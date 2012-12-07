/**
 *  @file       CSMarkovMultiStateMachine.js
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
    require("./CSMarkovStateMachine.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CSMarkovMultiStateMachine  Utilizes multiple `MarkovStateMachine`
   *  instances to generate a conglomerate state where each table generates
   *  the property that it is responsible for.
   **/
  CS.MarkovMultiStateMachine = function (params) {
    var key;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.order === "undefined" || params.order === null) {
      params.order = 2;
    }
    this._order = params.order;

    /**
     *  @type   Object
     *  `CS.MarkovStateMachine` instances that will be used to generate
     *  state events, keyed by the event parameter that the state machine
     *  will be mapped to.
     **/
    this._machines = {};

    /**
     *  @type   Array
     *  Keys to use as state event property names.
     **/
    this._stateKeys = [];
  };

  CS.MarkovMultiStateMachine.prototype = {
    /**
     *  Creates a state machine for a given MarkovTable instance.
     *
     *  @param  String        propertyName  The name of the property on the
     *  state event that the table will be used to generate.
     *  @param  MarkovTable   propertyTable  The table used to generate the
     *  given property on the state event.
     **/
    add_table: function (propertyName, propertyTable) {
      this._stateKeys.push(propertyName);
      this._machines[propertyName] = new CS.MarkovStateMachine({
        table: propertyTable
      });
    },
   
    /**
     *  Restart each state machine.
     **/
    start: function () {
      return this._each_machine_do("start", arguments);
    },

    /**
     *  Generate and return next state from each MarkovStateMachine.
     **/
    next: function () {
      return this._each_machine_do("next");
    },

    _each_machine_do: function (methodName, args) {
      var state = {},
        stateKeys = this._stateKeys,
        machines = this._machines,
        machine,
        key,
        i;

      // for each table, generate state
      for (i = 0; i < stateKeys.length; i++) {
        key = stateKeys[i];
        machine = machines[key];

        state[key] = machine[methodName].apply(machine, args);
      }

      return state;
    }
  };
  
}).call(this);

