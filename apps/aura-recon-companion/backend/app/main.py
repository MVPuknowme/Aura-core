from fastapi import FastAPI, HTTPException

from .models import ScanReport, ScanRequest
from .scanner import run_scan

app = FastAPI(title="Aura Recon Companion API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": "aura-recon-companion",
        "version": "0.1.0",
        "profiles": ["dns-passive", "web-metadata"],
    }


@app.post("/api/v1/scans", response_model=ScanReport)
def create_scan(request: ScanRequest) -> ScanReport:
    try:
        return run_scan(request)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
