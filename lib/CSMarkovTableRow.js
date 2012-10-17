/**
 *  @file       CSMarkovTableRow.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the MIT license.
 **/


/**
 *  @class  CSMarkovTableRow  Represents a single row within a markov table.
 *  
 *  @param  CSMarkovTable  params.table  The table which this row belongs to.
 **/
var CSMarkovTableRow = function (params) {

  var table,
    i,
    destState;

  if (typeof params === "undefined" || params === null) {
    params = {};
  }

  if (typeof params.table === "undefined" || params.table === null) {
    throw new Error("params.table is undefined");
  }
  this._table = table = params.table;

  // cells in this row of the table (keyed by destination state)
  // normalized probabilities
  this._probabilities = {};

  // unnormalized occurrence data.  Each time this is changed,
  // probabilities will be re-calculated.
  this._occurrences = {};

  // maintain sum of all occurrences (sum of `this._occurrences`)
  this._totalOccurrences = 0;

  // initialize with table's current destination states.  Table will
  // inform us when there are more discovered.
  for (i = 0; i < table._destStates.length; i++) {
    destState = table._destStates[i];
    this._add_column(destState);
  }

};

CSMarkovTableRow.prototype = {
  get_probability: function (destState) {
    return this._probabilities[destState];
  },

  _set_even_probability: function () {
    var destStates = this._table._destStates,
      destState,
      i,
      occurrences = {},
      totalOccurrences = 0;

    for (i = 0; i < destStates.length; i++) {
      destState = destStates[i];
      occurrences[destState] = 1;
      totalOccurrences += 1;
    }
    this._occurrences = occurrences;
    this._totalOccurrences = totalOccurrences;
    this._calculate_probabilities();
  },

  _add_transition: function (transitionData) {
    var destState = transitionData[transitionData.length - 1],
      probs = this._probabilities;

    // increase probability of this destination state
    this._occurrences[destState] += 1;
    this._totalOccurrences += 1;

    // calculate new probabilities
    this._calculate_probabilities();
  },

  _calculate_probabilities: function () {
    var destState,
      destStates = this._table._destStates,
      occs = this._occurrences,
      probs = {},
      totalOccs = this._totalOccurrences,
      i;

    for (i = 0; i < destStates.length; i++) {
      destState = destStates[i];
      probs[destState] = (occs[destState] / totalOccs);
    }
    this._probabilities = probs;
  },

  /**
   *  Called from table when new destination state was found.
   **/
  _add_column: function (destState) {
    this._occurrences[destState] = 0;
    this._probabilities[destState] = 0.0;
  }

};

if (typeof exports !== "undefined" && exports !== null) {
  exports.CSMarkovTableRow = CSMarkovTableRow;
}
