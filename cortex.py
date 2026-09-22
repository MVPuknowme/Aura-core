#!/usr/bin/env python3
"""cortex.py — fail-closed, read-only Robinhood Crypto API client."""
from __future__ import annotations

import argparse
import base64
import json
import os
import time
from dataclasses import dataclass
from typing import Any, Mapping, Sequence
from urllib.parse import urlencode

import requests

BASE_URL = "https://trading.robinhood.com"
DEFAULT_TIMEOUT_SECONDS = 30
READ_ONLY_METHODS = frozenset({"GET"})


class CortexError(RuntimeError):
    pass


@dataclass(frozen=True)
class Credentials:
    api_key: str
    private_key_b64: str

    @classmethod
    def from_env(cls) -> "Credentials":
        api_key = os.getenv("ROBINHOOD_CRYPTO_API_KEY", "").strip()
        private_key = os.getenv("ROBINHOOD_CRYPTO_PRIVATE_KEY_B64", "").strip()
        if not api_key or not private_key:
            raise CortexError(
                "Missing ROBINHOOD_CRYPTO_API_KEY or ROBINHOOD_CRYPTO_PRIVATE_KEY_B64"
            )
        if not api_key.startswith("rh-api-"):
            raise CortexError("Unexpected Robinhood API-key format")
        try:
            seed = base64.b64decode(private_key, validate=True)
        except Exception as exc:
            raise CortexError("Private key is not valid base64") from exc
        if len(seed) != 32:
            raise CortexError("Ed25519 private-key seed must decode to exactly 32 bytes")
        return cls(api_key, private_key)


class RobinhoodReadOnlyClient:
    def __init__(self, credentials: Credentials, timeout: int = DEFAULT_TIMEOUT_SECONDS):
        try:
            from nacl.signing import SigningKey
        except ImportError as exc:
            raise CortexError("PyNaCl is required: python -m pip install pynacl requests") from exc
        self.api_key = credentials.api_key
        self.signing_key = SigningKey(base64.b64decode(credentials.private_key_b64))
        self.timeout = timeout
        self.session = requests.Session()

    def _headers(self, method: str, path: str) -> dict[str, str]:
        method = method.upper()
        if method not in READ_ONLY_METHODS:
            raise CortexError(f"Blocked non-read-only HTTP method: {method}")
        timestamp = str(int(time.time()))
        message = f"{self.api_key}{timestamp}{path}{method}"
        signature = self.signing_key.sign(message.encode("utf-8")).signature
        return {
            "x-api-key": self.api_key,
            "x-timestamp": timestamp,
            "x-signature": base64.b64encode(signature).decode("ascii"),
            "Accept": "application/json",
        }

    def get(self, path: str, params: Mapping[str, Any] | None = None) -> Any:
        if not path.startswith("/api/"):
            raise CortexError("Refusing request outside the Robinhood /api/ namespace")
        query = urlencode(params or {}, doseq=True)
        signed_path = f"{path}?{query}" if query else path
        response = self.session.get(
            f"{BASE_URL}{signed_path}",
            headers=self._headers("GET", signed_path),
            timeout=self.timeout,
            allow_redirects=False,
        )
        response.raise_for_status()
        return response.json()

    def accounts(self) -> Any:
        return self.get("/api/v2/crypto/trading/accounts/")

    def holdings(self, account_number: str, assets: Sequence[str] = ()) -> Any:
        params: dict[str, Any] = {"account_number": account_number}
        if assets:
            params["asset_code"] = [a.upper() for a in assets]
        return self.get("/api/v2/crypto/trading/holdings/", params)

    def pairs(self, symbols: Sequence[str] = ()) -> Any:
        params = {"symbol": [s.upper() for s in symbols]} if symbols else None
        return self.get("/api/v2/crypto/trading/trading_pairs/", params)

    def best_bid_ask(self, symbols: Sequence[str]) -> Any:
        if not symbols:
            raise CortexError("At least one --symbol is required")
        return self.get(
            "/api/v2/crypto/marketdata/best_bid_ask/",
            {"symbol": [s.upper() for s in symbols]},
        )


def _common_parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "-+1", dest="plus_one", action="count", default=0,
        help="Increment the +1 review/preflight marker; this never authorizes a trade.",
    )
    return common


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read-only Cortex / Robinhood Crypto client")
    common = _common_parser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("account", parents=[common])

    holdings = sub.add_parser("holdings", parents=[common])
    holdings.add_argument("--account-number", required=True)
    holdings.add_argument("--asset", action="append", default=[])

    pairs = sub.add_parser("pairs", parents=[common])
    pairs.add_argument("--symbol", action="append", default=[])

    quote = sub.add_parser("best-bid-ask", parents=[common])
    quote.add_argument("--symbol", action="append", required=True)

    snapshot = sub.add_parser("snapshot", parents=[common])
    snapshot.add_argument("--account-number", required=True)
    snapshot.add_argument("--asset", action="append", default=[])
    snapshot.add_argument("--symbol", action="append", required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    client = RobinhoodReadOnlyClient(Credentials.from_env())
    if args.plus_one:
        print(f"+1 marker enabled: {args.plus_one}")

    if args.command == "account":
        result = client.accounts()
    elif args.command == "holdings":
        result = client.holdings(args.account_number, args.asset)
    elif args.command == "pairs":
        result = client.pairs(args.symbol)
    elif args.command == "best-bid-ask":
        result = client.best_bid_ask(args.symbol)
    elif args.command == "snapshot":
        result = {
            "holdings": client.holdings(args.account_number, args.asset),
            "best_bid_ask": client.best_bid_ask(args.symbol),
        }
    else:
        raise CortexError(f"Unsupported command: {args.command}")

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (CortexError, requests.RequestException) as exc:
        print(f"cortex: {exc}", file=__import__("sys").stderr)
        raise SystemExit(2)
