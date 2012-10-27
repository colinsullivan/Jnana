/*jslint sloppy: true */
/*global LiveAPI, post, error_aware_callback, Task, outlet */

function CSInputAnalyzer () {

  /**
   *  As a phrase is in the process of being played, this array will store
   *  the incoming notes.
   **/
  this._currentPhraseNotes = [];

  /**
   *  List of pitches that have received a noteon and haven't yet seen a
   *  noteoff
   **/
  this._currentNotesOn = [];

  /**
   *  The Task instance that will run after a period of silence to handle
   *  the end of a phrase.
   **/
  this._endOfPhraseCallback = new Task(function () {
    this.handle_phrase_ended();
  }, this);
  
};

CSInputAnalyzer.prototype = {

  /**
   *  Called from host when new note information is received.
   **/
  handle_notein: function (noteData) {
    this._currentPhraseNotes.push(noteData);

    // reset end of phrase timeout if it is running
    this._endOfPhraseCallback.cancel();

    // if this was a noteoff and there are no other notes being held on, 
    // wait two seconds before determining that this is the end of the phrase.
    if (!noteData.noteon && !this.notes_being_held()) {
      this._endOfPhraseCallback.schedule(2000);
    }

  },

  notes_being_held: function () {
    return 1;
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
