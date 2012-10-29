/*global it, describe */

var assert = require("assert"),
  CS = require("../lib/CS.js").CS;
require("../lib/CSPhraseNote.js");

describe("CSPhraseNote", function () {
  "use strict";

  describe("#set()", function () {
    var note = new CS.PhraseNote({
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

    it("should return proper attributes with get method", function () {
      assert.equal(note.get("al"), "pacino");
      assert.equal(note.get("chris"), "o'donnel");
    });

    it("should not calculate duration if only onTime is set", function () {
      note.set("onTime", 5);
      assert.equal(typeof note.attributes().duration, "undefined");
    });

    it("should only calculate duration after both ontime and offtime are set", function () {
      note.set("offTime", 10);
      assert.equal(typeof note.attributes().duration, "number");
    });


  });
});
