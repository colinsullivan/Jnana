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


  var CS;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSPhrase.js");
    require("./CSPhraseNote.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CSMarkovStateMachine  Utilizes multiple `MarkovTable` instances
   *  to generate a conglomerate state where each table generates the property
   *  that it is responsible for.
   **/
  CS.MarkovStateMachine = function (params) {
    var key;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.order === "undefined" || params.order === null) {
      params.order = 2;
    }
    this._order = params.order;

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

    /*[>*
     *  Incorporate a stream of events into the markov analysis for this
     *  state machine.
     *
     *  @param  Array  events  The list of events.
     *  @param  String  eventProperty  Name of the property to analyze from each
     *  event.
     *  @param  String  analysisTableNam  Name of table to store the analysis
     *  into.  If omitted, uses `eventProperty`.
     *<]
    analyze_events: function (events, eventProperty, analysisTableName) {
      var i,
        event,
        transitionEvents,
        order = this._order;


      if (typeof analysisTableName === "undefined" || analysisTableName === null) {
        analysisTableName = eventProperty;
      }

      for (i = order; i < events.length; i++) {
        transitionEvents = events.slice()
      }


    },*/

   
    /**
     *  Restart each markov table.
     **/
    start: function () {
      return this._each_table_do("start");
    },

    /**
     *  Generate and return next state from each MarkovTable.
     **/
    next: function () {
      return this._each_table_do("next");
    },

    _each_table_do: function (methodName) {
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

        state[key] = table[methodName]();
      }

      return state;
      
    }
  };
  
}).call(this);

