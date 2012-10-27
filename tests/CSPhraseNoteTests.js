/*global it, describe */

var assert = require("assert"),
  CSPhraseNote = require("../lib/CSPhraseNote.js").CSPhraseNote;

describe("CSPhraseNote", function () {
  "use strict";

  describe("#set()", function () {
    var note = new CSPhraseNote({
      whooahh: "yes"
    });


    it("should have new attributes", function () {
      note.set("al", "pacino");
      assert.deepEqual(note.attributes(), {
        whooahh: "yes",
        al: "pacino"
      });
    });

    it("should have proper attributes when using object to set", function () {
      note.set({
        "chris": "o'donnel"
      });
      assert.deepEqual(note.attributes(), {
        whooahh: "yes",
        al: "pacino",
        "chris": "o'donnel"
      });
    });

    it('should return proper attributes with get method', function() {
      assert.equal(note.get("al"), "pacino");
      assert.equal(note.get("chris"), "o'donnel");
    });


  });
});
