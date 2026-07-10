import worker from "../src/index.js";

const env = {
  SKYGRID_ORIGIN: "https://aurcore.skygrid-protocol.net",
};

async function run(path) {
  const request = new Request(`https://local.skygrid.test${path}`);
  const response = await worker.fetch(request, env, {});
  const body = await response.text();

  console.log(`\n=== ${path} ===`);
  console.log(`status: ${response.status}`);
  console.log(`content-type: ${response.headers.get("content-type")}`);
  console.log(body);

  if (!response.ok) {
    process.exitCode = 1;
  }

  try {
    const parsed = JSON.parse(body);
    if (parsed.ok !== true) {
      process.exitCode = 1;
    }
  } catch {
    process.exitCode = 1;
  }
}

await run("/edge/health");
await run("/edge/proof");
