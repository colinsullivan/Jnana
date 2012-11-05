/**
 *  @file       CSAbletonPhraseRenderingClip.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the MIT license.
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
    
    this._phraseGenerator = new CS.MarkovPhraseGenerator({
      order: 2,
      pitchTable: params.pitchTable,
      durationTable: params.durationTable
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
        clip.set("looping", 0);
        clip.set("loop_end", tEnd.toFixed(12));
        clip.set("looping", 1);
        clip.set("loop_end", tEnd.toFixed(12));
      }
     
      if (moveStartMarker) {
        // move loop start and loop end to boundaries of newly generated clip
        clip.set("looping", 0);
        clip.set("loop_start", tStart.toFixed(12));
        clip.set("looping", 1);
        clip.set("loop_start", tStart.toFixed(12));
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
      insertParams.tStart = this._currentEndTime;

      post("insertParams.tStart:\n");
      post(insertParams.tStart);
      post("\n");

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
      this.generate_and_append(this._originalLoopLength);
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

    // if the clip is stopped and not actively generating, safe to re-generate
    if (
      !this._isGenerating && this._clipState === this.CLIP_STATES.STOPPED
        &&
        this._playsSinceLastGenerate >= this._playsTillAutoGenerate
    ) {
      this._generate_and_append_loop_async();
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

