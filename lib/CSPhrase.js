
(function () {
  "use strict";

  var CS, root = this;

  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSPhraseNote.js");
    this._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
  }
  
  /**
   *  @class  CS.Phrase  A collection of notes with timestamps.
   *
   *  @param  Array  params.notes  Notes in this phrase; `CS.PhraseNote` instances.
   **/
  CS.Phrase = function (params) {
    var lastNote;

    if (typeof params === "undefined" || params === null) {
      throw new Error("params is undefined");
    }

    if (typeof params.notes === "undefined" || params.notes === null) {
      throw new Error("params.notes is undefined");
    }
    this._notes = params.notes;

    this.duration = 0;
    if (this._notes.length) {
      // duration of phrase is end time of last note
      lastNote = this._notes[this._notes.length - 1];

      this.duration = lastNote.get("time") + lastNote.get("duration");
    }


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
      lastNoteEndTime = notes[0].get("time") + notes[0].get("duration");
      notesWithRests.push(notes[0]);
      for (i = 1; i < notes.length; i++) {
        note = notes[i];

        // if there was a gap between the end of the last note and the start
        // of this note, we need to insert a rest for that duration
        gapDuration = note.get("time") - lastNoteEndTime;
        if (gapDuration > 0.05) {
          notesWithRests.push(new CS.PhraseNote({
            pitch: -1,
            duration: gapDuration,
            time: lastNoteEndTime,
            velocity: 0,
            muted: true
          }));
        }

        lastNoteEndTime = note.get("time") + note.get("duration");
        notesWithRests.push(note);
      }

      return notesWithRests;
      
    },

    notes: function () {
      return root._.clone(this._notes);
    }

  };

}).call(this);

