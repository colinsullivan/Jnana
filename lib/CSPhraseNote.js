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

    var attrs = this._attributes;

    if (typeof attrs[attrName] === "undefined" || attrs[attrName] === null) {
      throw new Error("this._attributes[" + attrName + "] is undefined");
    }

    return attrs[attrName];
  },

  set: function (attrNameOrAttrsToSet, attrValueOrNull) {
    var attrName,
      attrValue,
      attrsToSet;

    if (typeof attrNameOrAttrsToSet === "object") {
      attrsToSet = attrNameOrAttrsToSet;
    } else if (typeof attrNameOrAttrsToSet === "string") {
      attrsToSet = {};
      attrsToSet[attrNameOrAttrsToSet] = attrValueOrNull;
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
