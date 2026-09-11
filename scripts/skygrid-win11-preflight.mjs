import os from "node:os";
import process from "node:process";
import { evaluateWindows11Compatibility } from "../config/skygrid-win11-compat.mjs";

const result = evaluateWindows11Compatibility({
  platform: process.platform,
  release: os.release(),
  arch: process.arch,
  nodeVersion: process.versions.node
});

console.log(JSON.stringify({
  service: "SKYGRID Windows 11 preflight",
  sentinel: "fail_closed",
  ...result
}, null, 2));

if (!result.ok) process.exit(1);
