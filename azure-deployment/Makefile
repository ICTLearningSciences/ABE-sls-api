ENV ?= dev
APP_NAME=$(ENV)-abe-fa

#login/logout commands
.PHONY: login
login:
	az login

.PHONY: logout
logout:
	az logout

# Run to fetch app settings from Azure
.PHONY: fetch-app-settings
fetch-app-settings:
	func azure functionapp fetch-app-settings $(APP_NAME)

.PHONY: update-core
update-core:
	cd ../abe-sls-core && npm ci && npm run build

.PHONY: deploy
deploy:
	make update-core
	npm ci
	npm run build
	func azure functionapp publish $(APP_NAME) --typescript --env $(ENV)

#Develop
.PHONY: develop
develop:
	make fetch-app-settings
	npm run build
	func start --inspect-brk --build --verbose

