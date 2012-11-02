/**
 *  @file       CSAbletonClip.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the MIT license.
 **/

/*global post */

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
  *   @class  CS.AbletonClip  Parsing and instantiation of Ableton clip
  *   information into JavaScript data structures.
  *
  *   @param  Clip          clip              The clip to analyze
  **/
  CS.AbletonClip = function (params) {
    if (typeof params === "undefined" || params === null) {
      // assuming constructor was used as super class
      return;
    }

    if (typeof params.clip === "undefined" || params.clip === null) {
      throw new Error("params.clip is undefined");
    }
    /**
     *  Reference to the `LiveAPI` instance pointing to the clip in Ableton.
     **/
    this._clip = params.clip;

    /**
     *  `CSPhrase` instance populated with parsed note data from Ableton.
     **/
    this._phrase = new CS.Phrase({
      notes: this.fetch_notes()
    });

  };

  CS.AbletonClip.prototype = {

    fetch_notes: function () {
      var name,
        rawNotes,
        numNotes,
        notes = [],
        note,
        i,
        clip = this._clip;


      if (clip.id == 0) {
        // no clip was present
        return false;
      }

      name = clip.get("name");

      post("\n--------\nAnalyzing: " + name + "\n--------\n");
     
      //post("calling `select_all_notes`\n");
      clip.call("select_all_notes");

      //post("calling `get_selected_notes`\n");
      rawNotes = clip.call("get_selected_notes");
      
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
        note = new CS.PhraseNote({
          pitch: rawNotes[i + 1],
          time: rawNotes[i + 2],
          duration: rawNotes[i + 3],
          velocity: rawNotes[i + 4],
          muted: rawNotes[i + 5] === 1
        });
        notes.push(note);
      }

      if (notes.length !== numNotes) {
        post("Error parsing note data!\n\tGot " + notes.length + " notes but expected " + numNotes + " notes.");
        return;
      }

      post("organizing notes...");

      // sort notes by time
      notes.sort(function (a, b) {
        return (a.get("time") <= b.get("time")) ? -1 : 1;
      });

      return notes;
      
    }
  
  };
  
}).call(this);
