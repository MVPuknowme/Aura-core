setup:
	npm install

lint:
	npm run lint --if-present

test:
	npm test --if-present

run:
	npm start

debug:
	npm run debug --if-present

# Alias for command-style usage
make.debug: debug

health:
	bash scripts/healthcheck.sh

ci-local: setup lint test

.PHONY: setup lint test run debug make.debug health ci-local
