'use strict';

var expect = require('expect.js');
var Flaggr = require('../index');
var _ = require('lodash');
var async = require('async');

describe('Flaggr', function() {

  it('If you initialize with an incorrect flaggr it should throw an error', function(done) {
    var config = {
      adapter: 'weird-flaggr'
    };

    var flaggr = new Flaggr(config);
    flaggr.on('error', function(err) {
      expect(err).to.be.ok();
      done();
    });
  });

  it('It should default to the memory flaggr if none passed', function(done) {
    var flaggr = new Flaggr();
    flaggr.on('ready', function() {
      expect(flaggr.adapter.name).to.be('memory');
      done();
    });
  });

  describe('Instance', function() {
    var flaggr;
    var featureKey = 'uploader';
    var fakeFeatureKey = featureKey + '-fake';

    var checkNumberOfFeatures = _.curry(function(expectedNumberOfFeatures, next) {
      flaggr.features(function(err, features) {
        expect(features).to.have.length(expectedNumberOfFeatures);
        next(err);
      });
    });

    var addFeature = _.curry(function(feature, next) {
      flaggr.add(feature, next);
    });

    var checkFeatureEnabled = _.curry(function(feature, shouldbeEnabled, next) {
      flaggr.isEnabled(feature, function(err, isEnabled) {
        expect(isEnabled).to.be(shouldbeEnabled);

        next();
      });
    });

    before(function(done) {
      flaggr = new Flaggr();
      flaggr.on('ready', done);
    });

    describe('API', function() {
      it('should return an empty list of features if there are none', function(done) {
        checkNumberOfFeatures(0, done);
      });

      it('should allow adding a feature by name', function(done) {
        flaggr.add(featureKey, function(err) {
          if (err) return done(err);

          checkNumberOfFeatures(1, done);
        });
      });

      it('should not allow a new feature if a feature with the same name is already there', function(done) {
        flaggr.add(featureKey, function(err) {
          if (err) return done(err);

          checkNumberOfFeatures(1, done);
        });
      });

      it('should not allow a new feature if a feature with the same name is already there', function(done) {
        flaggr.add(featureKey, function(err) {
          if (err) return done(err);

          checkNumberOfFeatures(1, done);
        });
      });

      it('should do nothing if it tries to remove a feature that is not on the feature list', function(done) {
        flaggr.remove(fakeFeatureKey, function(err) {
          if (err) return done(err);

          checkNumberOfFeatures(1, done);
        });
      });

      it('should remove a feature that is on the feature list', function(done) {
        flaggr.remove(featureKey, function(err) {
          if (err) return done(err);

          checkNumberOfFeatures(0, done);
        });
      });

      it('should return null when trying to retrieve a feature that does not exist', function(done) {
        flaggr.get(featureKey, function(err, feature) {
          if (err) return done(err);

          expect(feature).not.to.be.ok();
          done();
        });
      });

      it('should return a feature when it actually exists', function(done) {
        var getFeature = _.curry(function(key, next) {
          flaggr.get(key, function(err, feature) {
            if (err) return next(err);

            expect(feature).to.be.ok();
            next();
          });
        });

        async.series([
          addFeature(featureKey),
          getFeature(featureKey)
        ], done);
      });
    });

    describe('gates', function() {
      describe('boolean', function() {
        it('should do nothing when trying to enable a feature that doesnt exist', function(done) {
          flaggr.enable(fakeFeatureKey, function(err) {
            if (err) return done(err);

            checkNumberOfFeatures(1, done);
          });
        });

        it('should do nothing when trying to enable a feature that is already enabled', function(done) {
          flaggr.enable(featureKey, function(err) {
            if (err) return done(err);

            flaggr.get(featureKey, function(err, feature) {
              expect(feature.enabled).to.be(true);
              done();
            });
          });
        });

        it('should enable a feature that is disabled', function(done) {
          var disableFeature = _.curry(function(key, next) {
            flaggr.disable(key, function(err) {
              if (err) return next(err);
              next();
            });
          });

          var enableFeature = _.curry(function(key, next) {
            flaggr.enable(key, function(err) {
              if (err) return next(err);
              next();
            });
          });

          var checkFeatureEnabled = _.curry(function(key, next) {
            flaggr.get(key, function(err, feature) {
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
        var groupProp = 'admin';
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

          flaggr.isEnabled(featureKey, opts, function(err, enabled) {
            expect(err).not.to.be.ok();
            expect(enabled).to.be(shouldBeEnabled);

            next();
          });
        });

        it('should return disable if a group does not exist', function(done) {
          checkEnabled(fakeFeatureKey, groupName, groupMemberAdmin, false, done);
        });

        it('should allow to register a group and default to enabled', function(done) {
          flaggr.registerGroup(featureKey, groupName, groupProp, groupValue, function(err) {
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
          flaggr.enableGroup(featureKey, groupName, function(err) {
            expect(err).not.to.be.ok();
            done();
          });
        });

        it('should disable a feature', function(done) {
          var test = function(next) {
            flaggr.disableGroup(featureKey, groupName, next);
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
            flaggr.enableGroup(featureKey, groupName, next);
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
            flaggr.disableGroup(featureKey, groupName, next);
          };

          var enableGroup = function(next) {
            flaggr.enableGroup(featureKey, groupName, next);
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
            flaggr.enable(featureKey, next);
          };

          var disableFeature = function(next) {
            flaggr.disable(featureKey, next);
          };

          var enableGroup = function(next) {
            flaggr.enableGroup(featureKey, groupName, next);
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

          flaggr.isEnabled(featureKey, opts, function(err, enabled) {
            expect(err).not.to.be.ok();
            expect(enabled).to.be(shouldBeEnabled);

            next();
          });
        });

        it('should return disable if a user has not been added', function(done) {
          checkEnabled(fakeFeatureKey, allowedUser, false, done);
        });

        it('should throw an error if the object passed doesnt have an id property', function(done) {
          flaggr.enableUser(featureKey, { other_id: 12 }, function(err) {
            expect(err).to.be.ok();

            done();
          });
        });

        it('should allow to register a user and default to enabled', function(done) {
          flaggr.registerUser(featureKey, allowedUser, function(err) {
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
          flaggr.registerUser(featureKey, allowedUser, function(err) {
            expect(err).not.to.be.ok();
            done();
          });
        });

        it('should disable a feature', function(done) {
          var test = function(next) {
            flaggr.disableUser(featureKey, allowedUser, next);
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
            flaggr.enableUser(featureKey, allowedUser, next);
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
            flaggr.disableUser(featureKey, allowedUser, next);
          };

          var enableUser = function(next) {
            flaggr.enableUser(featureKey, allowedUser, next);
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
            flaggr.enable(featureKey, next);
          };

          var disableFeature = function(next) {
            flaggr.disable(featureKey, next);
          };

          var enableUser = function(next) {
            flaggr.enableUser(featureKey, allowedUser, next);
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
});
