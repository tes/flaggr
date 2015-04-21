'use strict';

var expect = require('expect.js');
var Flipper = require('../index');

describe('Flipper', function() {

  it('If you initialize with an incorrect adapter it should throw an error', function(done) {
    var config = {
      adapter: 'weird-adapter'
    };

    var flipper = new Flipper(config);
    flipper.on('error', function(err) {
      expect(err).to.be.ok();
      done();
    });
  });

  it('It should default to the memory adapter if none passed', function(done) {
    var flipper = new Flipper();
    flipper.on('ready', function() {
      expect(flipper.adapter.name).to.be('memory');
      done();
    });
  });
});
