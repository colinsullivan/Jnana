/*global LiveAPI, post, error_aware_callback, Task, outlet, CS */

(function () {
  "use strict";

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
      clip;

    this.set_midi_passthrough(false);

    /**
     *  Retrieve clip we will generate into for accompaniment
     **/
    this.api = new LiveAPI("live_set");
    this.track = new LiveAPI("this_device canonical_parent");
    trackPath = this.track.path.slice(1, -1);

    clipSlots = this.track.get("clip_slots");

    // for each clip slot
    for (i = 0; i < clipSlots.length; i += 2) {
      clipSlotId = i / 2;
      clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";

      clip = new LiveAPI(clipPath);
      if (clip.id !== "0" && clip.get("name")[0] === "accomp-gen") {
        this.clip = clip;

        break;
      }
    }

    this.clipPlayingWatcher = new LiveAPI(function () {
      var isPlaying = this.get("is_playing")[0] === 1,
        isTriggered = this.get("is_triggered")[0] === 1;

      if (isPlaying || isTriggered) {
        me.set_midi_passthrough(true);
      } else {
        me.set_midi_passthrough(false);
      }
    }, clipPath);
    this.clipPlayingWatcher.property = "playing_status";

    this.generativeClip = new CS.Ableton.PhraseRenderingClip({
      pitchTable: new CS.MarkovTable({order: 2}),
      durationTable: new CS.MarkovTable({order: 2}),
      clip: this.clip
    });

    this.inputAnalyzer = new CS.InputAnalyzer({
      phrase_finished_callback: function (phrase) {
        var roundedPhraseDuration;

        me.generativeClip._phraseGenerator.incorporate_phrase(phrase);
        roundedPhraseDuration = Math.round(phrase.duration / 4) * 4;


        if (me.shouldAutoRespond) {
          me.generativeClip.generate_and_append_async(
            // generate a response at a duration quantized from original
            // phrase duration
            roundedPhraseDuration,
            // when clip is done generating, play it
            function () {
              me.clip.call("fire");
            }
          );
        }
      }
    });

  };

  /**
   *  Outlets:
   *
   *  0: status messages
   *  1: MIDI in passthrough (0: off, 1: on)
   **/
  this.outlets = 2;

  /**
   *  Send a status message.  Called from within JS to send a string
   *  out the patch's first outlet.
   *
   *  @param  String  msg  The message to output.
   **/
  this.status_message_out = function (msg) {
    this.outlet(0, msg);
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

  /**
   *  Called from patcher when the user starts holding the "hold to generate"
   *  button.
   **/
  this.enable_hold_to_generate = function () {
    
  };

  /**
   *  Called from patcher when the user stops holding the "hold to generate"
   *  button.
   **/
  this.disable_hold_to_generate = function () {
    
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
    var clipIsPlaying = this.clip.get("is_playing")[0],
      clipIsTriggered = this.clip.get("is_triggered")[0],
      isNoteOn = noteon === 1,
      noteData;

    if (

      (
        // if notes are coming in from our playback (accompaniment) clip
        (clipIsPlaying || clipIsTriggered)
        
        ||
        
        // if we are not auto-training
        !this.shouldAutoTrain
      )

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

    this.inputAnalyzer.handle_notein(noteData);

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


  
}).call(this);

