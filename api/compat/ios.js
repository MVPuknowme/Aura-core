export default async function handler(req, res) {
  const ua = String(req.headers["user-agent"] || "");

  const isiOS = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua);
  const isWalletBrowser = /MetaMask|Trust|CoinbaseWallet|Phantom|Rainbow|Wallet/i.test(ua);

  return res.status(200).json({
    ok: true,
    system: "SKYGRID Emergency Data On-Ramp",
    route: "/api/compat/ios",
    client: {
      isiOS,
      isSafari,
      isWalletBrowser
    },
    policy: {
      passkeysRequired: false,
      walletSigningRequired: false,
      fallbackEnabled: true,
      failoverUnlockAllowed: false
    },
    guidance: isiOS
      ? "iOS detected. Use fallback-safe flow: no required passkey, no wallet signing, no production failover unlock."
      : "Non-iOS client detected. Standard safe flow available."
  });
}
