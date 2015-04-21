'use strict';

var redis = require('redis');
var EventEmitter = require('events').EventEmitter;
var url = require('url');

function parseRedisConnectionString(connectionString) {
  var params = url.parse(connectionString, true);

  return {
    host: params.hostname,
    port: params.port && parseInt(params.port) || 6379,
    db: params.query.db && parseInt(params.query.db) || 0
  };
}

function RedisAdapter(config) {
  var redisConfig;
  var tenSeconds = 10 * 1000;
  var self = this;

  if(config.url) {
    redisConfig = parseRedisConnectionString(config.url);
  } else {
    redisConfig = config;
  }
  
  redisConfig.options = redisConfig.options || {};

  // Default redis client behaviour is to back off exponentially forever. Not very useful.
  redisConfig.options.retry_max_delay = redisConfig.options.retry_max_delay || tenSeconds;

  self._redisClient = redis.createClient(redisConfig.port || null, redisConfig.host || null, redisConfig.options);

  // Prevent error events bubbling up to v8 and taking the worker down if redis is unavailable
  // By listening for the error event, the redis client will automatically attempt to
  // re-establish the connection
  self._redisClient.on('error', function(err) {
    console.log('Error connecting to %s:%s - %s', redisConfig.host, redisConfig.port, err.message);
  });

  self._redisClient.on('ready', function() {
    self.emit('ready');
  });

  self._redisClient.select(redisConfig.db || 0);

  this.name = 'redis';

  this.disconnect = function(next) {
      self._redisClient.quit();
      return next();
  };
}

module.exports = RedisAdapter;

require('util').inherits(RedisAdapter, EventEmitter);