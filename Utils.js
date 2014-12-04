(function (main) {
  'use strict';
  /* jshint unused:true, jquery:true, curly:false, browser:true */
  var formats = {
    raw: function (value) { return value; },
    currency: function (value, opts) {
      opts = Utils.isObject(opts) ? opts : {};
      if (!opts.symbol)
        opts.symbol = '$';
      return otps.symbol + ' ' + formats.thousands(value, opts);
    },
    thousands: function (value, opts) {
      var format = ',';
      opts = Utils.isObject(opts) ? opts : {};
      if (opts.decimals)
        format += '2.';
      format += 'f';
      return d3.format(format)(value);
    }
  };
  var Utils = {
    proxy: function (fn, thisArg) {
      return function () {
        return fn.apply(thisArg, Utils.toArray(arguments));
      };
    },
    toArray: function (obj) {
      return Array.prototype.slice.call(obj);
    },
    deferred: jQuery.Deferred,
    pluck: function (data, key) {
      var values = [];
      if (Utils.isArray(data)) {
        values = data.map(function (value) {
          return value[key];
        });

        values = values.filter(function (value) {
          return typeof value !== 'undefined' && value !== null;
        });
      }
      return values;
    },
    isObject: function (obj) {
      return jQuery.isPlainObject(obj);
    },
    format: function (number, format, opts) {
      if (!(format in formats))
        format = 'raw';
      return formats[format](number, opts);
    },
    isEmptyObject: jQuery.isEmptyObject,
    isArray: jQuery.isArray,
    extend: jQuery.extend
  };

  if ('Utils' in main)
    Utils = Utils.extend(Utils, main.Utils);

  main.Utils = Utils;
})(this);
