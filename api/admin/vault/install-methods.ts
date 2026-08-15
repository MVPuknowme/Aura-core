import type { IncomingMessage, ServerResponse } from "node:http";
import {
  currentPlatform,
  type BackendId,
  resolveRunnableMethods,
} from "../../../packages/vault/src/install.js";
import { requireOwner, sendJson } from "./_auth.js";

const BACKENDS: readonly BackendId[] = [
  "1password",
  "bitwarden",
  "protonpass",
];

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "method not allowed" });
    return;
  }
  if (!requireOwner(req, res)) return;

  const platform = currentPlatform();
  if (!platform) {
    sendJson(res, 200, {
      ok: true,
      enabled: true,
      platform: process.platform,
      methods: {},
      warning: "Unsupported platform; automated installation is unavailable",
    });
    return;
  }

  const methods: Record<string, unknown> = {};
  for (const backendId of BACKENDS) {
    methods[backendId] = (await resolveRunnableMethods(backendId, platform)).map(
      (method) =>
        method.kind === "manual"
          ? {
              id: method.id,
              kind: method.kind,
              instructions: method.instructions,
              url: method.url,
            }
          : {
              id: method.id,
              kind: method.kind,
              executable: method.executable,
            },
    );
  }

  sendJson(res, 200, {
    ok: true,
    enabled: true,
    platform,
    methods,
  });
}
