/**
 *  @file       CSMarkovTable.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";
  
  var CS, root = this;

  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovTableRow.js");
    require("./CSHelpers.js");
    require("./CSProbabilityVector.js");
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
  }


  /**
   *  @class  CSMarkovTable   A general Markov table implementation.
   **/
  CS.MarkovTable = function (params) {
    var order;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.order === "undefined" || params.order === null) {
      throw new Error("params.order is undefined");
    }
    this._order = order = params.order;

    /**
     *  @type Object
     *  Rows of table keyed by chained previous states, used when finding
     *  a destination state based on previous states.
     **/
    this._rows = null;

    /**
     *  @type Array
     *  Rows of table in a list used when iterating over all rows
     **/
    this._rowsList = null;

    /**
     *  @type Array
     *  Destination states (the table's column keys)
     **/
    this._destStates = null;

    /**
     *  Basically a `MarkovTableRow` that keeps track of which rows of this
     *  table have a higher probability of being starting rows.
     **/
    this._startingStates = null;

    // this will initialize above properties to their appropriate initial
    // values.
    this.clear();
  };

  CS.MarkovTable.prototype = {
    /**
     *  Clear all probabilities and analysis.  Should be called
     *  initially and whenever analysis is to be cleared out.
     **/
    clear: function () {
      this._rows = {};
      this._rowsList = [];
      this._destStates = [];
      this._startingStates = new CS.ProbabilityVector({});
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
      row.add_transition(transitionData);
    },

    /**
     *  The `CSMarkovTable` instance has the ability to track the
     *  statistics of initial states of the system to use for
     *  choosing the initial state of a generated traversal through
     *  the states.
     **/
    add_initial_transition: function (transitionData) {
      // the probability of using these initial states will be higher.
      
      var key = this._generate_row_key_from_transition(transitionData);

      this._startingStates.add_occurrence(key);

      this.add_transition(transitionData);
    
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
        row = new CS.MarkovTableRow({
          order: this._order,
          table: this,
          prevStates: prevStates
        });
        this._rows[key] = row;
        this._rowsList.push(row);
        row.set_even_probability();
      }

      return row;
    },
    _get_or_create_row_from_transition: function (transitionData) {

      var key = this._generate_row_key_from_transition(transitionData),
        rows = this._rows,
        row = rows[key];

      // create row if it doesn't exist
      if (typeof row === "undefined" || row === null) {
        row = new CS.MarkovTableRow({
          order: this._order,
          table: this,
          prevStates: transitionData.slice(0, -1)
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

      CS.post("\n--------\nCSMarkovTable Contents:\n--------\n");
      // column headers
      CS.post("\t\t\t\t\t\t\t\t\t\t\t\t\t" + columnSpacer);
      for (i = 0; i < this._destStates.length; i++) {
        CS.post(this._destStates[i] + columnSpacer + "\t\t\t\t\t");
      }
      CS.post("\n");

      // rows
      for (key in this._rows) {
        CS.post(key);

        row = this._rows[key];

        for (i = 0; i < this._destStates.length; i++) {
          prob = row._probabilities[this._destStates[i]];
          CS.post(columnSpacer + prob.toFixed(2) + "\t\t");
        }

        CS.post("\n");
      }

      CS.post("\n--------\n");
    }
  };

}).call(this);


