'use strict';

var groupGenerator = {};
var GROUP_KEYS_PREFIX = 'group-';

groupGenerator.generateKey = function(groupName) {
  return GROUP_KEYS_PREFIX + groupName;
};

module.exports = groupGenerator;