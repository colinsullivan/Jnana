/**
 *  @file       CSMarkovStateMachine.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the MIT license.
 **/

(function () {
  "use strict";


  var CS;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSPhrase.js");
    require("./CSPhraseNote.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CSMarkovStateMachine  A state machine that utilizes provided
   *  `MarkovTable` instances to generate events at each state.
   **/
  CS.MarkovStateMachine = function (params) {
    var key;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    // `MarkovTable` instances to use to generate events, keyed by the event
    // parameter the table will generate.
    this._tables = {};

    // array of keys to use as state event properties
    this._stateKeys = [];
  };

  CS.MarkovStateMachine.prototype = {
    /**
     *  @param  String        propertyName  The name of the property on the
     *  state event that the table will be used to generate.
     *  @param  MarkovTable   propertyTable  The table used to generate the
     *  given property on the state event.
     **/
    add_table: function (propertyName, propertyTable) {
      this._stateKeys.push(propertyName);
      this._tables[propertyName] = propertyTable;
    },

    /**
     *  Incorporate a stream of events into the markov analysis for this
     *  state machine.
     *
     *  @param  Array  events  The list of events.
     *  @param  String  eventProperty  Name of the property to analyze from each
     *  event.
     *  @param  String  analysisTableNam  Name of table to store the analysis
     *  into.  If omitted, uses `eventProperty`.
     **/
    analyze_events: function (events, eventProperty, analysisTableName) {
      var i,
        event;


      if (typeof analysisTableName === "undefined" || analysisTableName === null) {
        analysisTableName = eventProperty;
      }

      for (i = 0; i < events.length; i++) {
        event = events[i];
      }


    },

    // generate and return next state
    next: function () {
      var state = {},
        stateKeys = this._stateKeys,
        tables = this._tables,
        table,
        key,
        i;

      // for each table, generate state
      for (i = 0; i < stateKeys.length; i++) {
        key = stateKeys[i];
        table = tables[key];

        state[key] = table.next();
      }

      return state;
    }
  };
  
}).call(this);

