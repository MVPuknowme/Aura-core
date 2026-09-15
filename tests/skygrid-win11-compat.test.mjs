import test from "node:test";
import assert from "node:assert/strict";
import {
  SKYGRID_WIN11_REVISION,
  WINDOWS_11_MIN_BUILD,
  evaluateWindows11Compatibility
} from "../config/skygrid-win11-compat.mjs";

const windows11 = {
  platform: "win32",
  release: "10.0.22631",
  arch: "x64",
  nodeVersion: "24.8.0",
  windowsProductType: 1
};

test("c64db11 identifies the Windows 11 successor revision", () => {
  assert.equal(SKYGRID_WIN11_REVISION, "c64db11");
  assert.equal(WINDOWS_11_MIN_BUILD, 22000);
});

test("Windows 11 workstation build 22631 on x64 with Node 24 is compatible", () => {
  const result = evaluateWindows11Compatibility(windows11);
  assert.equal(result.ok, true);
  assert.equal(result.revision, "c64db11");
  assert.deepEqual(result.failures, []);
});

test("Windows Server product type fails closed", () => {
  const result = evaluateWindows11Compatibility({
    ...windows11,
    release: "10.0.26100",
    windowsProductType: 3
  });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("windows_product_not_workstation"));
});

test("missing Windows product type fails closed", () => {
  const result = evaluateWindows11Compatibility({ ...windows11, windowsProductType: undefined });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("windows_product_type_unreadable"));
});

test("malformed Windows release fails closed instead of partially parsing", () => {
  const result = evaluateWindows11Compatibility({ ...windows11, release: "garbage.26100garbage" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("windows_build_unreadable"));
});

test("malformed Node version fails closed instead of partially parsing", () => {
  const result = evaluateWindows11Compatibility({ ...windows11, nodeVersion: "24garbage" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("node_major_unreadable"));
});

test("Node 25 fails because the repository engine contract is 24.x", () => {
  const result = evaluateWindows11Compatibility({ ...windows11, nodeVersion: "25.0.0" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("node_major_not_24"));
});

test("Windows build below 22000 fails closed", () => {
  const result = evaluateWindows11Compatibility({ ...windows11, release: "10.0.19045" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("windows_build_below_22000"));
});

test("unsupported architecture fails closed", () => {
  const result = evaluateWindows11Compatibility({ ...windows11, arch: "ia32" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("unsupported_windows_architecture"));
});

test("Node below 24 fails closed", () => {
  const result = evaluateWindows11Compatibility({ ...windows11, nodeVersion: "22.20.0" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("node_major_not_24"));
});

test("non-Windows platforms do not pass the Windows 11 preflight", () => {
  const result = evaluateWindows11Compatibility({ ...windows11, platform: "linux", release: "6.8.0" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.includes("platform_not_win32"));
});
