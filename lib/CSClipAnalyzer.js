/**
 *  @file       CSClipAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";


  var CS;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSPhrase.js");
    require("./CSPhraseNote.js");
  } else {
    CS = this.CS;
  }
  
  /**
   *  @class CS.ClipAnalyzer Perform analysis of a single clip and save analysis
   *  in provided CSMarkovTable.
   *  
   *  @extends  CS.Ableton.Clip
   *
   *  @param  CSMarkovTable   pitchTable      The table to store pitch
   *  analysis
   *  @param  CSMarkovTable   durationTable   The table to store duration
   *  analysis in
   *  @param  CSMarkovTable   velocityTable   The table to store velocity
   *  analysis in.
   **/
  CS.ClipAnalyzer = function (params) {

    CS.Ableton.Clip.apply(this, arguments);

    if (typeof params.pitchTable === "undefined" || params.pitchTable === null) {
      throw new Error("params.pitchTable is undefined");
    }
    this.pitchTable = params.pitchTable;

    if (typeof params.durationTable === "undefined" || params.durationTable === null) {
      throw new Error("params.durationTable is undefined");
    }
    this.durationTable = params.durationTable;

    if (typeof params.velocityTable === "undefined" || params.velocityTable === null) {
      throw new Error("params.velocityTable is undefined");
    }
    this.velocityTable = params.velocityTable;

  };

  CS.ClipAnalyzer.prototype = new CS.Ableton.Clip();
  
  /**
   *  @param  Array           notes     List of notes in clip ordered by time.
   *  @param  CSMarkovTable   table     The markov chain to store analysis
   *  @param  String          property  The property of the notes to analyze   
   *  @param  Function        op        Operation to apply to each value pre-markov
   **/
  CS.ClipAnalyzer.prototype.markov_note_analysis = function (notes, table, property, op) {

    var i,
      note,
      prevNote,
      prevPrevNote;

    if (typeof op === "undefined" || op === null) {
      op = function (x) { return x; };
    }

    // for each note (starting on third note)
    for (i = 2; i < notes.length; i++) {
      note = notes[i];
      prevNote = notes[i - 1];
      prevPrevNote = notes[i - 2];

      // add this 3-note event to markov table
      table.add_transition([
        op(prevPrevNote.get(property)),
        op(prevNote.get(property)),
        op(note.get(property))
      ]);

    }
  };

  CS.ClipAnalyzer.prototype.fetch_notes = function () {
    var notes,
      note,
      firstNoteInLoopIndex,
      lastNoteInLoopIndex,
      loopStart,
      loopEnd,
      i,
      clip = this._clip;

    notes = CS.Ableton.Clip.prototype.fetch_notes.apply(this, arguments);

    // throw away notes before and after loop indicators on MIDI clip
    firstNoteInLoopIndex = 0;
    lastNoteInLoopIndex = 0;
    loopStart = clip.get("loop_start");
    loopEnd = clip.get("loop_end");
    // find first note in loop
    for (i = 0; i < notes.length; i++) {
      note = notes[i];
      if (note.get("time") >= loopStart) {
        firstNoteInLoopIndex = i;
        break;
      }
    }

    // find last note in loop
    for (i = firstNoteInLoopIndex + 1; i < notes.length; i++) {
      note = notes[i];
      if (note.get("time") >= loopEnd) {
        break;
      }
      lastNoteInLoopIndex = i;
    }

    // discard all other notes
    notes = notes.slice(firstNoteInLoopIndex, lastNoteInLoopIndex + 1);

    return notes;
  };

  CS.ClipAnalyzer.prototype.analyze = function () {

    var notesWithRests,
      notes,
      pitchTable = this.pitchTable,
      durationTable = this.durationTable,
      velocityTable = this.velocityTable;

    notesWithRests = this.phrase.get_notes_with_rests();
    notes = this.phrase.get_notes();

    this.markov_note_analysis(notesWithRests, pitchTable, "pitch");

    this.markov_note_analysis(notesWithRests, durationTable, "duration");

    // velocity doesn't care about rests
    this.markov_note_analysis(notes, velocityTable, "velocity");
  };

}).call(this);

