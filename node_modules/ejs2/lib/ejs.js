var fs = require('fs');
var debug = require('debug')('ejs');
var crypto = require('crypto');
var path = require('path');
var filters = require('./filters');
var utils = require('./utils');

// TODO: SORT THIS OUT
function rethrow(err, str, filename, lineno){
  var lines = str.split('\n')
    , start = Math.max(lineno - 3, 0)
    , end = Math.min(lines.length, lineno + 3);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? ' >> ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'ejs') + ':'
    + lineno + '\n'
    + context + '\n\n'
    + err.message;

  throw err;
}


var EJS = module.exports = function(opts) {
  var self = this;
  self.opts = opts || {
    cache: true
  };
  self.cache = {};
};

EJS.prototype.render = function(str, opts, cb) {
  var self = this;

  debug('rendering');

  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  var key = opts.filename + ':comp';
  if (self.opts.cache && !opts.filename) {
    key = crypto.createHash('md5').update(str).digest('hex');
  }

  if (self.opts.cache && self.cache[key]) {
    debug('using cached compiled');
    self.cache[key].call(opts.scope, opts, cb);
    return;
  }

  self.compile(str, opts, function(err, comp) {
    if (err) {
      debug(err);
      return cb(err);
    }
    if (self.opts.cache) self.cache[key] = comp;
    comp.call(opts.scope, opts, cb);
  });


};

EJS.prototype.renderFile = function(file, opts, cb) {
  var self = this;

  debug('rendering file');

  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  opts.filename = file;

  self.fetchFile(file, function(err, str) {
    self.render(str, opts, cb);
  });

};

EJS.prototype.renderSerenityFile = function(file, opts, cb) {

  var self = this;

  debug('rendering serenity file');

  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  opts.filename = file;

  self.fetchFile(file, function(err, str) {

    self.renderSerenity(str, opts, cb);

  });
};

EJS.prototype.renderSerenity = function(str, opts, cb) {
  var self = this;

  debug('rendering serenity');

  opts.serenity = true;

  if (!opts.page) opts.page = {};

  var split = str.split('______');
  var pageOpts = split[0] || '{}';

  str = split.slice(1).join();

  try {
    var page = eval('(' + pageOpts + ')');
    for (var i in page) {
      if (!page.hasOwnProperty(i)) continue;
      opts.page[i] = page[i]; // overwrite anything with page opts.
    }
  } catch(e) {
    debug('no page config');
  }

  self.render(str, opts, function(err, html) {
    var layout = opts.page.layout;
    opts.page.layout = false;
    if (layout) {
      var ext = path.extname(layout);
      if (!ext) layout += '.ejs';

      self.renderSerenityFile('./_layouts/' + layout, {
        page: opts.page,
        site: opts.site,
        content: html
      }, cb);
      return;
    }

    cb(err, html);
  });

};

EJS.prototype.fetchFile = function(file, cb) {
  var self = this;

  debug('fetching file');

  var key = file + ':raw';
  if (self.opts.cache && self.cache[key]) {
    debug('using cached file');
    return cb(null, self.cache[key]);
  }

  debug('reading file');

  fs.readFile(file, 'utf8', function(err, file) {
    if (err) {
      debug('error reading file');
      debug(err);
      return cb(err);
    }

    if (self.opts.cache) {
      debug('caching file');
      self.cache[key] = file;
    }

    debug('read file');
    cb(err, file);
  });
};

EJS.prototype.compile = function(str, opts, cb) {
  var self = this;

  debug('compiling');

  self.parse(str, opts, function(err, str) {

    if (err) {
      debug('error compiling');
      return cb(err);
    }

    str = [
      'var __stack = { lineno: 1, input: ' + JSON.stringify(str) + ', filename: "' + opts.filename + '" };',
      rethrow.toString(),
      'try {',
        str,
      '} catch (err) {',
      '  rethrow(err, __stack.input, __stack.filename, __stack.lineno);',
      '}'
    ].join("\n");

    var fn;
    try {
      fn = new Function('locals, filters, escape, rethrow', str);
    } catch(e) {
      debug(e);
      return cb(e);
    }

    var func = function(locals, cb){
      var call = fn.call(this, locals, filters, utils.escape, rethrow);
      cb(null, call);
      return call;
    };

    cb(null, func);

  });

};

EJS.prototype.parse = function(str, opts, cb) {
  var self = this;

  debug('parsing');

  var open = opts.open || self.opts.open || '<%';
  var close = opts.close || self.opts.close || '%>';

  var buf = 'var buf = [];';
  if (opts._with !== false) buf += '\nwith (locals || {}) { (function(){ ';
  buf += 'buf.push(\'';

  var line = 1;
  var consumeEOL = false;
  var includes = [];


  for (var i = 0; i < str.length; i++) {

    if (str.slice(i, i + open.length) !== open) {

      // we dont have an open tag, so no EJS. process what we got
      switch(str[i]) {

        case "\\":  buf += "\\\\"; break;
        case "'":   buf += "\\'"; break;
        case "\r":  break;
        case "\n":  if (consumeEOL) {
                      consumeEOL = false;
                    } else {
                      buf += "\\n";
                      line++;
                    }
                    break;
        default:    buf += str[i];
      }

      // STOP HERE
      continue;
    }

    // we found an open tag
    i += open.length;

    var prefix, postfix;
    var lineAdd = '__stack.lineno=' + line;

    // parse the next character
    switch (str[i]) {
      case '=':
        prefix = "', escape((" + lineAdd + ', ';
        postfix = ")), '";
        i++;
        break;
      case '-':
        prefix = "', (" + lineAdd + ', ';
        postfix = "), '";
        i++;
        break;
      default:
        prefix = "');" + lineAdd + ';';
        postfix = "; buf.push('";
    }

    var start = i;
    var end = str.indexOf(close, i);
    var js = str.substring(i, end);
    var n = 0;


    if (js.substr(-1) === '-'){
      js = js.substring(0, js.length - 2);
      consumeEOL = true;
    }

    // process an include
    if (js.trim().indexOf('include') === 0) {

      // extract the name from 'include filename'
      var name = js.trim().slice(7).trim();

      if (!opts.filename) return cb(new Error('filename option is required for includes'));

      if (!path.extname(name)) name += '.ejs';

      var p = self.resolveInclude(name, opts.filename);

      // serenity forces includes to be in the _includes dir
      if (opts.serenity) p = './_includes/' + name;
      if (includes.indexOf(p) === -1) includes.push(p);

      // TODO: improve somehow? the string is replaced below
      buf += "' + (function(){" + '/*-----EJSINCLUDE ' + p + '-----*/' + "})() + '";
      js = '';
    }

    while(~(n = js.indexOf("\n", n))) {
      n++;
      line++;
    }

    // we have a filter, apply it
    if (js.substr(0, 1) == ':') js = self.filter(js);

    if (js) {
      if (js.lastIndexOf('//') > js.lastIndexOf('\n')) js += '\n';

      buf += prefix;

      // add the JS to buf
      buf += js;
      buf += postfix;
    }

    // increment i by the number of lines that we've processed
    i += end - start + close.length - 1;

  }

  if (opts._with !== false) {
    buf += "'); })();\n} \n return buf.join('');";
  } else {
    buf += "');\n return buf.join('');";
  }

  debug('done parsing');

  // if no includes, we're done
  if (!includes.length) return cb(null, buf);

  // async handling
  var done = 0;
  var isDone = function() {
    if (includes.length === ++done) {
      cb(null, buf);
    }
  };

  debug('handling includes');

  // loop over includes and switch them in
  includes.forEach(function(incl) {
    self.fetchFile(incl, function(err, file) {

      // should we clone the core opts object? (already in context, but for internal use)
      var ops = {};
      for (var i in opts) ops[i] = opts[i];
      ops._with = false;
      ops.filename = incl;

      self.parse(file, ops, function(err, inc) {

        // using split + join instead of regex (easier maintainability to be able to use a string)
        buf = buf.split('/*-----EJSINCLUDE ' + incl + '-----*/').join(inc);
        isDone();
      });
    });
  });


};

EJS.prototype.resolveInclude = function(name, filename) {
  var p = path.join(path.dirname(filename), name);
  var ext = path.extname(name);
  if (!ext) p += '.ejs';
  return p;
};

EJS.prototype.filter = function(js) {
  return js.substr(1).split('|').reduce(function(js, filter){
    var parts = filter.split(':');
    var name = parts.shift();
    var args = parts.join(':') || '';
    if (args) args = ', ' + args;
    return 'filters.' + name + '(' + js + args + ')';
  });
};


EJS.filters = filters;

EJS.render = function() {
  var ejs = new EJS();
  return ejs.render.apply(ejs, arguments);
};
