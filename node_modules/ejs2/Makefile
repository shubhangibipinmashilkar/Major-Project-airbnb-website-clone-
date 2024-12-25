REPORTER ?= list
NODE_FLAGS ?= --timeout 10000

test:
	DEBUG=ejs* ./node_modules/mocha/bin/mocha \
    $(NODE_FLAGS) \
		--reporter $(REPORTER) \
		test/test.js

.PHONY: test
