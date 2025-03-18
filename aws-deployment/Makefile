ENV?=dev

.PHONY: build-core
build-core:
	cd ../abe-sls-core && npm run build
	npm install

.PHONY: test-core
test-core:
	cd ../abe-sls-core && make test

.PHONY: update-core
update-core:
	cd ../abe-sls-core && npm ci && npm run build

.PHONY: deploy
deploy:
	make update-core
	npm ci
	npm run deploy:$(ENV)

.PHONY: package
package:
	npx sls package -s $(ENV) --aws-profile abe

.PHONY: publish-core
publish-core:
	cd ../abe-sls-core && make publish
