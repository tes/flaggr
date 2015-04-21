'use strict';

var adapters = {
  redis: require('./redis'),
  memory: require('./memory')
};

module.exports = adapters;
