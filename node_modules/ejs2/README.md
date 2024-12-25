# EJS2

EJS2 is a reimplementation of visionmedia's [EJS](https://github.com/visionmedia/ejs) node module. A fair amount of code is copied straight over, but improvements have been made.

It's built to use async functions (as in, readFile with callbacks rather than readFileSync) and to have more maintainable code. It also makes it more extensible as async functions can be added in (which will help with rendering in [serenity](https://github.com/simontabor/serenity)).

## Usage

Pretty much the same as the original, one or two changes.

```javascript
var EJS = require('ejs2');
var ejs = new EJS({ cache: true }); // cache is enabled by default, equivalent is just `var ejs = new EJS();`

ejs.render('i am an EJS string', {opts: 'go here'}, function(err, html) {
  // you have html!
});

ejs.renderFile('/my/ejs/file.ejs', {opts: 'still go here'}, function(err, html) {
  // you have more html!
});
```

## Benchmarks

For some strange reason, the original EJS is faster with the cache disabled (I assume readFileSync is slightly faster, but of course it's bad practise and blocks the process). EJS2 is slightly faster with the cache enabled. The differences are up to a couple of hundredths of a millisecond. Running the benchmarks on different file types would help, as I believe EJS2 will be quicker when there are includes in the file.


### Cache Enabled

#### EJS2

```
➜  CACHE=true NUM=100000 node test/bench.js

SYNC
--> 100000 renderfiles in 3.223761557s
--> 0.032237615569999996ms per render
--> 0.01876155699999981s estimated process lock
--> 0.00018761556999999813ms lock per render

PARALLEL
--> 100000 renderfiles in 2.608808327s
--> 0.026088083270000003ms per render
--> 2.608808327s estimated process lock
--> 0.026088083270000003ms lock per render
```

#### EJS

```
➜  CACHE=true NUM=100000 node test/benchOld.js

SYNC
--> 100000 renderfiles in 3.109851967s
--> 0.03109851967ms per render
--> 0.03085196700000006s estimated process lock
--> 0.00030851967000000057ms lock per render

PARALLEL
--> 100000 renderfiles in 2.667056251s
--> 0.02667056251ms per render
--> 2.667056251s estimated process lock
--> 0.02667056251ms lock per render
```

### Cache Disabled

#### EJS2

```
➜  NUM=100000 node test/bench.js

SYNC
--> 100000 renderfiles in 18.18666498s
--> 0.1818666498ms per render
--> 0.7826649800000014s estimated process lock
--> 0.007826649800000014ms lock per render

PARALLEL
--> 100000 renderfiles in 13.030406746s
--> 0.13030406746ms per render
--> 13.026406746000001s estimated process lock
--> 0.13026406746ms lock per render
```

#### EJS

```
➜  NUM=100000 node test/benchOld.js

SYNC
--> 100000 renderfiles in 10.333011529s
--> 0.10333011529ms per render
--> 0.3390115289999994s estimated process lock
--> 0.0033901152899999945ms lock per render

PARALLEL
--> 100000 renderfiles in 9.438156485s
--> 0.09438156485ms per render
--> 9.438156485s estimated process lock
--> 0.09438156485ms lock per render
```
