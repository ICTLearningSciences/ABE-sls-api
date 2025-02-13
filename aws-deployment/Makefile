
.PHONY: build-core
build-core:
	cd ../abe-sls-core && npm run build
	npm install

.PHONY: test-core
test-core:
	cd ../abe-sls-core && make test

.PHONY: deploy-dev
deploy-dev: build-core
	npm ci
	npm run deploy:dev

.PHONY: package
package:
	npx sls package -s dev --aws-profile abe