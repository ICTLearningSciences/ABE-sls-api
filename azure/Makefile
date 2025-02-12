ENV ?= dev
APP_NAME=$(ENV)-abe-function-app

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

.PHONY: deploy-functions
deploy-functions:
	npm run build
	func azure functionapp publish $(APP_NAME) --typescript --env $(ENV)

#Develop
.PHONY: develop
develop:
	make fetch-app-settings
	npm run build
	func start --inspect-brk --build
