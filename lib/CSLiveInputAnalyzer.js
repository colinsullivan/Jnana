/*global LiveAPI, post, error_aware_callback, Task, outlet, CS */

(function () {
  "use strict";

  /**
   *  Flag used when user is "holding to generate" because we must wait
   *  for track to stop.
   **/
  this.finishDisablingWhenStopped = false;

  /**
   *  Amount of silence required before detecting a phrase has ended (in ms).
   **/
  this.phraseTimeoutDuration = null;

  /**
   *  Wether or not we're currently automatically responding to live input
   *  with a generated musical phrase.  Will be set on patch load from
   *  toggle button.
   **/
  this.shouldAutoRespond = false;

  /**
   *  Wether or not we're currently automatically incorporating input data
   *  into statistical analysis.
   **/
  this.shouldAutoTrain = false;

  /**
   *  A placeholder for the previous value of `shouldAutoTrain`, used
   *  when temporarily exiting autotrain mode without the user's action.
   **/
  this.prevShouldAutoTrain = this.shouldAutoTrain;

  /**
   *  The CS.Ableton.SelfGeneratingClip that will be populated with generated
   *  material from statistical analysis of the live input when the user is
   *  generating continuously on demand.
   **/
  this.genClips = [];

  /**
   *  The `CS.Ableton.PhraseRenderingClip` to be populated with generated
   *  phrase when in auto generating mode.
   **/
  this.autoGenClip = null;

  /**
   *  Tables used for analysis of the input (instantiated in init)
   **/
  this.pitchTable = null;
  this.durationTable = null;

  /**
   *  Called from max patch to enable or disable the automatic rendering
   *  of a clip based on input analysis.
   *
   *  @param  Number  shouldAutoRespond     Wether or not we are automatically
   *  "responding" to live input with a generated phrase.
   **/
  this.set_auto_response = function (newShouldAutoRespond) {
    newShouldAutoRespond = (newShouldAutoRespond === 1);

    this.shouldAutoRespond = newShouldAutoRespond;
  };

  /**
   *  Called from max patch when patch is to be initialized.
   **/
  this.init = function () {
    var me = this,
      clipSlots,
      i,
      clipSlotId,
      trackPath,
      clipPath,
      clipName,
      clip;

    this.set_midi_passthrough(false);

    /**
     *  Retrieve clip we will generate into for accompaniment
     **/
    this.api = new LiveAPI("live_set");
    this.track = new LiveAPI("this_device canonical_parent");
    trackPath = this.track.path.slice(1, -1);

    clipSlots = this.track.get("clip_slots");
    
    this.pitchTable = new CS.MarkovTable({order: 2});
    this.durationTable = new CS.MarkovTable({order: 2});

    // for each clip slot
    for (i = 0; i < clipSlots.length; i += 2) {
      clipSlotId = i / 2;
      clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";

      clip = new LiveAPI(clipPath);
      if (clip.id !== "0") {
        clipName = clip.get("name")[0];
        
        // instantiate a `CS.Ableton.SelfGeneratingClip` instance for all
        // clips populated with a clip named like "something-gen01"
        if (clipName.match(/-gen[\d]*$/)) {
          this.genClips.push(new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: 1,
            pitchTable: this.pitchTable,
            durationTable: this.durationTable,
            clip: clip
          }));
        } else if (clipName.match(/-auto$/)) {
          this.autoGenClip = new CS.Ableton.SelfGeneratingClip({
            clip: clip,
            playsTillAutoGenerate: -1, // doesn't matter because it wont auto generate
            pitchTable: this.pitchTable,
            durationTable: this.durationTable
          });
        }
      
      }
    }

    if (this.genClips.length === 0) {
      throw new Error("No generative clips found!");
    }

    if (this.genClips.length < 3) {
      throw new Error("There must be at least 3 generative clips.");
    }

    /*this.clipPlayingWatcher = new LiveAPI(function () {
      var isPlaying = this.get("is_playing")[0] === 1,
        isTriggered = this.get("is_triggered")[0] === 1;

      if (isPlaying || isTriggered) {
        me.set_midi_passthrough(true);
      } else {
        me.set_midi_passthrough(false);
      }
    }, clipPath);
    this.clipPlayingWatcher.property = "playing_status";*/

    this.inputAnalyzer = new CS.InputAnalyzer({
      phraseTimeoutDuration: this.phraseTimeoutDuration,
      phrase_finished_callback: function (phrase) {
        var roundedPhraseDuration,
          previousShouldAutoTrain,
          autoGenClip = me.autoGenClip;

        autoGenClip._phraseGenerator.incorporate_phrase(phrase);
        roundedPhraseDuration = Math.round(phrase.duration / 4) * 4;

        me.status_message_out("End of input phrase detected.");


        /**
         *  If we are in auto response mode, and a phrase just ended,
         *  initiate the auto response
         **/
        if (me.shouldAutoRespond) {
          autoGenClip.generate_and_append_async(
            // generate a response at a duration quantized from original
            // phrase duration
            roundedPhraseDuration,
            // when clip is done generating, play it
            function () {
              previousShouldAutoTrain = me.shouldAutoTrain;
              // stop auto-training while clip is playing
              me.shouldAutoTrain = false;
              // pass midi through when clip is playing
              me.set_midi_passthrough(true);

              // but when clip is done playing, reset shouldAutoTrain
              autoGenClip.set_playbackEndedCallback(function () {
                post("playback ended callback");
                me.shouldAutoTrain = previousShouldAutoTrain;
                autoGenClip.set_playbackEndedCallback(null);
                // no more midi passthrough
                me.set_midi_passthrough(false);
               
                // stop clips on track
                //me.track.call("stop_all_clips");
                
                /*// re-enable other clips
                for (i = 1; i < genClips.length; i++) {
                  genClips[i]._clip.set("muted", 0);
                }*/

                autoGenClip.stop();

              });
              autoGenClip.start();
              // but don't autogenerate
              // TODO: fix this HACK.
              autoGenClip._isAutogenerating = false;

              // play clip
              autoGenClip._clip.call("fire");
            }
          );
        }
      }
    });


    // when track is stopped, re-enable training
    this.trackStoppingWatcher = new LiveAPI(function () {

      var playingSlotIndex = this.get("playing_slot_index")[0],
        genClip,
        genClips = me.genClips;

      if (playingSlotIndex < 0 && me.finishDisablingWhenStopped) {

        me.shouldAutoTrain = me.prevShouldAutoTrain;
        me.set_midi_passthrough(false);

        me.finishDisablingWhenStopped = false;
        
        /*for (i = 0; i < genClips.length; i++) {
          genClip = genClips[i];

          // stop waiting to auto generate
          genClip.stop();

        }*/
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
   *  Toggle wether or not MIDI in is allowed to pass through the patch.
   *
   *  @param  Booleanish  value  Wether or not passthrough is allowed.
   **/
  this.set_midi_passthrough = function (value) {
    if (value) {
      this.outlet(1, 1);
    } else {
      this.outlet(1, 0);
    }
  };

  this.clipPlayingWatcher = null;

  /**
   *  Called from patcher when the user starts holding the "hold to generate"
   *  button.
   **/
  this.enable_hold_to_generate = function () {

    var i,
      genClips = this.genClips,
      genClip,
      duration = 4 * 4;

    post("enable");

    // stop training
    this.prevShouldAutoTrain = this.shouldAutoTrain;
    this.shouldAutoTrain = false;

    // midi passthrough
    this.set_midi_passthrough(true);
    
    genClip = genClips[0];
    genClip.generate_and_append_async(duration, function () {
      // start watching for auto-generation
      genClip.start();

      genClip = genClips[1];

      genClip.generate_and_append_async(duration, function () {
        // start watching for auto-generation
        genClip.start();
        genClip = genClips[2];

        genClip.generate_and_append_async(duration, function () {
          genClip.start();

          (new Task(function () {
            // play first clip
            post("firing first clip");
            genClips[0]._clip.call("fire");
          })).schedule(100);
          

        });
      });
    });

    /*// generate phrase and append to current
    this.generativeClip.generate_and_append_async(4 * 4 + 1, function () {

      // now new material is loaded into clip, we're ready to fire it but first!
      
      me.clipPlayingWatcher = new Task(function () {

        var playingPosition;

        post("clip playing watcher\n");

        playingPosition = this.clip.get("playing_position")[0];

        // if we're near the end of the generated part, need to generate more
        if (this.generativeClip._currentEndTime - playingPosition < 8) {
          post("should generate again");
          [>this.generativeClip.generate_and_append_async(4 * 4, function () {
            
          }, {
            // but don't move markers or we will get in trouble with ableton
            moveStartMarker: false,
            moveEndMarker: false
          });<]
        }

      }, me);
      me.clipPlayingWatcher.interval = 250;
      
      // start playing
      me.clip.call("fire");
      me.clipPlayingWatcher.repeat(-1, 2000);
    });*/
    
  };

  this.trackStoppingWatcher = null;
  /**
   *  Called from patcher when the user stops holding the "hold to generate"
   *  button.
   **/
  this.disable_hold_to_generate = function () {
    var i,
      genClips = this.genClips,
      genClip,
      me = this;


    this.finishDisablingWhenStopped = true;

    // stop track
    this.track.call("stop_all_clips");


    /*this.clip.call("stop");
    if (this.clipPlayingWatcher) {
      this.clipPlayingWatcher.cancel();
      this.clipPlayingWatcher = null;
    }*/
    
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
    
    // if we are not auto-training
    if (
      !this.shouldAutoTrain
        &&
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
    this.shouldAutoTrain = (shouldAutoTrain === 1);
  };

  /**
   *  Clear training data from all markov tables.  Called from patch
   *  when user wishes to restart training.
   **/
  this.clear_training = function () {
    this.pitchTable.clear();
    this.durationTable.clear();
  };

}).call(this);

