import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import express from "express"

const app = express()

const PORT = Number(process.env.INSTAGRAM_GATE_PORT || 8787)
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "skygrid-local-verify-token"
const APP_SECRET = process.env.META_APP_SECRET || ""

const auditDir = path.resolve(".skygrid/instagram-integrity")
const auditPath = path.join(auditDir, "instagram-integrity-ledger.csv")
fs.mkdirSync(auditDir, { recursive: true })

if (!fs.existsSync(auditPath)) {
  fs.writeFileSync(
    auditPath,
    "timestamp,decision,score,sender_id,reason,message_preview\n",
    "utf8"
  )
}

function csv(value) {
  return `"${String(value ?? "")
    .replaceAll('"', '""')
    .replaceAll(/\r|\n/g, " ")
    .slice(0, 500)}"`
}

function appendAudit({ decision, score, senderId, reason, message }) {
  const row = [
    new Date().toISOString(),
    decision,
    score,
    senderId || "unknown",
    reason,
    String(message || "").slice(0, 140)
  ].map(csv).join(",")

  fs.appendFileSync(auditPath, row + "\n", "utf8")
}

function verifyMetaSignature(req, rawBody) {
  if (!APP_SECRET) return { ok: true, reason: "signature-check-disabled-local" }

  const signature = req.get("x-hub-signature-256")
  if (!signature || !signature.startsWith("sha256=")) {
    return { ok: false, reason: "missing-x-hub-signature-256" }
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", APP_SECRET)
      .update(rawBody)
      .digest("hex")

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)

  if (a.length !== b.length) {
    return { ok: false, reason: "signature-length-mismatch" }
  }

  const ok = crypto.timingSafeEqual(a, b)
  return { ok, reason: ok ? "signature-valid" : "signature-invalid" }
}

function scoreHumanLike({ message, senderId }) {
  const text = String(message || "")
  let score = 75
  const reasons = []

  if (!senderId) {
    score -= 20
    reasons.push("missing-sender-id")
  }

  if (!text.trim()) {
    score -= 30
    reasons.push("empty-message")
  }

  if (text.length > 1200) {
    score -= 25
    reasons.push("very-long-message")
  }

  if (/(.)\1{12,}/.test(text)) {
    score -= 20
    reasons.push("repeated-character-flood")
  }

  if (/(https?:\/\/\S+){3,}/i.test(text)) {
    score -= 25
    reasons.push("link-flood")
  }

  if (/\b(crypto giveaway|free followers|investment guaranteed|airdrop claim|seed phrase|wallet verify)\b/i.test(text)) {
    score -= 35
    reasons.push("known-scam-language")
  }

  if (/^[\W_]+$/.test(text) && text.length > 20) {
    score -= 15
    reasons.push("symbol-only-noise")
  }

  if (text.length >= 8 && text.length <= 280) {
    score += 10
    reasons.push("normal-human-length")
  }

  score = Math.max(0, Math.min(100, score))

  let decision = "allow"
  if (score < 20) decision = "block"
  else if (score < 40) decision = "quarantine"
  else if (score < 65) decision = "challenge"
  else if (score < 90) decision = "allow-log"

  return {
    score,
    decision,
    reason: reasons.join("|") || "no-risk-signals"
  }
}

function extractInstagramMessages(body) {
  const messages = []

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id || ""
      const text = event.message?.text || ""
      if (text || senderId) {
        messages.push({ senderId, message: text })
      }
    }
  }

  return messages
}

// Meta webhook verification handshake.
app.get("/webhooks/instagram", (req, res) => {
  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge)
  }

  return res.status(403).send("verification failed")
})

// Raw body capture for webhook signature verification.
app.post(
  "/webhooks/instagram",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    const rawBody = req.body
    const sig = verifyMetaSignature(req, rawBody)

    if (!sig.ok) {
      appendAudit({
        decision: "reject",
        score: 0,
        senderId: "unknown",
        reason: sig.reason,
        message: "signature rejected"
      })

      return res.status(403).json({ ok: false, error: sig.reason })
    }

    let body
    try {
      body = JSON.parse(rawBody.toString("utf8"))
    } catch {
      appendAudit({
        decision: "reject",
        score: 0,
        senderId: "unknown",
        reason: "invalid-json",
        message: "bad webhook body"
      })

      return res.status(400).json({ ok: false, error: "invalid-json" })
    }

    const messages = extractInstagramMessages(body)
    const results = []

    for (const item of messages) {
      const result = scoreHumanLike(item)

      appendAudit({
        decision: result.decision,
        score: result.score,
        senderId: item.senderId,
        reason: result.reason,
        message: item.message
      })

      results.push({
        senderId: item.senderId,
        decision: result.decision,
        score: result.score,
        reason: result.reason
      })
    }

    return res.status(200).json({
      ok: true,
      service: "SKYGRID Instagram Messenger Integrity Gate",
      signature: sig.reason,
      processed: results.length,
      results
    })
  }
)

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "SKYGRID Instagram Messenger Integrity Gate",
    mode: APP_SECRET ? "signature-enforced" : "local-dev-signature-disabled",
    auditPath
  })
})

app.listen(PORT, () => {
  console.log(`SKYGRID Instagram Messenger Integrity Gate listening on http://localhost:${PORT}`)
  console.log(`Webhook path: http://localhost:${PORT}/webhooks/instagram`)
  console.log(`Audit ledger: ${auditPath}`)
})
