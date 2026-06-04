import { mkdir, copyFile, writeFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });

await copyFile("public/index.html", "dist/index.html");

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
