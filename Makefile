SHELL=/bin/bash


########################################################################################################################
#
# Project dev targets
#
########################################################################################################################
.PHONY: build
build: node_modules 					## Build the project
	npx tsc

node_modules: package.json package-lock.json
ifeq ($(CI), true)
	npm ci
else
	npm install
endif

.PHONY: setup
setup: clean 										## Setup the project environment
	npm install
	$(MAKE) -f $(MAKEFILE) build

.PHONY: clean
clean:													## Clean up the build artifacts
	rm -rf dist

.PHONY: start
start: 													## Start the application in development mode
	npx tsx --watch \
		--inspect=9992 src/index.ts

.PHONY: test
test: 													## Run the tests
	node --experimental-vm-modules ./node_modules/.bin/jest

.PHONY: help
help: 													## Render the possible targets in this Makefile along with their descriptions
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) |  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'cat
