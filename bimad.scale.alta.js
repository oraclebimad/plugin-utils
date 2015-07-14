(function (main) {
  'use strict';
  /* jshint unused:true, curly:false */
  /* global d3 */

  var altaColors = [
    '#FAD55C', '#ED6647', '#8561C8', '#6DDBDB',
    '#FFB54D', '#E371B2', '#47BDEF', '#A2BF39',
    '#A75DBA', '#F7F37B', '#267DB3', '#68C182'
  ];


  if (!('bimad' in main))
    main.bimad = {};

  if (!('scale' in main.bimad))
    main.bimad.scale = {};

  if (!('alta' in main.bimad.scale)) {
    main.bimad.scale.alta = function () {
      return d3.scale.ordinal().range(altaColors);
    };
  }
})(this);
