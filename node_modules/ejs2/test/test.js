var should = require('should');

var EJS = require('../lib/ejs');
var ejs = new EJS();

var file = __dirname + '/test.ejs';


describe('renderFile', function() {
	it('should cache files', function(done) {

    ejs.renderFile(file, function(err, html) {
      console.log(err,html);
      should.exist(ejs.cache[file + ':raw']);
      done();
    });
	});

});
