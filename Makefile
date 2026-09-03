OPERATOR ?= MVPuknowme
PORT ?= 3000
DEBUG_PORT ?= 9229
IMAGE ?= aura-core-operator:local

.PHONY: operator runner runner-preflight debug local container-build container-run local-fallback test-operator transc.MVPuknowme

operator:
	pnpm run operator:status -- --operator=$(OPERATOR)

runner-preflight:
	pnpm run operator:preflight

runner: runner-preflight
	pnpm run operator:local -- --operator=$(OPERATOR)

# Local-only debugger. The Node inspector is intentionally bound to loopback so
# it is not exposed on LAN/container interfaces.
debug: runner-preflight
	node --inspect=127.0.0.1:$(DEBUG_PORT) --enable-source-maps --trace-warnings --trace-uncaught scripts/skygrid-operator-runner.mjs local --operator=$(OPERATOR)

local:
	pnpm run operator:local -- --operator=$(OPERATOR)

container-build: runner-preflight
	docker build -f Dockerfile.operator -t $(IMAGE) .

container-run: container-build
	docker run --rm -p $(PORT):3000 -e SKYGRID_OPERATOR=$(OPERATOR) $(IMAGE)

# Local fallback keeps hosting continuity without bypassing application
# authentication, request signatures, authorization, or fail-closed controls.
local-fallback: container-build
	docker run --rm -p $(PORT):3000 -e SKYGRID_OPERATOR=$(OPERATOR) $(IMAGE)

test-operator:
	pnpm run operator:test

transc.MVPuknowme:
	pnpm run transc:MVPuknowme -- $(ARGS)
