'use strict';

var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

function MemoryAdapter(config) {
  var self = this;
  this.source = {};

  config = config || {
    memoize: null
  };

  if (config.source) {
    this.source = config.source;
  }

  this.name = 'memory';

  // API Stuff

  this.features = function(next) {
    if (!_.isPlainObject(this.source)) {
      return next(null, []);
    }

    next(null, Object.keys(this.source));
  };

  this.add = function(feature, next) {
    this.source[feature] = {
      name: feature,
      enabled: true
    };

    next();
  };

  this.remove = function(feature, next) {
    delete this.source[feature];

    return next();
    //clear(feature, next);
  };

  this.get = function(feature, next) {
    var result = this.source[feature];

    next(null, result);
  };

  // Boolean Flags
  this.enable = function(feature, next) {
    if (!this.source[feature]) {
      return next(null, next);
    }

    this.source[feature].enabled = true;

    return next();
  };

  this.disable = function(feature, next) {
    if (!this.source[feature]) {
      return next();
    }

    this.source[feature].enabled = false;

    return next();
  };

  this.isEnabledGlobally = function(feature, next) {
    initSetOnKey(this.source, feature);

    return next(null, this.source[feature].enabled);
  };

  // Group flags
  this.registerGroup = function(feature, groupKey, key, value, next) {
    initSetOnKey(this.source, feature);

    this.source[feature][groupKey] = {
      enabled: true,
      key: key,
      value: value
    };

    return next();
  };

  this.enableGroup = function(feature, groupKey, next) {
    if (!this.source[feature] || !this.source[feature][groupKey]) return next(null, false);

    this.source[feature][groupKey].enabled = true;

    return next(null, true);
  };

  this.disableGroup = function(feature, groupKey, next) {
    if (!this.source[feature] || !this.source[feature][groupKey]) return next(null, false);

    this.source[feature][groupKey].enabled = false;

    return next(null, true);
  };

  this.isEnabledForGroup = function(feature, groupKey, groupMember, next) {
    initSetOnKey(this.source, feature);

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
  this.registerUser = function(feature, userKey, next) {
    initSetOnKey(this.source, feature);

    this.source[feature][userKey] = {
      enabled: true
    };

    return next(null, true);
  };

  this.enableUser = function(feature, userKey, next) {
    if (!this.source[feature] || !this.source[feature][userKey]) return next(null, false);

    this.source[feature][userKey].enabled = true;

    return next(null, true);
  };

  this.disableUser = function(feature, userKey, next) {
    if (!this.source[feature] || !this.source[feature][userKey]) return next(null, false);

    this.source[feature][userKey].enabled = false;

    return next(null, true);
  };

  this.isEnabledForUser = function(feature, userKey, next) {
    initSetOnKey(this.source, feature);

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
      this.source = {};
      next();
  };

  function initSetOnKey(source, key) {
    if (!source) source = {};

    if (source[key]) return;

    source[key] = {};
  }

  setTimeout(function(){
    self.emit('ready');
  });
}

module.exports = MemoryAdapter;

require('util').inherits(MemoryAdapter, EventEmitter);