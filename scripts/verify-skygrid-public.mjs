const baseUrl =
  process.env.SKYGRID_BASE_URL ||
  "https://skygrid-protocol.net";

const checks = [
  "/health.json",
  "/.well-known/skygrid-proof.json",
  "/status.json"
];

let failed = false;

for (const path of checks) {
  const url = new URL(path, baseUrl).toString();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json"
      }
    });

    const contentType =
      response.headers.get("content-type") || "";

    if (response.status !== 200) {
      console.error(
        `GET ${url} -> ${response.status} FAIL`
      );
      failed = true;
      continue;
    }

    if (!contentType.includes("application/json")) {
      console.error(
        `GET ${url} -> ${response.status} FAIL expected application/json received ${contentType}`
      );
      failed = true;
      continue;
    }

    const body = await response.json();

    if (body.ok !== true) {
      console.error(
        `GET ${url} -> ${response.status} FAIL body.ok was not true`
      );
      failed = true;
      continue;
    }

    console.log(
      `GET ${url} -> ${response.status} PASS`
    );
  } catch (error) {
    console.error(
      `GET ${url} -> ERROR FAIL ${error.message}`
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("SKYGRID public verification passed.");
