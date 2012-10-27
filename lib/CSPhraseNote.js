/*jslint sloppy: true */
/*global _*/

// ghetto import
var CSPhraseNote = CSPhraseNote,
  _ = _;
if (typeof require !== "undefined" && require !== null) {
  CSPhraseNote = require("./CSPhraseNote.js").CSPhraseNote;
  _ = require("../lib/vendor/underscore.js")._;
}


CSPhraseNote = function (params) {

  if (typeof params === "undefined" || params === null) {
    params = {};
  }
  this._attributes = params;
};

CSPhraseNote.prototype = {

  get: function (attrName) {
    return this._attributes[attrName];
  },

  set: function (attrNameOrAttrsToSet, attrValueOrNull) {
    var attrName,
      attrValue,
      attrsToSet,
      onTime,
      offTime;

    if (typeof attrNameOrAttrsToSet === "object") {
      attrsToSet = attrNameOrAttrsToSet;
    } else if (typeof attrNameOrAttrsToSet === "string") {
      attrsToSet = {};
      attrsToSet[attrNameOrAttrsToSet] = attrValueOrNull;
    }

    // if we're changing timestamps
    if (_.has(attrsToSet, "onTime") || _.has(attrsToSet, "offTime")) {
      onTime = attrsToSet.onTime || this.get("onTime");
      offTime = attrsToSet.offTime || this.get("offTime");

      // and we have both timestamps, recalculate duration
      if (
        typeof offTime !== "undefined" && offTime !== null
          && typeof onTime !== "undefined" && onTime !== null
      ) {
        attrsToSet.duration = (offTime - onTime);
      }
    }
    
    _.extend(this._attributes, attrsToSet);
  },

  attributes: function () {
    return _.clone(this._attributes);
  }

};

if (typeof exports !== "undefined" && exports !== null) {
  exports.CSPhraseNote = CSPhraseNote;
}
