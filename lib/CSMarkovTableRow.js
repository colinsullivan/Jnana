/**
 *  @file       CSMarkovTableRow.js
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
    CS = require("./CS.js").CS;
    require("./CSProbabilityVector.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CSMarkovTableRow  Represents a single row within a markov table.
   *  
   *  @param  CSMarkovTable  params.table  The table which this row belongs to.
   **/
  CS.MarkovTableRow = function (params) {

    var table,
      i,
      destState;

    CS.ProbabilityVector.apply(this, arguments);

    if (typeof params.table === "undefined" || params.table === null) {
      throw new Error("params.table is undefined");
    }
    this._table = table = params.table;

    if (typeof params.prevStates === "undefined" || params.prevStates === null) {
      throw new Error("params.prevStates is undefined");
    }
    // the array of previous states that are used as the key to this row in the
    // table.
    this._prevStates = params.prevStates;

    // initialize with table's current destination states.  Table will
    // inform us when there are more discovered.
    for (i = 0; i < table._destStates.length; i++) {
      destState = table._destStates[i];
      this._add_column(destState);
    }

  };

  CS.MarkovTableRow.prototype = new CS.ProbabilityVector({});

  CS.MarkovTableRow.prototype.add_transition = function (transitionData) {
    var destState = transitionData[transitionData.length - 1];

    this.add_occurrence(destState);

  };
  
}).call(this);

