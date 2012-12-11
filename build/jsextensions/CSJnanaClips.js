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
   *  @type Boolean
   *  Wether or not we should use the starting statistics when generating
   *  phrases.  Toggle button on GUI.
   **/
  this.useStartingStatistics = null;

  /**
   *  @type Boolean
   *  Wether or not to assume the incoming phrases are circular.  Toggle on
   *  GUI.
   **/
  this.useCircularStatistics = null;

  /**
   *  @type   Boolean
   *  Wether or not to auto generate clips after a specified number
   *  of plays.
   **/
  this.autoGenerateClips = null;

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

  /**
   *  @type   Boolean
   *  If plugin has initialized.
   **/
  this.initDone = false;

  /**
   *  @type   Boolean
   *  If track has been analyzed.
   **/
  this.trackWasAnalyzed = false;

  function status_message(msg) {
    outlet(0, ["set", msg]);
  }

  this.init = function () {

    this.analyzer = new CS.PhraseAnalyzer({
      markovOrder: 3
    });

    this.track = new LiveAPI(function () {
      
    }, "this_device canonical_parent");

    this.analysisClips = [];
    this.generativeClips = [];

    this.initDone = true;
    this.trackWasAnalyzed = false;
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
      clipName,
      me = this,
      process_clip_slot;

    
    /**
     *  Grab clips from session that will be analyzed and also those that
     *  will be used to populate with response material.
     **/
    trackPath = this.track.path.slice(1, -1);
    clipSlots = this.track.get("clip_slots");

    /**
     *  Process a single clip slot.
     **/
    process_clip_slot = error_aware_callback(function () {
      if (this.id !== "0") {
        clipName = this.get("name")[0];
        post("\n--------\nProcessing: " + clipName + "\n--------\n");
       
        // create a CS.Ableton.Clip instance for each clip with a name
        // ending in a "-01" or such.
        if (clipName.match(/-[\d]+$/)) {
          me.analysisClips.push(new CS.Ableton.Clip({
            clip: this
          }));
        // and for all clips ending in "-gen", create self generating
        // clips with our analyzer
        } else if (clipName.match(/-auto$/)) {
          me.generativeClips.push(new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: me.playsTillAutoGenerate,
            clip: this,
            phraseAnalyzer: me.analyzer
          }));
        }
      }

      i += 2;
      if (i < clipSlots.length) {
        clipSlotId = i / 2;
        clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";
        this.path = clipPath;
      } else {
        // now all clips are instantiated, we can analyze.
        for (i = 0; i < me.analysisClips.length; i++) {
          clip = me.analysisClips[i];
          me.analyzer.incorporate_phrase(clip);
        }

        // initiate auto-generation if it was toggled before track was analyzed
        me.set_autogen(me.autoGenerateClips);

        me.trackWasAnalyzed = true;
        status_message(me.analysisClips.length + " clips were analyzed.");
      
      }
    });

    i = 0;
    clipSlotId = i / 2;
    clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";
    clip = new LiveAPI(process_clip_slot, clipPath);

    /*// for each clip slot
    for (i = 0; i < clipSlots.length; i += 2) {

      clip = new LiveAPI(process_clip_slot, clipPath);

    }*/

  };

  /**
   *  A helper function to call a particular method on all of the
   *  generative clips.
   *
   *  @param  String  methodName  the name of the method to call on the
   *  `CS.Ableton.SelfGeneratingClip` instances.
   *  @param  Array   args  Arguments to send this method in apply.
   **/
  this._call_on_generative_clips = function (methodName, args) {
    var genClips = this.generativeClips,
      i;

    if (typeof args === "undefined" || args === null) {
      args = [];
    }

    for (i = 0; i < genClips.length; i++) {
      genClips[i][methodName].apply(genClips[i], args);
    }
  };

  this.generate_now = function () {
    
    if (!this.initDone) {
      return;
    }
    
    if (!this.trackWasAnalyzed) {
      status_message("Track has not yet been analyzed!");
      return;
    }

    this._call_on_generative_clips("_generate_and_append_loop_async");
    status_message(this.generativeClips.length + " clips were generated.");
  };

  this.set_autogen_plays = function (x) {
    this.playsTillAutoGenerate = Math.floor(Number(x));
    
    if (!this.initDone) {
      return;
    }
    
    if (this.generativeClips) {
      this._call_on_generative_clips("set_plays_till_autogen", [this.playsTillAutoGenerate]);
    }
  };

  this.set_autogen = function (autoGenOn) {

    var numAutoGenClips;

    if (!this.initDone) {
      return;
    }

    if (!this.trackWasAnalyzed) {
      status_message("Track has not yet been analyzed!");
      return;
    }

    this.autoGenerateClips = autoGenOn;

    if (autoGenOn) {
      // make sure clips know they should auto-generate
      this._call_on_generative_clips("start");
      status_message(this.generativeClips.length + " clips being observed.");
    } else {
      this._call_on_generative_clips("stop");
      status_message(this.generativeClips.length + " clips no longer being observed.");
    }
    
  };
  
  /**
   *  Enable or disable usage of starting note statistics when generating
   *  clips.  The statistics will always be taken, just not used if this
   *  option is turned off.
   *
   *  @param  Booleanish  value   Wether or not to use starting statistics
   *  from now on.
   **/
  this.set_use_starting_statistics = function (value) {
    var i,
      genClips = this.generativeClips;

    this.useStartingStatistics = Boolean(value);

    // if we've initialized
    if (this.initDone) {

      // make sure all clips will use starting statistics
      for (i = 0; i < genClips.length; i++) {
        genClips[i]._phraseGenerator.set_use_initial(this.useStartingStatistics);
      }
    }
  };

  /**
   *  Enable or disable the usage of circular statistics when generating clips.
   *  That is, wether or not to assume that the incoming phrases are circular.
   *  
   *  @param  Booleanish  value  Wether or not to assume phrases are circular.
   **/
  this.set_use_circular_statistics = function (value) {
    var i,
      genClips = this.generativeClips;

    this.useCircularStatistics = Boolean(value);

    // if we've already initialized our input analyzer
    if (this.initDone) {
      // make sure all clips will assume phrases are circular
      for (i = 0; i < genClips.length; i++) {
        genClips[i]._phraseGenerator.set_use_circular(this.useCircularStatistics);
      }
    }
  };

}).call(this);


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
   *  @type Boolean
   *  Wether or not we should use the starting statistics when generating
   *  phrases.  Toggle button on GUI.
   **/
  this.useStartingStatistics = null;

  /**
   *  @type Boolean
   *  Wether or not to assume the incoming phrases are circular.  Toggle on
   *  GUI.
   **/
  this.useCircularStatistics = null;

  /**
   *  @type   Boolean
   *  Wether or not to auto generate clips after a specified number
   *  of plays.
   **/
  this.autoGenerateClips = null;

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

  /**
   *  @type   Boolean
   *  If plugin has initialized.
   **/
  this.initDone = false;

  /**
   *  @type   Boolean
   *  If track has been analyzed.
   **/
  this.trackWasAnalyzed = false;

  function status_message(msg) {
    outlet(0, ["set", msg]);
  }

  this.init = function () {

    this.analyzer = new CS.PhraseAnalyzer({
      markovOrder: 3
    });

    this.track = new LiveAPI(function () {
      
    }, "this_device canonical_parent");

    this.analysisClips = [];
    this.generativeClips = [];

    this.initDone = true;
    this.trackWasAnalyzed = false;
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
      clipName,
      me = this,
      process_clip_slot;

    
    /**
     *  Grab clips from session that will be analyzed and also those that
     *  will be used to populate with response material.
     **/
    trackPath = this.track.path.slice(1, -1);
    clipSlots = this.track.get("clip_slots");

    /**
     *  Process a single clip slot.
     **/
    process_clip_slot = error_aware_callback(function () {
      if (this.id !== "0") {
        clipName = this.get("name")[0];
        post("\n--------\nProcessing: " + clipName + "\n--------\n");
       
        // create a CS.Ableton.Clip instance for each clip with a name
        // ending in a "-01" or such.
        if (clipName.match(/-[\d]+$/)) {
          me.analysisClips.push(new CS.Ableton.Clip({
            clip: this
          }));
        // and for all clips ending in "-gen", create self generating
        // clips with our analyzer
        } else if (clipName.match(/-auto$/)) {
          me.generativeClips.push(new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: me.playsTillAutoGenerate,
            clip: this,
            phraseAnalyzer: me.analyzer
          }));
        }
      }

      i += 2;
      if (i < clipSlots.length) {
        clipSlotId = i / 2;
        clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";
        this.path = clipPath;
      } else {
        // now all clips are instantiated, we can analyze.
        for (i = 0; i < me.analysisClips.length; i++) {
          clip = me.analysisClips[i];
          me.analyzer.incorporate_phrase(clip);
        }

        // initiate auto-generation if it was toggled before track was analyzed
        me.set_autogen(me.autoGenerateClips);

        me.trackWasAnalyzed = true;
        status_message(me.analysisClips.length + " clips were analyzed.");
      
      }
    });

    i = 0;
    clipSlotId = i / 2;
    clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";
    clip = new LiveAPI(process_clip_slot, clipPath);

    /*// for each clip slot
    for (i = 0; i < clipSlots.length; i += 2) {

      clip = new LiveAPI(process_clip_slot, clipPath);

    }*/

  };

  /**
   *  A helper function to call a particular method on all of the
   *  generative clips.
   *
   *  @param  String  methodName  the name of the method to call on the
   *  `CS.Ableton.SelfGeneratingClip` instances.
   *  @param  Array   args  Arguments to send this method in apply.
   **/
  this._call_on_generative_clips = function (methodName, args) {
    var genClips = this.generativeClips,
      i;

    if (typeof args === "undefined" || args === null) {
      args = [];
    }

    for (i = 0; i < genClips.length; i++) {
      genClips[i][methodName].apply(genClips[i], args);
    }
  };

  this.generate_now = function () {
    
    if (!this.initDone) {
      return;
    }
    
    if (!this.trackWasAnalyzed) {
      status_message("Track has not yet been analyzed!");
      return;
    }

    this._call_on_generative_clips("_generate_and_append_loop_async");
    status_message(this.generativeClips.length + " clips were generated.");
  };

  this.set_autogen_plays = function (x) {
    this.playsTillAutoGenerate = Math.floor(Number(x));
    
    if (!this.initDone) {
      return;
    }
    
    if (this.generativeClips) {
      this._call_on_generative_clips("set_plays_till_autogen", [this.playsTillAutoGenerate]);
    }
  };

  this.set_autogen = function (autoGenOn) {

    var numAutoGenClips;

    if (!this.initDone) {
      return;
    }

    if (!this.trackWasAnalyzed) {
      status_message("Track has not yet been analyzed!");
      return;
    }

    this.autoGenerateClips = autoGenOn;

    if (autoGenOn) {
      // make sure clips know they should auto-generate
      this._call_on_generative_clips("start");
      status_message(this.generativeClips.length + " clips being observed.");
    } else {
      this._call_on_generative_clips("stop");
      status_message(this.generativeClips.length + " clips no longer being observed.");
    }
    
  };
  
  /**
   *  Enable or disable usage of starting note statistics when generating
   *  clips.  The statistics will always be taken, just not used if this
   *  option is turned off.
   *
   *  @param  Booleanish  value   Wether or not to use starting statistics
   *  from now on.
   **/
  this.set_use_starting_statistics = function (value) {
    var i,
      genClips = this.generativeClips;

    this.useStartingStatistics = Boolean(value);

    // if we've initialized
    if (this.initDone) {

      // make sure all clips will use starting statistics
      for (i = 0; i < genClips.length; i++) {
        genClips[i]._phraseGenerator.set_use_initial(this.useStartingStatistics);
      }
    }
  };

  /**
   *  Enable or disable the usage of circular statistics when generating clips.
   *  That is, wether or not to assume that the incoming phrases are circular.
   *  
   *  @param  Booleanish  value  Wether or not to assume phrases are circular.
   **/
  this.set_use_circular_statistics = function (value) {
    var i,
      genClips = this.generativeClips;

    this.useCircularStatistics = Boolean(value);

    // if we've already initialized our input analyzer
    if (this.initDone) {
      // make sure all clips will assume phrases are circular
      for (i = 0; i < genClips.length; i++) {
        genClips[i]._phraseGenerator.set_use_circular(this.useCircularStatistics);
      }
    }
  };

}).call(this);


