'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var AdapterFactory = require('./lib/adapters');

var userGenerator = require('./lib/generators/users');
var groupGenerator = require('./lib/generators/groups');

function Flaggr(config) {
  var self = this;

  if (!config) {
    config = {};
  }

  this.config = _.defaults(config, {
    adapter: 'memory'
  });

  var Adapter = AdapterFactory[self.config.adapter];
  if (!Adapter) {
    setTimeout(function(){
      self.emit('error', 'Could not find adapter ' + self.config.adapter);
    });

    return;
  }

  this.adapter = new Adapter(config);
  this.adapter.on('ready', function() {
    self.emit('ready');
  });

  this.features = function(next) {
    return this.adapter.features(next);
  };

  this.add = function(feature, next) {
    return this.adapter.add(feature, next);
  };

  this.remove = function(feature, next) {
    return this.adapter.remove(feature, next);
  };

  this.get = function(feature, next) {
    return this.adapter.get(feature, next);
  };

  this.isEnabled = function(feature, opts, next) {
    if (typeof opts === 'function') {
      next = opts;
      opts = {};
    }

    if (opts.group) return this.isEnabledForGroup(feature, opts.group, opts.groupMember, next);
    if (opts.user) return this.isEnabledForUser(feature, opts.user, next);

    return this.isEnabledGlobally(feature, next);
  };

  // Boolean Flags
  this.enable = function(feature, next) {
    return this.adapter.enable(feature, next);
  };

  this.disable = function(feature, next) {
    return this.adapter.disable(feature, next);
  };

  this.isEnabledGlobally = function(feature, next) {
    return this.adapter.isEnabledGlobally(feature, next);
  };

  // Group flags
  this.registerGroup = function(feature, groupName, prop, value, next) {
    if (arguments.length !== 5) return next(new Error('Missing argument'));

    var groupKey = groupGenerator.generateKey(groupName);

    return this.adapter.registerGroup(feature, groupKey, prop, value, next);
  };

  this.enableGroup = function(feature, groupName, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    var groupKey = groupGenerator.generateKey(groupName);

    return this.adapter.enableGroup(feature, groupKey, next);
  };

  this.disableGroup = function(feature, groupName, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    var groupKey = groupGenerator.generateKey(groupName);

    return this.adapter.disableGroup(feature, groupKey, next);
  };

  this.isEnabledForGroup = function(feature, groupName, groupMember, next) {
    if (arguments.length !== 4) return next(new Error('Missing argument'));

    var groupKey = groupGenerator.generateKey(groupName);

    return this.adapter.isEnabledForGroup(feature, groupKey, groupMember, next);
  };

  // User flags
  this.registerUser = function(feature, user, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    if (!user.id) return (next(new Error('User passed has no id property')));

    var userKey = userGenerator.generateKey(user);

    return this.adapter.registerUser(feature, userKey, next);
  };

  this.enableUser = function(feature, user, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    if (!user.id) return (next(new Error('User passed has no id property')));

    var userKey = userGenerator.generateKey(user);

    return this.adapter.enableUser(feature, userKey, next);
  };

  this.disableUser = function(feature, user, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    if (!user.id) return (next(new Error('User passed has no id property')));

    var userKey = userGenerator.generateKey(user);

    return this.adapter.disableUser(feature, userKey, next);
  };

  this.isEnabledForUser = function(feature, user, next) {
    if (arguments.length !== 3) return next(new Error('Missing argument'));

    if (!user.id) return (next(new Error('User passed has no id property')));

    var userKey = userGenerator.generateKey(user);

    return this.adapter.isEnabledForUser(feature, userKey, next);
  };

  this.disconnect = function(next) {
    return this.adapter.disconnect(next);
  };
}

module.exports = Flaggr;
require('util').inherits(Flaggr, EventEmitter);