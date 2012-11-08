
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
    
  };

  CS.MarkovPhraseGenerator.prototype = {

    /**
     *  Incorporate an input phrase into the current analysis.
     *
     *  @param  CS.Phrase  phrase   The phrase to incorporate.
     **/
    incorporate_phrase: function (phrase) {

      var phraseNotesWithRests,
        order = this._order,
        phraseNotesWithRestsData,
        phrasePitches,
        phraseDurations,
        phraseVelocities,
        startStateIndex,
        endStateIndexPlusOne,
        i,
        _ = root._;

      phraseNotesWithRests = phrase.get_notes_with_rests();

      // convert note class to key-value data of attributes
      phraseNotesWithRestsData = _.invoke(phraseNotesWithRests, "attributes");
      // and grab array of pitches and durations since we'll need those
      phrasePitches = _.pluck(phraseNotesWithRestsData, "pitch");
      phraseDurations = _.pluck(phraseNotesWithRestsData, "duration");
      phraseVelocities = _.pluck(phraseNotesWithRestsData, "velocity");

      // if order == 2, this will grab every 3 notes
      for (i = order; i < phraseNotesWithRestsData.length; i++) {
        startStateIndex = i - order;
        endStateIndexPlusOne = i + 1;

        // extract pitch attributes
        this._pitchTable.add_transition(
          phrasePitches.slice(startStateIndex, endStateIndexPlusOne)
        );

        this._durationTable.add_transition(
          phraseDurations.slice(startStateIndex, endStateIndexPlusOne)
        );

        this._velocityTable.add_transition(
          phraseVelocities.slice(startStateIndex, endStateIndexPlusOne)
        );
      }
    },

    /**
     *  Generate a new phrase based on current statistical analysis stored
     *  in markov tables.
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
        notes: notes
      });

      return result;

    }
  };
}).call(this);

