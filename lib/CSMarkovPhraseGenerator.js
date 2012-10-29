

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
      params = {
        order: 2
      }
    }

    this._order = params.order;

    this._stateMachine = new CSMarkovStateMachine();
    this._stateMachine.add_table("pitch", new CSMarkovTable({
      order: this._order
    }));
    this._stateMachine.add_table("duration", new CSMarkovTable({
      order: this._order
    }));
    
  };

  CS.MarkovPhraseGenerator.prototype = {

    /**
     *  Incorporate an input phrase into the current analysis.
     *
     *  @param  CS.Phrase  phrase   The phrase to incorporate.
     **/
    incorporate_phrase: function (phrase) {
      
    }

  };


}).call(this);

