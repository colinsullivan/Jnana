/**
 *  @file       CSJnanaClips.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

/*global LiveAPI, post, CSMarkovTable, ClipAnalyzer, TrackAnalyzer, CSMarkovStateMachine, error_aware_callback, Task, outlet */

(function () {
  "use strict";
  
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

  this.generate_now = function () {
    var numClips;
    if (typeof this.trackAnalyzer === "undefined" || this.trackAnalyzer === null) {
      status_message("Track has not been analyzed!");
    } else {
      numClips = this.trackAnalyzer.generate_now();
      status_message(numClips + " clips were generated.");
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

}).call(this);


