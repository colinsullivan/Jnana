/**
 *  @file       CSMarkovTableTests.js 
 *
 *              Tests for the CSMarkovTable collection of classes
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/


/*global it, describe*/

var assert = require("assert"),
  CS = require("../lib/CS.js").CS,
  _ = require("../lib/vendor/underscore.js")._;
require("../lib/CSMarkovTable.js");
require("../lib/CSMarkovStateMachine.js");
require("../lib/CSPhrase.js");

describe("CS Markov Classes", function () {
  "use strict";

  var table,
    stateMachine;
  
  table = new CS.MarkovTable({order: 2});
  table.add_transition([60, 62, 64]);
  table.add_transition([62, 64, 60]);
  
  describe("CSMarkovTable", function () {

    it('should have the proper probability table', function () {
      // there should be only two transition rules
      assert.equal(_.keys(table._rows).length, 2);

      assert.deepEqual(table._rows["60->62"]._probabilities, {
        "60": 0.0,
        "62": 0.0,
        "64": 1.0
      });
    });
  });

  stateMachine = new CS.MarkovStateMachine({
    table: table
  });

  describe("CSMarkovStateMachine", function () {
    it('should return 64 as the next state', function () {
      // stage previous state
      stateMachine._prevStates = [60, 62];
      assert.equal(stateMachine.next(), 64);

      // no new transition rules should have been added
      assert.equal(_.keys(table._rows).length, 2);
    });
    
    it('prev states should now be [62, 64]', function () {
      assert.deepEqual(stateMachine._prevStates, [62, 64]);
      // no new transition rules should have been added
      assert.equal(_.keys(table._rows).length, 2);
    });

    it('should return 60 as next state', function () {
      assert.equal(stateMachine.next(), 60);
      // no new transition rules should have been added
      assert.equal(_.keys(table._rows).length, 2);
    });

    it('prev states should now be [64, 60]', function () {
      assert.deepEqual(stateMachine._prevStates, [64, 60]);
      // no new transition rules should have been added
      assert.equal(_.keys(table._rows).length, 2);
    });

    it('should return something defined when called again multiple times', function () {
      var i;

      for (i = 0; i < 10; i++) {
        assert.notEqual(typeof(stateMachine.next()),
          "undefined",
          new Error(
            "state machine next was undefined when trying transition from [" +
              stateMachine._prevStates[0] +
              ", " +
              stateMachine._prevStates[1] + "]"
          )
        );
      }
    });
    
  });

});


