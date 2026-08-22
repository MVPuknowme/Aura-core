import socket

import dns.exception
import pytest

from app import scanner
from app.models import ScanProfile, ScanRequest


def _address_entry(address: str) -> tuple[object, ...]:
    family = socket.AF_INET6 if ":" in address else socket.AF_INET
    endpoint = (address, 0, 0, 0) if family == socket.AF_INET6 else (address, 0)
    return (family, socket.SOCK_STREAM, 6, "", endpoint)


def test_private_resolution_is_blocked(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        scanner.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [_address_entry("127.0.0.1")],
    )

    with pytest.raises(ValueError, match="non-global"):
        scanner._validated_public_addresses("example.com")


def test_mixed_public_private_resolution_is_blocked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        scanner.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            _address_entry("93.184.216.34"),
            _address_entry("169.254.169.254"),
        ],
    )

    with pytest.raises(ValueError, match="non-global"):
        scanner._validated_public_addresses("example.com")


def test_web_profile_passes_only_validated_addresses(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    resolution_calls = 0
    captured: dict[str, object] = {}

    def resolve(*args: object, **kwargs: object) -> list[tuple[object, ...]]:
        nonlocal resolution_calls
        resolution_calls += 1
        return [_address_entry("93.184.216.34")]

    def web_metadata(target: str, addresses: list[str]) -> list[object]:
        captured["target"] = target
        captured["addresses"] = addresses
        return []

    monkeypatch.setattr(scanner.socket, "getaddrinfo", resolve)
    monkeypatch.setattr(scanner, "_dns_findings", lambda target: [])
    monkeypatch.setattr(scanner, "_web_metadata_findings", web_metadata)

    scanner.run_scan(
        ScanRequest(
            target="example.com",
            authorized=True,
            profile=ScanProfile.WEB_METADATA,
        )
    )

    assert resolution_calls == 1
    assert captured == {
        "target": "example.com",
        "addresses": ["93.184.216.34"],
    }


def test_pinned_https_connects_to_ip_and_preserves_tls_hostname(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    class FakeRawSocket:
        def settimeout(self, timeout: float) -> None:
            captured["connect_timeout"] = timeout

        def connect(self, endpoint: tuple[object, ...]) -> None:
            captured["endpoint"] = endpoint

        def close(self) -> None:
            captured["raw_closed"] = True

    class FakeTLSSocket:
        def __enter__(self) -> "FakeTLSSocket":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def settimeout(self, timeout: float) -> None:
            captured["tls_timeout"] = timeout

        def sendall(self, request: bytes) -> None:
            captured["request"] = request

    class FakeContext:
        def wrap_socket(
            self,
            raw_socket: FakeRawSocket,
            *,
            server_hostname: str,
        ) -> FakeTLSSocket:
            captured["server_hostname"] = server_hostname
            return FakeTLSSocket()

    class FakeResponse:
        status = 204

        def __init__(self, tls_socket: FakeTLSSocket) -> None:
            pass

        def begin(self) -> None:
            pass

        def getheaders(self) -> list[tuple[str, str]]:
            return [("Content-Type", "text/plain"), ("Location", "https://example.com/next")]

        def close(self) -> None:
            pass

    monkeypatch.setattr(scanner.socket, "socket", lambda *args: FakeRawSocket())
    monkeypatch.setattr(scanner.ssl, "create_default_context", lambda: FakeContext())
    monkeypatch.setattr(scanner.http.client, "HTTPResponse", FakeResponse)
    monkeypatch.setattr(
        scanner.socket,
        "getaddrinfo",
        lambda *args, **kwargs: pytest.fail("pinned HTTPS must not re-resolve DNS"),
    )

    status, headers, location = scanner._pinned_https_head(
        "example.com", ["93.184.216.34"]
    )

    assert status == 204
    assert headers == {"content-type": "text/plain"}
    assert location == "https://example.com/next"
    assert captured["endpoint"] == ("93.184.216.34", 443)
    assert captured["server_hostname"] == "example.com"
    assert b"Host: example.com\r\n" in captured["request"]


def test_dns_failures_are_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    class TimeoutResolver:
        lifetime = 0.0
        calls = 0

        def __init__(self, configure: bool) -> None:
            pass

        def resolve(self, *args: object, **kwargs: object) -> None:
            self.calls += 1
            raise dns.exception.Timeout

    resolver = TimeoutResolver(configure=True)
    monkeypatch.setattr(scanner.dns.resolver, "Resolver", lambda configure: resolver)

    assert scanner._dns_findings("example.com") == []
    assert resolver.calls <= len(scanner._RECORD_TYPES)


def test_dns_output_is_capped(monkeypatch: pytest.MonkeyPatch) -> None:
    class Item:
        def to_text(self) -> str:
            return "x" * (scanner._MAX_VALUE_CHARS + 100)

    class Resolver:
        lifetime = 0.0

        def __init__(self, configure: bool) -> None:
            pass

        def resolve(self, *args: object, **kwargs: object) -> list[Item]:
            return [Item() for _ in range(scanner._MAX_RECORD_VALUES + 10)]

    monkeypatch.setattr(scanner.dns.resolver, "Resolver", Resolver)
    findings = scanner._dns_findings("example.com")

    assert findings
    values = findings[0].value
    assert len(values) == scanner._MAX_RECORD_VALUES
    assert all(len(value) <= scanner._MAX_VALUE_CHARS + 1 for value in values)
