/*jslint sloppy: true */
/*global LiveAPI, post, CSMarkovTable, ClipAnalyzer, TrackAnalyzer, CSMarkovStateMachine, error_aware_callback, Task, outlet */

/**
 *  @class  TrackAnalyzer   Analyzes a track for its clips, coordinates
 *  all of the self generating clips using the same markov tables.
 **/
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
  this.pitchTable = new CS.MarkovTable({order: 2});
  // second-order markov analysis for duration
  this.durationTable = new CS.MarkovTable({order: 2});
  this.velocityTable = new CS.MarkovTable({order: 2});


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
          clip: clip,
          pitchTable: this.pitchTable,
          durationTable: this.durationTable,
          velocityTable: this.velocityTable
        });

        clipAnalyzer.analyze();

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
      velocityTable = this.velocityTable,
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
          genClip = new CS.Ableton.SelfGeneratingClip({
            pitchTable: pitchTable,
            durationTable: durationTable,
            velocityTable: velocityTable,
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

