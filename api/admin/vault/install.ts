import type { IncomingMessage, ServerResponse } from "node:http";
import {
  installVaultBackend,
  isOperatorExecutionHost,
} from "../../../packages/operator/src/vault-installer.js";
import type { BackendId } from "../../../packages/vault/src/install.js";
import { readJsonBody, requireOwner, sendJson } from "./_auth.js";

const BACKENDS: readonly BackendId[] = [
  "1password",
  "bitwarden",
  "protonpass",
];

function isBackendId(value: unknown): value is BackendId {
  return typeof value === "string" && BACKENDS.includes(value as BackendId);
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method not allowed" });
    return;
  }
  if (!requireOwner(req, res)) return;
  if (!isOperatorExecutionHost()) {
    sendJson(res, 409, {
      ok: false,
      enabled: true,
      executionAllowed: false,
      error:
        "Install API is enabled, but execution is blocked on CI/serverless runtimes; run it on a SKYGRID operator host",
    });
    return;
  }

  let parsed: unknown;
  try {
    parsed = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "invalid JSON body",
    });
    return;
  }

  const body = parsed as { backendId?: unknown; methodId?: unknown };
  if (!isBackendId(body.backendId)) {
    sendJson(res, 400, { ok: false, error: "invalid backendId" });
    return;
  }
  if (typeof body.methodId !== "string" || body.methodId.length === 0) {
    sendJson(res, 400, { ok: false, error: "methodId is required" });
    return;
  }

  try {
    const result = await installVaultBackend({
      backendId: body.backendId,
      methodId: body.methodId,
      requestedBy: "OWNER",
    });
    sendJson(res, 200, {
      ok: true,
      enabled: true,
      executionAllowed: true,
      result,
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "installation failed",
    });
  }
}
