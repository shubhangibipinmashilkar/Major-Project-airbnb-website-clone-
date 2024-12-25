// relies on you having EJS in the same parent directory as EJS2
var ejs = require('../../ejs');

var file = __dirname + '/test.ejs';

var num = process.env.NUM ? +process.env.NUM : 100;

var opts = {cache: !!process.env.CACHE || false};

var interval;
var comp = 0;
var startDrift = function() {
  var inte = 1;
  comp = 0;
  interval = setInterval(function() {
    comp += inte;
  }, inte);
};

var doneLog = function(start, type, cb) {
  var diff = process.hrtime(start);

  process.nextTick(function() {
    diff = +(diff[0] + diff[1] * 1e-9);
    var drift = diff * 1000 - comp;
    console.log('\n' + type.toUpperCase());
    console.log('--> ' + num + ' renderfiles in ' + diff + 's');
    console.log('--> ' + (diff * 1000 / num) + 'ms per render');
    console.log('--> ' + (drift / 1000) + 's estimated process lock');
    console.log('--> ' + (drift / num) + 'ms lock per render');
    clearInterval(interval);
    cb && cb();
  });
};

var testSync = function(cb) {
  var done = 0;

  var start = process.hrtime();

  startDrift();

  var next = function() {

    if (++done === num) {
      doneLog(start, 'sync', cb);
      return;
    }
    setImmediate(function() {
      ejs.renderFile(file, opts, next);
    });
  };

  ejs.renderFile(file, opts, next);
};

var testParallel = function(cb) {
  var start = process.hrtime();

  startDrift();

  var done = 0;
  var isDone = function(err, html) {
    if (++done === num) {
      doneLog(start, 'parallel', cb);
    }
  };

  for (var i = 0; i < num; i++) {
    ejs.renderFile(file, opts, isDone);
  }
};

testSync(testParallel.bind(this, process.exit));
