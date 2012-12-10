/**
 *  @file       CSJnanaLive.js
 *
 *              Entry point for the Jnana live input analysis and response
 *              system.  Handles all GUI parameters.
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

/*global LiveAPI, post, error_aware_callback, Task, outlet, CS */

(function () {
  "use strict";

  /**
   *  @type CS.Ableton.InputAnalyzer
   *  Handles the analysis of live input, and triggers the generation
   *  of clips when appropriate.
   **/
  this.inputAnalyzer = null;

  /**
   *  @type Boolean
   *  Flag used when user is "holding to generate" because we must wait
   *  for track to stop.
   **/
  this.finishDisablingWhenStopped = false;

  /**
   *  @type Number
   *  Amount of silence (in ms) required before detecting a phrase has ended.
   *  Sent in as a parameter from UI.
   **/
  this.phraseTimeoutDuration = null;

  /**
   *  @type Boolean
   *  Wether or not we're currently automatically responding to live input
   *  with a generated musical phrase.  Will be set on patch load from
   *  toggle button.
   **/
  this.shouldAutoRespond = null;

  /**
   *  @type Boolean
   *  Wether or not we're currently automatically incorporating input data
   *  into statistical analysis.  Sent in from auto train toggle button.
   **/
  this.shouldAutoTrain = null;

  /**
   *  @type Boolean
   *  A placeholder for the previous value of `shouldAutoTrain`, used
   *  when temporarily exiting autotrain mode without the user's action.
   **/
  this.prevShouldAutoTrain = this.shouldAutoTrain;

  /**
   *  @type Boolean
   *  Wether or not this track is passing MIDI through all the time.  Sent
   *  in from midi passthrough toggle button on GUI.
   **/
  this.midiPassthroughAlways = null;

  /**
   *  @type Boolean
   *  Wether or not we should use the starting statistics when generating
   *  phrases.  Toggle button on GUI.
   **/
  this.useStartingStatistics = null;

  /**
   *  @type Boolean
   *  Wether or not to assume the incoming phrases are circular.  Toggle on
   *  GUI.
   **/
  this.useCircularStatistics = null;

  /**
   *  @type Boolean
   *  Wether or not the track is currently armed.
   **/
  this.trackIsArmed = null;

  /**
   *  Called from max patch to enable or disable the automatic rendering
   *  of a clip based on input analysis.
   *
   *  @param  Number  shouldAutoRespond     Wether or not we are automatically
   *  "responding" to live input with a generated phrase.
   **/
  this.set_auto_response = function (newShouldAutoRespond) {
    newShouldAutoRespond = Boolean(newShouldAutoRespond);

    this.shouldAutoRespond = newShouldAutoRespond;

    if (this.inputAnalyzer) {
      this.inputAnalyzer.set_auto_response(newShouldAutoRespond);
    }
  };

  /**
   *  Because the Max for Live API is weird, this "class" must act as a
   *  delegate anytime another component wants a new `LiveAPI` instance.
   *
   *  @param  String  path    The `path` argument to send to the `LiveAPI`
   *  constructor.
   **/
  this.new_live_api = function (path) {
    return new LiveAPI(path);
  };

  /**
   *  Called from max patch when patch is to be initialized.
   **/
  this.init = function () {

    var me = this,
      previousShouldAutoTrain;

    this.track = new LiveAPI("this_device canonical_parent");
    this.api = new LiveAPI("live_set");

    this.inputAnalyzer = new CS.Ableton.InputAnalyzer({
      track: this.track,
      liveAPIDelegate: this,
      shouldAutoRespond: this.shouldAutoRespond,
      phraseTimeoutDuration: this.phraseTimeoutDuration,
      auto_response_will_start_callback: function () {
        
        me.status_message_out("End of input phrase detected.");

        previousShouldAutoTrain = me.shouldAutoTrain;

        // stop auto-training while clip is playing
        me.set_auto_train(false);
        
        // if user hasn't requested MIDI always passing through
        if (!me.midiPassthroughAlways) {
          // temporarily disarm track while clip is playing, otherwise
          // any incoming MIDI would be sent through
          me.set_track_armed(false);
          
          // allow midi to pass through so the clip can play
          me.set_midi_passthrough(true);
        }
      },
      auto_response_ended_callback: function () {
        me.shouldAutoTrain = previousShouldAutoTrain;
        // if user hasn't requested MIDI always passing through
        if (!me.midiPassthroughAlways) {

          // disallow midi from passing through
          me.set_midi_passthrough(false);
        }

        // if we should still be listening to input
        if (me.shouldAutoTrain) {
          // re-arm track if it is disarmed
          me.set_track_armed(true);
        }
        
      }
    });

    // if state variables were set, it was done pre-initialization so
    // we should re-initialize
    if (this.trackIsArmed !== null) {
      this.set_track_armed(this.trackIsArmed);
    }
    if (this.shouldAutoRespond) {
      this.set_auto_response(this.shouldAutoRespond);
    }
    if (this.useStartingStatistics) {
      this.set_use_starting_statistics(this.useStartingStatistics);
    }
    if (this.useCircularStatistics) {
      this.set_use_circular_statistics(this.useCircularStatistics);
    }


    // when track is stopped, re-enable training if flag was set
    this.trackStoppingWatcher = new LiveAPI(function () {

      var playingSlotIndex = this.get("playing_slot_index")[0],
        genClip,
        genClips = me.genClips;

      if (playingSlotIndex < 0 && me.finishDisablingWhenStopped) {

        (new Task(function () {
          // re-enable auto training if it was enabled before.  This will
          // arm track if necessary.
          this.set_auto_train(this.prevShouldAutoTrain);

          // if user hasn't requested MIDI always passing through
          if (!this.midiPassthroughAlways) {
            // disallow midi from passing through
            this.set_midi_passthrough(false);
          }

          this.finishDisablingWhenStopped = false;
          
        }, me)).schedule(50);
      }
      
    }, this.track.path.slice(1, -1));
    this.trackStoppingWatcher.property = "playing_slot_index";

  };

  /**
   *  Outlets:
   *
   *  0: status messages
   *  1: MIDI in passthrough (0: off, 1: on)
   **/
  this.outlets = 2;

  /**
   *  Change the amount of time the input analyzer should wait before
   *  determining that a phrase has finished.
   *
   *  @param  Number  timeoutDuration  The duration (in ms)
   **/
  this.set_phrase_detection_timeout = function (timeoutDuration) {

    this.phraseTimeoutDuration = timeoutDuration;

    if (this.inputAnalyzer) {
      this.inputAnalyzer.set_phraseTimeoutDuration(timeoutDuration);
    }
    
  };

  /**
   *  Send a status message.  Called from within JS to send a string
   *  out the patch's first outlet.
   *
   *  @param  String  msg  The message to output.
   **/
  this.status_message_out = function (msg) {
    this.outlet(0, ["set", msg]);
  };

  /**
   *  Called from the UI when the user would like MIDI to always pass
   *  through.
   *
   *  @param  Booleanish  value  Should always passthrough
   **/
  this.set_midi_passthrough_always = function (value) {
    this.midiPassthroughAlways = Boolean(value);

    if (this.midiPassthroughAlways) {
      this.set_midi_passthrough(true);
      this.set_track_armed(true);
    }

  };

  /**
   *  Toggle wether or not MIDI in will pass through the patch.
   *
   *  @param  Booleanish  value  Wether or not to passthrough
   **/
  this.set_midi_passthrough = function (value) {
    this.outlet(1, Number(value));
  };

  /**
   *  Toggle wether or not this clip is armed for recording.  This will cut off
   *  input to the patch, used when accompaniment is playing and user has not
   *  specified MIDI to passthrough always.
   *
   *  @param  Booleanish  value   Wether or not the track should be armed.
   **/
  this.set_track_armed = function (value) {
    this.trackIsArmed = value;
    if (this.track) {
      this.track.set("arm", Number(value));
    }
  };

  this.clipPlayingWatcher = null;

  /**
   *  Called from patcher when the user starts holding the "hold to generate"
   *  button.
   **/
  this.enable_hold_to_generate = function () {
    // stop training
    this.prevShouldAutoTrain = this.shouldAutoTrain;
    this.set_auto_train(false);
    
    // if user has not requested constant midi passthrough
    if (!this.midiPassthroughAlways) {
      // disarm clip or else extra input would passthrough
      this.set_track_armed(false);
      
      // enable midi passthrough just to let clip midi through
      this.set_midi_passthrough(true);
    }

    // generate manual clips and start playing first one
    this.inputAnalyzer.start_manual_response();
  
  };

  this.trackStoppingWatcher = null;
  /**
   *  Called from patcher when the user stops holding the "hold to generate"
   *  button.
   **/
  this.disable_hold_to_generate = function () {
    
    this.finishDisablingWhenStopped = true;

    this.inputAnalyzer.end_manual_response();
  };

  /**
   *  Called from max patch when a noteon or noteoff message comes in
   *  from the live input source.
   *
   *  @param  Number  pitch     of the note
   *  @param  Number  velocity  of the note
   *  @param  Number  noteon    1 if this was a noteon, 0 if it was a noteoff
   **/
  this.handle_notein = function (pitch, velocity, noteon) {
    var isNoteOn = noteon === 1,
      noteData,
      currentNumNotesInPhrase;
    
    if (
      // if we are not auto-training
      !this.shouldAutoTrain &&
        // this is a noteon (noteoffs are safe to analyze because they may be
        // ending notes started previously)
        isNoteOn
    ) {

      // ignore input noteon.
      return;
    }

    noteData = {
      pitch: pitch,
      velocity: velocity,
      noteon: isNoteOn,
      time: this.api.get("current_song_time")[0]
    };

    currentNumNotesInPhrase = this.inputAnalyzer.handle_notein(noteData);
    this.status_message_out(currentNumNotesInPhrase + " notes in incoming phrase.");

  };
  // the followign line would require the above method to run immediately in
  // the high-priority thread from within Max, but since I want to use
  // Ableton's clock to timestamp the notes, the method needs to be run in the
  // normal priority thread.
  //this.handle_notein.immediate = 1;
  

  /**
   *  Set wether or not we should automatically incorporate input data into
   *  statistical analysis.
   *
   *  @param  Number  shouldAutoTrain  Wether or not we should auto train.
   **/
  this.set_auto_train = function (shouldAutoTrain) {
    this.shouldAutoTrain = Boolean(shouldAutoTrain);

    // if user specified we should auto train on input and we're not
    // just initializing plugin
    if (this.shouldAutoTrain && this.track) {
      this.set_track_armed(true);
    }
  };

  /**
   *  Clear training data from all markov tables.  Called from patch
   *  when user wishes to restart training.
   **/
  this.clear_training = function () {
    this.inputAnalyzer.clear_training();
  };

  /**
   *  Enable or disable usage of starting note statistics when generating
   *  clips.  The statistics will always be taken, just not used if this
   *  option is turned off.
   *
   *  @param  Booleanish  value   Wether or not to use starting statistics
   *  from now on.
   **/
  this.set_use_starting_statistics = function (value) {
    this.useStartingStatistics = Boolean(value);

    // if we've initialized
    if (this.inputAnalyzer) {
      this.inputAnalyzer.set_use_starting_statistics(this.useStartingStatistics);
    }
  };

  /**
   *  Enable or disable the usage of circular statistics when generating clips.
   *  That is, wether or not to assume that the incoming phrases are circular.
   *  
   *  @param  Booleanish  value  Wether or not to assume phrases are circular.
   **/
  this.set_use_circular_statistics = function (value) {
    this.useCircularStatistics = Boolean(value);

    // if we've already initialized our input analyzer
    if (this.inputAnalyzer) {
      this.inputAnalyzer.set_use_circular_statistics(this.useCircularStatistics);
    }
  };

}).call(this);

