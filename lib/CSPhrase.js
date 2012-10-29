
(function () {
  "use strict";

  var CS;

  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js");
  } else {
    CS = this.CS;
  }
  
  /**
   *  @class  CS.Phrase  A collection of notes with timestamps.
   *
   *  @param  Array  params.notes  Notes in this phrase; `CS.PhraseNote` instances.
   **/
  CS.Phrase = function (params) {
    if (typeof params === "undefined" || params === null) {
      throw new Error("params is undefined");
    }

    if (typeof params.notes === "undefined" || params.notes === null) {
      throw new Error("params.notes is undefined");
    }
    this._notes = params.notes;


  };

  CS.Phrase.prototype = {

    /**
     *  Returns a list of the notes in the phrase, but with additional
     *  notes with a pitch of -1 each time a rest is found.
     **/
    get_notes_with_rests: function () {
      var lastNoteEndTime,
        notesWithRests = [],
        notes = this._notes,
        note,
        gapDuration,
        i;

      // create rests (note with pitch of -1) for each empty space
      lastNoteEndTime = notes[0].time + notes[0].duration;
      notesWithRests.push(notes[0]);
      for (i = 1; i < notes.length; i++) {
        note = notes[i];

        // if there was a gap between the end of the last note and the start
        // of this note, we need to insert a rest for that duration
        gapDuration = note.time - lastNoteEndTime;
        if (gapDuration > 0.05) {
          notesWithRests.push({
            pitch: -1,
            duration: gapDuration,
            time: lastNoteEndTime,
            velocity: 0,
            muted: true
          });
        }

        lastNoteEndTime = note.time + note.duration;
        notesWithRests.push(note);
      }

      return notesWithRests;
      
    }

  };

}).call(this);

