export const PAID_SOLANA_ASSET = Object.freeze({
  name: "Paid",
  symbol: "PAID",
  network: "Solana",
  chain: "solana-mainnet",
  mintAddress: "98kfF7rmsg1QDUEoCqNE7g7M1FdrTt92TEp2CLzypump",
  coinbasePriceUrl:
    "https://www.coinbase.com/price/paid-solana-98kff7rmsg1qdueocqne7g7m1fdrtt92tep2clzypump-token",
  source: "Coinbase public asset page"
});

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildPaidAccountAssetResponse({
  balance = null,
  priceUsd = null,
  priceObservedAt = null,
  priceSource = null
} = {}) {
  const normalizedBalance = finiteNumber(balance);
  const normalizedPrice = finiteNumber(priceUsd);
  const valuationUsd =
    normalizedBalance !== null && normalizedPrice !== null
      ? normalizedBalance * normalizedPrice
      : null;

  return {
    ok: true,
    asset: {
      name: PAID_SOLANA_ASSET.name,
      symbol: PAID_SOLANA_ASSET.symbol,
      network: PAID_SOLANA_ASSET.network,
      chain: PAID_SOLANA_ASSET.chain,
      mint_address: PAID_SOLANA_ASSET.mintAddress,
      recognized: true
    },
    account: {
      balance: normalizedBalance,
      valuation_usd: valuationUsd,
      valuation_verified: valuationUsd !== null && Boolean(priceSource)
    },
    market_data: {
      price_usd: normalizedPrice,
      observed_at: priceObservedAt || null,
      source: priceSource || PAID_SOLANA_ASSET.coinbasePriceUrl,
      source_label: PAID_SOLANA_ASSET.source,
      live_price_required_for_current_value: true,
      hardcoded_price: false
    },
    settlement: {
      status: "unverified",
      paid: false,
      note:
        "PAID is the token symbol. Asset recognition does not prove that an invoice, referral reward, or account obligation has been paid."
    }
  };
}
