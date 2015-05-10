'use strict';

var userGenerator = {};
var USER_KEYS_PREFIX = 'user-';

userGenerator.generateKey = function(user) {
  return USER_KEYS_PREFIX + user.id;
};

module.exports = userGenerator;