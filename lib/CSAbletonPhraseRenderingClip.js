(function () {
  "use strict";

  var CS;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
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
    var clip, notes, i, note;

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


    
    /**
     *  If we're in the process of generating a new clip
     **/
    this._isGenerating = false;
    
  };

  CS.Ableton.PhraseRenderingClip.prototype = {

    add_new_phrase: function (phrase, tStart) {

      var notes,
        clip = this._clip,
        i,
        tEnd = tStart + phrase.duration,
        note,
        loopingOn = clip.get("looping")[0];

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
      // move clip end and clip start to boundaries of newly generated clip.
      clip.set("looping", 0);
      clip.set("loop_end", tEnd.toFixed(12));
      clip.set("looping", 1);
      clip.set("loop_end", tEnd.toFixed(12));
      
      // move loop start and loop end to boundaries of newly generated clip
      clip.set("looping", 0);
      clip.set("loop_start", tStart.toFixed(12));
      clip.set("looping", 1);
      clip.set("loop_start", tStart.toFixed(12));

      clip.set("looping", loopingOn);

      post("done moving loop markers...\n");
      
    },

    generate_and_add: function (tStart, duration, callback) {
      var generatedPhrase;

      if (typeof callback === "undefined" || callback === null) {
        callback = function () {
          
        };
      }

      this._isGenerating = true;

      generatedPhrase = this._phraseGenerator.generate_phrase(duration);
      this.add_new_phrase(generatedPhrase, tStart);
      
      this._isGenerating = false;

      callback();
    },

    generate_and_add_async: function (tStart, duration, callback) {
      var genTask = new Task(function (args) {
        this.generate_and_add(args[0], args[1], args[2]);
      }, this, [tStart, duration, callback]);
      genTask.schedule();
    },

    _generate_new_loop: function () {
      // starting at end of current loop
      var clip = this._clip,
        tStart = clip.get("loop_end")[0],
        // for duration of loop
        loopLength = clip.get("length")[0];

      this.generate_and_add(tStart, loopLength);

    },
    _generate_loop_async: function () {
      var generateTask = new Task(function () {
        this._generate_new_loop();
      }, this);

      generateTask.schedule();
    },

  
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
    this._playingStatusObserver.interval = 150;

    // if we're currently observing and auto-generating
    this._isAutogenerating = false;
  };

  CS.Ableton.SelfGeneratingClip.prototype = new CS.Ableton.PhraseRenderingClip();

  CS.Ableton.SelfGeneratingClip.prototype.CLIP_STATES = {
    PLAYING: 0,
    TRIGGERED: 1,
    STOPPED: 2
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

  CS.Ableton.SelfGeneratingClip.prototype._generate_new_loop = function () {
    CS.Ableton.PhraseRenderingClip.prototype._generate_new_loop.apply(this, arguments);
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
      this._generate_loop_async();
    }
  };

  CS.Ableton.SelfGeneratingClip.prototype.start = function () {
    // start watching clip for plays
    if (!this._isAutogenerating) {
      this._playingStatusObserver.repeat(-1);
      this._isAutogenerating = true;
    }
  };
  CS.Ableton.SelfGeneratingClip.prototype.stop = function () {
    this._playingStatusObserver.cancel();
    this._isAutogenerating = false;
  };

}).call(this);


