OPERATOR ?= MVPuknowme
PORT ?= 3000
DEBUG_PORT ?= 9229
IMAGE ?= aura-core-operator:local

.PHONY: operator runner runner-preflight debug local vercel-build container-build container-run vercel-bypass test-operator

operator:
	pnpm run operator:status -- --operator=$(OPERATOR)

runner-preflight:
	pnpm run operator:test
	pnpm run mcp:check
	pnpm run skygrid:test:routing

runner: runner-preflight
	pnpm run operator:local -- --operator=$(OPERATOR)

# Local-only debugger. The Node inspector is intentionally bound to loopback so
# it is not exposed on LAN/container interfaces.
debug: runner-preflight
	node --inspect=127.0.0.1:$(DEBUG_PORT) --enable-source-maps --trace-warnings --trace-uncaught scripts/skygrid-operator-runner.mjs local --operator=$(OPERATOR)

local:
	pnpm run operator:local -- --operator=$(OPERATOR)

vercel-build:
	pnpm run operator:vercel-build -- --operator=$(OPERATOR)

container-build:
	docker build -f Dockerfile.operator -t $(IMAGE) .

container-run: container-build
	docker run --rm -p $(PORT):3000 -e SKYGRID_OPERATOR=$(OPERATOR) $(IMAGE)

# "vercel-bypass" means bypass Vercel as the hosting dependency by running
# Aura-core locally in Docker. It does not bypass Vercel Deployment Protection,
# application authentication, request signatures, or authorization controls.
vercel-bypass: container-build
	docker run --rm -p $(PORT):3000 -e SKYGRID_OPERATOR=$(OPERATOR) -e SKYGRID_VERCEL_BYPASS=local-container $(IMAGE)

test-operator:
	pnpm run operator:test
