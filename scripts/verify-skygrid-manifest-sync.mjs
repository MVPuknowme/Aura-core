import { readFile } from "node:fs/promises";

const manifestPath = "config/skygrid-route-manifest.json";
const runtimePath = "api/runtime.mjs";
const vercelPath = "vercel.json";
const postmanPath = "postman/skygrid-autodrill.collection.json";

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const runtime = await readFile(runtimePath, "utf8");
const vercel = JSON.parse(await readFile(vercelPath, "utf8"));
const postman = JSON.parse(await readFile(postmanPath, "utf8"));

const normalize = (path) => String(path || "").split("?")[0];
const routePath = (route) => normalize(route.path || route.sample_path);
const implementedRoutes = manifest.routes.filter((route) => String(route.status || "").includes("implemented"));
const requiredImplementedRoutes = implementedRoutes.filter((route) => route.required);

const vercelSources = new Set((vercel.rewrites || []).map((rewrite) => normalize(rewrite.source)));

function collectPostmanUrls(items = [], out = []) {
  for (const item of items) {
    if (item.request?.url) out.push(String(item.request.url).replace("{{base_url}}", ""));
    if (item.item) collectPostmanUrls(item.item, out);
  }
  return out;
}

const postmanUrls = new Set(collectPostmanUrls(postman.item).map(normalize));

const failures = [];

for (const route of implementedRoutes) {
  const path = routePath(route);
  if (route.owner.includes("vercel") && !vercelSources.has(path) && path !== "/api/sponsors/link") {
    failures.push(`vercel.json missing implemented route: ${path}`);
  }
  if (route.owner.includes("vercel") && !runtime.includes(`"${path}"`) && !runtime.includes(`path === "${path}"`) && path !== "/api/sponsors/link") {
    failures.push(`api/runtime.mjs missing implemented route reference: ${path}`);
  }
}

for (const route of requiredImplementedRoutes) {
  const testPath = normalize(route.sample_path || route.path);
  if (!postmanUrls.has(testPath)) {
    failures.push(`Postman collection missing required proof route: ${testPath}`);
  }
}

const report = {
  ok: failures.length === 0,
  service: manifest.service,
  source_of_truth: manifest.source_of_truth,
  manifest_routes: manifest.routes.length,
  implemented_routes: implementedRoutes.length,
  required_implemented_routes: requiredImplementedRoutes.length,
  vercel_rewrites: vercelSources.size,
  postman_urls: postmanUrls.size,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
