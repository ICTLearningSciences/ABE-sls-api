
PHONY: test-all
test-all:
	$(MAKE) test-format
	$(MAKE) test-lint
	$(MAKE) test-license
	$(MAKE) test-types

.PHONY: test-format
test-format:
	npm run test:format

.PHONY: test-license
test-license:
	npm run test:license

.PHONY: test-lint
test-lint: node_modules/eslint
	npm run test:lint

.PHONY: test-types
test-types: node_modules/typescript
	npm run test:types

.PHONY: test
test:
	npm run test

LICENSE:
	@echo "you must have a LICENSE file" 1>&2
	exit 1

LICENSE_HEADER:
	@echo "you must have a LICENSE_HEADER file" 1>&2
	exit 1

.PHONY: format
format: LICENSE LICENSE_HEADER
	npm run license:fix && npm run format


.PHONY: license
license: LICENSE LICENSE_HEADER
	npm run license:fix 