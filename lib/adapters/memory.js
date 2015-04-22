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
      this.source = {};
      next();
  };

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

  setTimeout(function(){
    self.emit('ready');
  });
}

module.exports = MemoryAdapter;

require('util').inherits(MemoryAdapter, EventEmitter);