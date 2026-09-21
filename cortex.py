#!/usr/bin/env python3
"""
cortex.py — safe Robinhood Crypto client scaffold.

This review slice intentionally keeps execution read-only and focuses on
configuration plus CLI parsing. Trading/order placement is not implemented.

Examples:
    python cortex.py production-config -+1
    python cortex.py gateway-token -+1
    python cortex.py diagnose-plaid -+1
    python cortex.py keygen -+1
    python cortex.py account -+1
    python cortex.py holdings --asset SOL -+1
    python cortex.py best-bid-ask --symbol SOL-USD -+1
    python cortex.py pairs --symbol SOL-USD -+1
    python cortex.py snapshot --asset SOL --symbol SOL-USD -+1
"""

from __future__ import annotations

import argparse
import os
from typing import Sequence

BASE_URL = "https://trading.robinhood.com"
DEFAULT_TIMEOUT_SECONDS = 30
PRODUCTION_ENV = "production"
DEFAULT_GATEWAY_TIMEOUT_SECONDS = 15


def _common_parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument(
        "-+1",
        dest="plus_one",
        action="count",
        default=0,
        help="Increment the +1 review/preflight marker each time the flag is supplied.",
    )
    return common


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Read-only Cortex / Robinhood Crypto client scaffold."
    )
    common = _common_parser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("production-config", parents=[common])
    subparsers.add_parser("gateway-token", parents=[common])
    subparsers.add_parser("diagnose-plaid", parents=[common])
    subparsers.add_parser("keygen", parents=[common])
    subparsers.add_parser("account", parents=[common])

    holdings = subparsers.add_parser("holdings", parents=[common])
    holdings.add_argument(
        "--asset",
        action="append",
        help="Crypto asset code, e.g. SOL. Repeat for multiple assets.",
    )

    best_bid_ask = subparsers.add_parser("best-bid-ask", parents=[common])
    best_bid_ask.add_argument(
        "--symbol",
        action="append",
        required=True,
        help="Pair symbol, e.g. SOL-USD. Repeat for multiple symbols.",
    )

    pairs = subparsers.add_parser("pairs", parents=[common])
    pairs.add_argument(
        "--symbol",
        action="append",
        help="Pair symbol, e.g. SOL-USD. Repeat for multiple symbols.",
    )

    snapshot = subparsers.add_parser("snapshot", parents=[common])
    snapshot.add_argument(
        "--asset",
        action="append",
        help="Crypto asset code, e.g. SOL. Repeat for multiple assets.",
    )
    snapshot.add_argument(
        "--symbol",
        action="append",
        required=True,
        help="Pair symbol, e.g. SOL-USD. Repeat for multiple symbols.",
    )

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    # Review/preflight marker only. It does not authorize trades or bypass
    # Robinhood, MFA, OAuth, Plaid, or other account-linking controls.
    if args.plus_one:
        print(f"+1 marker enabled: {args.plus_one}")

    print(f"command={args.command}")
    print(f"base_url={BASE_URL}")
    print(f"environment={os.getenv('CORTEX_ENV', 'development')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
