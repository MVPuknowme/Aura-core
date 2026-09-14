import os from "node:os";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { evaluateWindows11Compatibility } from "../config/skygrid-win11-compat.mjs";

function readWindowsProductType() {
  if (process.platform !== "win32") return null;
  try {
    const output = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", "(Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).ProductType"],
      { encoding: "utf8", windowsHide: true, timeout: 10000 }
    ).trim();
    return /^\d+$/.test(output) ? Number(output) : null;
  } catch {
    return null;
  }
}

const result = evaluateWindows11Compatibility({
  platform: process.platform,
  release: os.release(),
  arch: process.arch,
  nodeVersion: process.versions.node,
  windowsProductType: readWindowsProductType()
});

console.log(JSON.stringify({
  service: "SKYGRID Windows 11 preflight",
  sentinel: "fail_closed",
  ...result
}, null, 2));

if (!result.ok) process.exit(1);
