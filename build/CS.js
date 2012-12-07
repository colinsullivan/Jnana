/**
 *  @file       CS.js 
 *
 *              Base-level namespace for stuff
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";


  this.CS = {
    Ableton: {}
  };


}).call(this);
/**
 *  @file       CSAbletonClip.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
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

  CS.AbletonClip.prototype = {

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

      /*post("\n--------\nAnalyzing: " + name + "\n--------\n");*/
     
      //post("calling `select_all_notes`\n");
      clip.call("select_all_notes");

      //post("calling `get_selected_notes`\n");
      rawNotes = clip.call("get_selected_notes");
      
      // grab maxNumNotes
      if (rawNotes[0] !== "notes") {
        post("Unexpected note output!\n");
        return;
      }

      // this is the maximum number of notes because Ableton doesn't report
      // accurate data especially when there is a large amount of notes
      // in the clip.
      maxNumNotes = rawNotes[1];

      // remove maxNumNotes
      rawNotes = rawNotes.slice(2);

      /*post("rawNotes.length:\n");
      post(rawNotes.length);
      post("\n");

      post("maxNumNotes * 6:\n");
      post(maxNumNotes * 6);
      post("\n");*/

      post("extracting notes\n");

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
        post("Error parsing note data!\n\tGot " + notes.length + " notes but expected " + maxNumNotes + " notes.");
        return;
      }

      //post("organizing notes...");

      // sort notes by time
      notes.sort(function (a, b) {
        return (a.get("time") <= b.get("time")) ? -1 : 1;
      });

      return notes;
      
    }
  
  };
  
}).call(this);
/**
 *  @file       CSAbletonPhraseRenderingClip.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

/*global post, Task */

(function () {
  "use strict";

  var CS;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSAbletonClip.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CS.Ableton.PhraseRenderingClip  A clip in Ableton that is
   *  populated with the notes from a `CS.MarkovPhraseGenerator` instance.
   *
   *  @param  LiveAPI   clip  The clip reference
   *  @param  CS.MarkovTable  pitchTable  Statistics for generated pitches
   *  @param  CS.MarkovTable  durationTable   Statistics for durations of notes  
   *
   **/
  CS.Ableton.PhraseRenderingClip = function (params) {
    var clip, notes, i, note, abletonClip;

    if (typeof params === "undefined" || params === null) {
      return;
    }
    
    if (typeof params.clip === "undefined" || params.clip === null) {
      throw new Error("params.clip is undefined");
    }
    clip = this._clip = params.clip;

    if (typeof params.pitchTable === "undefined" || params.pitchTable === null) {
      throw new Error("params.pitchTable is undefined");
    }

    if (typeof params.durationTable === "undefined" || params.durationTable === null) {
      throw new Error("params.durationTable is undefined");
    }

    if (typeof params.velocityTable === "undefined" || params.velocityTable === null) {
      throw new Error("params.velocityTable is undefined");
    }

    if (typeof params.assumeCircular === "undefined" || params.assumeCircular === null) {
      params.assumeCircular = false;
    }
    
    this._phraseGenerator = new CS.MarkovPhraseGenerator({
      order: 2,
      pitchTable: params.pitchTable,
      durationTable: params.durationTable,
      velocityTable: params.velocityTable,
      assumeCircular: params.assumeCircular
    });

    /**
     *  This is the point in time where the last note in the clip ends, in
     *  absolute clip time units. (i.e. 0 is at beginning of clip)
     **/
    this._currentEndTime = null;

    // determine currentEndTime now the long way, but maintain for future
    // reference.  ASSUMPTION: the clip is only being modified from this
    // class instance, and nowhere else.
    abletonClip = new CS.AbletonClip({
      clip: clip
    });
    this._currentEndTime = abletonClip.phrase.duration;

    this._originalLoopLength = abletonClip.loopLength;

    /**
     *  Maintain the time of the end of the current loop for when
     *  appending loop.
     **/
    this._currentLoopEndTime = clip.get("loop_end")[0];
    
    /**
     *  If we're in the process of generating a new clip
     **/
    this._isGenerating = false;
    
  };

  CS.Ableton.PhraseRenderingClip.prototype = {

    /**
     *  Inserts the notes from a `CS.Phrase` object into the clip starting
     *  at a particular time.
     *
     *  @param  CS.Phrase   params.phrase           The phrase to insert.
     *  @param  Number      params.tStart           The time at which to
     *  insert the phrase.
     *  @param  Boolean     [params.moveStartMarker=true]  Wether or not to re-locate
     *  the start marker to the beginning of the newly inserted phrase.
     *  @param  Boolean     [params.moveEndMarker=true]    Wether or not to move the
     *  end marker to the end of the newly inserted phrase.
     **/
    insert_phrase: function (params) {

      var notes,
        clip = this._clip,
        i,
        tEnd,
        note,
        // wether or not the clip is currently looping
        loopingOn = clip.get("looping")[0],
        phrase,
        tStart,
        moveStartMarker,
        moveEndMarker;

      if (typeof params === "undefined" || params === null) {
        throw new Error("params is undefined");
      }

      if (typeof params.phrase === "undefined" || params.phrase === null) {
        throw new Error("params.phrase is undefined");
      }
      phrase = params.phrase;

      if (typeof params.tStart === "undefined" || params.tStart === null) {
        throw new Error("params.tStart is undefined");
      }
      tStart = params.tStart;

      if (typeof params.moveStartMarker === "undefined" || params.moveStartMarker === null) {
        params.moveStartMarker = true;
      }
      moveStartMarker = params.moveStartMarker;

      if (typeof params.moveEndMarker === "undefined" || params.moveEndMarker === null) {
        params.moveEndMarker = true;
      }
      moveEndMarker = params.moveEndMarker;

      if (phrase.duration === 0) {
        post("Warning: Phrase duration was 0...skipping");
        return;
      }

      tEnd = tStart + phrase.duration;
      notes = phrase.notes();

      clip.call("deselect_all_notes");
      clip.call("replace_selected_notes");
      clip.call("notes", notes.length);
      for (i = 0; i < notes.length; i++) {
        note = notes[i];
        clip.call([
          "note",
          note.get("pitch"),
          (tStart + note.get("time")).toFixed(12),
          note.get("duration").toFixed(12),
          note.get("velocity"),
          note.get("muted")
        ]);
      }
      clip.call("done");

      post("moving loop markers...\n");
      if (moveEndMarker) {
        // move clip end and clip start to boundaries of newly generated clip.
        post("\tlooping 0\n");
        clip.set("looping", 0);
        post("\tloop_end " + tEnd.toFixed(3) + "\n");
        clip.set("loop_end", tEnd.toFixed(3));
        post("\tlooping 1\n");
        clip.set("looping", 1);
        post("\tloop_end " + tEnd.toFixed(3) + "\n");
        clip.set("loop_end", tEnd.toFixed(3));
        this._currentLoopEndTime = tEnd;
      }
     
      if (moveStartMarker) {
        // move loop start and loop end to boundaries of newly generated clip
        post("\tlooping 0\n");
        clip.set("looping", 0);
        post("\tloop_start " + tStart.toFixed(3) + "\n");
        clip.set("loop_start", tStart.toFixed(3));
        post("\tlooping 1\n");
        clip.set("looping", 1);
        post("\tloop_start " + tStart.toFixed(3) + "\n");
        clip.set("loop_start", tStart.toFixed(3));
      }


      clip.set("looping", loopingOn);

      post("done moving loop markers...\n");
      
    },

    /**
     *  Generate a new phrase (based on the probability tables sent in
     *  at initialization), then insert it at the end of the current clip.
     *
     *  @param  Number    duration  Duration of phrase to generate
     *  @param  Object    [insertParams]  Optional parameters for insert method.  
     **/
    generate_and_append: function (duration, insertParams) {
      var generatedPhrase;

      if (typeof insertParams === "undefined" || insertParams === null) {
        insertParams = {};
      }

      this._isGenerating = true;

      generatedPhrase = this._phraseGenerator.generate_phrase(duration);

      insertParams.phrase = generatedPhrase;

      // if tStart was not specified
      if (typeof insertParams.tStart === "undefined" || insertParams.tStart === null) {
        // start off where last note left off
        insertParams.tStart = this._currentEndTime;
      }

      this.insert_phrase(insertParams);
      this._currentEndTime += generatedPhrase.duration;
      
      this._isGenerating = false;
    },

    /**
     *  Same as above, but asynchronous.  Provides an optional callback
     *  method to execute on completion.
     *
     *  @param  Number    duration        Duration of phrase to generate
     *  @param  Function  [callback]      Optional callback function when complete.
     *  @param  Object    [insertParams]  Optional parameters for insert method.  
     **/
    generate_and_append_async: function (duration, callback, insertParams) {
      var genTask;

      if (typeof callback === "undefined" || callback === null) {
        callback = function () {
        
        };
      }

      genTask = new Task(function (args) {
        this.generate_and_append(args[0], args[2]);
        args[1]();
      }, this, [duration, callback, insertParams]);
      genTask.schedule();
    },

    /**
     *  Generate a new phrase that is the duration of the current loop
     *  and append it after the current loop.
     **/
    _generate_and_append_loop: function () {
      this.generate_and_append(this._originalLoopLength, {
        // start off where loop ends
        tStart: this._currentLoopEndTime
      });
    },
    _generate_and_append_loop_async: function () {
      var generateTask = new Task(function () {
        this._generate_and_append_loop();
      }, this);

      generateTask.schedule();
    }
  };

  /**
   *  Continuously generate clip based on MarkovTables.
   **/
  CS.Ableton.SelfGeneratingClip = function (params) {
    var api,
      loopJumpWatcher,
      playingStatusObserver,
      me = this;

    CS.Ableton.PhraseRenderingClip.apply(this, arguments);

    if (typeof params.playsTillAutoGenerate === "undefined" || params.playsTillAutoGenerate === null) {
      throw new Error("params.playsTillAutoGenerate is undefined");
    }
    // amount of playbacks after which the clip will re-generate.
    this._playsTillAutoGenerate = params.playsTillAutoGenerate;

    if (typeof params.playbackEndedCallback === "undefined" || params.playbackEndedCallback === null) {
      params.playbackEndedCallback = function () {
        
      };
    }
    this._playbackEndedCallback = params.playbackEndedCallback;


    // amount of playbacks since last generate
    this._playsSinceLastGenerate = 0;

    this._clipState = this.CLIP_STATES.STOPPED;


    /*// wether or not this clip should generate now
    this._shouldGenerate = false;

    // task to constantly check to see if clip should be re-generated
    this._generate_checker = new Task(function () {
      if (this._shouldGenerate) {
        this._generate();
        this._shouldGenerate = false;
      }
    }, this);
    this._generate_checker.interval = 200;*/
    
    /*api = new LiveAPI((function (selfGenClip) {
      return error_aware_callback(function () {
        selfGenClip._handle_clip_playingstatus_change();
      });
    }(this)), this._clip.path.slice(1, -1));
    // causes above callback method to be run whenever
    // playing status changes.
    api.property = "playing_status";*/
    this._isPlayingPrev = this._clip.get("is_playing")[0] === 1;
    this._isTriggeredPrev = this._clip.get("is_triggered")[0] === 1;
    
    /**
     *  Task used to observe playing status.  Created on `start`.
     **/
    this._playingStatusObserver = null;

    // if we're currently observing and auto-generating
    this._isAutogenerating = false;
  };

  CS.Ableton.SelfGeneratingClip.prototype = new CS.Ableton.PhraseRenderingClip();

  CS.Ableton.SelfGeneratingClip.prototype.CLIP_STATES = {
    PLAYING: 0,
    TRIGGERED: 1,
    STOPPED: 2
  };

  CS.Ableton.SelfGeneratingClip.prototype.set_playbackEndedCallback = function (cb) {
    if (typeof cb === "undefined" || cb === null) {
      cb = function () {
        
      };
    }
    this._playbackEndedCallback = cb;
  };

  CS.Ableton.SelfGeneratingClip.prototype._handle_clip_playingstatus_change = function () {
    var currentState = this._clipState,
      clipStates = this.CLIP_STATES,
      clip = this._clip,
      isPlaying = clip.get("is_playing")[0] === 1,
      isTriggered = clip.get("is_triggered")[0] === 1;

    post("handling state change...\n");
    if (
      // if clip was playing and is now stopped
      currentState === clipStates.PLAYING && !isPlaying
    ) {

      this._clipState = this.CLIP_STATES.STOPPED;
      this.handle_end_reached();

    } else if (
      // if clip was just playing and is now triggered
      currentState === clipStates.PLAYING && isTriggered
    ) {
      this._clipState = clipStates.TRIGGERED;
    } else if (
      // if clip was triggered and is now playing
      currentState === clipStates.TRIGGERED && isPlaying
    ) {
      this._clipState = clipStates.PLAYING;
    } else if (
      // if clip was triggered while already triggered
      currentState === clipStates.TRIGGERED && isTriggered
    ) {
      this._clipState = clipStates.TRIGGERED;
      this.handle_end_reached();
    } else if (
      // if clip was stopped or triggered and is now playing
      (currentState === clipStates.STOPPED || currentState === clipStates.TRIGGERED) && isPlaying
    ) {
      this._clipState = clipStates.PLAYING;
    } else if (
      // if clip was stopped and is now triggered
      currentState === clipStates.STOPPED && isTriggered
    ) {
      this._clipState = clipStates.TRIGGERED;
    
    }
    post("done handling state change...\n");
  };

  CS.Ableton.SelfGeneratingClip.prototype.generate_and_append = function () {
    CS.Ableton.PhraseRenderingClip.prototype.generate_and_append.apply(this, arguments);
    this._playsSinceLastGenerate = 0;
  };

  /**
   *  Called whenever clip was playing and reached the end.  This means the 
   *  clip could have been triggered again, and thus is still playing.
   **/
  CS.Ableton.SelfGeneratingClip.prototype.handle_end_reached = function () {
    // keep track of amount of plays since the last generate
    this._playsSinceLastGenerate++;

    post("clip finished...\n");

    // if the clip is stopped
    if (
      !this._isGenerating && this._clipState === this.CLIP_STATES.STOPPED
    ) {

      if (
        // and is supposed to be auto generating
        this._isAutogenerating &&
          // and is time to generate
          this._playsSinceLastGenerate >= this._playsTillAutoGenerate
      ) {
        this._generate_and_append_loop_async();
      }

      // clip is stopped, so playback has ended.
      this._playbackEndedCallback();
    }
  };

  CS.Ableton.SelfGeneratingClip.prototype.start = function () {
    // start watching clip for plays
    if (!this._isAutogenerating) {
      this._playingStatusObserver = new Task(function () {
        var isPlaying,
          isTriggered,
          clip = this._clip;

        isPlaying = clip.get("is_playing")[0] === 1;
        isTriggered = clip.get("is_triggered")[0] === 1;

        if (isPlaying !== this._isPlayingPrev || isTriggered !== this._isTriggeredPrev) {
          this._handle_clip_playingstatus_change();
          this._isPlayingPrev = isPlaying;
          this._isTriggeredPrev = isTriggered;
        }
      }, this);
      this._playingStatusObserver.interval = 200;
      this._playingStatusObserver.repeat(-1);
      this._isAutogenerating = true;
    }
  };

  CS.Ableton.SelfGeneratingClip.prototype.stop = function () {
    this._playingStatusObserver.cancel();
    this._isAutogenerating = false;
  };

}).call(this);

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
   *  @extends  CS.AbletonClip
   *
   *  @param  CSMarkovTable   pitchTable      The table to store pitch
   *  analysis
   *  @param  CSMarkovTable   durationTable   The table to store duration
   *  analysis in
   *  @param  CSMarkovTable   velocityTable   The table to store velocity
   *  analysis in.
   **/
  CS.ClipAnalyzer = function (params) {

    CS.AbletonClip.apply(this, arguments);

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

  CS.ClipAnalyzer.prototype = new CS.AbletonClip();
  
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

    notes = CS.AbletonClip.prototype.fetch_notes.apply(this, arguments);

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

/**
 *  @file       CSHelpers.js 
 *
 *              Misc functions to help with Max/MSP deficiencies, et. al.
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

var print_object = function (obj) {
  var key;

  for (key in obj) {
    post("obj[" + key + "]:\n");
    post(obj[key]);
    post("\n");   
  }
};

var error_aware_callback = function (cb) {
  return function () {
    try {
      cb.apply(this, arguments);
    } catch (err) {
      post("\n--------\nERROR:\n--------\n");
      post(err.fileName + ":" + err.lineNumber + "\n" + err.message);
    }
  };
};

/**
 *  Might return true, might return false.
 **/
var maybe = function () {
  return (Math.random() <= 0.5);
}

if (typeof exports !== "undefined" && exports !== null) {
  exports.maybe = maybe;
}
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
    Task,
    post;


  if (typeof require !== "undefined" && require !== null) {
    CS = require("./lib/CS.js").CS;
    require("./lib/CSPhraseNote.js");
    require("./lib/CSPhrase.js");
    post = console.log;
  } else {
    CS = this.CS;
    Task = this.Task;
    post = this.post;
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

            post("phrase ended\n");

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
          post("starting endOfPhraseCallback\n");
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
/**
 *  @file       CSAbletonInputAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS,
    post;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./lib/CS.js").CS;
    post = console.log;
  } else {
    CS = this.CS;
    post = this.post;
  }

  CS.Ableton.InputAnalyzer = function (params) {
    var me = this,
      clipSlots,
      trackPath,
      clipSlotId,
      clipPath,
      clipName,
      clip,
      i;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    // call super constructor
    CS.InputAnalyzer.apply(this, arguments);

    if (typeof params.liveAPIDelegate === "undefined" || params.liveAPIDelegate === null) {
      throw new Error("params.liveAPIDelegate is undefined");
    }
    this.liveAPIDelegate = params.liveAPIDelegate;
    
    /**
     *  Wether or not we should auto respond when a phrase ends.
     **/
    if (typeof params.shouldAutoRespond === "undefined" || params.shouldAutoRespond === null) {
      throw new Error("params.shouldAutoRespond is undefined");
    }
    this.shouldAutoRespond = params.shouldAutoRespond;

    /**
     *  Hook for when clip is responding to an input phrase.
     **/
    if (typeof params.auto_response_will_start_callback === "undefined" || params.auto_response_will_start_callback === null) {
      params.auto_response_will_start_callback = function () {
        
      };
    }
    this.auto_response_will_start_callback = params.auto_response_will_start_callback;

    if (typeof params.auto_response_ended_callback === "undefined" || params.auto_response_ended_callback === null) {
      params.auto_response_ended_callback = function () {
        
      };
    }
    this.auto_response_ended_callback = params.auto_response_ended_callback;

    if (typeof params.track === "undefined" || params.track === null) {
      throw new Error("params.track is undefined");
    }
    this.track = params.track;

    /**
     *  The `CS.Ableton.PhraseRenderingClip` to be populated with generated
     *  phrase when in auto generating mode.
     **/
    this.autoGenClip = null;
    
    /**
     *  The CS.Ableton.SelfGeneratingClip that will be populated with generated
     *  material from statistical analysis of the live input when the user is
     *  generating continuously on demand.
     **/
    this.genClips = [];
   
    /**
     *  Markov tables to store statistics of incoming input.
     **/
    this.pitchTable = new CS.MarkovTable({order: 3});
    this.durationTable = new CS.MarkovTable({order: 3});
    this.velocityTable = new CS.MarkovTable({order: 3});


    /**
     *  Grab clips from session that will be used to populate with 
     *  response material.
     **/
    trackPath = this.track.path.slice(1, -1);
    clipSlots = this.track.get("clip_slots");
    
    // for each clip slot
    for (i = 0; i < clipSlots.length; i += 2) {
      clipSlotId = i / 2;
      clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";

      clip = this.liveAPIDelegate.new_live_api(clipPath);
      if (clip.id !== "0") {
        clipName = clip.get("name")[0];
        
        // instantiate a `CS.Ableton.SelfGeneratingClip` instance for all
        // clips populated with a clip named like "something-manual1"
        if (clipName.match(/-manual[\d]*$/)) {
          this.genClips.push(new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: 1,
            pitchTable: this.pitchTable,
            durationTable: this.durationTable,
            velocityTable: this.velocityTable,
            clip: clip
          }));
        } else if (clipName.match(/-auto$/)) {
          this.autoGenClip = new CS.Ableton.SelfGeneratingClip({
            clip: clip,
            playsTillAutoGenerate: -1, // doesn't matter because it wont auto generate
            pitchTable: this.pitchTable,
            durationTable: this.durationTable,
            velocityTable: this.velocityTable
          });
        }
      
      }
    }

    if (this.genClips.length === 0) {
      throw new Error("No generative clips found!");
    }
  
  };

  CS.Ableton.InputAnalyzer.prototype = new CS.InputAnalyzer();

  /**
   *  Change wether or not a clip should automatically be populated and
   *  triggered for playback when a phrase has ended.
   *
   *  @param  Boolean  value    Wether or not to auto respond.
   **/
  CS.Ableton.InputAnalyzer.prototype.set_auto_response = function (value) {
    this.shouldAutoRespond = value;
  };

  CS.Ableton.InputAnalyzer.prototype.handle_phrase_ended = function (phrase) {
    var roundedPhraseDuration,
      autoGenClip = this.autoGenClip,
      me = this;

    autoGenClip._phraseGenerator.incorporate_phrase(phrase);

    roundedPhraseDuration = Math.ceil(phrase.duration);

    /**
     *  If we are in auto response mode, and a phrase just ended,
     *  initiate the auto response
     **/
    if (me.shouldAutoRespond) {
      autoGenClip.generate_and_append_async(
        // generate a response at a duration quantized from original
        // phrase duration
        roundedPhraseDuration,
        // when clip is done generating, play it
        function () {


          // and when response is done playing
          autoGenClip.set_playbackEndedCallback(function () {
            autoGenClip.set_playbackEndedCallback(null);
            autoGenClip.stop();

            me.auto_response_ended_callback();

          });
          
          me.auto_response_will_start_callback();
          
          autoGenClip.start();
          
          // but don't autogenerate
          // TODO: fix this HACK.
          autoGenClip._isAutogenerating = false;

          // play clip
          autoGenClip._clip.call("fire");
        }
      );
    }
    
  };

  CS.Ableton.InputAnalyzer.prototype.start_manual_response = function () {
    var i,
      genClips = this.genClips,
      genClip,
      duration = 4 * 4,
      final_callback = function () {
        // play first clip
        post("firing first clip");
        genClips[0]._clip.call("fire");
      },
      generate_with_callback = function (genClip, callback) {
        genClip.generate_and_append_async(duration, function () {
          genClip.start();
          callback();
        });
      },
      generate_callback = function () {
        i++;
        if (i < genClips.length) {
          generate_with_callback(genClips[i], generate_callback);
        } else {
          final_callback();
        }
      },
      generate_all_clips = function () {
        i = 0;
        generate_with_callback(genClips[i], generate_callback);
      };


    // populate all `genClips` with notes, and play the first one
    generate_all_clips();
    
  };

  CS.Ableton.InputAnalyzer.prototype.end_manual_response = function () {
    // stop all clips
    this.track.call("stop_all_clips");
  };

  CS.Ableton.InputAnalyzer.prototype.clear_training = function () {

    this.pitchTable.clear();
    this.durationTable.clear();
    this.velocityTable.clear();
    
  };

  CS.Ableton.InputAnalyzer.prototype.set_use_starting_statistics = function (value) {
    var i;

    this.autoGenClip._phraseGenerator.set_useInitial(value);
    for (i = 0; i < this.genClips.length; i++) {
      this.genClips[i]._phraseGenerator.set_useInitial(value);
    }
  }
  
  
}).call(this);
/**
 *  @file       CSMarkovPhraseGenerator.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/


(function () {
  "use strict";

  var CS, _, root = this;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovMultiStateMachine.js");
    require("./CSMarkovTable.js");
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    _ = this._;
  }

  /**
   *  @class  CS.MarkovPhraseGenerator    Uses a set of markov tables
   *  to generate phrases.
   **/
  CS.MarkovPhraseGenerator = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.order === "undefined" || params.order === null) {
      throw new Error("params.order is undefined");
    }
    this._order = params.order;


    if (typeof params.pitchTable === "undefined" || params.pitchTable === null) {
      throw new Error("params.pitchTable is undefined");
    }
    this._pitchTable = params.pitchTable;

    if (typeof params.durationTable === "undefined" || params.durationTable === null) {
      throw new Error("params.durationTable is undefined");
    }
    this._durationTable = params.durationTable;

    if (typeof params.velocityTable === "undefined" || params.velocityTable === null) {
      throw new Error("params.velocityTable is undefined");
    }
    this._velocityTable = params.velocityTable;
    
    this._stateMachine = new CS.MarkovMultiStateMachine({});
    this._stateMachine.add_table("pitch", this._pitchTable);
    this._stateMachine.add_table("duration", this._durationTable);
    this._stateMachine.add_table("velocity", this._velocityTable);

    // if we're currently generating, don't disrupt.
    this._isGenerating = false;

    if (typeof params.assumeCircular === "undefined" || params.assumeCircular === null) {
      params.assumeCircular = false;
    }
    // if we should assume the input phrases are circular (useful for loops)
    this._assumeCircular = params.assumeCircular;

    if (typeof params.useInitialNotes === "undefined" || params.useInitialNotes === null) {
      params.useInitialNotes = false;
    }
    /**
     *  Wether or not we should take into account a statistical analysis of the
     *  initial notes of each phrase when choosing the initial notes of a
     *  generated phrase.
     **/
    this._useInitial = params.useInitialNotes;
  };

  CS.MarkovPhraseGenerator.prototype = {

    set_assumeCircular: function (shouldAssumeCircular) {
      this._assumeCircular = shouldAssumeCircular;
    },

    set_useInitial: function (shouldUseInitial) {
      this._useInitial = shouldUseInitial;
    },


    /**
     *  Incorporate an input phrase into the current analysis.
     *
     *  @param  CS.Phrase  phrase   The phrase to incorporate.
     **/
    incorporate_phrase: function (phrase) {

      var phraseNotesWithRests,
        phraseNotesWithRestsData,
        order = this._order,
        phraseNotes,
        phraseNotesData,
        phrasePitches,
        phraseDurations,
        phraseVelocities,
        startStateIndex,
        endStateIndexPlusOne,
        pitchTable = this._pitchTable,
        durationTable = this._durationTable,
        velocityTable = this._velocityTable,
        i,
        wrapIndex,
        _ = root._;

      phraseNotes = phrase.get_notes();
      phraseNotesWithRests = phrase.get_notes_with_rests();

      // convert note class to key-value data of attributes
      phraseNotesWithRestsData = _.invoke(phraseNotesWithRests, "attributes");
      phraseNotesData = _.invoke(phraseNotes, "attributes");

      // and grab array of pitches and durations since we'll need those
      phrasePitches = _.pluck(phraseNotesWithRestsData, "pitch");
      phraseDurations = _.pluck(phraseNotesWithRestsData, "duration");

      // don't care about the velocity of rests because it is inherently
      // encoded in the pitches and durations of the rest notes generated,
      // therefore we don't include rests in analysis of velocity attributes.
      phraseVelocities = _.pluck(phraseNotesData, "velocity");

      // Analyze every N + 1 note sequence, where N is the order of the 
      // system.  For example, if order == 2 this will grab every
      // 3 notes to incorporate the two previous states and one future
      // state into analysis.  This will leave out notes at end of
      // phrase that will not fit into an N + 1 sequence.
      
      // first, incorporate initial N notes.
      pitchTable.add_initial_transition(
        phrasePitches.slice(0, order + 1)
      );
      
      durationTable.add_initial_transition(
        phraseDurations.slice(0, order + 1)
      );


      for (i = order + 1; i < phraseNotesWithRestsData.length; i++) {
        startStateIndex = i - order;
        endStateIndexPlusOne = i + 1;

        // extract pitch attributes
        pitchTable.add_transition(
          phrasePitches.slice(startStateIndex, endStateIndexPlusOne)
        );

        durationTable.add_transition(
          phraseDurations.slice(startStateIndex, endStateIndexPlusOne)
        );

      }

      // if we're assuming phrases are circular, additionally incorporate
      // sequences where the starting note is up to the last note in 
      // the phrase.
      if (this._assumeCircular) {
        // starting at next `startStateIndex` and going until the 
        // last note in the phrase, analyze each N + 1 note sequence just
        // as before, but now wrap around
        for (startStateIndex = i - order; startStateIndex < phraseNotesWithRestsData.length; startStateIndex++) {
         
          // endStateIndex is probably the last note in the phrase.
          endStateIndexPlusOne = Math.min(startStateIndex + order + 1, phraseNotesWithRestsData.length + 1);
          // this is the note from the beginning of the phrase that we've
          // wrapped around to in order to get our Nth order transition.
          wrapIndex = order + 1 - (endStateIndexPlusOne - startStateIndex) + 1;

          // ex:
          //    
          //    phraseNotes = [60, 62, 64, 66];
          //    order = 3;
          //    startStateIndex = 1; (pointing to 62)
          //    endStateIndexPlusOne = 3; (pointing to 66)
          //    wrapIndex = 1; (pointing to 60)
          //    
          // yields the trasition:
          //
          //    62->64->66 -> 60
          //
          // then on the next loop iteration:
          //
          //    startStateIndex = 2; (pointing to 64)
          //    endStateIndexPlusOne = 4; (pointing to nil)
          //    wrapIndex = 2; (pointing to 62)
          //
          // yields the transition:
          //
          //    64->66->60 -> 62
          //
          
          pitchTable.add_transition(
            phrasePitches
              .slice(startStateIndex, endStateIndexPlusOne)
              .concat(phrasePitches.slice(0, wrapIndex))
          );

          durationTable.add_transition(
            phraseDurations
              .slice(startStateIndex, endStateIndexPlusOne)
              .concat(phraseDurations.slice(0, wrapIndex))
          
          );

        }
      }

      // now do same as above for attributes that do not care about rests
      velocityTable.add_initial_transition(
        phraseVelocities.slice(0, order + 1)
      );
      for (i = order + 1; i < phraseNotesData.length; i++) {
        startStateIndex = i - order;
        endStateIndexPlusOne = i + 1;

        velocityTable.add_transition(
          phraseVelocities.slice(startStateIndex, endStateIndexPlusOne)
        );
      }
      if (this._assumeCircular) {
        for (startStateIndex = i - order; startStateIndex < phraseNotesData.length; startStateIndex++) {
          endStateIndexPlusOne = Math.min(startStateIndex + order + 1, phraseNotesData.length + 1);
          wrapIndex = order + 1 - (endStateIndexPlusOne - startStateIndex) + 1;

          velocityTable.add_transition(
            phraseVelocities
              .slice(startStateIndex, endStateIndexPlusOne)
              .concat(phraseVelocities.slice(0, wrapIndex))
          );
        }
      }

      /*var keys = root._.keys(pitchTable._startingStates._probabilities);
      post("Starting probabilities:\n");
      for (i = 0; i < keys.length; i++) {
        post(keys[i] + ": " + pitchTable._startingStates._probabilities[keys[i]] + "\n");
      }
      post("\n\n");*/

    },

    /**
     *  Generate a new phrase based on current statistical analysis stored
     *  in markov tables.  The `duration` attribute of the returned phrase
     *  will be equal to the `phraseDuration` variable passed in, but the
     *  last note of the phrase may not end at the exact end of the phrase.
     *
     *  @param    Number  phraseDuration  The duration of the phrase
     *  @return   CS.Phrase   The resulting phrase.
     **/
    generate_phrase: function (phraseDuration) {
      if (typeof phraseDuration === "undefined" || phraseDuration === null) {
        throw new Error("phraseDuration is undefined");
      }

      var result,
        stateMachine = this._stateMachine,
        clip = this._clip,
        // starting now
        tStart = 0,
        tEnd = tStart + phraseDuration,
        notes = [],
        initialNoteAttributes = stateMachine.start(this._useInitial),
        noteAttributes = {},
        i,
        t = tStart;

      this._isGenerating = true;

      for (i = 0; i < initialNoteAttributes.pitch.length; i++) {
        noteAttributes.pitch = initialNoteAttributes.pitch[i];
        noteAttributes.duration = initialNoteAttributes.duration[i];
        noteAttributes.velocity = initialNoteAttributes.velocity[i];
        noteAttributes.time = t;
        noteAttributes.muted = 0;

        if (noteAttributes.pitch !== -1) {
          notes.push(new CS.PhraseNote(noteAttributes));
        }
        
        t += noteAttributes.duration;
      }

      noteAttributes = stateMachine.next();


      // generate new loop of same length
      while (t + noteAttributes.duration < tEnd) {
        noteAttributes.time = t;
        noteAttributes.muted = 0;

        // if this was not a rest note
        if (noteAttributes.pitch !== -1) {
          // save it in our loop
          notes.push(new CS.PhraseNote(noteAttributes));
        }

        t += noteAttributes.duration;
        noteAttributes = stateMachine.next();
      }

      result = new CS.Phrase({
        notes: notes,
        duration: phraseDuration
      });

      return result;

    }
  };
}).call(this);

/**
 *  @file       CSMarkovStateMachine.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS, root = this, post;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    root._ = require("./vendor/underscore.js")._;
    post = console.log;
  } else {
    CS = this.CS;
    post = this.post;
  }

  CS.MarkovStateMachine = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.table === "undefined" || params.table === null) {
      throw new Error("params.table is undefined");
    }
    this._table = params.table;

    /**
     *  @type Number
     *  The order of this state machine is the same as the order of the
     *  associated table.
     **/
    this._order = this._table._order;
  
    /**
     *  @type Array
     *  Previous N states leading up to the state table is currently in.
     **/
    this._prevStates = null;

    this.clear();
  
  };
  
  CS.MarkovStateMachine.prototype = {

    clear: function () {
      this._prevStates = [];
    },
    
    /**
     *  Start markov state machine by choosing a starting state.
     *
     *  @param  Boolean  useStartingAnalysis=true  By default, this function
     *  will use the analysis it has created of initial_transitions as
     *  tracked by the `add_initial_transition` method.  Set this argument
     *  to `false` to simply choose a random starting path in the system.
     *  @return Array   List of the previous states leading up to the
     *  machine's current state.
     **/
    start: function (useStartingAnalysis) {
      var startingRowKey,
        startingRow,
        table = this._table,
        _ = root._;

      if (typeof useStartingAnalysis === "undefined" || useStartingAnalysis === null) {
        useStartingAnalysis = true;
      }

      if (useStartingAnalysis) {
        post("generating using starting analysis\n");
        startingRowKey = table._startingStates.choose_column();
        startingRow = table._rows[startingRowKey];
      } else {
        post("generating without starting analysis\n");
        // choose a random starting row in the table
        startingRow = table._rowsList[_.random(table._rowsList.length - 1)];
      }

      this._prevStates = startingRow._prevStates;
      return _.clone(this._prevStates);
    },
    
    /**
     *  Advance machine to next state, and return this state.
     *  
     *  @return   Any    The current state of the machine (could be any
     *  datatype)
     **/
    next: function () {
      var row,
        nextState,
        table = this._table;

      // if there are previous states, use them
      if (this._prevStates.length) {
        row = table._get_row_from_prev_states(this._prevStates);
      // if not, just choose a random row and set prev states
      // (this will only happen on first run)
      } else {
        throw new Error(
          "No previous states. Try calling `start` on the MarkovStateMachine first."
        );
      }

      // get new state
      nextState = row.choose_column();

      // update prevStates
      this._prevStates = this._prevStates.slice(1);
      this._prevStates.push(nextState);

      return nextState;
    }
  
  };


}).call(this);
/**
 *  @file       CSMarkovMultiStateMachine.js
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
    require("./CSMarkovStateMachine.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CSMarkovMultiStateMachine  Utilizes multiple `MarkovStateMachine`
   *  instances to generate a conglomerate state where each table generates
   *  the property that it is responsible for.
   **/
  CS.MarkovMultiStateMachine = function (params) {
    var key;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    /**
     *  @type   Object
     *  `CS.MarkovStateMachine` instances that will be used to generate
     *  state events, keyed by the event parameter that the state machine
     *  will be mapped to.
     **/
    this._machines = {};

    /**
     *  @type   Array
     *  Keys to use as state event property names.
     **/
    this._stateKeys = [];
  };

  CS.MarkovMultiStateMachine.prototype = {
    /**
     *  Creates a state machine for a given MarkovTable instance.
     *
     *  @param  String        propertyName  The name of the property on the
     *  state event that the table will be used to generate.
     *  @param  MarkovTable   propertyTable  The table used to generate the
     *  given property on the state event.
     **/
    add_table: function (propertyName, propertyTable) {
      this._stateKeys.push(propertyName);
      this._machines[propertyName] = new CS.MarkovStateMachine({
        table: propertyTable
      });
    },
   
    /**
     *  Restart each state machine.
     **/
    start: function () {
      return this._each_machine_do("start", arguments);
    },

    /**
     *  Generate and return next state from each MarkovStateMachine.
     **/
    next: function () {
      return this._each_machine_do("next");
    },

    _each_machine_do: function (methodName, args) {
      var state = {},
        stateKeys = this._stateKeys,
        machines = this._machines,
        machine,
        key,
        i;

      // for each table, generate state
      for (i = 0; i < stateKeys.length; i++) {
        key = stateKeys[i];
        machine = machines[key];

        state[key] = machine[methodName].apply(machine, args);
      }

      return state;
    }
  };
  
}).call(this);

/**
 *  @file       CSProbabilityVector.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS, root = this;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    root._ = this._;
  }


  /**
   *  @class  CS.ProbabilityVector    Encapsulates logic for a listing of
   *  probabilities associated with keys and choosing a key based on those
   *  probabilities.
   **/
  CS.ProbabilityVector = function (params) {
    
    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    // column keys
    this._columns = [];
    
    // cells in this row of the table (keyed by destination state)
    // normalized probabilities
    this._probabilities = {};

    // unnormalized occurrence data.  Each time this is changed,
    // probabilities will be re-calculated.
    this._occurrences = {};

    // maintain sum of all occurrences (sum of `this._occurrences`)
    this._totalOccurrences = 0;
    
  };

  CS.ProbabilityVector.prototype = {
    get_probability: function (destState) {
      return this._probabilities[destState];
    },
    
    set_even_probability: function () {
      var destStates = this._columns,
        destState,
        i,
        occurrences = {},
        totalOccurrences = 0;

      for (i = 0; i < destStates.length; i++) {
        destState = destStates[i];
        occurrences[destState] = 1;
        totalOccurrences += 1;
      }
      this._occurrences = occurrences;
      this._totalOccurrences = totalOccurrences;
      this._calculate_probabilities();
    },
    

    add_occurrence: function (columnKey) {

      var probs = this._probabilities,
        _ = root._;

      // if this column doesn't exist, add it
      if (_.indexOf(this._columns, columnKey) === -1) {
        this._add_column(columnKey);
      }
      
      // increase probability of this destination state
      this._occurrences[columnKey] += 1;
      this._totalOccurrences += 1;

      // calculate new probabilities
      this._calculate_probabilities();
      
    },

    /**
     *  Choose a column based on the probabilities in this row.
     **/
    choose_column: function () {
      var i,
        prob,
        probSum = 0.0,
        seed = Math.random(),
        chosenCol,
        cols = this._columns;

      for (i = 0; i < cols.length; i++) {
        prob = this.get_probability(cols[i]);

        probSum += prob;

        if (seed <= probSum) {
          chosenCol = cols[i];
          break;
        }

      }

      return chosenCol;
      
    },
    
    _calculate_probabilities: function () {
      var destState,
        destStates = this._columns,
        occs = this._occurrences,
        probs = {},
        totalOccs = this._totalOccurrences,
        i;

      for (i = 0; i < destStates.length; i++) {
        destState = destStates[i];
        probs[destState] = (occs[destState] / totalOccs);
      }
      this._probabilities = probs;
    },
    
    /**
     *  Called from table when new destination state was found.
     **/
    _add_column: function (destState) {
      this._columns.push(destState);
      this._occurrences[destState] = 0;
      this._probabilities[destState] = 0.0;
    }
  
  };
  
}).call(this);
/**
 *  @file       CSMarkovTable.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";
  
  var CS, root = this;

  if (typeof this.post === "undefined" || this.post === null) {
    this.post = console.log;
  }
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovTableRow.js");
    require("./CSHelpers.js");
    require("./CSProbabilityVector.js");
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
  }


  /**
   *  @class  CSMarkovTable   A Markov table and state machine implementation.
   **/
  CS.MarkovTable = function (params) {
    var order;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.order === "undefined" || params.order === null) {
      throw new Error("params.order is undefined");
    }
    this._order = order = params.order;

    /**
     *  @type Object
     *  Rows of table keyed by chained previous states, used when finding
     *  a destination state based on previous states.
     **/
    this._rows = null;

    /**
     *  @type Array
     *  Rows of table in a list used when iterating over all rows
     **/
    this._rowsList = null;

    /**
     *  @type Array
     *  Destination states (the table's column keys)
     **/
    this._destStates = null;

    /**
     *  Basically a `MarkovTableRow` that keeps track of which rows of this
     *  table have a higher probability of being starting rows.
     **/
    this._startingStates = null;

    // this will initialize above properties to their appropriate initial
    // values.
    this.clear();
  };

  CS.MarkovTable.prototype = {
    /**
     *  Clear all probabilities and analysis.  Should be called
     *  initially and whenever analysis is to be cleared out.
     **/
    clear: function () {
      this._rows = {};
      this._rowsList = [];
      this._destStates = [];
      this._startingStates = new CS.ProbabilityVector({});
    },
    add_transition: function (transitionData) {
      var row, i;

      // get proper row in table
      row = this._get_or_create_row_from_transition(transitionData);

      // ensure all rows have any new possible destination states
      for (i = 0; i < transitionData.length; i++) {
        this._add_column(transitionData[i]);
      }

      // add transition to it
      row.add_transition(transitionData);
    },

    /**
     *  The `CSMarkovTable` instance has the ability to track the
     *  statistics of initial states of the system to use for
     *  choosing the initial state of a generated traversal through
     *  the states.
     **/
    add_initial_transition: function (transitionData) {
      // the probability of using these initial states will be higher.
      
      var key = this._generate_row_key_from_transition(transitionData);

      this._startingStates.add_occurrence(key);

      this.add_transition(transitionData);
    
    },

    /**
     *  Given the transition data, generate key used to find applicable
     *  row in table.  The first N - 1 elements in the `transitionData`
     *  array are the previous states (in order), and the Nth element
     *  is the destination state.  For example, in a second-order 
     *  chain, the transitionData array that looks like this:
     *
     *    [61, 63, 65]
     *
     *  means 61 -> 63 determine the row in the table and 65 determines
     *  the column.  They key for this example would be the following
     *  string:
     *
     *    "61->63"
     *
     *  @param  Array  transitionData   The transition information.
     **/
    _generate_row_key_from_transition: function (transitionData) {
      // key only depends on prev states
      return this._generate_row_key_from_prev_states(
        transitionData.slice(0, -1)
      );
    },
    _generate_row_key_from_prev_states: function (prevStates) {
      // concatenate all prev states with "->"
      return prevStates.join("->");
    },
    _get_row_from_prev_states: function (prevStates) {
      var key = this._generate_row_key_from_prev_states(prevStates),
        row = this._rows[key];

      // if row has not yet been created
      if (typeof row === "undefined" || row === null) {
        row = new CS.MarkovTableRow({
          order: this._order,
          table: this,
          prevStates: prevStates
        });
        this._rows[key] = row;
        this._rowsList.push(row);
        row.set_even_probability();
      }

      return row;
    },
    _get_or_create_row_from_transition: function (transitionData) {

      var key = this._generate_row_key_from_transition(transitionData),
        rows = this._rows,
        row = rows[key];

      // create row if it doesn't exist
      if (typeof row === "undefined" || row === null) {
        row = new CS.MarkovTableRow({
          order: this._order,
          table: this,
          prevStates: transitionData.slice(0, -1)
        });
        this._rowsList.push(row);
        rows[key] = row;
      }

      return row;
    },
    /**
     *  Called from row when a new destination state is found.
     **/
    _add_column: function (destState) {
      var i,
        rows = this._rowsList,
        destStates = this._destStates;

      // if this destination state has not been seen
      if (destStates.indexOf(destState) < 0) {
        // add to list of destination states
        destStates.push(destState);

        // inform all existing rows that there is a new destination state
        for (i = 0; i < rows.length; i++) {
          rows[i]._add_column(destState);
        }
      }
    },
    /**
     *  Print table to Max window for debugging.
     **/
    print: function () {
      var i, key, row, prob,
        columnSpacer = "\t\t\t\t\t\t",
        post = root.post;

      post("\n--------\nCSMarkovTable Contents:\n--------\n");
      // column headers
      post("\t\t\t\t\t\t\t\t\t\t\t\t\t" + columnSpacer);
      for (i = 0; i < this._destStates.length; i++) {
        post(this._destStates[i] + columnSpacer + "\t\t\t\t\t");
      }
      post("\n");

      // rows
      for (key in this._rows) {
        post(key);

        row = this._rows[key];

        for (i = 0; i < this._destStates.length; i++) {
          prob = row._probabilities[this._destStates[i]];
          post(columnSpacer + prob.toFixed(2) + "\t\t");
        }

        post("\n");
      }

      post("\n--------\n");
    }
  };

}).call(this);


/**
 *  @file       CSMarkovTableRow.js
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
    require("./CSProbabilityVector.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CSMarkovTableRow  Represents a single row within a markov table.
   *  
   *  @param  CSMarkovTable  params.table  The table which this row belongs to.
   **/
  CS.MarkovTableRow = function (params) {

    var table,
      i,
      destState;

    CS.ProbabilityVector.apply(this, arguments);

    if (typeof params.table === "undefined" || params.table === null) {
      throw new Error("params.table is undefined");
    }
    this._table = table = params.table;

    if (typeof params.prevStates === "undefined" || params.prevStates === null) {
      throw new Error("params.prevStates is undefined");
    }
    // the array of previous states that are used as the key to this row in the
    // table.
    this._prevStates = params.prevStates;

    // initialize with table's current destination states.  Table will
    // inform us when there are more discovered.
    for (i = 0; i < table._destStates.length; i++) {
      destState = table._destStates[i];
      this._add_column(destState);
    }

  };

  CS.MarkovTableRow.prototype = new CS.ProbabilityVector({});

  CS.MarkovTableRow.prototype.add_transition = function (transitionData) {
    var destState = transitionData[transitionData.length - 1];

    this.add_occurrence(destState);

  };
  
}).call(this);

/**
 *  @file       CSPhrase.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

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

    if (typeof params.duration === "undefined" || params.duration === null) {
      // determine duration of phrase based on notes.
      this.duration = 0;
      if (this._notes.length) {

        // duration of phrase is end time of last note
        lastNote = this._notes[this._notes.length - 1];

        this.duration = lastNote.get("time") + lastNote.get("duration");
        post("this.duration:\n");
        post(this.duration);
        post("\n");
      }
    } else {
      // assume user of API knows duration of phrase
      this.duration = params.duration;
    }



  };

  CS.Phrase.prototype = {

    /**
     *  Returns a list of notes in the phrase.
     **/
    get_notes: function () {
      return root._.clone(this._notes);
    },

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

/**
 *  @file       CSPhraseNote.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";
  
  var _, CS, PhraseNote, root = this;

  if (typeof require !== "undefined" && require !== null) {
    root._ = require("./vendor/underscore.js")._;
    CS = require("./CS.js").CS;
  } else {
    CS = this.CS;
  }
 
  /**
   *  @class    CS.PhraseNote   Simple encapsulation around properties of
   *  the note such as velocity, pitch, etc.
   **/
  CS.PhraseNote = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }
    this._attributes = root._.clone(params);
  };

  CS.PhraseNote.prototype = {

    get: function (attrName) {
      return this._attributes[attrName];
    },

    set: function (attrNameOrAttrsToSet, attrValueOrNull) {
      var attrName,
        attrValue,
        attrsToSet,
        onTime,
        offTime,
        _ = root._;

      if (typeof attrNameOrAttrsToSet === "object") {
        attrsToSet = attrNameOrAttrsToSet;
      } else if (typeof attrNameOrAttrsToSet === "string") {
        attrsToSet = {};
        attrsToSet[attrNameOrAttrsToSet] = attrValueOrNull;
      }

      /*// if we're changing timestamps
      if (_.has(attrsToSet, "onTime") || _.has(attrsToSet, "offTime")) {
        onTime = attrsToSet.onTime || this.get("onTime");
        offTime = attrsToSet.offTime || this.get("offTime");

        // and we have both timestamps, recalculate duration
        if (
          typeof offTime !== "undefined" && offTime !== null
            && typeof onTime !== "undefined" && onTime !== null
        ) {
          attrsToSet.duration = (offTime - onTime);
        }
      }*/
      
      _.extend(this._attributes, attrsToSet);
    },

    attributes: function () {
      return root._.clone(this._attributes);
    }

  };
  
}).call(this);

