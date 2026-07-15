import { createHash, createHmac } from "node:crypto";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function credentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
  const sessionToken = process.env.AWS_SESSION_TOKEN || "";
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("aws_credentials_not_configured");
  }
  return { accessKeyId, secretAccessKey, sessionToken };
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export function dynamoConfiguration() {
  const tableName = process.env.SKYGRID_ENROLLMENT_DYNAMODB_TABLE || "";
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "";
  return {
    configured: Boolean(tableName && region),
    table_name: tableName || null,
    region: region || null,
    endpoint: region ? `https://dynamodb.${region}.amazonaws.com` : null
  };
}

export async function dynamoRequest(target, body, options = {}) {
  const config = dynamoConfiguration();
  if (!config.configured) throw new Error("dynamodb_ledger_not_configured");

  const { accessKeyId, secretAccessKey, sessionToken } = credentials();
  const date = options.date || new Date();
  const timestamp = amzDate(date);
  const dateStamp = timestamp.slice(0, 8);
  const service = "dynamodb";
  const host = `dynamodb.${config.region}.amazonaws.com`;
  const payload = JSON.stringify(body);

  const canonicalHeaders = [
    `content-type:application/x-amz-json-1.0`,
    `host:${host}`,
    `x-amz-date:${timestamp}`,
    `x-amz-target:${target}`,
    ...(sessionToken ? [`x-amz-security-token:${sessionToken}`] : [])
  ].join("\n") + "\n";

  const signedHeaders = [
    "content-type",
    "host",
    "x-amz-date",
    "x-amz-target",
    ...(sessionToken ? ["x-amz-security-token"] : [])
  ].join(";");

  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256(payload)
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");

  const kDate = hmac(Buffer.from(`AWS4${secretAccessKey}`, "utf8"), dateStamp);
  const kRegion = hmac(kDate, config.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign, "hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-date": timestamp,
    "x-amz-target": target,
    authorization
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const response = await (options.fetch || globalThis.fetch)(config.endpoint, {
    method: "POST",
    headers,
    body: payload
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || result.Message || result.__type || `dynamodb_http_${response.status}`);
    error.name = String(result.__type || "").split("#").pop() || "DynamoDBError";
    error.status = response.status;
    error.details = result;
    throw error;
  }
  return result;
}
