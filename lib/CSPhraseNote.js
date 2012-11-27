(function () {
  "use strict";
  
  var _, CS, PhraseNote, root = this;

  if (typeof require !== "undefined" && require !== null) {
    root._ = require("./vendor/underscore.js")._;
    CS = require("./CS.js").CS;
  } else {
    CS = this.CS;
  }
  
  CS.PhraseNote = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }
    this._attributes = root._.clone(params);
  };

  CS.PhraseNote.prototype = {

    get: function (attrName) {
      return this._attributes[attrName];
    },

    set: function (attrNameOrAttrsToSet, attrValueOrNull) {
      var attrName,
        attrValue,
        attrsToSet,
        onTime,
        offTime,
        _ = root._;

      if (typeof attrNameOrAttrsToSet === "object") {
        attrsToSet = attrNameOrAttrsToSet;
      } else if (typeof attrNameOrAttrsToSet === "string") {
        attrsToSet = {};
        attrsToSet[attrNameOrAttrsToSet] = attrValueOrNull;
      }

      /*// if we're changing timestamps
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
      }*/
      
      _.extend(this._attributes, attrsToSet);
    },

    attributes: function () {
      return root._.clone(this._attributes);
    }

  };
  
}).call(this);

