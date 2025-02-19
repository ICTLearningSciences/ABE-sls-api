ENV ?= dev
APP_NAME=$(ENV)-abe-function-app
RESOURCE_GROUP=$(ENV)-abe-resource-group
LOCATION=westus
STORAGE_ACCOUNT=$(ENV)1abe1storage
NODE_VERSION=20
FUNCTIONS_VERSION=4
COSMOS_DB_NAME=$(ENV)-abe-cosmosdb
COSMOS_CONTAINER_NAME=$(ENV)-abe-cosmosdb-container
COSMOS_LEASE_CONTAINER_NAME=$(ENV)-abe-cosmosdb-lease-container
COSMOS_PARTITION_KEY_PATH=/id

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

.PHONY: deploy
deploy:
	npm run build
	func azure functionapp publish $(APP_NAME) --typescript --env $(ENV)

#Develop
.PHONY: develop
develop:
	make fetch-app-settings
	npm run build
	func start --inspect-brk --build --verbose

