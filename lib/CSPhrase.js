/*jslint sloppy: true */

// ghetto import
var CSPhrase = CSPhrase;
if (typeof require !== "undefined" && require !== null) {
  CSPhrase = require("./CSPhrase.js").CSPhrase;
}

/**
 *  @class  CSPhrase  A collection of notes with timestamps that will be
 *  analyzed as a single unit.
 *
 *  @param  Array  params.notes  Notes in this phrase; `CSPhraseNote` instances.
 **/
CSPhrase = function (params) {
  if (typeof params === "undefined" || params === null) {
    throw new Error("params is undefined");
  }

  if (typeof params.notes === "undefined" || params.notes === null) {
    throw new Error("params.notes is undefined");
  }
  this._notes = params.notes;


};

CSPhrase.prototype = {

};

if (typeof exports !== "undefined" && exports !== null) {
  exports.CSPhrase = CSPhrase;
}
