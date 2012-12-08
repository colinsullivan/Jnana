/**
 *  @file       CSMarkovPhraseGenerator.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/


(function () {
  "use strict";

  var CS, _, root = this, post;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovMultiStateMachine.js");
    require("./CSMarkovTable.js");
    root._ = require("./vendor/underscore.js")._;
    post = console.log;
  } else {
    CS = this.CS;
    _ = this._;
    post = this.post;
  }

  /**
   *  @class  CS.MarkovPhraseGenerator    Uses a set of markov tables
   *  to generate phrases.
   **/
  CS.MarkovPhraseGenerator = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.phraseAnalyzer === "undefined" || params.phraseAnalyzer === null) {
      throw new Error("params.phraseAnalyzer is undefined");
    }
    this._phraseAnalyzer = params.phraseAnalyzer;
    
    this._stateMachine = new CS.MarkovMultiStateMachine({});
    this._stateMachine.add_table("pitch", this._phraseAnalyzer._pitchTable);
    this._stateMachine.add_table("duration", this._phraseAnalyzer._durationTable);
    this._stateMachine.add_table("velocity", this._phraseAnalyzer._velocityTable);

    // if we're currently generating, don't disrupt.
    this._isGenerating = false;

    if (typeof params.useCircular === "undefined" || params.useCircular === null) {
      params.useCircular = false;
    }
    // if we should assume the input phrases are circular (useful for loops)
    this._useCircular = null;

    this.set_use_circular(params.useCircular);

    if (typeof params.useInitialNotes === "undefined" || params.useInitialNotes === null) {
      params.useInitialNotes = false;
    }
    /**
     *  Wether or not we should take into account a statistical analysis of the
     *  initial notes of each phrase when choosing the initial notes of a
     *  generated phrase.
     **/
    this._useInitial = null;
    this.set_use_initial(params.useInitialNotes);
  };

  CS.MarkovPhraseGenerator.prototype = {

    set_use_circular: function (shouldUseCircular) {

      if (this._useCircular !== shouldUseCircular) {
        this._useCircular = shouldUseCircular;

        if (shouldUseCircular) {
          post("using circular table\n");
          this._stateMachine.switch_table("pitch", this._phraseAnalyzer._circularPitchTable);
          this._stateMachine.switch_table("duration", this._phraseAnalyzer._circularDurationTable);
          this._stateMachine.switch_table("velocity", this._phraseAnalyzer._circularVelocityTable);
        } else {
          post("using un-circular table\n");
          this._stateMachine.switch_table("pitch", this._phraseAnalyzer._pitchTable);
          this._stateMachine.switch_table("duration", this._phraseAnalyzer._durationTable);
          this._stateMachine.switch_table("velocity", this._phraseAnalyzer._velocityTable);
        }
        
      }
    },

    set_use_initial: function (shouldUseInitial) {
      this._useInitial = shouldUseInitial;
    },

    /**
     *  Generate a new phrase based on current statistical analysis stored
     *  in markov tables.  The `duration` attribute of the returned phrase
     *  will be equal to the `phraseDuration` variable passed in, but the
     *  last note of the phrase may not end at the exact end of the phrase.
     *
     *  @param    Number  phraseDuration  The duration of the phrase
     *  @return   CS.Phrase   The resulting phrase.
     **/
    generate_phrase: function (phraseDuration) {
      if (typeof phraseDuration === "undefined" || phraseDuration === null) {
        throw new Error("phraseDuration is undefined");
      }

      var result,
        stateMachine = this._stateMachine,
        clip = this._clip,
        // starting now
        tStart = 0,
        tEnd = tStart + phraseDuration,
        notes = [],
        initialNoteAttributes = stateMachine.start(this._useInitial),
        noteAttributes = {},
        i,
        t = tStart;

      this._isGenerating = true;

      for (i = 0; i < initialNoteAttributes.pitch.length; i++) {
        noteAttributes.pitch = initialNoteAttributes.pitch[i];
        noteAttributes.duration = initialNoteAttributes.duration[i];
        noteAttributes.velocity = initialNoteAttributes.velocity[i];
        noteAttributes.time = t;
        noteAttributes.muted = 0;

        if (noteAttributes.pitch !== -1) {
          notes.push(new CS.PhraseNote(noteAttributes));
        }
        
        t += noteAttributes.duration;
      }

      noteAttributes = stateMachine.next();


      // generate new loop of same length
      while (t + noteAttributes.duration < tEnd) {
        noteAttributes.time = t;
        noteAttributes.muted = 0;

        // if this was not a rest note
        if (noteAttributes.pitch !== -1) {
          // save it in our loop
          notes.push(new CS.PhraseNote(noteAttributes));
        }

        t += noteAttributes.duration;
        noteAttributes = stateMachine.next();
      }

      result = new CS.Phrase({
        notes: notes,
        duration: phraseDuration
      });

      return result;

    }
  };
}).call(this);

