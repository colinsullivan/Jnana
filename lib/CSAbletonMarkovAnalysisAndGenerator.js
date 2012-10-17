/*global LiveAPI, post, CSMarkovTable, ClipAnalyzer, TrackAnalyzer, CSMarkovStateMachine, error_aware_callback */


/**
 *  Continuously generate clip based on MarkovTables.
 **/
function SelfGeneratingClip(params) {
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

  this._stateMachine = new CSMarkovStateMachine();
  this._stateMachine.add_table("pitch", this.pitchTable);
  this._stateMachine.add_table("duration", this.durationTable);

  if (typeof params.clip === "undefined" || params.clip === null) {
    throw new Error("params.clip is undefined");
  }
  this._clip = params.clip;

  // amount of playbacks after which the clip will re-generate.
  this._n = 2;
  // amount of playbacks since last generate
  this._i = 0;

};

SelfGeneratingClip.prototype = {

  _generate: function () {

    var clip = this._clip,
      stateMachine = this._stateMachine,
      // starting at beginning of loop, generate a clip until we've reached the end
      t = clip.get("loop_start")[0],
      tEnd = clip.get("loop_end")[0],
      events = [],
      event = stateMachine.next(),
      i;

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


    clip.call("select_all_notes");
    clip.call("replace_selected_notes");
    clip.call("notes", events.length);
    for (i = 0; i < events.length; i++) {
      event = events[i];
      clip.call([
        "note",
        event.pitch,
        event.time.toFixed(12),
        event.duration.toFixed(12),
        event.velocity,
        event.muted
      ]);
    }
    clip.call("done");
    
  },

  /**
   *  Start generating clip after every N playbacks.
   **/
  start: function () {
    this._generate();
  }

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
              clip: this
            });

            genClip.start();
          }), path);
        }
      }
    }
  }
};

var analyze_track_callback;


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

