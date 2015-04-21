'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var AdapterFactory = require('./lib/adapters');

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

  this.enable = function(featureName, next) {
    featureName = 'will be used';
    return next();
  };

  this.disable = function(featureName, next) {
    featureName = 'will be used';
    return next();
  };

  this.isEnabled = function(featureName, next) {
    featureName = 'will be used';
    return next();
  };
}

module.exports = Flaggr;
require('util').inherits(Flaggr, EventEmitter);