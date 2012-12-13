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
//     Underscore.js 1.4.2
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.4.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return arguments.length > 2 ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // with specific `key:value` pairs.
  _.where = function(obj, attrs) {
    if (_.isEmpty(attrs)) return [];
    return _.filter(obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (obj.length === +obj.length) return slice.call(obj);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) {
          result = func.apply(context, args);
        }
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        throttling = true;
        result = func.apply(context, args);
      }
      whenDone();
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + (0 | Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });
      source +=
        escape ? "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'" :
        interpolate ? "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'" :
        evaluate ? "';\n" + evaluate + "\n__p+='" : '';
      index = offset + match.length;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);
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
/**
 *  @file       CSPhraseNote.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";
  
  var _, CS, PhraseNote, root = this;

  if (typeof require !== "undefined" && require !== null) {
    root._ = require("./vendor/underscore.js")._;
    CS = require("./CS.js").CS;
  } else {
    CS = this.CS;
  }
 
  /**
   *  @class    CS.PhraseNote   Simple encapsulation around properties of
   *  the note such as velocity, pitch, etc.
   **/
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

/**
 *  @file       CSPhrase.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS, root = this;

  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSPhraseNote.js");
    this._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
  }
  
  /**
   *  @class  CS.Phrase  A collection of notes with timestamps.
   *
   *  @param  Array  params.notes  Notes in this phrase; `CS.PhraseNote` instances.
   **/
  CS.Phrase = function (params) {
    var lastNote;

    if (typeof params === "undefined" || params === null) {
      throw new Error("params is undefined");
    }

    if (typeof params.notes === "undefined" || params.notes === null) {
      throw new Error("params.notes is undefined");
    }
    this._notes = params.notes;

    if (typeof params.duration === "undefined" || params.duration === null) {
      // determine duration of phrase based on notes.
      this.duration = 0;
      if (this._notes.length) {

        // duration of phrase is end time of last note
        lastNote = this._notes[this._notes.length - 1];

        this.duration = lastNote.get("time") + lastNote.get("duration");
        CS.post("this.duration:\n");
        CS.post(this.duration);
        CS.post("\n");
      }
    } else {
      // assume user of API knows duration of phrase
      this.duration = params.duration;
    }



  };

  CS.Phrase.prototype = {

    /**
     *  Returns a list of notes in the phrase.
     **/
    get_notes: function () {
      return root._.clone(this._notes);
    },

    /**
     *  Returns a list of the notes in the phrase, but with additional
     *  notes with a pitch of -1 each time a rest is found.
     **/
    get_notes_with_rests: function () {
      var lastNoteEndTime,
        notesWithRests = [],
        notes = this._notes,
        note,
        gapDuration,
        i;

      // create rests (note with pitch of -1) for each empty space
      lastNoteEndTime = notes[0].get("time") + notes[0].get("duration");
      notesWithRests.push(notes[0]);
      for (i = 1; i < notes.length; i++) {
        note = notes[i];

        // if there was a gap between the end of the last note and the start
        // of this note, we need to insert a rest for that duration
        gapDuration = note.get("time") - lastNoteEndTime;
        if (gapDuration > 0.05) {
          notesWithRests.push(new CS.PhraseNote({
            pitch: -1,
            duration: gapDuration,
            time: lastNoteEndTime,
            velocity: 0,
            muted: true
          }));
        }

        lastNoteEndTime = note.get("time") + note.get("duration");
        notesWithRests.push(note);
      }

      return notesWithRests;
      
    },

    notes: function () {
      return root._.clone(this._notes);
    }

  };

}).call(this);

/**
 *  @file       CSAbletonClip.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSPhrase.js");
    require("./CSPhraseNote.js");
  } else {
    CS = this.CS;
  }

 /**
  *   @class  CS.Ableton.Clip  Parsing and instantiation of Ableton clip
  *   information into JavaScript data structures.
  *
  *   @param  Clip          clip              The clip to analyze
  **/
  CS.Ableton.Clip = function (params) {
    if (typeof params === "undefined" || params === null) {
      // assuming constructor was used as super class
      return;
    }

    if (typeof params.clip === "undefined" || params.clip === null) {
      throw new Error("params.clip is undefined");
    }
    /**
     *  Reference to the `LiveAPI` instance pointing to the clip in Ableton.
     **/
    this._clip = params.clip;

    /**
     *  Keep track of loop length as it was originally.  Useful when generating
     *  new clip so length of loop doesn't drift.
     **/
    this.loopLength = this._clip.get("length")[0];

    /**
     *  `CSPhrase` instance populated with parsed note data from Ableton.
     **/
    this.phrase = new CS.Phrase({
      notes: this.fetch_notes()
    });

  };

  CS.Ableton.Clip.prototype = {

    fetch_notes: function () {
      var name,
        rawNotes,
        maxNumNotes,
        notes = [],
        noteProperties,
        note,
        i,
        clip = this._clip;


      if (Number(clip.id) === 0) {
        // no clip was present
        return false;
      }

      name = clip.get("name");

      CS.post("\n--------\nFetching: " + name + "\n--------\n");
     
      CS.post("calling `select_all_notes`\n");
      clip.call("select_all_notes");

      CS.post("calling `get_selected_notes`\n");
      rawNotes = clip.call("get_selected_notes");
      
      // grab maxNumNotes
      if (rawNotes[0] !== "notes") {
        CS.post("Unexpected note output!\n");
        return;
      }

      // this is the maximum number of notes because Ableton doesn't report
      // accurate data especially when there is a large amount of notes
      // in the clip.
      maxNumNotes = rawNotes[1];

      // remove maxNumNotes
      rawNotes = rawNotes.slice(2);

      CS.post("rawNotes.length:\n");
      CS.post(rawNotes.length);
      CS.post("\n");

      CS.post("maxNumNotes * 6:\n");
      CS.post(maxNumNotes * 6);
      CS.post("\n");

      if (maxNumNotes === 0) {
        return [];
      }

      CS.post("extracting notes\n");

      for (i = 0; i < (maxNumNotes * 6); i += 6) {
        // extract note properties from array given from Ableton
        noteProperties = {
          pitch: rawNotes[i + 1],
          time: rawNotes[i + 2],
          duration: rawNotes[i + 3],
          velocity: rawNotes[i + 4],
          muted: rawNotes[i + 5] === 1
        };

        // if this is a valid note
        if (
          rawNotes[i] === "note" &&
            typeof(noteProperties.pitch) === "number" &&
              typeof(noteProperties.time) === "number" &&
                typeof(noteProperties.duration) === "number" &&
                  typeof(noteProperties.velocity) === "number" &&
                    typeof(noteProperties.muted) === "boolean"
        ) {
          note = new CS.PhraseNote(noteProperties);
          notes.push(note);
        }
      }

      if (notes.length !== maxNumNotes) {
        CS.post("Error parsing note data!\n\tGot " + notes.length + " notes but expected " + maxNumNotes + " notes.");
        throw new Error("Error parsing note data!\n\tGot " + notes.length + " notes but expected " + maxNumNotes + " notes.");
      }

      CS.post("organizing notes...");

      // sort notes by time
      notes.sort(function (a, b) {
        return (a.get("time") <= b.get("time")) ? -1 : 1;
      });

      return notes;
      
    }
  
  };

}).call(this);
/**
 *  @file       CSProbabilityVector.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS, root = this;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    root._ = this._;
  }


  /**
   *  @class  CS.ProbabilityVector    Encapsulates logic for a listing of
   *  probabilities associated with keys and choosing a key based on those
   *  probabilities.
   **/
  CS.ProbabilityVector = function (params) {
    
    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    // column keys
    this._columns = [];
    
    // cells in this row of the table (keyed by destination state)
    // normalized probabilities
    this._probabilities = {};

    // unnormalized occurrence data.  Each time this is changed,
    // probabilities will be re-calculated.
    this._occurrences = {};

    // maintain sum of all occurrences (sum of `this._occurrences`)
    this._totalOccurrences = 0;
    
  };

  CS.ProbabilityVector.prototype = {
    get_probability: function (destState) {
      return this._probabilities[destState];
    },
    
    set_even_probability: function () {
      var destStates = this._columns,
        destState,
        i,
        occurrences = {},
        totalOccurrences = 0;

      for (i = 0; i < destStates.length; i++) {
        destState = destStates[i];
        occurrences[destState] = 1;
        totalOccurrences += 1;
      }
      this._occurrences = occurrences;
      this._totalOccurrences = totalOccurrences;
      this._calculate_probabilities();
    },
    

    add_occurrence: function (columnKey) {

      var probs = this._probabilities,
        _ = root._;

      // if this column doesn't exist, add it
      if (_.indexOf(this._columns, columnKey) === -1) {
        this._add_column(columnKey);
      }
      
      // increase probability of this destination state
      this._occurrences[columnKey] += 1;
      this._totalOccurrences += 1;

      // calculate new probabilities
      this._calculate_probabilities();
      
    },

    /**
     *  Choose a column based on the probabilities in this row.
     **/
    choose_column: function () {
      var i,
        prob,
        probSum = 0.0,
        seed = Math.random(),
        chosenCol,
        cols = this._columns;

      for (i = 0; i < cols.length; i++) {
        prob = this.get_probability(cols[i]);

        probSum += prob;

        if (seed <= probSum) {
          chosenCol = cols[i];
          break;
        }

      }

      return chosenCol;
      
    },
    
    _calculate_probabilities: function () {
      var destState,
        destStates = this._columns,
        occs = this._occurrences,
        probs = {},
        totalOccs = this._totalOccurrences,
        i;

      for (i = 0; i < destStates.length; i++) {
        destState = destStates[i];
        probs[destState] = (occs[destState] / totalOccs);
      }
      this._probabilities = probs;
    },
    
    /**
     *  Called from table when new destination state was found.
     **/
    _add_column: function (destState) {
      this._columns.push(destState);
      this._occurrences[destState] = 0;
      this._probabilities[destState] = 0.0;
    }
  
  };
  
}).call(this);
/**
 *  @file       CSMarkovTableRow.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSProbabilityVector.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CSMarkovTableRow  Represents a single row within a markov table.
   *  
   *  @param  CSMarkovTable  params.table  The table which this row belongs to.
   **/
  CS.MarkovTableRow = function (params) {

    var table,
      i,
      destState;

    CS.ProbabilityVector.apply(this, arguments);

    if (typeof params.table === "undefined" || params.table === null) {
      throw new Error("params.table is undefined");
    }
    this._table = table = params.table;

    if (typeof params.prevStates === "undefined" || params.prevStates === null) {
      throw new Error("params.prevStates is undefined");
    }
    // the array of previous states that are used as the key to this row in the
    // table.
    this._prevStates = params.prevStates;

    // initialize with table's current destination states.  Table will
    // inform us when there are more discovered.
    for (i = 0; i < table._destStates.length; i++) {
      destState = table._destStates[i];
      this._add_column(destState);
    }

  };

  CS.MarkovTableRow.prototype = new CS.ProbabilityVector({});

  CS.MarkovTableRow.prototype.add_transition = function (transitionData) {
    var destState = transitionData[transitionData.length - 1];

    this.add_occurrence(destState);

  };
  
}).call(this);

/**
 *  @file       CSMarkovTable.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";
  
  var CS, root = this;

  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovTableRow.js");
    require("./CSHelpers.js");
    require("./CSProbabilityVector.js");
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
  }


  /**
   *  @class  CSMarkovTable   A general Markov table implementation.
   **/
  CS.MarkovTable = function (params) {
    var order;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.order === "undefined" || params.order === null) {
      throw new Error("params.order is undefined");
    }
    this._order = order = params.order;

    /**
     *  @type Object
     *  Rows of table keyed by chained previous states, used when finding
     *  a destination state based on previous states.
     **/
    this._rows = null;

    /**
     *  @type Array
     *  Rows of table in a list used when iterating over all rows
     **/
    this._rowsList = null;

    /**
     *  @type Array
     *  Destination states (the table's column keys)
     **/
    this._destStates = null;

    /**
     *  Basically a `MarkovTableRow` that keeps track of which rows of this
     *  table have a higher probability of being starting rows.
     **/
    this._startingStates = null;

    // this will initialize above properties to their appropriate initial
    // values.
    this.clear();
  };

  CS.MarkovTable.prototype = {
    /**
     *  Clear all probabilities and analysis.  Should be called
     *  initially and whenever analysis is to be cleared out.
     **/
    clear: function () {
      this._rows = {};
      this._rowsList = [];
      this._destStates = [];
      this._startingStates = new CS.ProbabilityVector({});
    },
    add_transition: function (transitionData) {
      var row, i;

      // get proper row in table
      row = this._get_or_create_row_from_transition(transitionData);

      // ensure all rows have any new possible destination states
      for (i = 0; i < transitionData.length; i++) {
        this._add_column(transitionData[i]);
      }

      // add transition to it
      row.add_transition(transitionData);
    },

    /**
     *  The `CSMarkovTable` instance has the ability to track the
     *  statistics of initial states of the system to use for
     *  choosing the initial state of a generated traversal through
     *  the states.
     **/
    add_initial_transition: function (transitionData) {
      // the probability of using these initial states will be higher.
      
      var key = this._generate_row_key_from_transition(transitionData);

      this._startingStates.add_occurrence(key);

      this.add_transition(transitionData);
    
    },

    /**
     *  Given the transition data, generate key used to find applicable
     *  row in table.  The first N - 1 elements in the `transitionData`
     *  array are the previous states (in order), and the Nth element
     *  is the destination state.  For example, in a second-order 
     *  chain, the transitionData array that looks like this:
     *
     *    [61, 63, 65]
     *
     *  means 61 -> 63 determine the row in the table and 65 determines
     *  the column.  They key for this example would be the following
     *  string:
     *
     *    "61->63"
     *
     *  @param  Array  transitionData   The transition information.
     **/
    _generate_row_key_from_transition: function (transitionData) {
      // key only depends on prev states
      return this._generate_row_key_from_prev_states(
        transitionData.slice(0, -1)
      );
    },
    _generate_row_key_from_prev_states: function (prevStates) {
      // concatenate all prev states with "->"
      return prevStates.join("->");
    },
    _get_row_from_prev_states: function (prevStates) {
      var key = this._generate_row_key_from_prev_states(prevStates),
        row = this._rows[key];

      // if row has not yet been created
      if (typeof row === "undefined" || row === null) {
        row = new CS.MarkovTableRow({
          order: this._order,
          table: this,
          prevStates: prevStates
        });
        this._rows[key] = row;
        this._rowsList.push(row);
        row.set_even_probability();
      }

      return row;
    },
    _get_or_create_row_from_transition: function (transitionData) {

      var key = this._generate_row_key_from_transition(transitionData),
        rows = this._rows,
        row = rows[key];

      // create row if it doesn't exist
      if (typeof row === "undefined" || row === null) {
        row = new CS.MarkovTableRow({
          order: this._order,
          table: this,
          prevStates: transitionData.slice(0, -1)
        });
        this._rowsList.push(row);
        rows[key] = row;
      }

      return row;
    },
    /**
     *  Called from row when a new destination state is found.
     **/
    _add_column: function (destState) {
      var i,
        rows = this._rowsList,
        destStates = this._destStates;

      // if this destination state has not been seen
      if (destStates.indexOf(destState) < 0) {
        // add to list of destination states
        destStates.push(destState);

        // inform all existing rows that there is a new destination state
        for (i = 0; i < rows.length; i++) {
          rows[i]._add_column(destState);
        }
      }
    },
    /**
     *  Print table to Max window for debugging.
     **/
    print: function () {
      var i, key, row, prob,
        columnSpacer = "\t\t\t\t\t\t";

      CS.post("\n--------\nCSMarkovTable Contents:\n--------\n");
      // column headers
      CS.post("\t\t\t\t\t\t\t\t\t\t\t\t\t" + columnSpacer);
      for (i = 0; i < this._destStates.length; i++) {
        CS.post(this._destStates[i] + columnSpacer + "\t\t\t\t\t");
      }
      CS.post("\n");

      // rows
      for (key in this._rows) {
        CS.post(key);

        row = this._rows[key];

        for (i = 0; i < this._destStates.length; i++) {
          prob = row._probabilities[this._destStates[i]];
          CS.post(columnSpacer + prob.toFixed(2) + "\t\t");
        }

        CS.post("\n");
      }

      CS.post("\n--------\n");
    }
  };

}).call(this);


/**
 *  @file       CSMarkovStateMachine.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS, root = this;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
  }

  CS.MarkovStateMachine = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.table === "undefined" || params.table === null) {
      throw new Error("params.table is undefined");
    }
    this._table = params.table;

    /**
     *  @type Number
     *  The order of this state machine is the same as the order of the
     *  associated table.
     **/
    this._order = this._table._order;
  
    /**
     *  @type Array
     *  Previous N states leading up to the state table is currently in.
     **/
    this._prevStates = null;

    this.clear();
  
  };
  
  CS.MarkovStateMachine.prototype = {

    clear: function () {
      this._prevStates = [];
    },
    
    /**
     *  Start markov state machine by choosing a starting state.
     *
     *  @param  Boolean  useStartingAnalysis=true  By default, this function
     *  will use the analysis it has created of initial_transitions as
     *  tracked by the `add_initial_transition` method.  Set this argument
     *  to `false` to simply choose a random starting path in the system.
     *  @return Array   List of the previous states leading up to the
     *  machine's current state.
     **/
    start: function (useStartingAnalysis) {
      var startingRowKey,
        startingRow,
        table = this._table,
        _ = root._;

      if (typeof useStartingAnalysis === "undefined" || useStartingAnalysis === null) {
        useStartingAnalysis = true;
      }

      if (useStartingAnalysis) {
        CS.post("generating using starting analysis\n");
        startingRowKey = table._startingStates.choose_column();
        startingRow = table._rows[startingRowKey];
      } else {
        CS.post("generating without starting analysis\n");
        // choose a random starting row in the table
        startingRow = table._rowsList[_.random(table._rowsList.length - 1)];
      }

      this._prevStates = startingRow._prevStates;
      return _.clone(this._prevStates);
    },
    
    /**
     *  Advance machine to next state, and return this state.
     *  
     *  @return   Any    The current state of the machine (could be any
     *  datatype)
     **/
    next: function () {
      var row,
        nextState,
        table = this._table;

      // if there are previous states, use them
      if (this._prevStates.length) {
        row = table._get_row_from_prev_states(this._prevStates);
      // if not, just choose a random row and set prev states
      // (this will only happen on first run)
      } else {
        throw new Error(
          "No previous states. Try calling `start` on the MarkovStateMachine first."
        );
      }

      // get new state
      nextState = row.choose_column();

      // update prevStates
      this._prevStates = this._prevStates.slice(1);
      this._prevStates.push(nextState);

      return nextState;
    },

    /**
     *  Switch this state machine's table.  If the new table does not have
     *  a path that the machine can take given its current `_prevStates`, it
     *  will be given a random destination state when the row is created.  This
     *  could be undesirable and thus switching tables in the middle of a
     *  generating phrase is discouraged.
     *
     *  @param  MarkovTable  newTable
     **/
    switch_table: function (newTable) {
      this._table = newTable;
    }
  };

}).call(this);
/**
 *  @file       CSMarkovMultiStateMachine.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";


  var CS;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovStateMachine.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CSMarkovMultiStateMachine  Utilizes multiple `MarkovStateMachine`
   *  instances to generate a conglomerate state where each table generates
   *  the property that it is responsible for.
   **/
  CS.MarkovMultiStateMachine = function (params) {
    var key;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    /**
     *  @type   Object
     *  `CS.MarkovStateMachine` instances that will be used to generate
     *  state events, keyed by the event parameter that the state machine
     *  will be mapped to.
     **/
    this._machines = {};

    /**
     *  @type   Array
     *  Keys to use as state event property names.
     **/
    this._stateKeys = [];
  };

  CS.MarkovMultiStateMachine.prototype = {
    /**
     *  Creates a state machine for a given MarkovTable instance.
     *
     *  @param  String        propertyName  The name of the property on the
     *  state event that the table will be used to generate.
     *  @param  MarkovTable   propertyTable  The table used to generate the
     *  given property on the state event.
     **/
    add_table: function (propertyName, propertyTable) {
      this._stateKeys.push(propertyName);
      this._machines[propertyName] = new CS.MarkovStateMachine({
        table: propertyTable
      });
    },

    /**
     *  Switch a state machine's `MarkovTable` reference.  Useful if we want
     *  to switch to using a circular analysis, for example.
     *
     *  @param  String        propertyName      The table key we are switching
     *  @param  MarkovTable   newPropertyTable  Reference to new table
     **/
    switch_table: function (propertyName, newPropertyTable) {
      this._machines[propertyName].switch_table(newPropertyTable);
    },
   
    /**
     *  Restart each state machine.
     **/
    start: function () {
      return this._each_machine_do("start", arguments);
    },

    /**
     *  Generate and return next state from each MarkovStateMachine.
     **/
    next: function () {
      return this._each_machine_do("next");
    },

    _each_machine_do: function (methodName, args) {
      var state = {},
        stateKeys = this._stateKeys,
        machines = this._machines,
        machine,
        key,
        i;

      // for each table, generate state
      for (i = 0; i < stateKeys.length; i++) {
        key = stateKeys[i];
        machine = machines[key];

        state[key] = machine[methodName].apply(machine, args);
      }

      return state;
    }
  };
  
}).call(this);

/**
 *  @file       CSPhraseAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS,
    _,
    root = this;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovMultiStateMachine.js");
    require("./CSMarkovTable.js");
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    _ = this._;
  }

  /**
   *  @class    CS.PhraseAnalyzer   Maintains statistics of incoming
   *  phrases.  Provides API for `PhraseGenerator` instances to grab
   *  statistics they need to generate new phrases.
   **/
  CS.PhraseAnalyzer = function (params) {
    var markovParams;


    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.markovOrder === "undefined" || params.markovOrder === null) {
      params.markovOrder = 3;
    }
    this._markovOrder = params.markovOrder;

    markovParams = {order: this._markovOrder};

    /**
     *  Markov tables to store statistics of incoming input.
     **/
    this._pitchTable              = new CS.MarkovTable(markovParams);
    this._durationTable           = new CS.MarkovTable(markovParams);
    this._velocityTable           = new CS.MarkovTable(markovParams);

    /**
     *  Markov tables to store statistics of incoming input in a 
     *  circular fashion.
     **/
    this._circularPitchTable      = new CS.MarkovTable(markovParams);
    this._circularDurationTable   = new CS.MarkovTable(markovParams);
    this._circularVelocityTable   = new CS.MarkovTable(markovParams);

    /**
     *  Statistics of beginning of phrase.  Basically a `MarkovTableRow` that
     *  keeps track of which rows of the tables above have a higher
     *  probability of being starting rows.
     **/

  };

  /**
   *  Incorporate an input phrase into the current analysis.
   *
   *  @param  CS.Phrase  phrase   The phrase to incorporate.
   **/
  CS.PhraseAnalyzer.prototype.incorporate_phrase = function (phrase) {
    var phraseNotesWithRests,
      phraseNotesWithRestsData,
      order = this._markovOrder,
      phraseNotes,
      phraseNotesData,
      phrasePitches,
      phraseDurations,
      phraseVelocities,
      startStateIndex,
      endStateIndexPlusOne,
      pitchTable = this._pitchTable,
      durationTable = this._durationTable,
      velocityTable = this._velocityTable,
      circularPitchTable = this._circularPitchTable,
      circularDurationTable = this._circularDurationTable,
      circularVelocityTable = this._circularVelocityTable,
      i,
      wrapIndex,
      _ = root._;

    phraseNotes = phrase.get_notes();
    phraseNotesWithRests = phrase.get_notes_with_rests();

    // convert note class to key-value data of attributes
    phraseNotesWithRestsData = _.invoke(phraseNotesWithRests, "attributes");
    phraseNotesData = _.invoke(phraseNotes, "attributes");

    // and grab array of pitches and durations since we'll need those
    phrasePitches = _.pluck(phraseNotesWithRestsData, "pitch");
    phraseDurations = _.pluck(phraseNotesWithRestsData, "duration");

    // don't care about the velocity of rests because it is inherently
    // encoded in the pitches and durations of the rest notes generated,
    // therefore we don't include rests in analysis of velocity attributes.
    phraseVelocities = _.pluck(phraseNotesData, "velocity");

    // Analyze every N + 1 note sequence, where N is the order of the 
    // system.  For example, if order == 2 this will grab every
    // 3 notes to incorporate the two previous states and one future
    // state into analysis.  This will leave out notes at end of
    // phrase that will not fit into an N + 1 sequence.
    
    // first, incorporate initial N notes.
    pitchTable.add_initial_transition(
      phrasePitches.slice(0, order + 1)
    );
    
    durationTable.add_initial_transition(
      phraseDurations.slice(0, order + 1)
    );

    circularPitchTable.add_initial_transition(
      phrasePitches.slice(0, order + 1)
    );

    circularDurationTable.add_initial_transition(
      phraseDurations.slice(0, order + 1)
    );

    for (i = order + 1; i < phraseNotesWithRestsData.length; i++) {
      startStateIndex = i - order;
      endStateIndexPlusOne = i + 1;

      // extract pitch attributes
      pitchTable.add_transition(
        phrasePitches.slice(startStateIndex, endStateIndexPlusOne)
      );
      circularPitchTable.add_transition(
        phrasePitches.slice(startStateIndex, endStateIndexPlusOne)
      );

      durationTable.add_transition(
        phraseDurations.slice(startStateIndex, endStateIndexPlusOne)
      );
      circularDurationTable.add_transition(
        phraseDurations.slice(startStateIndex, endStateIndexPlusOne)
      );
    }

    // if we want to consider phrases to be circular, we need to additionally
    // incorporate sequences where the starting note is up to the last note in 
    // the phrase.
    
    // starting at next `startStateIndex` and going until the 
    // last note in the phrase, analyze each N + 1 note sequence just
    // as before, but now wrap around
    for (startStateIndex = i - order; startStateIndex < phraseNotesWithRestsData.length; startStateIndex++) {
     
      // endStateIndex is probably the last note in the phrase.
      endStateIndexPlusOne = Math.min(startStateIndex + order + 1, phraseNotesWithRestsData.length + 1);
      // this is the note from the beginning of the phrase that we've
      // wrapped around to in order to get our Nth order transition.
      wrapIndex = order + 1 - (endStateIndexPlusOne - startStateIndex) + 1;

      // ex:
      //    
      //    phraseNotes = [60, 62, 64, 66];
      //    order = 3;
      //    startStateIndex = 1; (pointing to 62)
      //    endStateIndexPlusOne = 3; (pointing to 66)
      //    wrapIndex = 1; (pointing to 60)
      //    
      // yields the trasition:
      //
      //    62->64->66 -> 60
      //
      // then on the next loop iteration:
      //
      //    startStateIndex = 2; (pointing to 64)
      //    endStateIndexPlusOne = 4; (pointing to nil)
      //    wrapIndex = 2; (pointing to 62)
      //
      // yields the transition:
      //
      //    64->66->60 -> 62
      //
      
      circularPitchTable.add_transition(
        phrasePitches
          .slice(startStateIndex, endStateIndexPlusOne)
          .concat(phrasePitches.slice(0, wrapIndex))
      );

      circularDurationTable.add_transition(
        phraseDurations
          .slice(startStateIndex, endStateIndexPlusOne)
          .concat(phraseDurations.slice(0, wrapIndex))
      
      );
    }

    // now do same as above for attributes that do not care about rests
    velocityTable.add_initial_transition(
      phraseVelocities.slice(0, order + 1)
    );
    circularVelocityTable.add_initial_transition(
      phraseVelocities.slice(0, order + 1)
    );
    for (i = order + 1; i < phraseNotesData.length; i++) {
      startStateIndex = i - order;
      endStateIndexPlusOne = i + 1;

      velocityTable.add_transition(
        phraseVelocities.slice(startStateIndex, endStateIndexPlusOne)
      );
      circularVelocityTable.add_transition(
        phraseVelocities.slice(startStateIndex, endStateIndexPlusOne)
      );
    }
    
    for (startStateIndex = i - order; startStateIndex < phraseNotesData.length; startStateIndex++) {
      endStateIndexPlusOne = Math.min(startStateIndex + order + 1, phraseNotesData.length + 1);
      wrapIndex = order + 1 - (endStateIndexPlusOne - startStateIndex) + 1;

      circularVelocityTable.add_transition(
        phraseVelocities
          .slice(startStateIndex, endStateIndexPlusOne)
          .concat(phraseVelocities.slice(0, wrapIndex))
      );
    }

    /*var keys = root._.keys(pitchTable._startingStates._probabilities);
    CS.post("Starting probabilities:\n");
    for (i = 0; i < keys.length; i++) {
      CS.post(keys[i] + ": " + pitchTable._startingStates._probabilities[keys[i]] + "\n");
    }
    CS.post("\n\n");*/
  };

}).call(this);
/**
 *  @file       CSMarkovPhraseGenerator.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/


(function () {
  "use strict";

  var CS, _, root = this;
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSMarkovMultiStateMachine.js");
    require("./CSMarkovTable.js");
    root._ = require("./vendor/underscore.js")._;
  } else {
    CS = this.CS;
    _ = this._;
  }

  /**
   *  @class  CS.MarkovPhraseGenerator    Uses a set of markov tables
   *  to generate phrases.
   **/
  CS.MarkovPhraseGenerator = function (params) {

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    if (typeof params.phraseAnalyzer === "undefined" || params.phraseAnalyzer === null) {
      throw new Error("params.phraseAnalyzer is undefined");
    }
    this._phraseAnalyzer = params.phraseAnalyzer;
    
    this._stateMachine = new CS.MarkovMultiStateMachine({});
    this._stateMachine.add_table("pitch", this._phraseAnalyzer._pitchTable);
    this._stateMachine.add_table("duration", this._phraseAnalyzer._durationTable);
    this._stateMachine.add_table("velocity", this._phraseAnalyzer._velocityTable);

    // if we're currently generating, don't disrupt.
    this._isGenerating = false;

    if (typeof params.useCircular === "undefined" || params.useCircular === null) {
      params.useCircular = false;
    }
    // if we should assume the input phrases are circular (useful for loops)
    this._useCircular = null;

    this.set_use_circular(params.useCircular);

    if (typeof params.useInitialNotes === "undefined" || params.useInitialNotes === null) {
      params.useInitialNotes = false;
    }
    /**
     *  Wether or not we should take into account a statistical analysis of the
     *  initial notes of each phrase when choosing the initial notes of a
     *  generated phrase.
     **/
    this._useInitial = null;
    this.set_use_initial(params.useInitialNotes);
  };

  CS.MarkovPhraseGenerator.prototype = {

    set_use_circular: function (shouldUseCircular) {

      if (this._useCircular !== shouldUseCircular) {
        this._useCircular = shouldUseCircular;

        if (shouldUseCircular) {
          CS.post("using circular table\n");
          this._stateMachine.switch_table("pitch", this._phraseAnalyzer._circularPitchTable);
          this._stateMachine.switch_table("duration", this._phraseAnalyzer._circularDurationTable);
          this._stateMachine.switch_table("velocity", this._phraseAnalyzer._circularVelocityTable);
        } else {
          CS.post("using un-circular table\n");
          this._stateMachine.switch_table("pitch", this._phraseAnalyzer._pitchTable);
          this._stateMachine.switch_table("duration", this._phraseAnalyzer._durationTable);
          this._stateMachine.switch_table("velocity", this._phraseAnalyzer._velocityTable);
        }
        
      }
    },

    set_use_initial: function (shouldUseInitial) {
      this._useInitial = shouldUseInitial;
    },

    /**
     *  Generate a new phrase based on current statistical analysis stored
     *  in markov tables.  The `duration` attribute of the returned phrase
     *  will be equal to the `phraseDuration` variable passed in, but the
     *  last note of the phrase may not end at the exact end of the phrase.
     *
     *  @param    Number  phraseDuration  The duration of the phrase
     *  @return   CS.Phrase   The resulting phrase.
     **/
    generate_phrase: function (phraseDuration) {
      if (typeof phraseDuration === "undefined" || phraseDuration === null) {
        throw new Error("phraseDuration is undefined");
      }

      var result,
        stateMachine = this._stateMachine,
        clip = this._clip,
        // starting now
        tStart = 0,
        tEnd = tStart + phraseDuration,
        notes = [],
        initialNoteAttributes = stateMachine.start(this._useInitial),
        noteAttributes = {},
        i,
        t = tStart;

      this._isGenerating = true;

      for (i = 0; i < initialNoteAttributes.pitch.length; i++) {
        noteAttributes.pitch = initialNoteAttributes.pitch[i];
        noteAttributes.duration = initialNoteAttributes.duration[i];
        noteAttributes.velocity = initialNoteAttributes.velocity[i];
        noteAttributes.time = t;
        noteAttributes.muted = 0;

        if (noteAttributes.pitch !== -1) {
          notes.push(new CS.PhraseNote(noteAttributes));
        }
        
        t += noteAttributes.duration;
      }

      noteAttributes = stateMachine.next();


      // generate new loop of same length
      while (t + noteAttributes.duration < tEnd) {
        noteAttributes.time = t;
        noteAttributes.muted = 0;

        // if this was not a rest note
        if (noteAttributes.pitch !== -1) {
          // save it in our loop
          notes.push(new CS.PhraseNote(noteAttributes));
        }

        t += noteAttributes.duration;
        noteAttributes = stateMachine.next();
      }

      result = new CS.Phrase({
        notes: notes,
        duration: phraseDuration
      });

      return result;

    }
  };
}).call(this);

/**
 *  @file       CSAbletonPhraseRenderingClip.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

/*global Task */

(function () {
  "use strict";

  var CS;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./CS.js").CS;
    require("./CSAbletonClip.js");
  } else {
    CS = this.CS;
  }

  /**
   *  @class  CS.Ableton.PhraseRenderingClip  A clip in Ableton that is
   *  populated with the notes from a `CS.MarkovPhraseGenerator` instance.
   *
   *  @param  LiveAPI   clip  The clip reference
   *  @param  CS.MarkovTable  pitchTable  Statistics for generated pitches
   *  @param  CS.MarkovTable  durationTable   Statistics for durations of notes  
   *
   **/
  CS.Ableton.PhraseRenderingClip = function (params) {
    var clip, notes, i, note;

    if (typeof params === "undefined" || params === null) {
      return;
    }

    CS.Ableton.Clip.apply(this, arguments);
    
    clip = this._clip;

    if (typeof params.phraseAnalyzer === "undefined" || params.phraseAnalyzer === null) {
      throw new Error("params.phraseAnalyzer is undefined");
    }

    if (typeof params.useCircular === "undefined" || params.useCircular === null) {
      params.useCircular = false;
    }
    
    this._phraseGenerator = new CS.MarkovPhraseGenerator({
      phraseAnalyzer: params.phraseAnalyzer,
      useCircular: params.useCircular
    });

    /**
     *  This is the point in time where the last note in the clip ends, in
     *  absolute clip time units. (i.e. 0 is at beginning of clip)
     **/
    this._currentEndTime = null;

    // determine currentEndTime now the long way, but maintain for future
    // reference.  ASSUMPTION: the clip is only being modified from this
    // class instance, and nowhere else.
    this._currentEndTime = this.phrase.duration;

    this._originalLoopLength = this.loopLength;

    /**
     *  Maintain the time of the end of the current loop for when
     *  appending loop.
     **/
    this._currentLoopEndTime = clip.get("loop_end")[0];
    
    /**
     *  If we're in the process of generating a new clip
     **/
    this._isGenerating = false;
    
  };

  CS.Ableton.PhraseRenderingClip.prototype = new CS.Ableton.Clip();

  /**
   *  Inserts the notes from a `CS.Phrase` object into the clip starting
   *  at a particular time.
   *
   *  @param  CS.Phrase   params.phrase           The phrase to insert.
   *  @param  Number      params.tStart           The time at which to
   *  insert the phrase.
   *  @param  Boolean     [params.moveStartMarker=true]  Wether or not to re-locate
   *  the start marker to the beginning of the newly inserted phrase.
   *  @param  Boolean     [params.moveEndMarker=true]    Wether or not to move the
   *  end marker to the end of the newly inserted phrase.
   **/
  CS.Ableton.PhraseRenderingClip.prototype.insert_phrase = function (params) {

    var notes,
      clip = this._clip,
      i,
      tEnd,
      note,
      // wether or not the clip is currently looping
      loopingOn = clip.get("looping")[0],
      phrase,
      tStart,
      moveStartMarker,
      moveEndMarker;

    if (typeof params === "undefined" || params === null) {
      throw new Error("params is undefined");
    }

    if (typeof params.phrase === "undefined" || params.phrase === null) {
      throw new Error("params.phrase is undefined");
    }
    phrase = params.phrase;

    if (typeof params.tStart === "undefined" || params.tStart === null) {
      throw new Error("params.tStart is undefined");
    }
    tStart = params.tStart;

    if (typeof params.moveStartMarker === "undefined" || params.moveStartMarker === null) {
      params.moveStartMarker = true;
    }
    moveStartMarker = params.moveStartMarker;

    if (typeof params.moveEndMarker === "undefined" || params.moveEndMarker === null) {
      params.moveEndMarker = true;
    }
    moveEndMarker = params.moveEndMarker;

    if (phrase.duration === 0) {
      CS.post("Warning: Phrase duration was 0...skipping");
      return;
    }

    tEnd = tStart + phrase.duration;
    notes = phrase.notes();

    CS.post("inserting phrase\n");
    clip.call("deselect_all_notes");
    clip.call("replace_selected_notes");
    clip.call("notes", notes.length);
    for (i = 0; i < notes.length; i++) {
      note = notes[i];
      clip.call([
        "note",
        note.get("pitch"),
        (tStart + note.get("time")).toFixed(12),
        note.get("duration").toFixed(12),
        note.get("velocity"),
        note.get("muted")
      ]);
    }
    clip.call("done");
    CS.post("done inserting phrase\n");

    CS.post("moving loop markers...\n");
    if (moveEndMarker) {
      // move clip end and clip start to boundaries of newly generated clip.
      //CS.post("\tlooping 0\n");
      clip.set("looping", 0);
      //CS.post("\tloop_end " + tEnd.toFixed(3) + "\n");
      clip.set("loop_end", tEnd.toFixed(3));
      //CS.post("\tlooping 1\n");
      clip.set("looping", 1);
      //CS.post("\tloop_end " + tEnd.toFixed(3) + "\n");
      clip.set("loop_end", tEnd.toFixed(3));
      this._currentLoopEndTime = tEnd;
    }
   
    if (moveStartMarker) {
      // move loop start and loop end to boundaries of newly generated clip
      //CS.post("\tlooping 0\n");
      clip.set("looping", 0);
      //CS.post("\tloop_start " + tStart.toFixed(3) + "\n");
      clip.set("loop_start", tStart.toFixed(3));
      //CS.post("\tlooping 1\n");
      clip.set("looping", 1);
      //CS.post("\tloop_start " + tStart.toFixed(3) + "\n");
      clip.set("loop_start", tStart.toFixed(3));
    }


    clip.set("looping", loopingOn);

    CS.post("done moving loop markers...\n");
    
  };

  /**
   *  Generate a new phrase (based on the probability tables sent in
   *  at initialization), then insert it at the end of the current clip.
   *
   *  @param  Number    duration  Duration of phrase to generate
   *  @param  Object    [insertParams]  Optional parameters for insert method.  
   **/
  CS.Ableton.PhraseRenderingClip.prototype.generate_and_append = function (duration, insertParams) {
    var generatedPhrase;

    if (typeof insertParams === "undefined" || insertParams === null) {
      insertParams = {};
    }

    this._isGenerating = true;

    generatedPhrase = this._phraseGenerator.generate_phrase(duration);

    insertParams.phrase = generatedPhrase;

    // if tStart was not specified
    if (typeof insertParams.tStart === "undefined" || insertParams.tStart === null) {
      // start off where last note left off
      insertParams.tStart = this._currentEndTime;
    }

    this.insert_phrase(insertParams);
    this._currentEndTime += generatedPhrase.duration;
    
    this._isGenerating = false;
  };

  /**
   *  Same as above, but asynchronous.  Provides an optional callback
   *  method to execute on completion.
   *
   *  @param  Number    duration        Duration of phrase to generate
   *  @param  Function  [callback]      Optional callback function when complete.
   *  @param  Object    [insertParams]  Optional parameters for insert method.  
   **/
  CS.Ableton.PhraseRenderingClip.prototype.generate_and_append_async = function (duration, callback, insertParams) {
    var genTask;

    if (typeof callback === "undefined" || callback === null) {
      callback = function () {
      
      };
    }

    genTask = new Task(function (args) {
      this.generate_and_append(args[0], args[2]);
      args[1]();
    }, this, [duration, callback, insertParams]);
    genTask.schedule();
  };

  /**
   *  Generate a new phrase that is the duration of the current loop
   *  and append it after the current loop.
   **/
  CS.Ableton.PhraseRenderingClip.prototype._generate_and_append_loop = function () {
    this.generate_and_append(this._originalLoopLength, {
      // start off where loop ends
      tStart: this._currentLoopEndTime
    });
  };
  CS.Ableton.PhraseRenderingClip.prototype._generate_and_append_loop_async = function () {
    var generateTask = new Task(function () {
      this._generate_and_append_loop();
    }, this);

    generateTask.schedule();
  };

  /**
   *  Continuously generate clip based on MarkovTables.
   **/
  CS.Ableton.SelfGeneratingClip = function (params) {
    var api,
      loopJumpWatcher,
      playingStatusObserver,
      me = this;

    CS.Ableton.PhraseRenderingClip.apply(this, arguments);

    if (typeof params.playsTillAutoGenerate === "undefined" || params.playsTillAutoGenerate === null) {
      throw new Error("params.playsTillAutoGenerate is undefined");
    }
    // amount of playbacks after which the clip will re-generate.
    this._playsTillAutoGenerate = params.playsTillAutoGenerate;

    if (typeof params.playbackEndedCallback === "undefined" || params.playbackEndedCallback === null) {
      params.playbackEndedCallback = function () {
        
      };
    }
    this._playbackEndedCallback = params.playbackEndedCallback;


    // amount of playbacks since last generate
    this._playsSinceLastGenerate = 0;

    this._clipState = this.CLIP_STATES.STOPPED;


    /*// wether or not this clip should generate now
    this._shouldGenerate = false;

    // task to constantly check to see if clip should be re-generated
    this._generate_checker = new Task(function () {
      if (this._shouldGenerate) {
        this._generate();
        this._shouldGenerate = false;
      }
    }, this);
    this._generate_checker.interval = 200;*/
    
    /*api = new LiveAPI((function (selfGenClip) {
      return error_aware_callback(function () {
        selfGenClip._handle_clip_playingstatus_change();
      });
    }(this)), this._clip.path.slice(1, -1));
    // causes above callback method to be run whenever
    // playing status changes.
    api.property = "playing_status";*/
    this._isPlayingPrev = this._clip.get("is_playing")[0] === 1;
    this._isTriggeredPrev = this._clip.get("is_triggered")[0] === 1;
    
    /**
     *  Task used to observe playing status.  Created on `start`.
     **/
    this._playingStatusObserver = null;

    // if we're currently observing and auto-generating
    this._isAutogenerating = false;
  };

  CS.Ableton.SelfGeneratingClip.prototype = new CS.Ableton.PhraseRenderingClip();

  CS.Ableton.SelfGeneratingClip.prototype.CLIP_STATES = {
    PLAYING: 0,
    TRIGGERED: 1,
    STOPPED: 2
  };

  CS.Ableton.SelfGeneratingClip.prototype.set_plays_till_autogen = function (playsTill) {
    this._playsTillAutoGenerate = playsTill;
  };

  CS.Ableton.SelfGeneratingClip.prototype.set_playbackEndedCallback = function (cb) {
    if (typeof cb === "undefined" || cb === null) {
      cb = function () {
        
      };
    }
    this._playbackEndedCallback = cb;
  };

  CS.Ableton.SelfGeneratingClip.prototype._handle_clip_playingstatus_change = function () {
    var currentState = this._clipState,
      clipStates = this.CLIP_STATES,
      clip = this._clip,
      isPlaying = clip.get("is_playing")[0] === 1,
      isTriggered = clip.get("is_triggered")[0] === 1;

    CS.post("handling state change...\n");
    if (
      // if clip was playing and is now stopped
      currentState === clipStates.PLAYING && !isPlaying
    ) {

      this._clipState = this.CLIP_STATES.STOPPED;
      this.handle_end_reached();

    } else if (
      // if clip was just playing and is now triggered
      currentState === clipStates.PLAYING && isTriggered
    ) {
      this._clipState = clipStates.TRIGGERED;
    } else if (
      // if clip was triggered and is now playing
      currentState === clipStates.TRIGGERED && isPlaying
    ) {
      this._clipState = clipStates.PLAYING;
    } else if (
      // if clip was triggered while already triggered
      currentState === clipStates.TRIGGERED && isTriggered
    ) {
      this._clipState = clipStates.TRIGGERED;
      this.handle_end_reached();
    } else if (
      // if clip was stopped or triggered and is now playing
      (currentState === clipStates.STOPPED || currentState === clipStates.TRIGGERED) && isPlaying
    ) {
      this._clipState = clipStates.PLAYING;
    } else if (
      // if clip was stopped and is now triggered
      currentState === clipStates.STOPPED && isTriggered
    ) {
      this._clipState = clipStates.TRIGGERED;
    
    }
    CS.post("done handling state change...\n");
  };

  CS.Ableton.SelfGeneratingClip.prototype.generate_and_append = function () {
    CS.Ableton.PhraseRenderingClip.prototype.generate_and_append.apply(this, arguments);
    this._playsSinceLastGenerate = 0;
  };

  /**
   *  Called whenever clip was playing and reached the end.  This means the 
   *  clip could have been triggered again, and thus is still playing.
   **/
  CS.Ableton.SelfGeneratingClip.prototype.handle_end_reached = function () {
    // keep track of amount of plays since the last generate
    this._playsSinceLastGenerate++;

    CS.post("clip finished...\n");

    // if the clip is stopped
    if (
      !this._isGenerating && this._clipState === this.CLIP_STATES.STOPPED
    ) {

      if (
        // and is supposed to be auto generating
        this._isAutogenerating &&
          // and is time to generate
          this._playsSinceLastGenerate >= this._playsTillAutoGenerate
      ) {
        this._generate_and_append_loop_async();
      }

      // clip is stopped, so playback has ended.
      this._playbackEndedCallback();
    }
  };

  CS.Ableton.SelfGeneratingClip.prototype.start = function () {
    // start watching clip for plays
    if (!this._isAutogenerating) {
      this._playingStatusObserver = new Task(function () {
        var isPlaying,
          isTriggered,
          clip = this._clip;

        isPlaying = clip.get("is_playing")[0] === 1;
        isTriggered = clip.get("is_triggered")[0] === 1;

        if (isPlaying !== this._isPlayingPrev || isTriggered !== this._isTriggeredPrev) {
          this._handle_clip_playingstatus_change();
          this._isPlayingPrev = isPlaying;
          this._isTriggeredPrev = isTriggered;
        }
      }, this);
      this._playingStatusObserver.interval = 200;
      this._playingStatusObserver.repeat(-1);
      this._isAutogenerating = true;
    }
  };

  CS.Ableton.SelfGeneratingClip.prototype.stop = function () {
    this._playingStatusObserver.cancel();
    this._isAutogenerating = false;
  };

}).call(this);

/**
 *  @file       CSInputAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS,
    Task;


  if (typeof require !== "undefined" && require !== null) {
    CS = require("./lib/CS.js").CS;
    require("./lib/CSPhraseNote.js");
    require("./lib/CSPhrase.js");
  } else {
    CS = this.CS;
    Task = this.Task;
  }

  /**
   *  @class  CS.InputAnalyzer    Handles incoming note events and determines
   *  when a phrase has completed based on a timeout.
   **/
  CS.InputAnalyzer = function (params) {

    if (typeof params === "undefined" || params === null) {
      return; // assume being used in prototype.
    }


    if (typeof params.phraseTimeoutDuration === "undefined" || params.phraseTimeoutDuration === null) {
      throw new Error("params.phraseTimeoutDuration is undefined");
    }
    /**
     *  The amount of silence required to consider a phrase ended (in
     *  milliseconds).
     **/
    this._phraseTimeoutDuration = params.phraseTimeoutDuration;

    this._previousPhrases = [];

    /**
     *  As a phrase is in the process of being played, this array will store
     *  the incoming notes.
     **/
    this._currentPhraseNotes = [];

    /**
     *  Start of phrase occurred at this ableton time
     **/
    this._phraseStartTime = -1;

    /**
     *  Notes that are on and haven't yet received a noteoff.  Indexed
     *  by the pitch value.
     **/
    this._currentNotesOn = {};
    this._numCurrentNotesOn = 0;

    /**
     *  The Task instance that will run after a period of silence to handle
     *  the end of a phrase.
     **/
    this._endOfPhraseCallback = null;
    
  };

  CS.InputAnalyzer.prototype = {

    /**
     *  Change amount of silence required to consider a phrase
     *  ended.
     *
     *  @param  Number  timeoutDuration   New timeout duration
     **/
    set_phraseTimeoutDuration: function (timeoutDuration) {
      this._phraseTimeoutDuration = timeoutDuration;
    },

    /**
     *  Called from host when new note information is received.
     **/
    handle_notein: function (noteData) {
      var noteAttributes = {},
        note;

      // if this was a noteon event
      if (noteData.noteon) {
        // if this is the first note in the phrase
        if (this._phraseStartTime === -1) {
          this._phraseStartTime = noteData.time;
        }

        noteAttributes.pitch = noteData.pitch;
        noteAttributes.velocity = noteData.velocity;
        // phrase note times will be relative to phrase start
        noteAttributes.time = noteData.time - this._phraseStartTime;
        noteAttributes.muted = 0;

        note = new CS.PhraseNote(noteAttributes);

        // note is part of the phrase
        this._currentPhraseNotes.push(note);

        // maintain indexed by pitch so we can update it upon noteoff
        this._currentNotesOn[noteAttributes.pitch] = note;
        this._numCurrentNotesOn++;

        // reset end of phrase timeout if it is running
        if (this._endOfPhraseCallback) {
          this._endOfPhraseCallback.cancel();
        }

      // this was a noteoff event
      } else {

        // find note
        note = this._currentNotesOn[noteData.pitch];

        // if we don't have a noteon, this maybe is a hangover from playback,
        // in any case is safe to ignore because we thought note ended already.
        if (typeof note === "undefined" || note === null) {
          return this._currentPhraseNotes.length;
        }

        // update note with new information
        note.set({
          offVelocity: noteData.velocity,
          // duration is endtime - starttime
          duration: (noteData.time - this._phraseStartTime) - note.get("time")
        });

        // note is no longer on
        this._currentNotesOn[noteData.pitch] = null;
        this._numCurrentNotesOn--;

        // if there are no other notes being held on, start phrase end timer by
        // waiting two seconds before determining that this is the end of the
        // phrase.
        if (this._numCurrentNotesOn === 0) {
          this._endOfPhraseCallback = new Task(function () {
            var phrase;

            CS.post("phrase ended\n");

            phrase = new CS.Phrase({
              notes: this._currentPhraseNotes
            });

            this._previousPhrases.push(phrase);

            this._currentPhraseNotes = [];
            // should already be 0 but just to make sure
            this._numCurrentNotesOn = 0;
            this._currentNotesOn = {};
            this._phraseStartTime = -1;

            this.handle_phrase_ended(phrase);

          }, this);
          CS.post("starting endOfPhraseCallback\n");
          this._endOfPhraseCallback.schedule(this._phraseTimeoutDuration);
        }

      }

      return this._currentPhraseNotes.length;

    },

    /**
     *  Called when a phrase has ended.  Subclasses should override this
     *  method to process the phrase once it has ended.
     **/
    handle_phrase_ended: function (phrase) {

    }
  };

}).call(this);
/**
 *  @file       CSAbletonInputAnalyzer.js
 *
 *  @author     Colin Sullivan <colinsul [at] gmail.com>
 *
 *              Copyright (c) 2012 Colin Sullivan
 *              Licensed under the GPLv3 license.
 **/

(function () {
  "use strict";

  var CS;
  
  if (typeof require !== "undefined" && require !== null) {
    CS = require("./lib/CS.js").CS;
  } else {
    CS = this.CS;
  }

  /**
   *  @class    CS.Ableton.InputAnalyzer    In addition to handling incoming
   *  notes and detecting an end-of-phrase, creates context in which to 
   *  analyze these phrases and initiates generated responses.
   *
   *  @extends  CS.InputAnalyzer
   **/
  CS.Ableton.InputAnalyzer = function (params) {
    var me = this,
      clipSlots,
      trackPath,
      clipSlotId,
      clipPath,
      clipName,
      clip,
      i;

    if (typeof params === "undefined" || params === null) {
      params = {};
    }

    // call super constructor
    CS.InputAnalyzer.apply(this, arguments);

    if (typeof params.liveAPIDelegate === "undefined" || params.liveAPIDelegate === null) {
      throw new Error("params.liveAPIDelegate is undefined");
    }
    this.liveAPIDelegate = params.liveAPIDelegate;
    
    /**
     *  Wether or not we should auto respond when a phrase ends.
     **/
    if (typeof params.shouldAutoRespond === "undefined" || params.shouldAutoRespond === null) {
      throw new Error("params.shouldAutoRespond is undefined");
    }
    this.shouldAutoRespond = params.shouldAutoRespond;

    /**
     *  Hook for when clip is responding to an input phrase.
     **/
    if (typeof params.auto_response_will_start_callback === "undefined" || params.auto_response_will_start_callback === null) {
      params.auto_response_will_start_callback = function () {
        
      };
    }
    this.auto_response_will_start_callback = params.auto_response_will_start_callback;

    if (typeof params.auto_response_ended_callback === "undefined" || params.auto_response_ended_callback === null) {
      params.auto_response_ended_callback = function () {
        
      };
    }
    this.auto_response_ended_callback = params.auto_response_ended_callback;

    if (typeof params.track === "undefined" || params.track === null) {
      throw new Error("params.track is undefined");
    }
    this.track = params.track;

    /**
     *  The `CS.Ableton.PhraseRenderingClip` to be populated with generated
     *  phrase when in auto generating mode.
     **/
    this.autoGenClip = null;
    
    /**
     *  The CS.Ableton.SelfGeneratingClip that will be populated with generated
     *  material from statistical analysis of the live input when the user is
     *  generating continuously on demand.
     **/
    this.genClips = [];

    /**
     *  Phrase analyzer to store statistics of incoming input.
     **/
    this.phraseAnalyzer = new CS.PhraseAnalyzer({
      markovOrder: 3
    });

    /**
     *  Grab clips from session that will be used to populate with 
     *  response material.
     **/
    trackPath = this.track.path.slice(1, -1);
    clipSlots = this.track.get("clip_slots");
    
    // for each clip slot
    for (i = 0; i < clipSlots.length; i += 2) {
      clipSlotId = i / 2;
      clipPath = trackPath + " clip_slots " + clipSlotId + " clip ";

      clip = this.liveAPIDelegate.new_live_api(clipPath);
      if (clip.id !== "0") {
        clipName = clip.get("name")[0];
        
        // instantiate a `CS.Ableton.SelfGeneratingClip` instance for all
        // clips populated with a clip named like "something-manual1"
        if (clipName.match(/-manual[\d]*$/)) {
          this.genClips.push(new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: 1,
            phraseAnalyzer: this.phraseAnalyzer,
            clip: clip
          }));
        // and do the same for all clips named "something-auto"
        } else if (clipName.match(/-auto$/)) {
          this.autoGenClip = new CS.Ableton.SelfGeneratingClip({
            playsTillAutoGenerate: -1, // doesn't matter because it wont auto generate because loop should be off
            clip: clip,
            phraseAnalyzer: this.phraseAnalyzer
          });
        }
      
      }
    }

    if (typeof this.autoGenClip === "undefined" || this.autoGenClip === null) {
      throw new Error("No `-auto` clip found!");
    }
    
    if (this.genClips.length === 0) {
      throw new Error("No `-manual` clips found!");
    }
  };

  CS.Ableton.InputAnalyzer.prototype = new CS.InputAnalyzer();

  /**
   *  Change wether or not a clip should automatically be populated and
   *  triggered for playback when a phrase has ended.
   *
   *  @param  Boolean  value    Wether or not to auto respond.
   **/
  CS.Ableton.InputAnalyzer.prototype.set_auto_response = function (value) {
    this.shouldAutoRespond = value;
  };

  CS.Ableton.InputAnalyzer.prototype.handle_phrase_ended = function (phrase) {
    var roundedPhraseDuration,
      autoGenClip = this.autoGenClip,
      me = this;

    this.phraseAnalyzer.incorporate_phrase(phrase);

    roundedPhraseDuration = Math.ceil(phrase.duration);

    /**
     *  If we are in auto response mode, and a phrase just ended,
     *  initiate the auto response
     **/
    if (me.shouldAutoRespond) {
      autoGenClip.generate_and_append_async(
        // generate a response at a duration quantized from original
        // phrase duration
        roundedPhraseDuration,
        // when clip is done generating, play it
        function () {


          // and when response is done playing
          autoGenClip.set_playbackEndedCallback(function () {
            autoGenClip.set_playbackEndedCallback(null);
            autoGenClip.stop();

            me.auto_response_ended_callback();

          });
          
          me.auto_response_will_start_callback();
          
          autoGenClip.start();
          
          // but don't autogenerate
          // TODO: fix this HACK.
          autoGenClip._isAutogenerating = false;

          // play clip
          autoGenClip._clip.call("fire");
        }
      );
    }
    
  };

  CS.Ableton.InputAnalyzer.prototype.start_manual_response = function () {
    var i,
      genClips = this.genClips,
      genClip,
      duration = genClips[0]._clip.get("length")[0],
      final_callback = function () {
        // play first clip
        CS.post("firing first clip");
        genClips[0]._clip.call("fire");
      },
      generate_with_callback = function (genClip, callback) {
        genClip.generate_and_append_async(duration, function () {
          genClip.start();
          callback();
        });
      },
      generate_callback = function () {
        i++;
        if (i < genClips.length) {
          generate_with_callback(genClips[i], generate_callback);
        } else {
          final_callback();
        }
      },
      generate_all_clips = function () {
        i = 0;
        generate_with_callback(genClips[i], generate_callback);
      };

    // make sure all clips have the same loop length
    for (i = 0; i < genClips.length; i++) {
      if (genClips[i]._clip.get("length")[0] !== duration) {
        throw new Error("`-manual` clips must all have the same clip duration!");
      }
    }

    // populate all `genClips` with notes, and play the first one
    generate_all_clips();
    
  };

  CS.Ableton.InputAnalyzer.prototype.end_manual_response = function () {
    // stop all clips
    this.track.call("stop_all_clips");
  };

  CS.Ableton.InputAnalyzer.prototype.clear_training = function () {

    this.phraseAnalyzer.clear_analysis();
    
  };

  CS.Ableton.InputAnalyzer.prototype.set_use_starting_statistics = function (value) {
    var i;

    this.autoGenClip._phraseGenerator.set_use_initial(value);
    for (i = 0; i < this.genClips.length; i++) {
      this.genClips[i]._phraseGenerator.set_use_initial(value);
    }
  };

  CS.Ableton.InputAnalyzer.prototype.set_use_circular_statistics = function (value) {
    var i;

    this.autoGenClip._phraseGenerator.set_use_circular(value);
    for (i = 0; i < this.genClips.length; i++) {
      this.genClips[i]._phraseGenerator.set_use_circular(value);
    }
    
  };
  
  
}).call(this);
