/*global maybe*/
var CSMarkovTableRow = CSMarkovTableRow,
  maybe = maybe;

if (typeof require !== "undefined" && require !== null) {
  CSMarkovTableRow = require("./CSMarkovTableRow.js").CSMarkovTableRow;
  maybe = require("./CSHelpers.js").maybe;
}


/**
 *  @class  CSMarkovTable   A Markov table and state machine implementation.
 **/
var CSMarkovTable = function (params) {
  var order;

  if (typeof params === "undefined" || params === null) {
    params = {};
  }

  if (typeof params.order === "undefined" || params.order === null) {
    throw new Error("params.order is undefined");
  }
  this._order = order = params.order;

  // rows of table keyed by chained states
  this._rows = {};

  // rows of table in a list
  this._rowsList = [];

  // destination states (column keys)
  this._destStates = [];

  // previous N states
  this._prevStates = [];
}

CSMarkovTable.prototype = {
  /**
   *  Get next state.
   **/
  next: function () {
    var row,
      possibleStates = this._destStates,
      prob,
      i,
      seed = Math.random(),
      probSum = 0.0,
      //largestProb = -1,
      //largestProbIndex,
      nextState;

    // if there are previous states, use them
    if (this._prevStates.length) {
      row = this._get_row_from_prev_states(this._prevStates);
    // if not, just choose a random row (this will only happen on first run)
    } else {
      row = this._rowsList[
        Math.round(Math.random() * (this._rowsList.length - 1))
      ];
    }

    for (i = 0; i < possibleStates.length; i++) {
      prob = row.get_probability(possibleStates[i]);

      probSum += prob;

      if (seed <= probSum) {
        nextState = possibleStates[i];
        break;
      }

      //if (seed <= prob) {
        //// the probability for this potential next state is largest we've
        //// seen so far.
        //if (prob > largestProb) {
          //largestProb = prob;
          //largestProbIndex = i;
        //// this probability is equal to previous candidate, choose randomly
        //// between them
        //} else if (prob === largestProb) {
          //if (maybe()) {
            //largestProbIndex = i;
          //}
        //}
      //}
    }

    //nextState = possibleStates[largestProbIndex];

    // update prevStates

    // pop front
    this._prevStates = this._prevStates.slice(1);
    this._prevStates.push(nextState);

    return nextState;

  },
  add_transition: function (transitionData) {
    var row, i;

    // get proper row in table
    row = this._get_or_create_row_from_transition(transitionData);

    // ensure all rows have any new possible destination states
    for (i = 0; i < transitionData.length; i++) {
      this._add_column(transitionData[i]);
    }

    // add transition to it
    row._add_transition(transitionData);

  },
  /**
   *  Given the transition data, generate key used to find applicable
   *  row in table.  The first N - 1 elements in the `transitionData`
   *  array are the previous states (in order), and the Nth element
   *  is the destination state.  For example, in a second-order 
   *  chain, the transitionData array that looks like this:
   *
   *    [61, 63, 65]
   *
   *  means 61 -> 63 determine the row in the table and 65 determines
   *  the column.  They key for this example would be the following
   *  string:
   *
   *    "61->63"
   *
   *  @param  Array  transitionData   The transition information.
   **/
  _generate_row_key_from_transition: function (transitionData) {
    // key only depends on prev states
    return this._generate_row_key_from_prev_states(
      transitionData.slice(0, -1)
    );
  },
  _generate_row_key_from_prev_states: function (prevStates) {
    // concatenate all prev states with "->"
    return prevStates.join("->");
  },
  _get_row_from_prev_states: function (prevStates) {
    var key = this._generate_row_key_from_prev_states(prevStates),
      row = this._rows[key];

    // if row has not yet been created
    if (typeof row === "undefined" || row === null) {
      row = new CSMarkovTableRow({
        order: this._order,
        table: this
      });
      row._set_even_probability();
      this._rows[key] = row;
      this._rowsList.push(row);
    }

    return row;
  },
  _get_or_create_row_from_transition: function (transitionData) {

    var key = this._generate_row_key_from_transition(transitionData),
      rows = this._rows,
      row = rows[key];

    // create row if it doesn't exist
    if (typeof row === "undefined" || row === null) {
      row = new CSMarkovTableRow({
        order: this._order,
        table: this
      });
      this._rowsList.push(row);
      rows[key] = row;
    }

    return row;
  },
  /**
   *  Called from row when a new destination state is found.
   **/
  _add_column: function (destState) {
    var i,
      rows = this._rowsList,
      destStates = this._destStates;

    // if this destination state has not been seen
    if (destStates.indexOf(destState) < 0) {
      // add to list of destination states
      destStates.push(destState);

      // inform all existing rows that there is a new destination state
      for (i = 0; i < rows.length; i++) {
        rows[i]._add_column(destState);
      }
    }
  },
  /**
   *  Print table to Max window for debugging.
   **/
  print: function () {
    var i, key, row, prob,
      columnSpacer = "\t\t\t\t\t\t";

    post("\n--------\nCSMarkovTable Contents:\n--------\n");
    // column headers
    post("\t\t\t\t\t\t\t\t\t\t\t\t\t" + columnSpacer);
    for (i = 0; i < this._destStates.length; i++) {
      post(this._destStates[i] + columnSpacer + "\t\t\t\t\t");
    }
    post("\n");

    // rows
    for (key in this._rows) {
      post(key);

      row = this._rows[key];

      for (i = 0; i < this._destStates.length; i++) {
        prob = row._probabilities[this._destStates[i]];
        post(columnSpacer + prob.toFixed(2) + "\t\t");
      }

      post("\n");
    }

    post("\n--------\n");
  }
}

if (typeof exports !== "undefined" && exports !== null) {
  exports.CSMarkovTable = CSMarkovTable;
}
