/*jslint sloppy: true */
/*global LiveAPI, post, error_aware_callback, Task, outlet, CS */

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
      me.generativeClip.generate_and_add_async(
        me.clip.get("loop_end")[0],
        roundedPhraseDuration,
        // when clip is done generating, play it
        function () {
          me.clip.call("fire");
        }
      );
    }
  });

};

/**
 *  Outlets:
 *
 *  0: MIDI note pitch out
 *  1: MIDI note velocity out
 *  2: MIDI note duration out
 **/
this.outlets = 3;

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
    noteData;

  // if notes are coming in from our clip, ignore
  if (clipIsPlaying || clipIsTriggered) {
    return;
  }

  noteData = {
    pitch: pitch,
    velocity: velocity,
    noteon: (noteon === 1),
    time: this.api.get("current_song_time")[0]
  };

  this.inputAnalyzer.handle_notein(noteData);

};
// the followign line would require the above method to run immediately in
// the high-priority thread from within Max, but since I want to use
// Ableton's clock to timestamp the notes, the method needs to be run in the
// normal priority thread.
//this.handle_notein.immediate = 1;
