# AT&T public discovery → SKYGRID PNPK

**Status: evidence-only prototype; unauthorized integration candidate.**

AT&T's official [llms.txt](https://www.att.com/llms.txt) lists public AI-agent discovery resources. It describes AI-assisted shopping and customer-service functions. This does not establish AT&T carrier access, outage telemetry, FirstNet affiliation, or permission to use its MCP tools.

The AT&T Network API Accelerator and Aduna/CAMARA APIs are separate commercial programs. Their access must be negotiated and verified independently.

## Read-only implementation

The adapter in lib/att-readonly-discovery.mjs contacts only these fixed HTTPS paths on www.att.com:

- /llms.txt
- /.well-known/agent-card.json
- /.well-known/mcp/server-card.json
- /.well-known/agent-skills/index.json

It uses public GET requests only: no credentials, no cookies, no redirects, no arbitrary URLs, and no subscriber identifiers. A 256 KiB response limit, 5-second timeout, content-type checks and JSON parsing restrict ingestion. Receipts contain endpoint names, status codes, lengths, and SHA-256 hashes, not response bodies or raw errors.

**Important:** DISCOVERY_VERIFIED only means all four public metadata files passed checks. It is never a PNPK authorization receipt. Every receipt contains pnpk_preflight.decision = HOLD_UNAUTHORIZED and prohibits carrier data access, private data movement, device activation, production failover, network switching, wallet signing, and transaction broadcasting. Unreachable or malformed resources produce FAIL_CLOSED.

The prototype does not change the active bridge/skygrid-emergency-onramp.pnpk runtime policy and cannot execute carrier commands.

## Tests and operator command

Synthetic tests, with no AT&T network traffic:

    node --test tests/att-readonly-discovery.test.mjs

Optional operator-triggered PUBLIC metadata check (never in CI):

    node scripts/att-readonly-discovery.mjs --live

Without --live, the CLI refuses network activity. With --live, it writes a local receipt in an exclusively created permission-restricted JSON file (0600 where supported), and prints the decision, filename and hash. Do not commit live receipts without review.

## Approval gates before other APIs

1. Independently verify discovery JSON contents; never invent MCP tool names or permissions.
2. Get AT&T/Aduna authorization and documented contracts for each commercial API, data type, territory, purpose and consent requirement.
3. Obtain an independent validated PNPK authorization receipt before any authenticated ingest; a public metadata receipt is not sufficient.
4. Run synthetic outage/observability Auto-Drill and prove fail-closed behavior.
5. Obtain separate FirstNet approval for any public-safety operational integration.

Sources:
- https://www.att.com/llms.txt
- https://devex-web.att.com/developer-hub/docs/network-api-accelerator-program
