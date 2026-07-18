import { createHmac, randomBytes } from "node:crypto";
import "./skygrid-ci-auth-bootstrap.mjs";

const nativeFetch = globalThis.fetch;

if (nativeFetch && !globalThis.__skygridTrainingSignedFetchInstalled) {
  globalThis.fetch = (input, init = {}) => {
    const method = String(init.method || "GET").toUpperCase();
    const rawBody = typeof init.body === "string" ? init.body : "";

    if (method !== "POST" || !rawBody) {
      return nativeFetch(input, init);
    }

    const secret = process.env.SKYGRID_INGEST_SECRET;
    if (!secret) {
      throw new Error(
        "SKYGRID_INGEST_SECRET is required to run authenticated training drills."
      );
    }

    const timestamp = String(Date.now());
    const nonce = randomBytes(18).toString("base64url");
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${nonce}.${rawBody}`)
      .digest("hex");
    const headers = new Headers(init.headers || {});
    headers.set("content-type", "application/json");
    headers.set("x-skygrid-timestamp", timestamp);
    headers.set("x-skygrid-nonce", nonce);
    headers.set("x-skygrid-signature", signature);

    return nativeFetch(input, {
      ...init,
      headers
    });
  };

  globalThis.__skygridTrainingSignedFetchInstalled = true;
}
