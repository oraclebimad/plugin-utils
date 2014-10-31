  (function (main) {
    'use strict';
    /* jshint unused:true, jquery:true, curly:false */
    /* global Utils */

    /**
     * Creates a new data model to manipulate the data
     * @param data Array Array of arrays
     * @param metadata Array Column metadata
     */
    var DataModel = function (data, metadata) {
       if (Utils.isObject(data) && !Utils.isEmptyObject(data))
         this.setData(data);

       if (Utils.isObject(metadata) && !Utils.isEmptyObject(metadata))
         this.setColumnMetadata(metadata);
    };

    /**
     * Sets the column metadata. This information is given as a parameter to the BIMAD Plugin
     * @param metadata Array Column metadata
     * @return DataModel
     */
    DataModel.prototype.setColumnMetadata = function (meta) {
      var metaData = {};
      var numericColumns = [];
      meta.forEach(function (column) {
        var field = column.field;
        var last;
        metaData[column.name] = column;
        field = field.slice(field.lastIndexOf('/') + 1);
        last = field.indexOf(':');
        last = last > 0 ? last + 1 : field.length;
        column.label = field.slice(0, last);
        if (column.fieldType === 'measure')
          numericColumns.push(column.name);
      });
      this.numericColumns = numericColumns;
      this.metaData = meta;
      this.indexedMetaData = metaData;
      return this;
    };

    /**
     * Sets the data to work on
     * @param data Array
     * @return DataModel
     */
    DataModel.prototype.setData = function (data) {
      this.columnOrder = this.columns = data.shift();
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
      this.data.forEach(function (row) {
        var indexedRow = {};
        row.forEach(function (value, index) {
          indexedRow[columns[index]] = value;
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
      if (!Utils.isArray(columns) || !columns.length) {
        throw new Error('Incorrect column order definition');
      }
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
      this.columnOrder = columnOrder;
      return this;
    };

    /**
     * Creates the hierarchical object based on the column order
     * @return Object
     */
    DataModel.prototype.nest = function () {
      var nest = d3.nest();
      var numeric = {};
      var root = {
        key: 'root',
      };
      var nested;

      this.columnOrder.forEach(function (column) {
         nest.key(function (node) {
            return node[column];
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
      removeLeaf(root);

      return root;
    };

  function accumulate (node, key) {
    if (Utils.isObject(node) && !Utils.isEmptyObject(node)) {
      return (Utils.isArray(node.values)) ?
        node[key] = node.values.reduce(function (prev, value) {
          return prev + accumulate(value, key);
        }, 0) :
        node[key] = node.values[key];
    }
  }

  function removeLeaf (data) {
    if (data.values && Utils.isArray(data.values)) {
      data.values.forEach(function (node) {
         removeLeaf(node);
      });
    } else if (data.values) {
      delete data.values;
    }
  }

  if (!('Utils' in main))
    main.Utils = {};

  Utils.DataModel = DataModel;

})(this);
