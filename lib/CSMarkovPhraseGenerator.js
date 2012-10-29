
(function () {
  "use strict";

  var CS;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
  } else {
    CS = this.CS;
  }

  CS.MarkovPhraseGenerator = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    this._stateMachine = new CSMarkovStateMachine({
      order: 2
    });
    this._stateMachine.add_table("pitch");
    this._stateMachine.add_table("duration");
    
  };

  CS.MarkovPhraseGenerator.prototype = {

    /**
     *  Incorporate an input phrase into the current analysis.
     *
     *  @param  CS.Phrase  phrase   The phrase to incorporate.
     **/
    incorporate_phrase: function (phrase) {

      var phraseNotesWithRests;

      phraseNotesWithRests = phrase.get_notes_with_rests();

      this._stateMachine.analyze_events(phraseNotesWithRests)


      
    }

  };


}).call(this);

