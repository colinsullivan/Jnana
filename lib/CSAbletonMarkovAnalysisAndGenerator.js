/*global LiveAPI, post, CSMarkovTable, ClipAnalyzer, TrackAnalyzer, CSMarkovStateMachine, error_aware_callback, Task */


/**
 *  Continuously generate clip based on MarkovTables.
 **/
function SelfGeneratingClip(params) {
  var api,
    loopJumpWatcher;

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
  
  // start watching clip for plays
  post("observing...\n");
  api = new LiveAPI((function (selfGenClip) {
    return error_aware_callback(function () {
      var currentState = selfGenClip._clipState,
        clipStates = selfGenClip.CLIP_STATES,
        isPlaying = this.get("is_playing")[0] === 1,
        isTriggered = this.get("is_triggered")[0] === 1;

      post("handling state change...\n");
      if (
        // if clip was playing and is now stopped
        currentState === clipStates.PLAYING && !isPlaying
      ) {

        selfGenClip._clipState = selfGenClip.CLIP_STATES.STOPPED;
        selfGenClip.handle_end_reached();

      } else if (
        // if clip was just playing and is now triggered
        currentState === clipStates.PLAYING && isTriggered
      ) {
        selfGenClip._clipState = clipStates.TRIGGERED;
      } else if (
        // if clip was triggered and is now playing
        currentState === clipStates.TRIGGERED && isPlaying
      ) {
        selfGenClip._clipState = clipStates.PLAYING;
      } else if (
        // if clip was triggered while already triggered
        currentState === clipStates.TRIGGERED && isTriggered
      ) {
        selfGenClip._clipState = clipStates.TRIGGERED;
        selfGenClip.handle_end_reached();
      } else if (
        // if clip was stopped or triggered and is now playing
        (currentState === clipStates.STOPPED || currentState === clipStates.TRIGGERED) && isPlaying
      ) {
        selfGenClip._clipState = clipStates.PLAYING;
      } else if (
        // if clip was stopped and is now triggered
        currentState === clipStates.STOPPED && isTriggered
      ) {
        selfGenClip._clipState = clipStates.TRIGGERED;
      
      }
      post("done handling state change...\n");

/*
      if (isPlaying) {
        post("isPlaying");
        selfGenClip.handle_clip_state_change(selfGenClip.CLIP_STATES.PLAYING);
      } else if (isTriggered) {
        post("isTriggered");
        selfGenClip.handle_clip_state_change(selfGenClip.CLIP_STATES.TRIGGERED);
      } else if (justFinished) {
        post("justFinished");
        selfGenClip.handle_clip_state_change(selfGenClip.CLIP_STATES.STOPPED);
      }

      post("\n\n");*/

    });
  }(this)), this._clip.path.slice(1, -1));
  // causes above callback method to be run whenever
  // playing status changes.
  api.property = "playing_status";

  /*loopJumpWatcher = new LiveAPI((function (selfGenClip) {
    return error_aware_callback(function () {
      var isPlaying = this.get("is_playing") == 1;

      if (isPlaying) {
        selfGenClip.handle_clip_looped();
        //post("looped\n");
        //selfGenClip.handle_clip_state_change(selfGenClip.CLIP_STATES.PLAYING);
      }
    });
  }(this)), this._clip.path.slice(1, -1));
  // causes above callback to be run whenever "loop_jump" is triggered
  loopJumpWatcher.property = "loop_jump";*/
}

SelfGeneratingClip.prototype = {
  CLIP_STATES: {
    PLAYING: 0,
    TRIGGERED: 1,
    STOPPED: 2
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

    generateTask.schedule(50);
  },

  /*handle_clip_state_change: function (newState) {
    var prevState = this._clipState,
      

    if (this._isGenerating) {
      return;
    }

    // if clip has just finished playing
    if (
      // playing -> stopped
      (prevState === this.CLIP_STATES.PLAYING &&
        newState === this.CLIP_STATES.STOPPED)
        ||
        // playing -> triggered
        (prevState === this.CLIP_STATES.PLAYING &&
          newState === this.CLIP_STATES.TRIGGERED)
        ||
        // triggered -> triggered
        (prevState === this.CLIP_STATES.TRIGGERED &&
        newState === this.CLIP_STATES.TRIGGERED)
        ||
        // playing -> playing (looped)
        (prevState === this.CLIP_STATES.PLAYING &&
        newState === this.CLIP_STATES.PLAYING)
    ) {
      // keep track of amount of plays
      this._playsSinceLastGenerate++;

      // if clip is stopped, chance to re-generate
      if (newState === this.CLIP_STATES.STOPPED) {
        // if we're supposed to re-generate
        if (this._playsSinceLastGenerate >= this._playsTillAutoGenerate) {

          [>this._shouldGenerate = true;<]

          // generate asynchronously
          generateTask.schedule();
        }
      }
    }

    this._clipState = newState;
  },*/

  /**
   *  Start generating clip after every N playbacks.
   **/
  start: function () {
    /*this._generate_checker.repeat(-1);*/
  },
  stop: function () {
    /*this._generate_checker.cancel();*/
  },

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
  this._analyzeClipSlotIds = [];
  // clip slots used for generative clips
  this._genClipSlotIds = [];
};

TrackAnalyzer.prototype = {
  analyze_clip: function (clipSlotId, clip) {
    var analyzeClipSlotIds = this._analyzeClipSlotIds,
      genClipSlotIds = this._genClipSlotIds,
      clipAnalyzer,
      clipName;
    
    // if clip is present in clip slot
    if (clip.id !== "0") {

      clipName = clip.get("name")[0];

      // if clip is a gen clip it ends with "-gen"
      if (clipName.match(/-gen$/)) {
        genClipSlotIds.push(clipSlotId);
      } else {

        // clip is a clip to analyze
        analyzeClipSlotIds.push(clipSlotId);
        
        clipAnalyzer = new ClipAnalyzer({
          pitchTable: this.pitchTable,
          durationTable: this.durationTable
        });

        clipAnalyzer.analyze(clip);
      
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
      api = new LiveAPI(
        create_analyze_clip_callback(clipSlotId),
        path
      );
    }

    if (analyzeClipSlotIds.length === 0) {
      post("No clips found to analyze!");
    } else {
      post("pitch analysis:");
      pitchTable.print();

      post("duration analysis:");
      durationTable.print();

      post("analyzeClipSlotIds:\n");
      post(analyzeClipSlotIds);
      post("\n");

      if (genClipSlotIds.length === 0) {
        post("No '*-gen' clip slots found to generate into!");
      } else {
        post("genClipSlotIds:\n");
        post(genClipSlotIds);
        post("\n");

        // for each generate slot
        for (i = 0; i < genClipSlotIds.length; i++) {
          path = currentPath + " clip_slots " + genClipSlotIds[i] + " clip";

          // retrieve clip
          api = new LiveAPI(error_aware_callback(function () {
            // create self-generating clip object
            genClip = new SelfGeneratingClip({
              pitchTable: pitchTable,
              durationTable: durationTable,
              clip: this,
              playsTillAutoGenerate: playsTillAutoGenerate
            });

            genClip.start();
          }), path);
        }
      }
    }
  }
};

var playsTillAutoGenerate;


this.analyze_track = function () {

  //analyze_track(13);
  var track,
    trackAnalyzer;

  track = new LiveAPI("this_device canonical_parent");

  post("analyzing track '" + track.get("name") + "'\n");

  trackAnalyzer = new TrackAnalyzer({
    track: track
  });

  trackAnalyzer.analyze();

  if (!track) {
    post("no track object!\n");
    return;
  }
};

this.set_autogen_plays = function (x) {
  playsTillAutoGenerate = x;
};

