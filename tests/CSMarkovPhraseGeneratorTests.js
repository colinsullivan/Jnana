/**
 *  @file       CSMarkovPhraseGeneratorTests.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/


var assert = require("assert"),
  CS = require("../lib/CS.js").CS,
  _ = require("../lib/vendor/underscore.js")._;
require("../lib/CSMarkovPhraseGenerator");
require("../lib/CSPhraseAnalyzer");
require("../lib/CSPhrase.js");

describe("CSMarkovPhraseGenerator", function () {
  "use strict";

  var repetitivePhraseNotes,
    repetitivePhrase;

  repetitivePhraseNotes = [
    new CS.PhraseNote({
      time: 0,
      duration: 2,
      pitch: 60,
      velocity: 100
    }),
    new CS.PhraseNote({
      time: 2,
      duration: 2,
      pitch: 62,
      velocity: 100
    }),
    new CS.PhraseNote({
      time: 4,
      duration: 2,
      pitch: 64,
      velocity: 100
    }),
    new CS.PhraseNote({
      time: 6,
      duration: 2,
      pitch: 66,
      velocity: 100
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
  
  describe("analyze phrase", function () {

    var phraseGenerator,
      phraseAnalyzer;
    
    // prepare to generate new phrase
    phraseAnalyzer = new CS.PhraseAnalyzer({
      markovOrder: 2
    });
    phraseGenerator = new CS.MarkovPhraseGenerator({
      phraseAnalyzer: phraseAnalyzer
    });
   
    // incorporate phrase into analysis
    phraseAnalyzer.incorporate_phrase(repetitivePhrase);

    // check state of pitch and duration tables
    it("should have analyzed phrase correctly", function () {

      var pitchTable = phraseAnalyzer._pitchTable;

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

    it("should have analyzed starting probability correctly", function () {
      var pitchTable = phraseAnalyzer._pitchTable;

      assert.equal(_.keys(pitchTable._startingStates._probabilities).length, 1);

      assert.equal(pitchTable._startingStates._probabilities["60->62"], 1.0);

    });



  });
  
  describe("analyze phrase 3rd order", function () {
    var phraseGenerator,
      phraseAnalyzer;
    
    // prepare to generate new phrase
    phraseAnalyzer = new CS.PhraseAnalyzer({
      markovOrder: 3
    });
    phraseGenerator = new CS.MarkovPhraseGenerator({
      phraseAnalyzer: phraseAnalyzer
    });
   
    // incorporate phrase into analysis
    phraseAnalyzer.incorporate_phrase(repetitivePhrase);

    // check state of pitch and duration tables
    it("should have analyzed phrase correctly", function () {
      var pitchTable = phraseAnalyzer._pitchTable;

      assert.equal(_.keys(pitchTable._rows).length, 1);

      assert.deepEqual(pitchTable._rows["60->62->64"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 0,
        "66": 1
      });

    });

    it("should have analyzed initial states correctly", function () {
      var pitchTable = phraseAnalyzer._pitchTable;
      
      assert.equal(_.keys(pitchTable._startingStates._probabilities).length, 1);

      assert.deepEqual(pitchTable._startingStates._probabilities["60->62->64"], 1.0);
    });
    
    it("should generate a new phrase", function () {
      var generatedPhrase,
        generatedPhraseNotes,
        note,
        i;

      // generate a phrase that is 8 time-units long
      generatedPhrase = phraseGenerator.generate_phrase(16);
      generatedPhraseNotes = generatedPhrase.get_notes_with_rests();
    });

  });
  
  describe("analyze phrase 3rd order circular", function () {
    var phraseGenerator,
      phraseAnalyzer;
    
    // prepare to generate new phrase
    phraseAnalyzer = new CS.PhraseAnalyzer({
      markovOrder: 3
    });
    phraseGenerator = new CS.MarkovPhraseGenerator({
      phraseAnalyzer: phraseAnalyzer,
      assumeCircular: true
    });
   
    // incorporate phrase into analysis
    phraseAnalyzer.incorporate_phrase(repetitivePhrase);

    // check state of circular pitch tables
    it("should have analyzed phrase correctly", function () {

      var pitchTable = phraseAnalyzer._circularPitchTable,
        transitions = _.keys(pitchTable._rows);

      assert.equal(
        transitions.length,
        4,
        new Error("Unexpected rows in pitchTable: " + transitions)
      );

      assert.deepEqual(pitchTable._rows["60->62->64"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 0,
        "66": 1
      });

      assert.deepEqual(pitchTable._rows["62->64->66"]._probabilities, {
        "60": 1,
        "62": 0,
        "64": 0,
        "66": 0
      });
      
      assert.deepEqual(pitchTable._rows["64->66->60"]._probabilities, {
        "60": 0,
        "62": 1,
        "64": 0,
        "66": 0
      });

      assert.deepEqual(pitchTable._rows["66->60->62"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 1,
        "66": 0
      });

    });
    
    // check state of non-circular pitch tables
    it("should have analyzed non-circular phrase correctly", function () {

      var pitchTable = phraseAnalyzer._pitchTable,
        transitions = _.keys(pitchTable._rows);

      assert.equal(
        transitions.length,
        1,
        new Error("Unexpected rows in pitchTable: " + transitions)
      );

      assert.deepEqual(pitchTable._rows["60->62->64"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 0,
        "66": 1
      });

    });
    
    it("should have analyzed initial states correctly", function () {
      var pitchTable = phraseAnalyzer._circularPitchTable;

      assert.equal(_.keys(pitchTable._startingStates._probabilities).length, 1);

      assert.deepEqual(pitchTable._startingStates._probabilities["60->62->64"], 1.0);
    });
    
    it("should generate a new phrase", function () {
      var generatedPhrase,
        generatedPhraseNotes,
        note,
        i;

      // generate a phrase that is 8 time-units long
      generatedPhrase = phraseGenerator.generate_phrase(16);
      generatedPhraseNotes = generatedPhrase.get_notes_with_rests();
    });

  });
  
  describe("analysis of multiple phrases", function () {

    var phraseGenerator,
      phraseAnalyzer,
      anotherPhraseNotes,
      anotherPhrase;
    
    // prepare to generate new phrase
    phraseAnalyzer = new CS.PhraseAnalyzer({
      markovOrder: 2
    });
    phraseGenerator = new CS.MarkovPhraseGenerator({
      phraseAnalyzer: phraseAnalyzer
    });
   
    // incorporate phrase into analysis
    phraseAnalyzer.incorporate_phrase(repetitivePhrase);
    
    anotherPhraseNotes = [
      new CS.PhraseNote({
        time: 0,
        duration: 2,
        pitch: 62,
        velocity: 100
      }),
      new CS.PhraseNote({
        time: 2,
        duration: 2,
        pitch: 64,
        velocity: 100
      }),
      new CS.PhraseNote({
        time: 4,
        duration: 2,
        pitch: 66,
        velocity: 100
      }),
      new CS.PhraseNote({
        time: 6,
        duration: 2,
        pitch: 68,
        velocity: 100
      })
    ];

    anotherPhrase = new CS.Phrase({
      notes: anotherPhraseNotes
    });

    phraseAnalyzer.incorporate_phrase(anotherPhrase);

    // check state of pitch and duration tables
    it("should have analyzed phrase correctly", function () {

      var pitchTable = phraseAnalyzer._pitchTable;

      assert.equal(_.keys(pitchTable._rows).length, 3);

      assert.deepEqual(pitchTable._rows["60->62"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 1,
        "66": 0,
        "68": 0
      });
      
      assert.deepEqual(pitchTable._rows["62->64"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 0,
        "66": 1,
        "68": 0
      });
      
      assert.deepEqual(pitchTable._rows["64->66"]._probabilities, {
        "60": 0,
        "62": 0,
        "64": 0,
        "66": 0,
        "68": 1
      });

    });

    it("should have analyzed starting probability correctly", function () {
      var pitchTable = phraseAnalyzer._pitchTable;
      
      assert.equal(_.keys(pitchTable._startingStates._probabilities).length, 2);

      assert.equal(pitchTable._startingStates._probabilities["60->62"], 0.5);
      assert.equal(pitchTable._startingStates._probabilities["62->64"], 0.5);

    });
    
    it("should generate a new phrase", function () {
      var generatedPhrase,
        generatedPhraseNotes,
        note,
        i;

      // generate a phrase that is 8 time-units long
      generatedPhrase = phraseGenerator.generate_phrase(16);
      generatedPhraseNotes = generatedPhrase.get_notes_with_rests();
    });

  });

  describe("generating phrase", function() {
    var phraseGenerator,
      phraseAnalyzer,
      generatedPhrase,
      generatedPhraseNotes,
      phrasePitches;
    
    // prepare to generate new phrase
    phraseAnalyzer = new CS.PhraseAnalyzer({
      markovOrder: 2
    });
    phraseGenerator = new CS.MarkovPhraseGenerator({
      phraseAnalyzer: phraseAnalyzer,
      useInitialNotes: true
    });
   
    // incorporate phrase into analysis
    phraseAnalyzer.incorporate_phrase(repetitivePhrase);

    // generate a phrase that is 8 time-units long
    generatedPhrase = phraseGenerator.generate_phrase(16);
    generatedPhraseNotes = generatedPhrase.get_notes_with_rests();
    phrasePitches = _.pluck(
      _.invoke(generatedPhraseNotes, "attributes"),
      "pitch"
    );
    
    it("should generate proper notes", function () {
      // initial notes can only be one thing because input is so simple
      assert.equal(phrasePitches[0], 60);
      assert.equal(phrasePitches[1], 62);
      assert.equal(phrasePitches[2], 64);
    });
    
  });

});
