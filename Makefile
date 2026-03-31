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

health:
	bash scripts/healthcheck.sh

ci-local: setup lint test
