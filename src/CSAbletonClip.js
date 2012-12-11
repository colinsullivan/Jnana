/**
 *  @file       CSAbletonClip.js
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
  *   @class  CS.Ableton.Clip  Parsing and instantiation of Ableton clip
  *   information into JavaScript data structures.
  *
  *   @param  Clip          clip              The clip to analyze
  **/
  CS.Ableton.Clip = function (params) {
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
     *  Keep track of loop length as it was originally.  Useful when generating
     *  new clip so length of loop doesn't drift.
     **/
    this.loopLength = this._clip.get("length")[0];

    /**
     *  `CSPhrase` instance populated with parsed note data from Ableton.
     **/
    this.phrase = new CS.Phrase({
      notes: this.fetch_notes()
    });

  };

  CS.Ableton.Clip.prototype = {

    fetch_notes: function () {
      var name,
        rawNotes,
        maxNumNotes,
        notes = [],
        noteProperties,
        note,
        i,
        clip = this._clip;


      if (Number(clip.id) === 0) {
        // no clip was present
        return false;
      }

      name = clip.get("name");

      CS.post("\n--------\nFetching: " + name + "\n--------\n");
     
      CS.post("calling `select_all_notes`\n");
      clip.call("select_all_notes");

      CS.post("calling `get_selected_notes`\n");
      rawNotes = clip.call("get_selected_notes");
      
      // grab maxNumNotes
      if (rawNotes[0] !== "notes") {
        CS.post("Unexpected note output!\n");
        return;
      }

      // this is the maximum number of notes because Ableton doesn't report
      // accurate data especially when there is a large amount of notes
      // in the clip.
      maxNumNotes = rawNotes[1];

      // remove maxNumNotes
      rawNotes = rawNotes.slice(2);

      CS.post("rawNotes.length:\n");
      CS.post(rawNotes.length);
      CS.post("\n");

      CS.post("maxNumNotes * 6:\n");
      CS.post(maxNumNotes * 6);
      CS.post("\n");

      CS.post("extracting notes\n");

      for (i = 0; i < (maxNumNotes * 6); i += 6) {
        // extract note properties from array given from Ableton
        noteProperties = {
          pitch: rawNotes[i + 1],
          time: rawNotes[i + 2],
          duration: rawNotes[i + 3],
          velocity: rawNotes[i + 4],
          muted: rawNotes[i + 5] === 1
        };

        // if this is a valid note
        if (
          rawNotes[i] === "note" &&
            typeof(noteProperties.pitch) === "number" &&
              typeof(noteProperties.time) === "number" &&
                typeof(noteProperties.duration) === "number" &&
                  typeof(noteProperties.velocity) === "number" &&
                    typeof(noteProperties.muted) === "boolean"
        ) {
          note = new CS.PhraseNote(noteProperties);
          notes.push(note);
        }
      }

      if (notes.length !== maxNumNotes) {
        CS.post("Error parsing note data!\n\tGot " + notes.length + " notes but expected " + maxNumNotes + " notes.");
        return;
      }

      CS.post("organizing notes...");

      // sort notes by time
      notes.sort(function (a, b) {
        return (a.get("time") <= b.get("time")) ? -1 : 1;
      });

      return notes;
      
    }
  
  };

}).call(this);
