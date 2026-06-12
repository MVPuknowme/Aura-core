import { mkdir, copyFile, writeFile, readFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });

await copyFile("public/index.html", "dist/index.html");

const canonicalDomain = "aura-core-home-e539c0b1.vercel.app";
const indexPath = "dist/index.html";
const indexHtml = await readFile(indexPath, "utf8");
await writeFile(
  indexPath,
  indexHtml
    .replaceAll("aura-core.vercel.app", canonicalDomain)
    .replaceAll("Vercel fallback", "Vercel production candidate")
    .replaceAll(
      "Please use the live Vercel link until the custom domain is fully routed off B12.",
      "Please use the canonical Vercel project domain while the custom domain is finalized."
    )
);

await writeFile(
  "dist/health.json",
  JSON.stringify(
    {
      ok: true,
      status: "online",
      service: "SKYGRID Emergency Data On-Ramp",
      mode: "controlled_pilot",
      sentinel: "fail_closed",
      runtime: "vercel-static",
      canonical_domain: canonicalDomain,
      payment_execution: false,
      device_activation: false,
      production_failover: false,
      private_data_movement: false,
      generated_at: new Date().toISOString()
    },
    null,
    2
  )
);
