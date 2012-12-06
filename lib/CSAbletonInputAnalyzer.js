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

  var CS,
    post,
    LiveAPI;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./lib/CS.js").CS;
    post = console.log;
    LiveAPI = null;
  } else {
    CS = this.CS;
    post = this.post;
    LiveAPI = this.LiveAPI;
  }

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
     *  Markov tables to store statistics of incoming input.
     **/
    this.pitchTable = new CS.MarkovTable({order: 3});
    this.durationTable = new CS.MarkovTable({order: 3});
    this.velocityTable = new CS.MarkovTable({order: 3});

    /**
     *  Grab clips from session that will be used to populate with 
     *  response material.
     **/
    this.api = new LiveAPI("live_set");
    this.track = new LiveAPI("this_device canonical_parent");
    trackPath = this.track.path.slice(1, -1);
    clipSlots = this.track.get("clip_slots");
    
    // for each clip slot
    for (i = 0; i < clipSlots.length; i += 2) {
      clipSlotId = i / 2;
      clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";

      clip = new LiveAPI(clipPath);
      if (clip.id !== "0") {
        clipName = clip.get("name")[0];
        
        // instantiate a `CS.Ableton.SelfGeneratingClip` instance for all
        // clips populated with a clip named like "something-manual1"
        if (clipName.match(/-manual[\d]*$/)) {
          this.genClips.push(new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: 1,
            pitchTable: this.pitchTable,
            durationTable: this.durationTable,
            velocityTable: this.velocityTable,
            clip: clip
          }));
        } else if (clipName.match(/-auto$/)) {
          this.autoGenClip = new CS.Ableton.SelfGeneratingClip({
            clip: clip,
            playsTillAutoGenerate: -1, // doesn't matter because it wont auto generate
            pitchTable: this.pitchTable,
            durationTable: this.durationTable,
            velocityTable: this.velocityTable
          });
        }
      
      }
    }

    if (this.genClips.length === 0) {
      throw new Error("No generative clips found!");
    }
  
  };

  CS.Ableton.InputAnalyzer.prototype = new CS.InputAnalyzer({});

  CS.Ableton.InputAnalyzer.prototype.handle_phrase_ended = function (phrase) {
    var roundedPhraseDuration,
      previousShouldAutoTrain,
      autoGenClip = this.autoGenClip,
      me = this;

    autoGenClip._phraseGenerator.incorporate_phrase(phrase);
    // TODO: Fix.  Sometimes this rounds to zero and bad things happen.
    roundedPhraseDuration = Math.round(phrase.duration / 4) * 4;

    this.status_message_out("End of input phrase detected.");


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
  
  
}).call(this);
