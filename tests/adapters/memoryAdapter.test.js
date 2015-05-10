'use strict';

var expect = require('expect.js');
var MemoryAdapter = require('../../lib/adapters/memoryAdapter');
var usersGenerator = require('../../lib/generators/users');
var groupsGenerator = require('../../lib/generators/groups');
var _ = require('lodash');
var async = require('async');

describe('Memory Adapter', function() {
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
    adapter.isEnabledGlobally(feature, function(err, isEnabled) {
      expect(isEnabled).to.be(shouldbeEnabled);

      next();
    });
  });

  before(function(done) {
    adapter = new MemoryAdapter();
    adapter.on('ready', done);
  });

  after(function(done) {
    adapter.disconnect(done);
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

          expect(feature).to.eql(feature);
          next();
        });
      });

      async.series([
        addFeatureToAdapter(featureKey),
        getFeature(featureKey)
      ], done);
    });

    it('should do nothing when trying to enable a feature that doesnt exist', function(done) {
      adapter.enable(fakeFeatureKey, function(err) {
        if (err) return done(err);

        checkNumberOfFeatures(1, done);
      });
    });
  });

  describe('gates', function() {
    describe('boolean', function() {
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
      var groupKey = groupsGenerator.generateKey(groupName);
      var groupProp = 'admin';
      var groupValue = true;

      var groupMemberAdmin = {
        admin: true
      };

      var groupMemberNonAdmin = {
        admin: false
      };

      var checkEnabled = _.curry(function(key, groupKey, groupMember, shouldBeEnabled, next) {
        adapter.isEnabledForGroup(featureKey, groupKey, groupMember, function(err, enabled) {
          expect(err).not.to.be.ok();
          expect(enabled).to.be(shouldBeEnabled);

          next();
        });
      });

      it('should return disable if a group does not exist', function(done) {
        checkEnabled(fakeFeatureKey, groupKey, groupMemberAdmin, false, done);
      });

      it('should allow to register a group and default to enabled', function(done) {
        adapter.registerGroup(featureKey, groupKey, groupProp, groupValue, function(err) {
          expect(err).not.to.be.ok();

          async.parallel([
            checkEnabled(featureKey, groupKey, groupMemberAdmin, true),
            checkEnabled(featureKey, groupKey, groupMemberNonAdmin, false)
          ], function(err) {
            expect(err).not.to.be.ok();
            done();
          });
        });
      });

      it('should do nothing when trying to enable a feature that is already enabled', function(done) {
        adapter.enableGroup(featureKey, groupKey, function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should disable a feature', function(done) {
        var test = function(next) {
          adapter.disableGroup(featureKey, groupKey, next);
        };

        async.series([
          checkEnabled(featureKey, groupKey, groupMemberAdmin, true),
          test,
          checkEnabled(featureKey, groupKey, groupMemberAdmin, false)
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should enable a feature if a feature is disabled', function(done) {
        var test = function(next) {
          adapter.enableGroup(featureKey, groupKey, next);
        };

        async.series([
          checkEnabled(featureKey, groupKey, groupMemberAdmin, false),
          test,
          checkEnabled(featureKey, groupKey, groupMemberAdmin, true)
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should return enabled if a boolean gate exist for the feature even if the group is disabled', function(done) {
        var disableGroup = function(next) {
          adapter.disableGroup(featureKey, groupKey, next);
        };

        var enableGroup = function(next) {
          adapter.enableGroup(featureKey, groupKey, next);
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
          adapter.enableGroup(featureKey, groupKey, next);
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

      var allowedUserKey = usersGenerator.generateKey(allowedUser);
      var nonAllowedUserKey = usersGenerator.generateKey(nonAllowedUser);

      var checkEnabled = _.curry(function(key, userKey, shouldBeEnabled, next) {
        adapter.isEnabledForUser(featureKey, userKey, function(err, enabled) {
          expect(err).not.to.be.ok();
          expect(enabled).to.be(shouldBeEnabled);

          next();
        });
      });

      it('should return disable if a user has not been added', function(done) {
        checkEnabled(fakeFeatureKey, allowedUserKey, false, done);
      });

      it('should allow to register a user and default to enabled', function(done) {
        adapter.registerUser(featureKey, allowedUserKey, function(err) {
          expect(err).not.to.be.ok();

          async.parallel([
            checkEnabled(featureKey, allowedUserKey, true),
            checkEnabled(featureKey, nonAllowedUserKey, false)
          ], function(err) {
            expect(err).not.to.be.ok();
            done();
          });
        });
      });

      it('should do nothing when trying to enable a feature that is already enabled', function(done) {
        adapter.registerUser(featureKey, allowedUserKey, function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should disable a feature', function(done) {
        var test = function(next) {
          adapter.disableUser(featureKey, allowedUserKey, next);
        };

        async.series([
          checkEnabled(featureKey, allowedUserKey, true),
          test,
          checkEnabled(featureKey, allowedUserKey, false)
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should enable a feature if a feature is disabled', function(done) {
        var test = function(next) {
          adapter.enableUser(featureKey, allowedUserKey, next);
        };

        async.series([
          checkEnabled(featureKey, allowedUserKey, false),
          test,
          checkEnabled(featureKey, allowedUserKey, true)
        ], function(err) {
          expect(err).not.to.be.ok();
          done();
        });
      });

      it('should return enabled if a boolean gate exist for the feature even if the group is disabled', function(done) {
        var disableUser = function(next) {
          adapter.disableUser(featureKey, allowedUserKey, next);
        };

        var enableUser = function(next) {
          adapter.enableUser(featureKey, allowedUserKey, next);
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