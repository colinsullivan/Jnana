
(function () {
  "use strict";

  var CS, _, root = this;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovStateMachine.js");
    require("./CSMarkovTable.js");
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    _ = this._;
  }

  CS.MarkovPhraseGenerator = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.order === "undefined" || params.order === null) {
      throw new Error("params.order is undefined");
    }
    this._order = params.order;


    if (typeof params.pitchTable === "undefined" || params.pitchTable === null) {
      throw new Error("params.pitchTable is undefined");
    }
    this._pitchTable = params.pitchTable;

    if (typeof params.durationTable === "undefined" || params.durationTable === null) {
      throw new Error("params.durationTable is undefined");
    }
    this._durationTable = params.durationTable;

    if (typeof params.velocityTable === "undefined" || params.velocityTable === null) {
      throw new Error("params.velocityTable is undefined");
    }
    this._velocityTable = params.velocityTable;
    
    this._stateMachine = new CS.MarkovStateMachine({
      order: 2
    });
    this._stateMachine.add_table("pitch", this._pitchTable);
    this._stateMachine.add_table("duration", this._durationTable);
    this._stateMachine.add_table("velocity", this._velocityTable);

    // if we're currently generating, don't disrupt.
    this._isGenerating = false;

    if (typeof params.assumeCircular === "undefined" || params.assumeCircular === null) {
      params.assumeCircular = false;
    }
    // if we should assume the input phrases are circular (useful for loops)
    this._assumeCircular = params.assumeCircular;
    
  };

  CS.MarkovPhraseGenerator.prototype = {

    set_assumeCircular: function (shouldAssumeCircular) {
      this._assumeCircular = shouldAssumeCircular;
    },


    /**
     *  Incorporate an input phrase into the current analysis.
     *
     *  @param  CS.Phrase  phrase   The phrase to incorporate.
     **/
    incorporate_phrase: function (phrase) {

      var phraseNotesWithRests,
        phraseNotesWithRestsData,
        order = this._order,
        phraseNotes,
        phraseNotesData,
        phrasePitches,
        phraseDurations,
        phraseVelocities,
        startStateIndex,
        endStateIndexPlusOne,
        pitchTable = this._pitchTable,
        durationTable = this._durationTable,
        velocityTable = this._velocityTable,
        i,
        wrapIndex,
        _ = root._;

      phraseNotes = phrase.get_notes();
      phraseNotesWithRests = phrase.get_notes_with_rests();

      // convert note class to key-value data of attributes
      phraseNotesWithRestsData = _.invoke(phraseNotesWithRests, "attributes");
      phraseNotesData = _.invoke(phraseNotes, "attributes");

      // and grab array of pitches and durations since we'll need those
      phrasePitches = _.pluck(phraseNotesWithRestsData, "pitch");
      phraseDurations = _.pluck(phraseNotesWithRestsData, "duration");

      // don't care about the velocity of rests because it is inherently
      // encoded in the pitches and durations of the rest notes generated,
      // therefore we don't include rests in analysis of velocity attributes.
      phraseVelocities = _.pluck(phraseNotesData, "velocity");

      // Analyze every N + 1 note sequence, where N is the order of the 
      // system.  For example, if order == 2 this will grab every
      // 3 notes to incorporate the two previous states and one future
      // state into analysis.  This will leave out notes at end of
      // phrase that will not fit into an N + 1 sequence.
      for (i = order; i < phraseNotesWithRestsData.length; i++) {
        startStateIndex = i - order;
        endStateIndexPlusOne = i + 1;

        // extract pitch attributes
        pitchTable.add_transition(
          phrasePitches.slice(startStateIndex, endStateIndexPlusOne)
        );

        durationTable.add_transition(
          phraseDurations.slice(startStateIndex, endStateIndexPlusOne)
        );

      }

      // if we're assuming phrases are circular, additionally incorporate
      // sequences where the starting note is up to the last note in 
      // the phrase.
      if (this._assumeCircular) {
        // starting at next `startStateIndex` and going until the 
        // last note in the phrase, analyze each N + 1 note sequence just
        // as before, but now wrap around
        for (startStateIndex = i - order; startStateIndex < phraseNotesWithRestsData.length; startStateIndex++) {
         
          // endStateIndex is probably the last note in the phrase.
          endStateIndexPlusOne = Math.min(startStateIndex + order + 1, phraseNotesWithRestsData.length + 1);
          // this is the note from the beginning of the phrase that we've
          // wrapped around to in order to get our Nth order transition.
          wrapIndex = order + 1 - (endStateIndexPlusOne - startStateIndex) + 1;

          // ex:
          //    
          //    phraseNotes = [60, 62, 64, 66];
          //    order = 3;
          //    startStateIndex = 1; (pointing to 62)
          //    endStateIndexPlusOne = 3; (pointing to 66)
          //    wrapIndex = 1; (pointing to 60)
          //    
          // yields the trasition:
          //
          //    62->64->66 -> 60
          //
          // then on the next loop iteration:
          //
          //    startStateIndex = 2; (pointing to 64)
          //    endStateIndexPlusOne = 4; (pointing to nil)
          //    wrapIndex = 2; (pointing to 62)
          //
          // yields the transition:
          //
          //    64->66->60 -> 62
          //
          
          pitchTable.add_transition(
            phrasePitches
              .slice(startStateIndex, endStateIndexPlusOne)
              .concat(phrasePitches.slice(0, wrapIndex))
          );

          durationTable.add_transition(
            phraseDurations
              .slice(startStateIndex, endStateIndexPlusOne)
              .concat(phraseDurations.slice(0, wrapIndex))
          
          );

        }
      }

      // now do same as above for attributes that do not care about rests
      for (i = order; i < phraseNotesData.length; i++) {
        startStateIndex = i - order;
        endStateIndexPlusOne = i + 1;

        velocityTable.add_transition(
          phraseVelocities.slice(startStateIndex, endStateIndexPlusOne)
        );
      }
      if (this._assumeCircular) {
        for (startStateIndex = i - order; startStateIndex < phraseNotesData.length; startStateIndex++) {
          endStateIndexPlusOne = Math.min(startStateIndex + order + 1, phraseNotesData.length + 1);
          wrapIndex = order + 1 - (endStateIndexPlusOne - startStateIndex) + 1;

          velocityTable.add_transition(
            phraseVelocities
              .slice(startStateIndex, endStateIndexPlusOne)
              .concat(phraseVelocities.slice(0, wrapIndex))
          );
        }
      }


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
        noteAttributes = stateMachine.next(),
        i,
        t = tStart;

      this._isGenerating = true;

      post("generating phrase...\n");


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

