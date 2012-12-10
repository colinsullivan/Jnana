/**
 *  @file       CSJnanaClips.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

/*global LiveAPI, post, CS, error_aware_callback, Task, outlet */

(function () {
  "use strict";
 
  /**
   *  @type   Number
   *  Amount of times clips will play before being auto generated.
   **/
  this.playsTillAutoGenerate = null;

  /**
   *  @type   CS.PhraseAnalyzer
   *  Phrase analyzer that will store statistics of the clips in this
   *  track.
   **/
  this.analyzer = null;

  /**
   *  @type   LiveAPI
   *  Reference to the current track.
   **/
  this.track = null;

  /**
   *  @type   Array
   *  Reference to `CS.Ableton.Clip` instances of each clip in analysis.
   **/
  this.analysisClips = null;

  /**
   *  @type   Array
   *  Reference to `CS.Ableton.SelfGeneratingClip` instances of each clip
   *  that will be populated with generated stuffs.
   **/
  this.generativeClips = null;

  function status_message(msg) {
    outlet(0, ["set", msg]);
  }

  this.init = function () {

    this.analyzer = new CS.PhraseAnalyzer({
      markovOrder: 3
    });

    this.track = new LiveAPI("this_device canonical_parent");

    this.analysisClips = [];
    this.generativeClips = [];

  };

  /**
   *  Because the Max for Live API is weird, this "class" must act as a
   *  delegate anytime another component wants a new `LiveAPI` instance.
   *
   *  @param  String  path    The `path` argument to send to the `LiveAPI`
   *  constructor.
   **/
  this.new_live_api = function (path) {
    return new LiveAPI(path);
  };

  /**
   *  Called from UI when analyze button is pressed.
   **/
  this.analyze_track = function () {

    var trackPath,
      clipSlots,
      i,
      clipSlotId,
      clipPath,
      clip,
      clipName;

    
    /**
     *  Grab clips from session that will be analyzed and also those that
     *  will be used to populate with response material.
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
       
        // create a CS.Ableton.Clip instance for each clip with a name
        // ending in a "-01" or such.
        if (clipName.match(/-[\d]+$/)) {
          this.analysisClips.push(new CS.Ableton.Clip({
            clip: clip
          }));
        // and for all clips ending in "-gen", create self generating
        // clips with our analyzer
        } else if (clipName.match(/-auto$/)) {
          this.generativeClips.push(new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: this.playsTillAutoGenerate,
            clip: clip,
            phraseAnalyzer: this.analyzer
          }));
        }
      
      }
    }

    // now all clips are instantiated, we can analyze.
    for (i = 0; i < this.analysisClips.length; i++) {
      clip = this.analysisClips[i];
      this.analyzer.incorporate_phrase(clip.phrase);
    }

    /*var track,
      trackAnalyzer,
      me = this,
      numClipsAnalyzed;


    track = new LiveAPI(error_aware_callback(function () {
      post("analyzing track '" + this.get("name") + "'\n");
      
      me.trackAnalyzer = trackAnalyzer = new TrackAnalyzer({
        track: this
      });

      numClipsAnalyzed = trackAnalyzer.analyze();

      status_message(numClipsAnalyzed + " clips were analyzed.");
    }), "this_device canonical_parent");

    if (!track) {
      post("no track object!\n");
      return;
    }*/
  };

  /**
   *  A helper function to call a particular method on all of the
   *  generative clips.
   *
   *  @param  String  methodName  the name of the method to call on the
   *  `CS.Ableton.SelfGeneratingClip` instances.
   **/
  this._call_on_generative_clips = function (methodName) {
    var genClips = this.generativeClips,
      i;

    for (i = 0; i < genClips.length; i++) {
      genClips[i][methodName]();
    }
  };

  this.generate_now = function () {
    if (typeof this.analyzer === "undefined" || this.analyzer === null) {
      status_message("Track has not been analyzed!");
    } else {

      this._call_on_generative_clips("_generate_and_append_loop_async");
      status_message(this.generativeClips.length + " clips were generated.");
    }
  };

  this.set_autogen_plays = function (x) {
    this.playsTillAutoGenerate = Math.floor(Number(x));
  };

  this.set_autogen = function (autoGenOn) {

    var numAutoGenClips;

    if (typeof this.trackAnalyzer === "undefined" || this.trackAnalyzer === null) {
      status_message("No clips have been analyzed!");
      return;
    }

    if (autoGenOn) {
      // make sure clips know they should auto-generate
      this._call_on_generative_clips("start");
      status_message(this.generativeClips.length + " clips being observed.");
    } else {
      this._call_on_generative_clips("stop");
      status_message(this.generativeClips.length + " clips no longer being observed.");
    }
    
  };

}).call(this);


