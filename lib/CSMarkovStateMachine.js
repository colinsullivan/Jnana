/**
 *  @file       CSMarkovStateMachine.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS, root = this, post;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    root._ = require("./vendor/underscore.js")._;
    post = console.log;
  } else {
    CS = this.CS;
    post = this.post;
  }

  CS.MarkovStateMachine = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.table === "undefined" || params.table === null) {
      throw new Error("params.table is undefined");
    }
    this._table = params.table;

    /**
     *  @type Number
     *  The order of this state machine is the same as the order of the
     *  associated table.
     **/
    this._order = this._table._order;
  
    /**
     *  @type Array
     *  Previous N states leading up to the state table is currently in.
     **/
    this._prevStates = null;

    this.clear();
  
  };
  
  CS.MarkovStateMachine.prototype = {

    clear: function () {
      this._prevStates = [];
    },
    
    /**
     *  Start markov state machine by choosing a starting state.
     *
     *  @param  Boolean  useStartingAnalysis=true  By default, this function
     *  will use the analysis it has created of initial_transitions as
     *  tracked by the `add_initial_transition` method.  Set this argument
     *  to `false` to simply choose a random starting path in the system.
     *  @return Array   List of the previous states leading up to the
     *  machine's current state.
     **/
    start: function (useStartingAnalysis) {
      var startingRowKey,
        startingRow,
        table = this._table,
        _ = root._;

      if (typeof useStartingAnalysis === "undefined" || useStartingAnalysis === null) {
        useStartingAnalysis = true;
      }

      if (useStartingAnalysis) {
        post("generating using starting analysis\n");
        startingRowKey = table._startingStates.choose_column();
        startingRow = table._rows[startingRowKey];
      } else {
        post("generating without starting analysis\n");
        // choose a random starting row in the table
        startingRow = table._rowsList[_.random(table._rowsList.length - 1)];
      }

      this._prevStates = startingRow._prevStates;
      return _.clone(this._prevStates);
    },
    
    /**
     *  Advance machine to next state, and return this state.
     *  
     *  @return   Any    The current state of the machine (could be any
     *  datatype)
     **/
    next: function () {
      var row,
        nextState,
        table = this._table;

      // if there are previous states, use them
      if (this._prevStates.length) {
        row = table._get_row_from_prev_states(this._prevStates);
      // if not, just choose a random row and set prev states
      // (this will only happen on first run)
      } else {
        throw new Error(
          "No previous states. Try calling `start` on the MarkovStateMachine first."
        );
      }

      // get new state
      nextState = row.choose_column();

      // update prevStates
      this._prevStates = this._prevStates.slice(1);
      this._prevStates.push(nextState);

      return nextState;
    },

    /**
     *  Switch this state machine's table.  The new machine should have the same
     *  states as the previous machine, or `_prevStates` should be cleared to 
     *  avoid bad things happening.
     *
     *  @param  MarkovTable  newTable
     **/
    switch_table: function (newTable) {
      this._table = newTable;
    }
  };

}).call(this);
