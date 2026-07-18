import { AuraLocalClient } from "@/app/aura-local-client";

const commands = [
  "/aura prompt:<question>",
  "/github task:<repository task>",
  "/skygrid",
  "APPROVE WRITE: create an issue …",
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 20px 64px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ width: "min(980px, 100%)", margin: "0 auto", display: "grid", gap: 24 }}>
        <header
          style={{
            padding: 28,
            border: "1px solid #334155",
            borderRadius: 20,
            background: "linear-gradient(145deg, #11172a, #17112d)",
            boxShadow: "0 24px 80px rgba(0,0,0,.35)",
          }}
        >
          <p
            style={{
              margin: 0,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "#93c5fd",
            }}
          >
            SKYGRID Emergency Data On-Ramp
          </p>
          <h1 style={{ margin: "8px 0 12px", fontSize: "clamp(2rem, 6vw, 4rem)" }}>
            Aura Work Agent
          </h1>
          <p style={{ color: "#cbd5e1", lineHeight: 1.7, maxWidth: 760 }}>
            Teach your local Aura-Core how you prefer responses to feel, then let family members
            give a visible thumbs-up when Aura gets the presentation right. Preferences stay in
            this browser and never override security controls.
          </p>
          <p style={{ marginBottom: 0 }}>
            Readiness: <a href="/api/health" style={{ color: "#60a5fa" }}>/api/health</a>
          </p>
        </header>

        <AuraLocalClient />

        <section
          style={{
            padding: 20,
            border: "1px solid #334155",
            borderRadius: 16,
            background: "rgba(15, 23, 42, .62)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Discord commands</h2>
          <ul style={{ lineHeight: 1.9, color: "#dbeafe", marginBottom: 0 }}>
            {commands.map((command) => (
              <li key={command}>
                <code>{command}</code>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
