/**
 *  @file       CSClipAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the MIT license.
 **/

/*global post */

/**
 *  @class ClipAnalyzer Perform analysis of a single clip and save analysis
 *  in provided CSMarkovTable.
 *
 *  @param  Clip          clip              The clip to analyze
 *  @param  CSMarkovTable   pitchTable     The table to store pitch analysis
 *  @param  CSMarkovTable   durationTable  The table to store duration analysis in
 **/
var ClipAnalyzer = function (params) {
  if (typeof params === "undefined" || params === null) {
    params = {};
  }

  if (typeof params.pitchTable === "undefined" || params.pitchTable === null) {
    throw new Error("params.pitchTable is undefined");
  }
  this.pitchTable = params.pitchTable;

  if (typeof params.durationTable === "undefined" || params.durationTable === null) {
    throw new Error("params.durationTable is undefined");
  }
  this.durationTable = params.durationTable;

};

ClipAnalyzer.prototype = {

  /**
   *  @param  Array         notes     List of notes in clip ordered by time.
   *  @param  CSMarkovTable   table     The markov chain to store analysis
   *  @param  String        property  The property of the notes to analyze   
   *  @param  Function      op        Operation to apply to each value pre-markov
   **/
  markov_note_analysis: function (notes, table, property, op) {

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
        op(prevPrevNote[property]),
        op(prevNote[property]),
        op(note[property])
      ]);

    }

    return table;
  },

  analyze: function (ctx) {
    var name,
      rawNotes,
      rawNotesSplit,
      numNotes,
      noteData = {
        notes: []
      },
      note,
      i,
      firstNoteInLoopIndex,
      lastNoteInLoopIndex,
      loopStart,
      loopEnd,
      pitchTable = this.pitchTable,
      durationTable = this.durationTable;


    if (ctx.id == 0) {
      // no clip was present
      return false;
    }

    name = ctx.get("name");

    post("\n--------\nAnalyzing: " + name + "\n--------\n");
   
    //post("calling `select_all_notes`\n");
    ctx.call("select_all_notes");

    //post("calling `get_selected_notes`\n");
    rawNotes = ctx.call("get_selected_notes");
    
    // grab numNotes
    if (rawNotes[0] !== "notes") {
      post("Unexpected note output!\n");
      return;
    }

    numNotes = rawNotes[1];

    // remove numNotes
    rawNotes = rawNotes.slice(2);

    post("extracting notes\n");

    for (i = 0; i < (numNotes * 6); i += 6) {
      note = {
        pitch: rawNotes[i + 1],
        time: rawNotes[i + 2],
        duration: rawNotes[i + 3],
        velocity: rawNotes[i + 4],
        muted: rawNotes[i + 5] === 1
      };
      noteData.notes.push(note);
    }

    if (noteData.notes.length !== numNotes) {
      post("Error parsing note data!\n\tGot " + noteData.notes.length + " notes but expected " + numNotes + " notes.");
      return;
    }

    // sort notes by time
    noteData.notes.sort(function (a, b) {
      return (a.time <= b.time) ? -1 : 1;
    });

    // throw away notes before and after loop indicators on MIDI clip
    firstNoteInLoopIndex = 0;
    lastNoteInLoopIndex = 0;
    loopStart = ctx.get("loop_start");
    loopEnd = ctx.get("loop_end");
    // find first note in loop
    for (i = 0; i < noteData.notes.length; i++) {
      note = noteData.notes[i];
      if (note.time >= loopStart) {
        firstNoteInLoopIndex = i;
        break;
      }
    }

    // find last note in loop
    for (i = firstNoteInLoopIndex + 1; i < noteData.notes.length; i++) {
      note = noteData.notes[i];
      if (note.time >= loopEnd) {
        break;
      }
      lastNoteInLoopIndex = i;
    }

    // discard all other notes
    noteData.notes = noteData.notes.slice(firstNoteInLoopIndex, lastNoteInLoopIndex + 1);

    this.markov_note_analysis(noteData.notes, pitchTable, "pitch");

    this.markov_note_analysis(
      noteData.notes,
      durationTable,
      "duration"
    );

  }

};
