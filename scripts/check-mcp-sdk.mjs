const modules = [
  "@modelcontextprotocol/sdk/server/mcp.js",
  "@modelcontextprotocol/sdk/client/index.js",
  "@modelcontextprotocol/sdk/types.js"
];

const loaded = [];

for (const moduleName of modules) {
  try {
    await import(moduleName);
    loaded.push(moduleName);
  } catch (error) {
    console.error(JSON.stringify({
      system: "SKYGRID Emergency Data On-Ramp",
      check: "mcp_typescript_sdk",
      verdict: "FAIL",
      module: moduleName,
      error: error.message
    }, null, 2));
    process.exit(1);
  }
}

console.log(JSON.stringify({
  system: "SKYGRID Emergency Data On-Ramp",
  check: "mcp_typescript_sdk",
  verdict: "SUCCESS",
  loaded
}, null, 2));
