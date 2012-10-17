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

  if (typeof params.autoGenAfterPlays === "undefined" || params.autoGenAfterPlays === null) {
    throw new Error("params.autoGenAfterPlays is undefined");
  }
  // amount of playbacks after which the clip will re-generate.
  this._autoGenAfterPlays = params.autoGenAfterPlays;

  this._stateMachine = new CSMarkovStateMachine();
  this._stateMachine.add_table("pitch", this.pitchTable);
  this._stateMachine.add_table("duration", this.durationTable);

  if (typeof params.clip === "undefined" || params.clip === null) {
    throw new Error("params.clip is undefined");
  }
  this._clip = params.clip;

  // amount of playbacks since last generate
  this._i = 0;

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
  
  // start watching clip for plays
  post("observing...\n");
  api = new LiveAPI((function (selfGenClip) {
    return error_aware_callback(function () {
      var isPlaying = this.get("is_playing") == 1,
        isTriggered = this.get("is_triggered") == 1,
        justFinished = (!isPlaying && !isTriggered);

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

      post("\n\n");

    });
  }(this)), this._clip.path.slice(1, -1));
  // causes above callback method to be run whenever
  // playing status changes.
  api.property = "playing_status";

  loopJumpWatcher = new LiveAPI((function (selfGenClip) {
    return error_aware_callback(function () {
      var isPlaying = this.get("is_playing") == 1;

      if (isPlaying) {
        post("looped\n");
        selfGenClip.handle_clip_state_change(selfGenClip.CLIP_STATES.PLAYING);
      }
    });
  }(this)), this._clip.path.slice(1, -1));
  // causes above callback to be run whenever "loop_jump" is triggered
  loopJumpWatcher.property = "loop_jump";
};

SelfGeneratingClip.prototype = {
  CLIP_STATES: {
    PLAYING: 0,
    TRIGGERED: 1,
    STOPPED: 2
  },

  _generate: function () {
    var api;

    api = new LiveAPI((function (stateMachine) {
      return function () {
        // starting at beginning of loop, generate a clip until we've reached the end
        var t = this.get("loop_start")[0],
          tEnd = this.get("loop_end")[0],
          events = [],
          event = stateMachine.next(),
          i;

        post("clip generating\n");
        while (t + event.duration < tEnd) {
          event.time = t;
          event.velocity = 100;
          event.muted = 0;

          // if this was not a rest note
          if (event.pitch !== -1) {
            events.push(event);
          }
          t += event.duration;
          event = stateMachine.next();
        }


        this.call("select_all_notes");
        this.call("replace_selected_notes");
        this.call("notes", events.length);
        for (i = 0; i < events.length; i++) {
          event = events[i];
          this.call([
            "note",
            event.pitch,
            event.time.toFixed(12),
            event.duration.toFixed(12),
            event.velocity,
            event.muted
          ]);
        }
        this.call("done");
        
      };
      
    }(this._stateMachine)), this._clip.path.slice(1, -1));
    
  },

  handle_clip_state_change: function (newState) {
    var prevState = this._clipState,
      generateTask = new Task(function () {
        this._generate();
      }, this);

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
      this._i++;

      // if we're supposed to re-generate
      if (this._i >= this._autoGenAfterPlays) {

        /*this._shouldGenerate = true;*/
        generateTask.schedule();


        this._i = 0;
      }

    }

    this._clipState = newState;
  },

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

  if (typeof params.ctx === "undefined" || params.ctx === null) {
    throw new Error("params.ctx is undefined");
  }
  this.ctx = params.ctx;

  // CSMarkovTables to hold analysis of this track

  // second-order markov analysis for pitch
  this.pitchTable = new CSMarkovTable({order: 2});
  // second-order markov analysis for duration
  this.durationTable = new CSMarkovTable({order: 2});


};

TrackAnalyzer.prototype = {

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
      analyzeClipSlotIds = [],
      genClipSlotIds = [],
      ctx = this.ctx,
      currentPath = ctx.path.slice(1, -1),
      api,
      genClip,
      clipId;

    create_analyze_clip_callback = function (clipSlotId) {
      return error_aware_callback(function (clip) {

        var clipAnalyzer,
          clipName;

        // if clip is present
        if (this.id !== "0") {

          clipName = this.get("name")[0];

          // if clip is a gen clip it ends with "-gen"
          if (clipName.match(/-gen$/)) {
            genClipSlotIds.push(clipSlotId);
          } else {

            // this is a clip to analyze
            analyzeClipSlotIds.push(clipSlotId);
            
            clipAnalyzer = new ClipAnalyzer({
              pitchTable: pitchTable,
              durationTable: durationTable
            });

            clipAnalyzer.analyze(this);
          
          }
        
        }
      });
    };

    clipSlots = ctx.get("clip_slots");

    // for each clip slot
    // clip slot array is ["id", "123", "id", "124"], so skip all the "id" elements.
    for (i = 0; i < (clipSlots.length); i += 2) {
      clipSlotId = i / 2;
      clipId = clipSlots[i];
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
              autoGenAfterPlays: autoGenAfterPlays
            });

            genClip.start();
          }), path);
        }
      }
    }
  }
};

var analyze_track_callback,
  autoGenAfterPlays;


analyze_track_callback = error_aware_callback(function () {

  post("analyzing track '" + this.get("name") + "'\n");

  var trackAnalyzer = new TrackAnalyzer({
    ctx: this
  });

  trackAnalyzer.analyze();

});


this.analyze_track = function () {

  //analyze_track(13);
  var api;

  api = new LiveAPI(analyze_track_callback, "this_device canonical_parent");

  if (!api) {
    post("no api object!\n");
    return;
  }
};

this.set_autogen_plays = function (x) {
  autoGenAfterPlays = x;
};

