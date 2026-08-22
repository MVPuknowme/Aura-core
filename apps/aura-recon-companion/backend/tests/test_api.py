from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_scan_requires_authorization() -> None:
    response = client.post(
        "/api/v1/scans",
        json={"target": "example.com", "authorized": False, "profile": "dns-passive"},
    )
    assert response.status_code == 403


def test_rejects_url_in_target() -> None:
    response = client.post(
        "/api/v1/scans",
        json={
            "target": "https://example.com/path",
            "authorized": True,
            "profile": "dns-passive",
        },
    )
    assert response.status_code == 422


def test_rejects_ip_literals() -> None:
    for target in ("8.8.8.8", "2606:4700:4700::1111"):
        response = client.post(
            "/api/v1/scans",
            json={"target": target, "authorized": True, "profile": "dns-passive"},
        )
        assert response.status_code == 422
