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
        display: "grid",
        placeItems: "center",
        padding: 32,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(760px, 100%)",
          padding: 32,
          border: "1px solid #334155",
          borderRadius: 20,
          background: "linear-gradient(145deg, #11172a, #17112d)",
          boxShadow: "0 24px 80px rgba(0,0,0,.35)",
        }}
      >
        <p style={{ letterSpacing: ".14em", textTransform: "uppercase", color: "#93c5fd" }}>
          SKYGRID Emergency Data On-Ramp
        </p>
        <h1 style={{ margin: "8px 0 12px", fontSize: "clamp(2rem, 6vw, 4rem)" }}>
          Aura Work Agent
        </h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7 }}>
          Discord operations agent powered by the OpenAI Agents SDK, with allowlisted GitHub
          tools and explicit approval gates for writes.
        </p>
        <h2 style={{ marginTop: 28 }}>Commands</h2>
        <ul style={{ lineHeight: 1.9, color: "#dbeafe" }}>
          {commands.map((command) => (
            <li key={command}>
              <code>{command}</code>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 28 }}>
          Readiness: <a href="/api/health" style={{ color: "#60a5fa" }}>/api/health</a>
        </p>
      </section>
    </main>
  );
}
