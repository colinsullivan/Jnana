/**
 *  @file       CSMarkovTableTests.js 
 *
 *              Tests for the CSMarkovTable collection of classes
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the MIT license.
 **/



/*global it, describe*/

post = console.log;


var assert = require("assert"),
  CS = require("../lib/CS.js").CS,
  _ = require("../lib/vendor/underscore.js")._;
require("../lib/CSMarkovTable.js");
require("../lib/CSPhrase.js");
require("../lib/CSMarkovPhraseGenerator");

describe("CSMarkovTable", function () {
  "use strict";
  
  describe("#next()", function () {

    var table = new CS.MarkovTable({order: 2});
    table.add_transition([60, 62, 64]);
    table.add_transition([62, 64, 60]);

    it('should have the proper probability table', function () {
      // there should be only two transition rules
      assert.equal(_.keys(table._rows).length, 2);

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

      // no new transition rules should have been added
      assert.equal(_.keys(table._rows).length, 2);
    });

    it('prev states should now be [62, 64]', function () {
      assert.deepEqual(table._prevStates, [62, 64]);
      // no new transition rules should have been added
      assert.equal(_.keys(table._rows).length, 2);
    });


    it('should return 60 as next state', function () {
      assert.equal(table.next(), 60);
      // no new transition rules should have been added
      assert.equal(_.keys(table._rows).length, 2);
    });

    it('prev states should now be [64, 60]', function () {
      assert.deepEqual(table._prevStates, [64, 60]);
      // no new transition rules should have been added
      assert.equal(_.keys(table._rows).length, 2);
    });

    it('should return something defined when called again multiple times', function () {
      var i;

      for (i = 0; i < 10; i++) {
        assert.notEqual(typeof(table.next()), "undefined", new Error("table next was undefined when trying transition from [" + table._prevStates[0] + ", " + table._prevStates[1] + "]"));
      }
    });
  });
});

describe("CSMarkovPhraseGenerator", function () {
  "use strict";

  var repetitivePhraseNotes,
    phraseGenerator,
    pitchTable,
    durationTable,
    repetitivePhrase;

  repetitivePhraseNotes = [
    new CS.PhraseNote({
      time: 0,
      duration: 2,
      pitch: 60
    }),
    new CS.PhraseNote({
      time: 2,
      duration: 2,
      pitch: 62
    }),
    new CS.PhraseNote({
      time: 4,
      duration: 2,
      pitch: 64
    }),
    new CS.PhraseNote({
      time: 6,
      duration: 2,
      pitch: 66
    })
  ];

  repetitivePhrase = new CS.Phrase({
    notes: repetitivePhraseNotes
  });

  describe("phrase creation", function () {
    it('should have the proper phrase duration', function () {
      assert.equal(repetitivePhrase.duration, 8, new Error("Phrase did not have proper duration."));
    });
  });

  // prepare to generate new phrase
  pitchTable = new CS.MarkovTable({order: 2});
  durationTable = new CS.MarkovTable({order: 2});
  phraseGenerator = new CS.MarkovPhraseGenerator({
    order: 2,
    pitchTable: pitchTable,
    durationTable: durationTable
  });

  
  describe("incorporate and generate", function () {

    // check state of pitch and duration tables
    it("should have analyzed phrase correctly", function () {

      phraseGenerator.incorporate_phrase(repetitivePhrase);
      
      assert.equal(_.keys(pitchTable._rows).length, 2);

      assert.deepEqual(pitchTable._rows["60->62"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 1,
        "66": 0
      });
      
      assert.deepEqual(pitchTable._rows["62->64"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 0,
        "66": 1
      });

    });

    it("should generate a new phrase", function () {
      var generatedPhrase,
        generatedPhraseNotes,
        note,
        i;

      // generate a phrase that is 8 time-units long
      generatedPhrase = phraseGenerator.generate_phrase(8);
      generatedPhraseNotes = generatedPhrase.get_notes_with_rests();

      // found bug I was looking for while inspecting this
      //console.log("generatedPhraseNotes");
      //console.log(generatedPhraseNotes);

      
    });

  });

});

