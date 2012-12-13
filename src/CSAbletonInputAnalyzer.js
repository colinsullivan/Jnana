/**
 *  @file       CSAbletonInputAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./lib/CS.js").CS;
  } else {
    CS = this.CS;
  }

  /**
   *  @class    CS.Ableton.InputAnalyzer    In addition to handling incoming
   *  notes and detecting an end-of-phrase, creates context in which to 
   *  analyze these phrases and initiates generated responses.
   *
   *  @extends  CS.InputAnalyzer
   **/
  CS.Ableton.InputAnalyzer = function (params) {
    var me = this,
      clipSlots,
      trackPath,
      clipSlotId,
      clipPath,
      clipName,
      clip,
      i;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    // call super constructor
    CS.InputAnalyzer.apply(this, arguments);

    if (typeof params.liveAPIDelegate === "undefined" || params.liveAPIDelegate === null) {
      throw new Error("params.liveAPIDelegate is undefined");
    }
    this.liveAPIDelegate = params.liveAPIDelegate;
    
    /**
     *  Wether or not we should auto respond when a phrase ends.
     **/
    if (typeof params.shouldAutoRespond === "undefined" || params.shouldAutoRespond === null) {
      throw new Error("params.shouldAutoRespond is undefined");
    }
    this.shouldAutoRespond = params.shouldAutoRespond;

    /**
     *  Hook for when clip is responding to an input phrase.
     **/
    if (typeof params.auto_response_will_start_callback === "undefined" || params.auto_response_will_start_callback === null) {
      params.auto_response_will_start_callback = function () {
        
      };
    }
    this.auto_response_will_start_callback = params.auto_response_will_start_callback;

    if (typeof params.auto_response_ended_callback === "undefined" || params.auto_response_ended_callback === null) {
      params.auto_response_ended_callback = function () {
        
      };
    }
    this.auto_response_ended_callback = params.auto_response_ended_callback;

    if (typeof params.input_phrase_ended_callback === "undefined" || params.input_phrase_ended_callback === null) {
      params.input_phrase_ended_callback = function () {
        
      };
    }
    this.input_phrase_ended_callback = params.input_phrase_ended_callback;

    if (typeof params.track === "undefined" || params.track === null) {
      throw new Error("params.track is undefined");
    }
    this.track = params.track;

    /**
     *  The `CS.Ableton.PhraseRenderingClip` to be populated with generated
     *  phrase when in auto generating mode.
     **/
    this.autoGenClip = null;
    
    /**
     *  The CS.Ableton.SelfGeneratingClip that will be populated with generated
     *  material from statistical analysis of the live input when the user is
     *  generating continuously on demand.
     **/
    this.genClips = [];

    /**
     *  Phrase analyzer to store statistics of incoming input.
     **/
    this.phraseAnalyzer = new CS.PhraseAnalyzer({
      markovOrder: 3
    });

    /**
     *  Grab clips from session that will be used to populate with 
     *  response material.
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
        
        // instantiate a `CS.Ableton.SelfGeneratingClip` instance for all
        // clips populated with a clip named like "something-manual1"
        if (clipName.match(/-manual[\d]*$/)) {
          this.genClips.push(new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: 1,
            phraseAnalyzer: this.phraseAnalyzer,
            clip: clip
          }));
        // and do the same for all clips named "something-auto"
        } else if (clipName.match(/-auto$/)) {
          this.autoGenClip = new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: -1, // doesn't matter because it wont auto generate because loop should be off
            clip: clip,
            phraseAnalyzer: this.phraseAnalyzer
          });
        }
      
      }
    }

    if (typeof this.autoGenClip === "undefined" || this.autoGenClip === null) {
      throw new Error("No `-auto` clip found!");
    }
    
    if (this.genClips.length === 0) {
      throw new Error("No `-manual` clips found!");
    }
  };

  CS.Ableton.InputAnalyzer.prototype = new CS.InputAnalyzer();

  /**
   *  Change wether or not a clip should automatically be populated and
   *  triggered for playback when a phrase has ended.
   *
   *  @param  Boolean  value    Wether or not to auto respond.
   **/
  CS.Ableton.InputAnalyzer.prototype.set_auto_response = function (value) {
    this.shouldAutoRespond = value;
  };

  CS.Ableton.InputAnalyzer.prototype.handle_phrase_ended = function (phrase) {
    var roundedPhraseDuration,
      autoGenClip = this.autoGenClip,
      me = this;

    this.input_phrase_ended_callback();

    this.phraseAnalyzer.incorporate_phrase(phrase);

    roundedPhraseDuration = Math.ceil(phrase.duration);

    /**
     *  If we are in auto response mode, and a phrase just ended,
     *  initiate the auto response
     **/
    if (me.shouldAutoRespond) {
      autoGenClip.generate_and_append_async(
        // generate a response at a duration quantized from original
        // phrase duration
        roundedPhraseDuration,
        // when clip is done generating, play it
        function () {


          // and when response is done playing
          autoGenClip.set_playbackEndedCallback(function () {
            autoGenClip.set_playbackEndedCallback(null);
            autoGenClip.stop();

            me.auto_response_ended_callback();

          });
          
          me.auto_response_will_start_callback();
          
          autoGenClip.start();
          
          // but don't autogenerate
          // TODO: fix this HACK.
          autoGenClip._isAutogenerating = false;

          // play clip
          autoGenClip._clip.call("fire");
        }
      );
    }
    
  };

  CS.Ableton.InputAnalyzer.prototype.start_manual_response = function () {
    var i,
      genClips = this.genClips,
      genClip,
      duration = genClips[0]._clip.get("length")[0],
      final_callback = function () {
        // play first clip
        CS.post("firing first clip");
        genClips[0]._clip.call("fire");
      },
      generate_with_callback = function (genClip, callback) {
        genClip.generate_and_append_async(duration, function () {
          genClip.start();
          callback();
        });
      },
      generate_callback = function () {
        i++;
        if (i < genClips.length) {
          generate_with_callback(genClips[i], generate_callback);
        } else {
          final_callback();
        }
      },
      generate_all_clips = function () {
        i = 0;
        generate_with_callback(genClips[i], generate_callback);
      };

    // make sure all clips have the same loop length
    for (i = 0; i < genClips.length; i++) {
      if (genClips[i]._clip.get("length")[0] !== duration) {
        throw new Error("`-manual` clips must all have the same clip duration!");
      }
    }

    // make sure phrase analyzer has analyzed at least something
    if (this.phraseAnalyzer.numPhrasesAnalyzed === 0) {
      throw new Error("No input has been analyzed yet!");
    }


    // populate all `genClips` with notes, and play the first one
    generate_all_clips();
    
  };

  CS.Ableton.InputAnalyzer.prototype.end_manual_response = function () {
    // stop all clips
    this.track.call("stop_all_clips");
  };

  CS.Ableton.InputAnalyzer.prototype.clear_training = function () {

    this.phraseAnalyzer.clear_analysis();
    
  };

  CS.Ableton.InputAnalyzer.prototype.set_use_starting_statistics = function (value) {
    var i;

    this.autoGenClip._phraseGenerator.set_use_initial(value);
    for (i = 0; i < this.genClips.length; i++) {
      this.genClips[i]._phraseGenerator.set_use_initial(value);
    }
  };

  CS.Ableton.InputAnalyzer.prototype.set_use_circular_statistics = function (value) {
    var i;

    this.autoGenClip._phraseGenerator.set_use_circular(value);
    for (i = 0; i < this.genClips.length; i++) {
      this.genClips[i]._phraseGenerator.set_use_circular(value);
    }
    
  };
  
  
}).call(this);
