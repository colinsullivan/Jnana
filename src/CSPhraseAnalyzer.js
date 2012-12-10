/**
 *  @file       CSPhraseAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS,
    _,
    root = this,
    post;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovMultiStateMachine.js");
    require("./CSMarkovTable.js");
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    _ = this._;
  }

  /**
   *  @class    CS.PhraseAnalyzer   Maintains statistics of incoming
   *  phrases.  Provides API for `PhraseGenerator` instances to grab
   *  statistics they need to generate new phrases.
   **/
  CS.PhraseAnalyzer = function (params) {
    var markovParams;


    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.markovOrder === "undefined" || params.markovOrder === null) {
      params.markovOrder = 3;
    }
    this._markovOrder = params.markovOrder;

    markovParams = {order: this._markovOrder};

    /**
     *  Markov tables to store statistics of incoming input.
     **/
    this._pitchTable              = new CS.MarkovTable(markovParams);
    this._durationTable           = new CS.MarkovTable(markovParams);
    this._velocityTable           = new CS.MarkovTable(markovParams);

    /**
     *  Markov tables to store statistics of incoming input in a 
     *  circular fashion.
     **/
    this._circularPitchTable      = new CS.MarkovTable(markovParams);
    this._circularDurationTable   = new CS.MarkovTable(markovParams);
    this._circularVelocityTable   = new CS.MarkovTable(markovParams);

    /**
     *  Statistics of beginning of phrase.  Basically a `MarkovTableRow` that
     *  keeps track of which rows of the tables above have a higher
     *  probability of being starting rows.
     **/

  };

  /**
   *  Incorporate an input phrase into the current analysis.
   *
   *  @param  CS.Phrase  phrase   The phrase to incorporate.
   **/
  CS.PhraseAnalyzer.prototype.incorporate_phrase = function (phrase) {
    var phraseNotesWithRests,
      phraseNotesWithRestsData,
      order = this._markovOrder,
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
      circularPitchTable = this._circularPitchTable,
      circularDurationTable = this._circularDurationTable,
      circularVelocityTable = this._circularVelocityTable,
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
    
    // first, incorporate initial N notes.
    pitchTable.add_initial_transition(
      phrasePitches.slice(0, order + 1)
    );
    
    durationTable.add_initial_transition(
      phraseDurations.slice(0, order + 1)
    );

    circularPitchTable.add_initial_transition(
      phrasePitches.slice(0, order + 1)
    );

    circularDurationTable.add_initial_transition(
      phraseDurations.slice(0, order + 1)
    );

    for (i = order + 1; i < phraseNotesWithRestsData.length; i++) {
      startStateIndex = i - order;
      endStateIndexPlusOne = i + 1;

      // extract pitch attributes
      pitchTable.add_transition(
        phrasePitches.slice(startStateIndex, endStateIndexPlusOne)
      );
      circularPitchTable.add_transition(
        phrasePitches.slice(startStateIndex, endStateIndexPlusOne)
      );

      durationTable.add_transition(
        phraseDurations.slice(startStateIndex, endStateIndexPlusOne)
      );
      circularDurationTable.add_transition(
        phraseDurations.slice(startStateIndex, endStateIndexPlusOne)
      );
    }

    // if we want to consider phrases to be circular, we need to additionally
    // incorporate sequences where the starting note is up to the last note in 
    // the phrase.
    
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
      
      circularPitchTable.add_transition(
        phrasePitches
          .slice(startStateIndex, endStateIndexPlusOne)
          .concat(phrasePitches.slice(0, wrapIndex))
      );

      circularDurationTable.add_transition(
        phraseDurations
          .slice(startStateIndex, endStateIndexPlusOne)
          .concat(phraseDurations.slice(0, wrapIndex))
      
      );
    }

    // now do same as above for attributes that do not care about rests
    velocityTable.add_initial_transition(
      phraseVelocities.slice(0, order + 1)
    );
    circularVelocityTable.add_initial_transition(
      phraseVelocities.slice(0, order + 1)
    );
    for (i = order + 1; i < phraseNotesData.length; i++) {
      startStateIndex = i - order;
      endStateIndexPlusOne = i + 1;

      velocityTable.add_transition(
        phraseVelocities.slice(startStateIndex, endStateIndexPlusOne)
      );
      circularVelocityTable.add_transition(
        phraseVelocities.slice(startStateIndex, endStateIndexPlusOne)
      );
    }
    
    for (startStateIndex = i - order; startStateIndex < phraseNotesData.length; startStateIndex++) {
      endStateIndexPlusOne = Math.min(startStateIndex + order + 1, phraseNotesData.length + 1);
      wrapIndex = order + 1 - (endStateIndexPlusOne - startStateIndex) + 1;

      circularVelocityTable.add_transition(
        phraseVelocities
          .slice(startStateIndex, endStateIndexPlusOne)
          .concat(phraseVelocities.slice(0, wrapIndex))
      );
    }

    /*var keys = root._.keys(pitchTable._startingStates._probabilities);
    post("Starting probabilities:\n");
    for (i = 0; i < keys.length; i++) {
      post(keys[i] + ": " + pitchTable._startingStates._probabilities[keys[i]] + "\n");
    }
    post("\n\n");*/
  };

}).call(this);
