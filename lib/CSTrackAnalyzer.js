/**
 *  @file       CSTrackAnalyzer.js
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


  /**
   *  @class  TrackAnalyzer   Analyzes a track for its clips, coordinates
   *  all of the self generating clips using the same markov tables.
   **/
  CS.TrackAnalyzer = function(params) {
    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.track === "undefined" || params.track === null) {
      throw new Error("params.track is undefined");
    }
    this.track = params.track;



    // CSMarkovTables to hold analysis of this track

    // second-order markov analysis for pitch
    this.pitchTable = new CS.MarkovTable({order: 3});
    // second-order markov analysis for duration
    this.durationTable = new CS.MarkovTable({order: 3});
    this.velocityTable = new CS.MarkovTable({order: 3});


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


        // if clip is a gen clip it ends with "-gen"
        if (clipName.match(/-gen$/)) {
          //genClipSlotIds.push(clipSlotId);
          generativeClips.push(clip);
        } else {
        
          post("analyzing '" + clipName + "'...\n");

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

        post("velocity analysis:\n");
        velocityTable.print();

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
              playsTillAutoGenerate: playsTillAutoGenerate,
              useCircular: true
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
    },

    /**
     *  Tell each clip to generate a new loop asynchronously.
     *
     *  @return   Number  Amount of clips successfully generated.
     **/
    generate_now: function () {
      var i,
        clipGenerators = this._clipGenerators;

      for (i = 0; i < clipGenerators.length; i++) {
        clipGenerators[i]._generate_and_append_loop_async();
      }

      return i;
      
    }
  };
}).call(this);
