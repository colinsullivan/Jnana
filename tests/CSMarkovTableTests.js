/*global it, describe*/


var assert = require("assert"),
  CSMarkovTable = require("../src/CSMarkovTable.js").CSMarkovTable;

describe("CSMarkovTable", function () {
  "use strict";
  
  describe("#next()", function () {

    var table = new CSMarkovTable({order: 2});
    table.add_transition([60, 62, 64]);
    table.add_transition([62, 64, 60]);

    it('should have the proper probability table', function() {
      assert.deepEqual(table._rows["60->62"]._probabilities, {
        "60": 0.0,
        "62": 0.0,
        "64": 1.0
      });
    });

    
    it('should return 64 as the next state', function () {
      // stage previous state
      table._prevStates = [60, 62];
      assert.equal(table.next(), 64);
    });

    it('prev states should now be [62, 64]', function() {
      assert.deepEqual(table._prevStates, [62, 64]);
    });


    it('should return 60 as next state', function() {
      assert.equal(table.next(), 60);
    });

    it('prev states should now be [64, 60]', function() {
      assert.deepEqual(table._prevStates, [64, 60]);
    });

    it('should return something defined when called again multiple times', function() {
      var i;

      for (i = 0; i < 10; i++) {
        assert.notEqual(typeof(table.next()), "undefined", new Error("table next was undefined when trying transition from [" + table._prevStates[0] + ", " + table._prevStates[1] + "]"));
      }
      
    });
          
    
  });
});

