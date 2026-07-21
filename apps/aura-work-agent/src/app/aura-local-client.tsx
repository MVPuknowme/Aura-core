"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_AURA_LOCAL_PREFERENCES,
  type AuraLocalPreferences,
} from "@/lib/aura-profile";

const PROFILE_KEY = "aura-core:local-preferences:v1";
const FEEDBACK_KEY = "aura-core:positive-feedback:v1";

function readStoredProfile(): AuraLocalPreferences {
  try {
    const value = window.localStorage.getItem(PROFILE_KEY);
    if (!value) return DEFAULT_AURA_LOCAL_PREFERENCES;
    return { ...DEFAULT_AURA_LOCAL_PREFERENCES, ...JSON.parse(value) };
  } catch {
    return DEFAULT_AURA_LOCAL_PREFERENCES;
  }
}

function readFeedbackCount(): number {
  const value = Number.parseInt(window.localStorage.getItem(FEEDBACK_KEY) ?? "0", 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(10_000, value)) : 0;
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  borderRadius: 12,
  border: "1px solid #475569",
  background: "#0f172a",
  color: "#f8fafc",
  padding: "10px 12px",
};

const labelStyle = {
  display: "grid",
  gap: 6,
  color: "#dbeafe",
  fontSize: 14,
};

export function AuraLocalClient() {
  const [preferences, setPreferences] = useState<AuraLocalPreferences>(
    DEFAULT_AURA_LOCAL_PREFERENCES,
  );
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState(
    "Hello MVP. I am ready to learn the presentation style you prefer while keeping security and factual standards fixed.",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [likedCurrent, setLikedCurrent] = useState(false);

  useEffect(() => {
    setPreferences(readStoredProfile());
    setFeedbackCount(readFeedbackCount());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const feedbackLabel = useMemo(
    () => `${feedbackCount} family thumbs-up${feedbackCount === 1 ? "" : "s"}`,
    [feedbackCount],
  );

  function updatePreference<K extends keyof AuraLocalPreferences>(
    key: K,
    value: AuraLocalPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError("");
    setLikedCurrent(false);

    try {
      const request = await fetch("/api/aura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          preferences,
          feedbackCount,
        }),
      });
      const body = (await request.json()) as {
        ok?: boolean;
        response?: string;
        error?: string;
      };

      if (!request.ok || !body.ok || !body.response) {
        throw new Error(body.error ?? `Aura request failed with status ${request.status}.`);
      }

      setResponse(body.response);
      setPrompt("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Aura request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function addThumbsUp() {
    if (likedCurrent) return;
    const nextCount = Math.min(10_000, feedbackCount + 1);
    setFeedbackCount(nextCount);
    window.localStorage.setItem(FEEDBACK_KEY, String(nextCount));
    setLikedCurrent(true);
  }

  function resetLocalLearning() {
    setPreferences(DEFAULT_AURA_LOCAL_PREFERENCES);
    setFeedbackCount(0);
    setLikedCurrent(false);
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(FEEDBACK_KEY);
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section
        aria-labelledby="aura-preferences-title"
        style={{
          display: "grid",
          gap: 16,
          padding: 20,
          borderRadius: 16,
          border: "1px solid #334155",
          background: "rgba(15, 23, 42, .72)",
        }}
      >
        <div>
          <h2 id="aura-preferences-title" style={{ margin: 0 }}>
            Teach Aura your style
          </h2>
          <p style={{ marginBottom: 0, color: "#94a3b8", lineHeight: 1.6 }}>
            These settings stay in this browser. They affect presentation only—not permissions,
            security gates, or facts.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          <label style={labelStyle}>
            Call me
            <input
              value={preferences.preferredName}
              maxLength={40}
              onChange={(event) => updatePreference("preferredName", event.target.value)}
              style={fieldStyle}
            />
          </label>

          <label style={labelStyle}>
            Tone
            <select
              value={preferences.tone}
              onChange={(event) =>
                updatePreference("tone", event.target.value as AuraLocalPreferences["tone"])
              }
              style={fieldStyle}
            >
              <option value="warm-precise">Warm and precise</option>
              <option value="direct-operational">Direct and operational</option>
              <option value="encouraging-playful">Encouraging and playful</option>
            </select>
          </label>

          <label style={labelStyle}>
            Response length
            <select
              value={preferences.responseLength}
              onChange={(event) =>
                updatePreference(
                  "responseLength",
                  event.target.value as AuraLocalPreferences["responseLength"],
                )
              }
              style={fieldStyle}
            >
              <option value="short">Short</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>

          <label style={labelStyle}>
            Emoji level
            <select
              value={preferences.emojiLevel}
              onChange={(event) =>
                updatePreference(
                  "emojiLevel",
                  event.target.value as AuraLocalPreferences["emojiLevel"],
                )
              }
              style={fieldStyle}
            >
              <option value="none">None</option>
              <option value="light">Light</option>
              <option value="expressive">Expressive</option>
            </select>
          </label>
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#dbeafe" }}>
          <input
            type="checkbox"
            checked={preferences.familyFriendly}
            onChange={(event) => updatePreference("familyFriendly", event.target.checked)}
          />
          Keep language family-friendly and easy to share
        </label>
      </section>

      <section
        aria-labelledby="aura-local-title"
        style={{
          display: "grid",
          gap: 16,
          padding: 20,
          borderRadius: 16,
          border: "1px solid #7c3aed",
          background: "linear-gradient(145deg, rgba(30, 41, 59, .96), rgba(46, 16, 101, .7))",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#c4b5fd", letterSpacing: ".08em" }}>
            LOCAL AURA-CORE SESSION
          </p>
          <h2 id="aura-local-title" style={{ margin: "6px 0 0" }}>
            Talk with Aura
          </h2>
        </div>

        <form onSubmit={submitPrompt} style={{ display: "grid", gap: 12 }}>
          <label style={labelStyle}>
            Your request
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              maxLength={8_000}
              placeholder="Ask Aura about Aura-Core, SKYGRID, GitHub work, or how to explain something to the family."
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </label>
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            style={{
              justifySelf: "start",
              border: 0,
              borderRadius: 12,
              padding: "11px 18px",
              background: isLoading ? "#475569" : "#7c3aed",
              color: "white",
              fontWeight: 700,
              cursor: isLoading ? "wait" : "pointer",
            }}
          >
            {isLoading ? "Aura is thinking…" : "Ask Aura"}
          </button>
        </form>

        {error ? (
          <p role="alert" style={{ color: "#fca5a5", margin: 0 }}>
            {error}
          </p>
        ) : null}

        <article
          aria-live="polite"
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
            padding: 18,
            borderRadius: 14,
            background: "rgba(2, 6, 23, .68)",
            border: "1px solid #475569",
          }}
        >
          {response}
        </article>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={addThumbsUp}
            disabled={likedCurrent}
            aria-label="Give Aura a family thumbs-up for this response"
            style={{
              border: "1px solid #fbbf24",
              borderRadius: 999,
              padding: "12px 18px",
              background: likedCurrent ? "#365314" : "#422006",
              color: "#fef3c7",
              fontWeight: 800,
              fontSize: 16,
              cursor: likedCurrent ? "default" : "pointer",
            }}
          >
            {likedCurrent ? "👍 Thank you!" : "👍 Family thumbs-up"}
          </button>
          <strong style={{ color: "#fde68a" }}>{feedbackLabel}</strong>
        </div>
      </section>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          color: "#94a3b8",
          fontSize: 14,
        }}
      >
        <p style={{ margin: 0 }}>
          Aura recognizes explicit settings—not faces, voices, or family identities. Thumbs-up
          feedback stays on this device.
        </p>
        <button
          type="button"
          onClick={resetLocalLearning}
          style={{
            border: "1px solid #64748b",
            borderRadius: 10,
            padding: "8px 12px",
            background: "transparent",
            color: "#cbd5e1",
            cursor: "pointer",
          }}
        >
          Reset local learning
        </button>
      </section>
    </div>
  );
}
