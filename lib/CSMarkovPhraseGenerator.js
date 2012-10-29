
(function () {
  "use strict";

  var CS, _, root = this;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovStateMachine.js");
    require("./CSMarkovTable.js");
    _ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    _ = this._;
  }

  CS.MarkovPhraseGenerator = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    this._order = 2;

    this._stateMachine = new CS.MarkovStateMachine({
      order: 2
    });
    this._pitchTable = new CS.MarkovTable({
      order: 2
    });
    this._durationTable = new CS.MarkovTable({
      order: 2
    });
    this._stateMachine.add_table("pitch", this._pitchTable);
    this._stateMachine.add_table("duration", this._durationTable);
    
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
      }
    }
  };
}).call(this);

