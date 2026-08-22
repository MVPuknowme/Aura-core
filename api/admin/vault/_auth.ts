import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export function requireOwner(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const configured = process.env.SKYGRID_OWNER_TOKEN;
  if (!configured) {
    sendJson(res, 503, {
      ok: false,
      error: "SKYGRID_OWNER_TOKEN is not configured; admin vault routes fail closed",
    });
    return false;
  }

  const authorization = req.headers.authorization ?? "";
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) {
    sendJson(res, 401, { ok: false, error: "OWNER authorization required" });
    return false;
  }

  const supplied = authorization.slice(prefix.length);
  const a = Buffer.from(configured, "utf8");
  const b = Buffer.from(supplied, "utf8");
  const authorized = a.length === b.length && timingSafeEqual(a, b);
  if (!authorized) {
    sendJson(res, 403, { ok: false, error: "OWNER authorization rejected" });
    return false;
  }
  return true;
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  let body = "";
  for await (const chunk of req) {
    body += chunk.toString();
    if (body.length > 16_384) throw new Error("request body too large");
  }
  return JSON.parse(body || "{}");
}
