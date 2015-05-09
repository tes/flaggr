'use strict';

var adapters = {
  redis: require('./redisAdapter'),
  memory: require('./memoryAdapter')
};

module.exports = adapters;
