(function (main) {
  'use strict';
  /* jshint unused:true, jquery:true, curly:false */
  /* global Utils */

  function getFieldName (field) {
    var last;
    var name = '';
    if (typeof field === 'string') {
      field = field.slice(field.lastIndexOf('/') + 1);
      last = field.indexOf(':');
      last = last > 0 ? last + 1 : field.length;
      name = field.slice(0, last);
    }
    return name;
  }

  var Parser = {
    date: function (data) {
      var date = new Date(data);
      var year = date.getFullYear().toString();
      var month = date.getMonth().toString();
      return {
        date: date,
        year: year,
        month: month,
        yearmonth: year + month
      };
    },
    parse: function (data) {
      return data;
    }
  };

  var Postprocessors = {
    date: function (node, index, length, meta) {
      //extend the object by parsing the date
      var date;
      var month = 0;
      var day = 1;
      if (meta.aggregate === 'year') {
        date = new Date(node.key, month, day);
      } else if(meta.aggregate === 'yearmonth') {
        month = (length - 1) === index ? 11 : node.key.substring(4);
        day = (length - 1) === index ? 31 : 1;
        date = new Date(node.key.substring(0, 4), node.key.substring(4), day);
      }
      node[meta.name] = date;
    }
  };


  /**
   * Creates a new data model to manipulate the data
   * @param data Array Array of arrays
   * @param metadata Array Column metadata
   */
  var DataModel = function (data, metadata) {
     if (Utils.isArray(data))
       this.setData(data);

     if (Utils.isArray(metadata))
       this.setColumnMetadata(metadata);

     this.sort = {
       by: null,
       comparator: d3.descending
     };
     this.aggregators = {};
     this.columnOrder = [];
  };

  /**
   * Sets the column metadata. This information is given as a parameter to the BIMAD Plugin
   * @param metadata Array Column metadata
   * @return DataModel
   */
  DataModel.prototype.setColumnMetadata = function (meta) {
    var metaData = {};
    var numericColumns = [];
    var columns = [];
    meta.forEach(function (column) {
      var field = column.field;
      var last;
      metaData[column.name] = column;
      if (typeof column.label === 'undefined')
        column.label = getFieldName(column.field);

      column.parser = (column.dataType in Parser) ? column.dataType : 'parse';
      columns.push(column.name);
      if (column.fieldType === 'measure')
        numericColumns.push(column.name);
    });
    this.numericColumns = numericColumns;
    this.metaData = meta;
    this.indexedMetaData = metaData;
    this.columns = columns;
    return this;
  };

  /**
   * Sets the data to work on
   * @param data Array
   * @return DataModel
   */
  DataModel.prototype.setData = function (data) {
    this.data = data;
    return this;
  };

  /**
   * Indexes the data with the column metadata information
   * @return DataModel
   */
  DataModel.prototype.indexColumns = function () {
    var indexed = [];
    var columns = this.columns;
    var metadata = this.indexedMetaData;
    this.data.forEach(function (row) {
      var indexedRow = {};
      row.forEach(function (value, index) {
        var name = columns[index];
        var type = metadata[name].parser;
        indexedRow[name] = value;
        indexedRow[name + '_parsed'] = Parser[metadata[name].parser](value);
      });
      indexed.push(indexedRow);
    });
    this.indexedData = indexed;
    return this;
  };

  /**
   * Sets the colum order to create the hierarchical object.
   * All numeric columns will be discarded and placed at the end of the hierarchy
   * @param columns Array
   * @returns DataModel
   */
  DataModel.prototype.setColumnOrder = function (columns) {
    var columnOrder = [];
    if (!Utils.isArray(columns))
      columns = [];

    if (columns.length > 0) {
      // first add the string columns that come in the ordered array
      columns.forEach(function (column) {
        if (column in this.indexedMetaData && this.indexedMetaData[column].fieldType !== 'measure')
          columnOrder.push(column);
      }, this);
      //Then add any missing string columns to the end of the array
      this.metaData.forEach(function (column) {
        if (columns.indexOf(column.name) === -1 && column.fieldType !== 'measure')
          columnOrder.push(column.name);
      });
    }
    this.columnOrder = columnOrder;
    return this;
  };

  /**
   * Sets the sorting method by keys
   * @returns DataModel
   */
  DataModel.prototype.sortBy = function (key) {
    if (key in this.indexedMetaData)
      this.sort.by = key;
    return this;
  };

  /**
   * Sets the comparator method to ascending
   * @returns DataModel
   */
  DataModel.prototype.asc = function () {
    this.sort.comparator = d3.ascending;
    return this;
  };

  /**
   * Sets the sorting method descending
   * @returns DataModel
   */
  DataModel.prototype.desc = function () {
    this.sort.comparator = d3.descending;
    return this;
  };

  /**
   * Creates the hierarchical object based on the column order
   * @return Object
   */
  DataModel.prototype.nest = function () {
    var aggregators = this.aggregators;
    var meta = this.indexedMetaData;
    var nest = d3.nest();
    var numeric = {};
    var columnTypes = [];
    var root = {
      key: 'root',
    };
    var nested;

    this.columnOrder.forEach(function (column) {
      var columnMeta = meta[column];
      var aggregator = aggregators[columnMeta.dataType];
      columnTypes.push(columnMeta);
      nest.key(function (node) {
        return aggregator ? aggregator(node, column) : node[column];
      });
    });

    //Create this object dinamically based on the numeric columns
    this.numericColumns.forEach(function (column) {
      numeric[column] = function (leaves) {
        return d3.sum(leaves, function (node) { return node[column]; });
      };
    });

    nest.rollup(function (leaves) {
      var rollup = {};
      for (var key in numeric)
        rollup[key] = numeric[key](leaves);

      return rollup;
    });

    nested = nest.entries(this.indexedData);

    root.values = nested;
    this.numericColumns.forEach(function (column) {
      accumulate(root, column);
    });
    postProcess(root, columnTypes);

    if (this.sort.by)
      sort(root.values, this.sort.by, this.sort.comparator);

    return root;
  };

  DataModel.prototype.dateAggregateBy = function (aggregate) {
    var aggregators = {'year': true, 'month': true, 'yearmonth': true};
    var key;
    var column;
    if (!(aggregate in aggregators))
      aggregate = 'year';

    for (key in this.indexedMetaData) {
      column = this.indexedMetaData[key];
      if (column.dataType === 'date')
        column.aggregate = aggregate;
    }
    //create the aggregator and store it for later use
    this.aggregators.date = function (data, column) {
      return data[column + '_parsed'][aggregate];
    };

    return this;
  };

  function sort (data, key, order) {
    if (!Utils.isArray(data))
      return false;

    if (typeof order !== 'function')
      order = d3.descending;

    data.sort(function (nodeA, nodeB) {
      return order(nodeA[key], nodeB[key]);
    });

    //means we have a hierarchical data of more than one level of depth
    if (Utils.isArray(data[0].values)) {
      data.forEach(function (node) {
        sort(node.values, key, order);
      });
    }

    return true;
  }

  function accumulate (node, key) {
    if (Utils.isObject(node) && !Utils.isEmptyObject(node)) {
      return (Utils.isArray(node.values)) ?
        node[key] = node.values.reduce(function (prev, value) {
          return prev + accumulate(value, key);
        }, 0) :
        node[key] = node.values[key];
    }
  }

  function postProcess (data, columns) {
    if (data.values && Utils.isArray(data.values)) {
      var valuesLength = data.values.length;
      var column = columns.shift();
      data.values.forEach(function (node, index) {
        if (column && column.dataType in Postprocessors)
          Postprocessors[column.dataType](node, index, valuesLength, column);
        postProcess(node, columns);
      });
    } else if (data.values) {
      delete data.values;
    }
  }

  if (!('Utils' in main))
    main.Utils = {};

  if (!('DataModel' in main.Utils))
    main.Utils.DataModel = DataModel;

})(this);
