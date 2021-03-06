/**
 *  @file       CSInputAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

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

  /**
   *  @class  CS.InputAnalyzer    Handles incoming note events and determines
   *  when a phrase has completed based on a timeout.
   **/
  CS.InputAnalyzer = function (params) {

    if (typeof params === "undefined" || params === null) {
      return; // assume being used in prototype.
    }


    if (typeof params.phraseTimeoutDuration === "undefined" || params.phraseTimeoutDuration === null) {
      throw new Error("params.phraseTimeoutDuration is undefined");
    }
    /**
     *  The amount of silence required to consider a phrase ended (in
     *  milliseconds).
     **/
    this._phraseTimeoutDuration = params.phraseTimeoutDuration;

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
     *  Change amount of silence required to consider a phrase
     *  ended.
     *
     *  @param  Number  timeoutDuration   New timeout duration
     **/
    set_phraseTimeoutDuration: function (timeoutDuration) {
      this._phraseTimeoutDuration = timeoutDuration;
    },

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
            var phrase;

            CS.post("phrase ended\n");

            phrase = new CS.Phrase({
              notes: this._currentPhraseNotes
            });

            this._previousPhrases.push(phrase);

            this._currentPhraseNotes = [];
            // should already be 0 but just to make sure
            this._numCurrentNotesOn = 0;
            this._currentNotesOn = {};
            this._phraseStartTime = -1;

            this.handle_phrase_ended(phrase);

          }, this);
          CS.post("starting endOfPhraseCallback\n");
          this._endOfPhraseCallback.schedule(this._phraseTimeoutDuration);
        }

      }

      return this._currentPhraseNotes.length;

    },

    /**
     *  Called when a phrase has ended.  Subclasses should override this
     *  method to process the phrase once it has ended.
     **/
    handle_phrase_ended: function (phrase) {

    }
  };

}).call(this);
