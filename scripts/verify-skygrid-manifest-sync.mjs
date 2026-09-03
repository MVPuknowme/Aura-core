import { readFile } from "node:fs/promises";

const manifestPath = "config/skygrid-route-manifest.json";
const runtimePath = "api/runtime.mjs";
const runtimeCorePath = "api/runtime-core.mjs";
const postmanPath = "postman/skygrid-autodrill.collection.json";

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const runtimeEntry = await readFile(runtimePath, "utf8");
const runtimeCore = await readFile(runtimeCorePath, "utf8").catch(() => "");
const runtime = `${runtimeEntry}\n${runtimeCore}`;
const postman = JSON.parse(await readFile(postmanPath, "utf8"));

const normalize = (path) => String(path || "").split("?")[0];
const routePath = (route) => normalize(route.path || route.sample_path);
const implementedRoutes = manifest.routes.filter((route) =>
  String(route.status || "").includes("implemented")
);
const requiredImplementedRoutes = implementedRoutes.filter((route) => route.required);

function collectPostmanUrls(items = [], out = []) {
  for (const item of items) {
    if (item.request?.url) {
      out.push(String(item.request.url).replace("{{base_url}}", ""));
    }
    if (item.item) collectPostmanUrls(item.item, out);
  }
  return out;
}

const postmanUrls = new Set(collectPostmanUrls(postman.item).map(normalize));

const failures = [];
const warnings = [];

if (Object.hasOwn(manifest.runtimes || {}, "vercel")) {
  failures.push("route manifest must not declare removed Vercel runtime");
}

for (const route of implementedRoutes) {
  const path = routePath(route);
  const owner = String(route.owner || "");
  const hasDedicatedApiFile = path === "/api/sponsors/link";

  if (owner.includes("vercel")) {
    failures.push(`route manifest contains removed Vercel owner: ${route.id}`);
  }

  if (
    owner.includes("skygrid_api") &&
    !runtime.includes(`"${path}"`) &&
    !runtime.includes(`path === "${path}"`) &&
    !hasDedicatedApiFile
  ) {
    failures.push(`runtime entry/core missing implemented route reference: ${path}`);
  }
}

for (const route of requiredImplementedRoutes) {
  const testPath = normalize(route.sample_path || route.path);
  if (!postmanUrls.has(testPath)) {
    warnings.push(`Postman collection missing required proof route: ${testPath}`);
  }
}

const report = {
  ok: failures.length === 0,
  service: manifest.service,
  source_of_truth: manifest.source_of_truth,
  manifest_routes: manifest.routes.length,
  implemented_routes: implementedRoutes.length,
  required_implemented_routes: requiredImplementedRoutes.length,
  runtime_files_scanned: runtimeCore ? [runtimePath, runtimeCorePath] : [runtimePath],
  active_runtime_owner: "skygrid_api",
  postman_urls: postmanUrls.size,
  failures,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
