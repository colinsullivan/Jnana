/**
 *  @file       CSProbabilityVector.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the MIT license.
 **/

(function () {
  "use strict";

  var CS, root = this;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    root._ = this._;
  }


  CS.ProbabilityVector = function (params) {
    
    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    // column keys
    this._columns = [];
    
    // cells in this row of the table (keyed by destination state)
    // normalized probabilities
    this._probabilities = {};

    // unnormalized occurrence data.  Each time this is changed,
    // probabilities will be re-calculated.
    this._occurrences = {};

    // maintain sum of all occurrences (sum of `this._occurrences`)
    this._totalOccurrences = 0;
    
  };

  CS.ProbabilityVector.prototype = {
    get_probability: function (destState) {
      return this._probabilities[destState];
    },
    
    set_even_probability: function () {
      var destStates = this._columns,
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
    

    add_occurrence: function (columnKey) {

      var probs = this._probabilities,
        _ = root._;

      // if this column doesn't exist, add it
      if (_.indexOf(this._columns, columnKey) === -1) {
        this._add_column(columnKey);
      }
      
      // increase probability of this destination state
      this._occurrences[columnKey] += 1;
      this._totalOccurrences += 1;

      // calculate new probabilities
      this._calculate_probabilities();
      
    },

    /**
     *  Choose a column based on the probabilities in this row.
     **/
    choose_column: function () {
      var i,
        prob,
        probSum = 0.0,
        seed = Math.random(),
        chosenCol,
        cols = this._columns;

      for (i = 0; i < cols.length; i++) {
        prob = this.get_probability(cols[i]);

        probSum += prob;

        if (seed <= probSum) {
          chosenCol = cols[i];
          break;
        }

      }

      return chosenCol;
      
    },
    
    _calculate_probabilities: function () {
      var destState,
        destStates = this._columns,
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
      this._columns.push(destState);
      this._occurrences[destState] = 0;
      this._probabilities[destState] = 0.0;
    }
  
  };
  
}).call(this);
