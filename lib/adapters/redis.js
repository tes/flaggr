'use strict';

var redis = require('fakeredis');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var _ = require('lodash');
var FLAGGR_FEATURES = 'flagger_features';

function RedisAdapter(config) {
  var redisConfig;
  var tenSeconds = 10 * 1000;
  var self = this;

  if (!config) {
    setTimeout(function() {
      self.emit('error', new Error('Config not provided'));
    }, 0);
    return;
  };

  if(config.url) {
    redisConfig = parseRedisConnectionString(config.url);
  } else {
    redisConfig = config;
  }
  
  redisConfig.options = redisConfig.options || {};

  // Default redis client behaviour is to back off exponentially forever. Not very useful.
  redisConfig.options.retry_max_delay = redisConfig.options.retry_max_delay || tenSeconds;

  this._redisClient = redis.createClient(redisConfig.port || null, redisConfig.host || null, redisConfig.options);

  // Prevent error events bubbling up to v8 and taking the worker down if redis is unavailable
  // By listening for the error event, the redis client will automatically attempt to
  // re-establish the connection
  this._redisClient.on('error', function(err) {
    console.log('Error connecting to %s:%s - %s', redisConfig.host, redisConfig.port, err.message);
  });

  this._redisClient.on('ready', function() {
    self.emit('ready');
  });

  this._redisClient.select(redisConfig.db || 0);

  this.name = 'redis';

  // API Stuff

  this.features = function(next) {
    this._redisClient.smembers(FLAGGR_FEATURES, function(err, reply) {
      redis.print(err, reply);
      return next(err, reply);
    });
  };

  this.add = function(feature, next) {
    var self = this;
    // This can prob be done using a multi instead of 2 redis call but
    // add doesnt have to be performant so will keep it like this for now
    // to avoid code duplication
    this._redisClient.sadd(FLAGGR_FEATURES, feature, function(err, reply) {
      if (err) return next(err);

      self.enable(feature, next);
    });
  };

  this.remove = function(feature, next) {
    // Also clear all gates, this will have to be switched to a multi with
    // srem and hrem
    this._redisClient.multi()
      .srem(FLAGGR_FEATURES, feature)
      .del(feature)
      .exec(function(err, replies) {
        redis.print(err, replies);
        return next(err, replies);
      });
  };

  this.get = function(feature, next) {
    this._redisClient.hgetall(feature, function(err, reply) {
      if (err) return next(err);

      if (!reply) return next();

      var parsedObject = _.reduce(reply, function(result, val, key) {
        result[key] = JSON.parse(val);
        return result;
      }, {});

      next(null, parsedObject);
    });
  };

  // Boolean Flags

  this.enable = function(feature, next) {
    this._redisClient.hset(feature, 'enabled', 'true', function(err, reply) {
      redis.print(err, reply);
      return next(err, reply);
    });
  };

  this.disable = function(feature, next) {
    this._redisClient.hget(feature, 'enabled', function(err, reply) {
      redis.print(err, reply);
      return next(err, reply);
    });

    return next();
  };

  this.isEnabled = function(feature, opts, next ) {
    if (typeof opts === 'function') {
      next = opts;
      opts = {};
    }

    initSetOnKey(this.source, feature);

    if (opts.group) return this.isEnabledForGroup(feature, opts.group, opts.groupMember, next);
    if (opts.user) return this.isEnabledForUser(feature, opts.user, next);
    if (opts.percentageUser) return this.isEnabledForPercentageUser(feature, opts.percentageUser, next);
    if (opts.percentageTime) return this.isEnabledForPercentageTime(feature, opts.percentageTime, next);

    return next(null, this.source[feature].enabled);
  };

  // Group flags

  this.registerGroup = function(feature, groupName, key, value, next) {
    if (arguments.length !== 5) return next(new Error('Missing argument'));

    initSetOnKey(this.source, feature);

    var groupKey = generateGroupKey(groupName);
    this.source[feature][groupKey] = {
      enabled: true,
      key: key,
      value: value
    };

    return next();
  };

  this.enableGroup = function(feature, groupName, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    var groupKey = generateGroupKey(groupName);

    if (!this.source[feature] || !this.source[feature][groupKey]) return next(null, false);

    this.source[feature][groupKey].enabled = true;

    return next(null, true);
  };

  this.disableGroup = function(feature, groupName, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    var groupKey = generateGroupKey(groupName);

    if (!this.source[feature] || !this.source[feature][groupKey]) return next(null, false);

    this.source[feature][groupKey].enabled = false;

    return next(null, true);
  };

  this.isEnabledForGroup = function(feature, groupName, groupMember, next) {
    if (arguments.length !== 4) return next(new Error('Missing argument'));

    var groupKey = generateGroupKey(groupName);

    var featureDoesNotExistOrIsDisabled = !this.source[feature] || this.source[feature].enabled === false;
    if (featureDoesNotExistOrIsDisabled) {
      return next(null, false);
    }

    var featureGroupDoesNotExistOrIsDisabled = !this.source[feature][groupKey] || this.source[feature][groupKey].enabled === false;
    if (featureGroupDoesNotExistOrIsDisabled) {
      return next(null, false);
    }

    var key = this.source[feature][groupKey].key;

    // The object does not have the property we care about
    if (!groupMember[key]) return next(null, false);

    var value = _.isFunction(groupMember.key) ? groupMember.key() : _.get(groupMember, key);

    return next(null, value === this.source[feature][groupKey].value);
  };

  // User flags

  this.registerUser = function(feature, user, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    if (!user.id) return (next(new Error('User passed has no id property')));

    initSetOnKey(this.source, feature);
    var userKey = generateUserKey(user.id);

    this.source[feature][userKey] = {
      enabled: true
    };

    return next(null, true);
  };

  this.enableUser = function(feature, user, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    if (!user.id) return (next(new Error('User passed has no id property')));

    var userKey = generateUserKey(user.id);

    if (!this.source[feature] || !this.source[feature][userKey]) return next(null, false);

    this.source[feature][userKey].enabled = true;

    return next(null, true);
  };

  this.disableUser = function(feature, user, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    if (!user.id) return (next(new Error('User passed has no id property')));

    var userKey = generateUserKey(user.id);

    if (!this.source[feature] || !this.source[feature][userKey]) return next(null, false);

    this.source[feature][userKey].enabled = false;

    return next(null, true);
  };

  this.isEnabledForUser = function(feature, user, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    if (!user.id) return (next(new Error('User passed has no id property')));

    var userKey = generateUserKey(user.id);

    var featureDoesNotExistOrIsDisabled = !this.source[feature] || this.source[feature].enabled === false;
    if (featureDoesNotExistOrIsDisabled) {
      return next(null, false);
    }

    var featureUserDoesNotExistOrIsDisabled = !this.source[feature][userKey] || this.source[feature][userKey].enabled === false;
    if (featureUserDoesNotExistOrIsDisabled) {
      return next(null, false);
    }

    return next(null, true);
  };

  // COMING SOON: Percentage User
  // COMING SOON: Percentage Time

  this.disconnect = function(next) {
    self._redisClient.quit();
    return next();
  };

  function parseRedisConnectionString(connectionString) {
    var params = url.parse(connectionString, true);

    return {
      host: params.hostname,
      port: params.port && parseInt(params.port) || 6379,
      db: params.query.db && parseInt(params.query.db) || 0
    };
  }

  function generateGroupKey(groupName) {
    return 'group-' + groupName;
  }

  function generateUserKey(userId) {
    return 'user-' + userId;
  }

  function initSetOnKey(source, key) {
    if (!source) source = {};

    if (source[key]) return;

    source[key] = {};
  }
}

module.exports = RedisAdapter;

require('util').inherits(RedisAdapter, EventEmitter);