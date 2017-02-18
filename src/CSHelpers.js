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

exports = {
  print_object: function (obj) {
    var key;

    for (key in obj) {
      post("obj[" + key + "]:\n");
      post(obj[key]);
      post("\n");   
    }
  },

  error_aware_callback: function (cb) {
    return function () {
      try {
        cb.apply(this, arguments);
      } catch (err) {
        post("\n--------\nERROR:\n--------\n");
        post(err.fileName + ":" + err.lineNumber + "\n" + err.message);
      }
    };
  },

  /**
   *  Might return true, might return false.
   **/
  maybe: function () {
    return (Math.random() <= 0.5);
  },
  post: function (msg) {
    post(msg);
  }

};
