/*jslint sloppy: true */
/*global LiveAPI, post, error_aware_callback, Task, outlet, CSPhraseNote, CSPhrase */

function CSInputAnalyzer () {

  this._previousPhrases = [];

  /**
   *  As a phrase is in the process of being played, this array will store
   *  the incoming notes.
   **/
  this._currentPhraseNotes = [];

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
  this._endOfPhraseCallback = new Task(function () {

    this.handle_phrase_ended();

  }, this);
  
}

CSInputAnalyzer.prototype = {

  /**
   *  Called from host when new note information is received.
   **/
  handle_notein: function (noteData) {
    var noteAttributes = {},
      note;

    // if this was a noteon event
    if (noteData.noteon) {
      noteAttributes.pitch = noteData.pitch;
      noteAttributes.onVelocity = noteData.velocity;
      noteAttributes.onTime = noteData.time;

      note = new CSPhraseNote(noteAttributes);

      // note is part of the phrase
      this._currentPhraseNotes.push(noteData);

      // maintain indexed by pitch so we can update it upon noteoff
      this._currentNotesOn[noteAttributes.pitch] = note;
      this._numCurrentNotesOn++;

      // reset end of phrase timeout if it is running
      this._endOfPhraseCallback.cancel();

    // this was a noteoff event
    } else {

      // find note
      note = this._currentNotesOn[noteData.pitch];

      // update note with new information
      note.set({
        offVelocity: noteData.velocity,
        offTime: noteData.time
      });

      // note is no longer on
      this._currentNotesOn[noteData.pitch] = null;
      this._numCurrentNotesOn--;

      // if there are no other notes being held on, start phrase end timer by
      // waiting two seconds before determining that this is the end of the
      // phrase.
      if (this._numCurrentNotesOn === 0) {
        //TODO: timeout duration here should be set based on host
        this._endOfPhraseCallback.schedule(2000);
      }

    }

  },

  handle_phrase_ended: function () {

    var phrase;

    phrase = new CSPhrase({
      notes: this._currentPhraseNotes
    });

    this._previousPhrases.push(phrase);

    this._currentPhraseNotes = [];
    // should already be 0 but just to make sure
    this._numCurrentNotesOn = 0;
    this._currentNotesOn = {};

  }

};


/**
 *  Called from max patch when patch is to be initialized.
 **/
this.init = function () {

  this.inputAnalyzer = new CSInputAnalyzer();
  this.api = new LiveAPI("live_set");
  
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

  var noteData = {
    pitch: pitch,
    velocity: velocity,
    noteon: (noteon === 1),
    time: this.api.get("current_song_time")
  };

  this.inputAnalyzer.handle_notein(noteData);

};
// the followign line would require the above method to run immediately in
// the high-priority thread from within Max, but since I want to use
// Ableton's clock to timestamp the notes, the method needs to be run in the
// normal priority thread.
//this.handle_notein.immediate = 1;
