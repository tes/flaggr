'use strict';

var expect = require('expect.js');
var RedisAdapter = require('../lib/adapters/redisAdapter');
var _ = require('lodash');
var async = require('async');

describe('Redis Adapter', function() {
  var adapter = null;
  var featureKey = 'uploader';
  var fakeFeatureKey = featureKey + '-fake';

  var checkNumberOfFeatures = _.curry(function(expectedNumberOfFeatures, next) {
    adapter.features(function(err, features) {
      expect(features).to.have.length(expectedNumberOfFeatures);
      next(err);
    });
  });

  var addFeatureToAdapter = _.curry(function(feature, next) {
    adapter.add(feature, next);
  });

  var checkFeatureEnabled = _.curry(function(feature, shouldbeEnabled, next) {
    adapter.isEnabled(feature, function(err, isEnabled) {
      expect(isEnabled).to.be(shouldbeEnabled);

      next();
    });
  });

  before(function(done) {
    var config = {
      url: "redis://localhost?db=1"
    };

    adapter = new RedisAdapter(config);
    adapter.on('ready', done);
  });

  after(function(done) {
    adapter.disconnect(done);
  });

  it('should throw an error if a config is not passed', function(done) {
    var brokenAdapter = new RedisAdapter();
    brokenAdapter.on('error', function(err) {
      expect(err).to.be.ok();
      done();
    });
  });

  describe('API', function() {
    it('should return an empty list of features if there are none', function(done) {
      checkNumberOfFeatures(0, done);
    });

    it('should allow adding a feature by name', function(done) {
      adapter.add(featureKey, function(err) {
        if (err) return done(err);

        checkNumberOfFeatures(1, done);
      });
    });

    it('should not allow a new feature if a feature with the same name is already there', function(done) {
      adapter.add(featureKey, function(err) {
        if (err) return done(err);

        checkNumberOfFeatures(1, done);
      });
    });

    it('should not allow a new feature if a feature with the same name is already there', function(done) {
      adapter.add(featureKey, function(err) {
        if (err) return done(err);

        checkNumberOfFeatures(1, done);
      });
    });

    it('should do nothing if it tries to remove a feature that is not on the feature list', function(done) {
      adapter.remove(fakeFeatureKey, function(err) {
        if (err) return done(err);

        checkNumberOfFeatures(1, done);
      });
    });

    it('should remove a feature that is on the feature list', function(done) {
      adapter.remove(featureKey, function(err) {
        if (err) return done(err);

        checkNumberOfFeatures(0, done);
      });
    });

    it('should return null when trying to retrieve a feature that does not exist', function(done) {
      adapter.get(featureKey, function(err, feature) {
        if (err) return done(err);

        expect(feature).not.to.be.ok();
        done();
      });
    });

    it('should return a feature when it actually exists', function(done) {
      var getFeature = _.curry(function(key, next) {
        adapter.get(key, function(err, feature) {
          if (err) return next(err);

          expect(feature).to.be.ok();
          next();
        });
      });

      async.series([
        addFeatureToAdapter(featureKey),
        getFeature(featureKey)
      ], done);
    });
  });

  describe('gates', function() {
    describe('boolean', function() {
      it('should do nothing when trying to enable a feature that doesnt exist', function(done) {
        adapter.enable(fakeFeatureKey, function(err) {
          if (err) return done(err);

          checkNumberOfFeatures(1, done);
        });
      });

      it('should do nothing when trying to enable a feature that is already enabled', function(done) {
        adapter.enable(featureKey, function(err) {
          if (err) return done(err);

          adapter.get(featureKey, function(err, feature) {
            expect(feature.enabled).to.be(true);
            done();
          });
        });
      });

      it('should enable a feature that is disabled', function(done) {
        var disableFeature = _.curry(function(key, next) {
          adapter.disable(key, function(err) {
            if (err) return next(err);
            next();
          });
        });

        var enableFeature = _.curry(function(key, next) {
          adapter.enable(key, function(err) {
            if (err) return next(err);
            next();
          });
        });

        var checkFeatureEnabled = _.curry(function(key, next) {
          adapter.get(key, function(err, feature) {
            if (err) return next(err);

            expect(feature).to.be.ok();
            expect(feature.enabled).to.be(true);
            next();
          });
        });

        async.series([
          disableFeature(featureKey),
          enableFeature(featureKey),
          checkFeatureEnabled(featureKey)
        ], done);
      });
    });

    describe('group', function() {
      var groupName = 'admins';
      var groupKey = 'admin';
      var groupValue = true;

      var groupMemberAdmin = {
        admin: true
      };

      var groupMemberNonAdmin = {
        admin: false
      };

      var checkEnabled = _.curry(function(key, groupName, groupMember, shouldBeEnabled, next) {
        var opts = {
          group: groupName,
          groupMember: groupMember
        };

        adapter.isEnabled(featureKey, opts, function(err, enabled) {
          expect(err).not.to.be.ok();
          expect(enabled).to.be(shouldBeEnabled);

          next();
        });
      });

      it('should return disable if a group does not exist', function(done) {
        checkEnabled(fakeFeatureKey, groupName, groupMemberAdmin, false, done);
      });

      it('should allow to register a group and default to enabled', function(done) {
        adapter.registerGroup(featureKey, groupName, groupKey, groupValue, function(err) {
          expect(err).not.to.be.ok();

          async.parallel([
            checkEnabled(featureKey, groupName, groupMemberAdmin, true),
            checkEnabled(featureKey, groupName, groupMemberNonAdmin, false)
          ], function(err) {
            expect(err).not.to.be.ok();
            done();
          });
        });
      });

      it('should do nothing when trying to enable a feature that is already enabled', function(done) {
        adapter.enableGroup(featureKey, groupName, function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should disable a feature', function(done) {
        var test = function(next) {
          adapter.disableGroup(featureKey, groupName, next);
        };

        async.series([
          checkEnabled(featureKey, groupName, groupMemberAdmin, true),
          test,
          checkEnabled(featureKey, groupName, groupMemberAdmin, false)
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should enable a feature if a feature is disabled', function(done) {
        var test = function(next) {
          adapter.enableGroup(featureKey, groupName, next);
        };

        async.series([
          checkEnabled(featureKey, groupName, groupMemberAdmin, false),
          test,
          checkEnabled(featureKey, groupName, groupMemberAdmin, true)
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should return enabled if a boolean gate exist for the feature even if the group is disabled', function(done) {
        var disableGroup = function(next) {
          adapter.disableGroup(featureKey, groupName, next);
        };

        var enableGroup = function(next) {
          adapter.enableGroup(featureKey, groupName, next);
        };

        async.series([
          disableGroup,
          checkFeatureEnabled(featureKey, true),
          enableGroup
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should return disabled if a boolean gate exist for the feature even if the group is enabled', function(done) {
        var enableFeature = function(next) {
          adapter.enable(featureKey, next);
        };

        var disableFeature = function(next) {
          adapter.disable(featureKey, next);
        };

        var enableGroup = function(next) {
          adapter.enableGroup(featureKey, groupName, next);
        };

        async.series([
          enableGroup,
          disableFeature,
          checkFeatureEnabled(featureKey, false),
          enableFeature
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });
    });

    describe('user', function() {
      var allowedUser = {
        id: 1
      };

      var nonAllowedUser = {
        id: 5
      };

      var checkEnabled = _.curry(function(key, user, shouldBeEnabled, next) {
        var opts = {
          user: user
        };

        adapter.isEnabled(featureKey, opts, function(err, enabled) {
          expect(err).not.to.be.ok();
          expect(enabled).to.be(shouldBeEnabled);

          next();
        });
      });

      it('should return disable if a user has not been added', function(done) {
        checkEnabled(fakeFeatureKey, allowedUser, false, done);
      });

      it('should throw an error if the object passed doesnt have an id property', function(done) {
        adapter.enableUser(featureKey, { other_id: 12 }, function(err) {
          expect(err).to.be.ok();

          done();
        });
      });

      it('should allow to register a user and default to enabled', function(done) {
        adapter.registerUser(featureKey, allowedUser, function(err) {
          expect(err).not.to.be.ok();

          async.parallel([
            checkEnabled(featureKey, allowedUser, true),
            checkEnabled(featureKey, nonAllowedUser, false)
          ], function(err) {
            expect(err).not.to.be.ok();
            done();
          });
        });
      });

      it('should do nothing when trying to enable a feature that is already enabled', function(done) {
        adapter.registerUser(featureKey, allowedUser, function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should disable a feature', function(done) {
        var test = function(next) {
          adapter.disableUser(featureKey, allowedUser, next);
        };

        async.series([
          checkEnabled(featureKey, allowedUser, true),
          test,
          checkEnabled(featureKey, allowedUser, false)
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should enable a feature if a feature is disabled', function(done) {
        var test = function(next) {
          adapter.enableUser(featureKey, allowedUser, next);
        };

        async.series([
          checkEnabled(featureKey, allowedUser, false),
          test,
          checkEnabled(featureKey, allowedUser, true)
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should return enabled if a boolean gate exist for the feature even if the group is disabled', function(done) {
        var disableUser = function(next) {
          adapter.disableUser(featureKey, allowedUser, next);
        };

        var enableUser = function(next) {
          adapter.enableUser(featureKey, allowedUser, next);
        };

        async.series([
          disableUser,
          checkFeatureEnabled(featureKey, true),
          enableUser
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should return disabled if a boolean gate exist for the feature even if the group is enabled', function(done) {
        var enableFeature = function(next) {
          adapter.enable(featureKey, next);
        };

        var disableFeature = function(next) {
          adapter.disable(featureKey, next);
        };

        var enableUser = function(next) {
          adapter.enableUser(featureKey, allowedUser, next);
        };

        async.series([
          enableUser,
          disableFeature,
          checkFeatureEnabled(featureKey, false),
          enableFeature
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });
    });
  });
});