(function (main) {
  'use strict';
  /* jshint unused:true, jquery:true, curly:false, browser:true */
  var formats = {
    raw: function () {
      var decimals = d3.format('.2f');
      var integers = d3.format('');
      return function (value) {
        return (value + '').split('.').length > 1 ? decimals(value) : integers(value);
      };
    },
    currency: function (opts) {
      opts = Utils.isObject(opts) ? opts : {};
      if (!opts.symbol)
        opts.symbol = '$';
      var format = formats.thousands(opts);
      return function (value) {
        return opts.symbol + ' ' + format(value);
      };
    },
    thousands: function (opts) {
      var format = ',';
      opts = Utils.isObject(opts) ? opts : {};
      if (opts.decimals)
        format += '.2';
      if (opts.si)
        format += 's';
      format += 'f';
      return d3.format(format);
    },
    axis: function (formatter) {
      if (!formatter || typeof formatter !== 'function')
        formatter = String;

      var suffixFormatter = d3.format('s');
      return function (value) {
        //Remove all non integer values
        value = parseInt(value, 10);
        var formatted = suffixFormatter(value);
        var suffix = formatted.replace(/\d+/, '');
        value = formatted.replace(/[^\d]+/, '');
        return formatter(value) + suffix;
      };
    }
  };
  var Utils = {
    isDesigner: function () {
      return xdo && xdo.app && xdo.app.designer && xdo.app.designer.DesignerApplication;
    },
    proxy: function (fn, thisArg) {
      return function () {
        return fn.apply(thisArg, Utils.toArray(arguments));
      };
    },
    toArray: function (obj) {
      return Array.prototype.slice.call(obj);
    },
    stringToBoolean: function(obj){
      return typeof obj === 'boolean' ? obj : obj.toLowerCase() === "true";
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
    isFunction: function (method) {
      return typeof method === 'function';
    },
    format: function (format, opts) {
      if (!(format in formats))
        format = 'raw';
      return formats[format](opts);
    },
    capitalize: function (text) {
      return (text + '').toLowerCase().replace(/_/g, ' ');
    },
    ascending: function (a, b) {
      if (!isNaN(a) && !isNaN(b))
        return d3.ascending(+a, +b);
      return (a + '').localeCompare(b);
    },
    descending: function (a, b) {
      if (!isNaN(a) && !isNaN(b))
        return d3.descending(+a, +b);
      return (b + '').localeCompare(a);
    },
    isEmptyObject: jQuery.isEmptyObject,
    isArray: jQuery.isArray,
    extend: jQuery.extend
  };

  if ('Utils' in main)
    Utils = Utils.extend(Utils, main.Utils);

  main.Utils = Utils;
})(this);
