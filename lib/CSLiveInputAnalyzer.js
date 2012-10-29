/*jslint sloppy: true */
/*global LiveAPI, post, error_aware_callback, Task, outlet, CS */

/**
 *  Called from max patch when patch is to be initialized.
 **/
this.init = function () {


  this.inputAnalyzer = new CS.InputAnalyzer();
  this.phraseGenerator = new CS.MarkovPhraseGenerator();

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
