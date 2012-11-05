(function () {
  "use strict";

  var CS,
    Task;


  if (typeof require !== "undefined" && require !== null) {
    CS = require("./lib/CS.js").CS;
    require("./lib/CSPhraseNote.js");
    require("./lib/CSPhrase.js");
  } else {
    CS = this.CS;
    Task = this.Task;
  }
  
  CS.InputAnalyzer = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.phrase_finished_callback === "undefined" || params.phrase_finished_callback === null) {
      params.phrase_finished_callback = function () {
        
      };
    }
    this._phrase_finished_callback = params.phrase_finished_callback;

    this._previousPhrases = [];

    /**
     *  As a phrase is in the process of being played, this array will store
     *  the incoming notes.
     **/
    this._currentPhraseNotes = [];

    /**
     *  Start of phrase occurred at this ableton time
     **/
    this._phraseStartTime = -1;

    /**
     *  Notes that are on and haven't yet received a noteoff.  Indexed
     *  by the pitch value.
     **/
    this._currentNotesOn = {};
    this._numCurrentNotesOn = 0;

    /**
     *  The Task instance that will run after a period of silence to handle
     *  the end of a phrase.
     **/
    this._endOfPhraseCallback = null;
    
  };

  CS.InputAnalyzer.prototype = {

    /**
     *  Called from host when new note information is received.
     **/
    handle_notein: function (noteData) {
      var noteAttributes = {},
        note;

      // if this was a noteon event
      if (noteData.noteon) {
        // if this is the first note in the phrase
        if (this._phraseStartTime === -1) {
          this._phraseStartTime = noteData.time;
        }

        noteAttributes.pitch = noteData.pitch;
        noteAttributes.velocity = noteData.velocity;
        // phrase note times will be relative to phrase start
        noteAttributes.time = noteData.time - this._phraseStartTime;
        noteAttributes.muted = 0;

        note = new CS.PhraseNote(noteAttributes);

        // note is part of the phrase
        this._currentPhraseNotes.push(note);

        // maintain indexed by pitch so we can update it upon noteoff
        this._currentNotesOn[noteAttributes.pitch] = note;
        this._numCurrentNotesOn++;

        // reset end of phrase timeout if it is running
        if (this._endOfPhraseCallback) {
          this._endOfPhraseCallback.cancel();
        }

      // this was a noteoff event
      } else {

        // find note
        note = this._currentNotesOn[noteData.pitch];

        // if we don't have a noteon, this maybe is a hangover from playback,
        // in any case is safe to ignore because we thought note ended already.
        if (typeof note === "undefined" || note === null) {
          return this._currentPhraseNotes.length;
        }

        // update note with new information
        note.set({
          offVelocity: noteData.velocity,
          // duration is endtime - starttime
          duration: (noteData.time - this._phraseStartTime) - note.get("time")
        });

        // note is no longer on
        this._currentNotesOn[noteData.pitch] = null;
        this._numCurrentNotesOn--;

        // if there are no other notes being held on, start phrase end timer by
        // waiting two seconds before determining that this is the end of the
        // phrase.
        if (this._numCurrentNotesOn === 0) {
          this._endOfPhraseCallback = new Task(function () {

            this.handle_phrase_ended();

          }, this);
          //TODO: timeout duration here should be set based on host
          post("starting endOfPhraseCallback");
          this._endOfPhraseCallback.schedule(2000);
        }

      }

      return this._currentPhraseNotes.length;

    },

    handle_phrase_ended: function () {

      var phrase;

      post("phrase ended");

      phrase = new CS.Phrase({
        notes: this._currentPhraseNotes
      });

      this._previousPhrases.push(phrase);

      this._currentPhraseNotes = [];
      // should already be 0 but just to make sure
      this._numCurrentNotesOn = 0;
      this._currentNotesOn = {};
      this._phraseStartTime = -1;

      this._phrase_finished_callback(phrase);

    }

  };

}).call(this);
