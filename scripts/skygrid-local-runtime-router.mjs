import runtimeHandler from "../api/runtime.mjs";
import aerodromeWalletHandler from "../api/aerodrome/wallet.mjs";

const dedicatedRoutes = new Map([
  ["/api/aerodrome/wallet", aerodromeWalletHandler]
]);

function requestPath(req) {
  const host = req.headers?.host || "localhost";
  return new URL(req.url || "/", `http://${host}`).pathname;
}

export default async function localRuntimeRouter(req, res) {
  const handler = dedicatedRoutes.get(requestPath(req));
  if (handler) return handler(req, res);
  return runtimeHandler(req, res);
}
