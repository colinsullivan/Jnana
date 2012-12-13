/**
 *  @file       CS.js 
 *
 *              Base-level namespace for stuff
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";


  var CS,
    post;

  if (typeof require !== "undefined" && require !== null) {
    post = console.log;
  } else {
    post = this.post;
  }
  
  CS = this.CS = {
    DEBUG: true,
    Ableton: {}
  };
  
  CS.post = function (msg) {
    if (CS.DEBUG) {
      post(msg);
    }
  };

}).call(this);
