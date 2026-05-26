from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from datetime import datetime, timezone

VERSION = "1.3.6-fastapi-fallback"

app = FastAPI(title="Aura-Core SKYGRID Runtime", version=VERSION)


def runtime_payload(extra=None):
    body = {
        "ok": True,
        "service": "Aura-Core SKYGRID Runtime",
        "mode": "advisory_preflight",
        "sentinel": "fail_closed",
        "operatorAssistOnly": True,
        "executionAllowed": False,
        "version": VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    if extra:
        body.update(extra)
    return body


def json_response(body, status_code=200):
    return JSONResponse(
        content=body,
        status_code=status_code,
        headers={
            "Cache-Control": "no-store, max-age=0",
            "X-SkyGrid-Network": "Aura-Core",
            "X-Phoenix-Version": VERSION
        }
    )


@app.get("/", response_class=HTMLResponse)
async def home():
    return HTMLResponse(
        content="""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SKYGRID Runtime</title>
</head>
<body>
  <main>
    <h1>SKYGRID Runtime</h1>
    <p>Aura-Core SKYGRID runtime preflight active.</p>
  </main>
</body>
</html>""",
        status_code=200,
        headers={
            "Cache-Control": "no-store, max-age=0",
            "X-SkyGrid-Network": "Aura-Core",
            "X-Phoenix-Version": VERSION
        }
    )


@app.get("/api/health")
async def health():
    return json_response(runtime_payload({
        "status": "healthy",
        "routes": {
            "home": "/",
            "health": "/api/health",
            "healthAlias": "/health.json",
            "helm": "/api/skygrid/helm?command=status",
            "provenance": "/api/skygrid/provenance",
            "aws": "/api/skygrid/aws"
        }
    }))


@app.get("/health.json")
async def health_alias():
    return await health()


@app.get("/api/skygrid/helm")
async def helm_status(command: str = "status"):
    return json_response(runtime_payload({
        "service": "SKYGRID Helm Status",
        "status": "operator_assist_ready",
        "command": command
    }))


@app.get("/api/skygrid/provenance")
async def provenance():
    return json_response(runtime_payload({
        "service": "SKYGRID Provenance Mirror",
        "status": "pending_or_ready",
        "proofWritten": False
    }))


@app.get("/api/skygrid/aws")
async def aws_status():
    return json_response(runtime_payload({
        "service": "SKYGRID AWS Mirror",
        "status": "pending_or_ready",
        "awsConfigured": False,
        "connected": False,
        "roleAssumptionAllowed": False
    }))


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def fallback(path: str, request: Request):
    return json_response({
        "ok": False,
        "service": "Aura-Core SKYGRID Runtime",
        "status": "not_found",
        "path": f"/{path}",
        "sentinel": "fail_closed",
        "version": VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }, status_code=404)
