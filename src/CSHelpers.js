/**
 *  @file       CSHelpers.js 
 *
 *              Misc functions to help with Max/MSP deficiencies, et. al.
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

var print_object = function (obj) {
  var key;

  for (key in obj) {
    CS.post("obj[" + key + "]:\n");
    CS.post(obj[key]);
    CS.post("\n");   
  }
};

var error_aware_callback = function (cb) {
  return function () {
    try {
      cb.apply(this, arguments);
    } catch (err) {
      post("\n--------\nERROR:\n--------\n");
      post(err.fileName + ":" + err.lineNumber + "\n" + err.message);
    }
  };
};

/**
 *  Might return true, might return false.
 **/
var maybe = function () {
  return (Math.random() <= 0.5);
}

if (typeof exports !== "undefined" && exports !== null) {
  exports.maybe = maybe;
}
