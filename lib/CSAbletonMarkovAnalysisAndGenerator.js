/*jslint sloppy: true */
/*global LiveAPI, post, CSMarkovTable, ClipAnalyzer, TrackAnalyzer, CSMarkovStateMachine, error_aware_callback, Task, outlet */


/**
 *  Continuously generate clip based on MarkovTables.
 **/
function SelfGeneratingClip(params) {
  var api,
    loopJumpWatcher,
    playingStatusObserver,
    me = this;

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

  if (typeof params.playsTillAutoGenerate === "undefined" || params.playsTillAutoGenerate === null) {
    throw new Error("params.playsTillAutoGenerate is undefined");
  }
  // amount of playbacks after which the clip will re-generate.
  this._playsTillAutoGenerate = params.playsTillAutoGenerate;

  this._stateMachine = new CSMarkovStateMachine();
  this._stateMachine.add_table("pitch", this.pitchTable);
  this._stateMachine.add_table("duration", this.durationTable);

  if (typeof params.clip === "undefined" || params.clip === null) {
    throw new Error("params.clip is undefined");
  }
  this._clip = params.clip;

  // amount of playbacks since last generate
  this._playsSinceLastGenerate = 0;

  this._clipState = this.CLIP_STATES.STOPPED;

  /**
   *  If we're in the process of generating a new clip
   **/
  this._isGenerating = false;

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
}

SelfGeneratingClip.prototype = {
  CLIP_STATES: {
    PLAYING: 0,
    TRIGGERED: 1,
    STOPPED: 2
  },

  _handle_clip_playingstatus_change: function () {
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
  },

  _generate: function () {

    // starting at the end of the loop, generate a new loop
    var stateMachine = this._stateMachine,
      clip = this._clip,
      // starting at end of loop
      tStart = clip.get("loop_end")[0],
      // for duration of loop
      loopLength = clip.get("length")[0],
      tEnd = tStart + loopLength,
      notes = [],
      note = stateMachine.next(),
      i,
      t = tStart;

    this._isGenerating = true;

    post("generating...\n");

    // generate new loop of same length
    while (t + note.duration < tEnd) {
      note.time = t;
      note.velocity = 100;
      note.muted = 0;

      // if this was not a rest note
      if (note.pitch !== -1) {
        // save it in our loop
        notes.push(note);
      }

      t += note.duration;
      note = stateMachine.next();
    }
    post("done generating...\n");

    post("replacing...\n");

    // store new loop in clip
    clip.call("deselect_all_notes");
    clip.call("replace_selected_notes");
    clip.call("notes", notes.length);
    for (i = 0; i < notes.length; i++) {
      note = notes[i];
      clip.call([
        "note",
        note.pitch,
        note.time.toFixed(12),
        note.duration.toFixed(12),
        note.velocity,
        note.muted
      ]);
    }
    clip.call("done");
    post("done replacing...\n");

    post("moving loop markers...\n");
    // move clip end and loop end to end of newly generated clip
    clip.set("looping", 0);
    clip.set("loop_end", tEnd.toFixed(12));
    clip.set("looping", 1);
    clip.set("loop_end", tEnd.toFixed(12));

    // move clip start and loop start to start of newly generated clip
    clip.set("looping", 0);
    clip.set("loop_start", tStart.toFixed(12));
    clip.set("looping", 1);
    clip.set("loop_start", tStart.toFixed(12));
    post("done moving loop markers...\n");
    

    this._playsSinceLastGenerate = 0;
    this._isGenerating = false;
    
  },

  /**
   *  Called whenever clip was playing and reached the end.  This means the 
   *  clip could have been triggered again, and thus is still playing.
   **/
  handle_end_reached: function () {
    // keep track of amount of plays since the last generate
    this._playsSinceLastGenerate++;

    post("clip finished...\n");

    // if the clip is stopped and not actively generating, safe to re-generate
    if (
      !this._isGenerating && this._clipState === this.CLIP_STATES.STOPPED
        &&
        this._playsSinceLastGenerate >= this._playsTillAutoGenerate
    ) {
      this._generate_async();
    }
  },

  _generate_async: function () {
    var generateTask = new Task(function () {
      this._generate();
    }, this);

    generateTask.schedule();
  },

  start: function () {
    // start watching clip for plays
    if (!this._isAutogenerating) {
      this._playingStatusObserver.repeat(-1);
      this._isAutogenerating = true;
    }
  },
  stop: function () {
    this._playingStatusObserver.cancel();
    this._isAutogenerating = false;
  }
};

function TrackAnalyzer(params) {
  if (typeof params === "undefined" || params === null) {
    params = {};
  }

  if (typeof params.track === "undefined" || params.track === null) {
    throw new Error("params.track is undefined");
  }
  this.track = params.track;

  // CSMarkovTables to hold analysis of this track

  // second-order markov analysis for pitch
  this.pitchTable = new CSMarkovTable({order: 2});
  // second-order markov analysis for duration
  this.durationTable = new CSMarkovTable({order: 2});


  // clip slots used to store analyze clips
  //this._analyzeClipSlotIds = [];
  // clip slots used for generative clips
  //this._genClipSlotIds = [];

  //this._analysisClips = [];
  this._generativeClips = [];
  this._clipAnalyzers = [];
  this._clipGenerators = [];
};

TrackAnalyzer.prototype = {
  analyze_clip: function (clip, clipSlotId) {
    var analyzeClipSlotIds = this._analyzeClipSlotIds,
      //genClipSlotIds = this._genClipSlotIds,
      //analysisClips = this._analysisClips,
      generativeClips = this._generativeClips,
      clipAnalyzers = this._clipAnalyzers,
      clipAnalyzer,
      clipName;
    
    // if clip is present in clip slot
    if (clip.id !== "0") {

      clipName = clip.get("name")[0];

      post("analyzing '" + clipName + "'...\n");

      // if clip is a gen clip it ends with "-gen"
      if (clipName.match(/-gen$/)) {
        //genClipSlotIds.push(clipSlotId);
        generativeClips.push(clip);
      } else {

        // clip is a clip to analyze
        //analyzeClipSlotIds.push(clipSlotId);
        
        clipAnalyzer = new CS.ClipAnalyzer({
          pitchTable: this.pitchTable,
          durationTable: this.durationTable
        });

        clipAnalyzer.analyze(clip);

        clipAnalyzers.push(clipAnalyzer);
      
      }
    
    }
  },

  analyze: function (analysisCompleteCallback) {
    var clipSlots,
      clipSlotId,
      i,
      clip,
      path,
      pitchTable = this.pitchTable,
      durationTable = this.durationTable,
      //analyzeClipSlotIds = this._analyzeClipSlotIds,
      //genClipSlotIds = this._genClipSlotIds,
      generativeClips = this._generativeClips,
      clipAnalyzers = this._clipAnalyzers,
      clipGenerators = this._clipGenerators,
      // callback for analyzing clips in this track
      create_analyze_clip_callback,
      track = this.track,
      currentPath = track.path.slice(1, -1),
      api,
      genClip,
      clipId;

    clipSlots = track.get("clip_slots");

    // for each clip slot
    // clip slot array is ["id", "123", "id", "124"], so skip every 2nd element
    for (i = 0; i < (clipSlots.length); i += 2) {
      clipSlotId = i / 2;
      
      path = currentPath + " clip_slots " + clipSlotId + " clip";

      // analyze clip
      clip = new LiveAPI(path);
      this.analyze_clip(clip, clipSlotId);
    }

    if (clipAnalyzers.length === 0) {
      post("No clips found to analyze!");
    } else {
      post("pitch analysis:");
      pitchTable.print();

      post("duration analysis:");
      durationTable.print();

      if (generativeClips.length === 0) {
        post("No '*-gen' clips found to generate into!");
      } else {

        // for each generative clip
        for (i = 0; i < generativeClips.length; i++) {
          // create self-generating clip object
          genClip = new SelfGeneratingClip({
            pitchTable: pitchTable,
            durationTable: durationTable,
            clip: generativeClips[i],
            playsTillAutoGenerate: playsTillAutoGenerate
          });
          clipGenerators.push(genClip);
        }
      }
    }

    return clipAnalyzers.length;
  },

  enable_autogen: function () {
    var i,
      clipGenerators = this._clipGenerators;

    for (i = 0; i < clipGenerators.length; i++) {
      clipGenerators[i].start();
    }

    return i;
  },

  disable_autogen: function () {
    var i,
      clipGenerators = this._clipGenerators;

    for (i = 0; i < clipGenerators.length; i++) {
      clipGenerators[i].stop();
    }

    return i;
  }
};

var playsTillAutoGenerate;

function status_message(msg) {
  outlet(0, ["set", msg]);
}


this.analyze_track = function () {

  //analyze_track(13);
  var track,
    trackAnalyzer,
    me = this,
    numClipsAnalyzed;


  track = new LiveAPI(error_aware_callback(function () {
    post("analyzing track '" + this.get("name") + "'\n");
    
    trackAnalyzer = new TrackAnalyzer({
      track: this
    });

    numClipsAnalyzed = trackAnalyzer.analyze();

    status_message(numClipsAnalyzed + " clips were analyzed.");

    me.trackAnalyzer = trackAnalyzer;
    
  }), "this_device canonical_parent");

  if (!track) {
    post("no track object!\n");
    return;
  }



};

this.set_autogen_plays = function (x) {
  playsTillAutoGenerate = x;
};

this.set_autogen = function (autoGenOn) {

  var numAutoGenClips;

  if (typeof this.trackAnalyzer === "undefined" || this.trackAnalyzer === null) {
    status_message("No clips have been analyzed!");
    return;
  }

  if (autoGenOn) {
    // make sure clips know they should auto-generate
    numAutoGenClips = this.trackAnalyzer.enable_autogen();
    status_message(numAutoGenClips + " clips being observed.");

  } else {
    numAutoGenClips = this.trackAnalyzer.disable_autogen();
    status_message(numAutoGenClips + " clips no longer being observed.");
  }
  
};

