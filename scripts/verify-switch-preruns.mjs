import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { pathToFileURL } from "node:url";

const DEFAULT_PNPK_PATH = "bridge/skygrid-emergency-onramp.pnpk";
const ETHERNET_NAME = /(^|\s)(eth\d*|ethernet(?:\s+\d+)?|eno\d+|ens\d+|enp\d+s\d+(?:f\d+)?|lan(?:\s+\d+)?)(\s|$)/i;

function publicInterfaceCandidates(interfaces = {}) {
  return Object.entries(interfaces)
    .filter(([name, addresses]) =>
      ETHERNET_NAME.test(name) &&
      (addresses || []).some((address) => address.internal !== true)
    )
    .map(([name, addresses]) => ({
      name,
      address_families: [
        ...new Set(
          (addresses || [])
            .filter((address) => address.internal !== true)
            .map((address) => address.family)
        )
      ]
    }));
}

function assertSafeSwitchPolicy(pnpk) {
  const ethernet = pnpk.platforms?.ethernet;
  const allbridge = pnpk.platforms?.allbridge_core;
  const preRuns = pnpk.aura_core_ai_switch?.pre_run_verification;

  if (!preRuns?.enabled || preRuns.fail_closed !== true) {
    throw new Error("switch pre-run verification must be enabled and fail closed");
  }
  if (
    !ethernet?.enabled ||
    ethernet.os_network_switching_allowed !== false ||
    ethernet.interface_reconfiguration_allowed !== false
  ) {
    throw new Error("Ethernet must be verification-only with OS switching disabled");
  }
  if (
    !allbridge?.enabled ||
    allbridge.bridge_execution_allowed !== false ||
    allbridge.wallet_signing_allowed !== false ||
    allbridge.transaction_broadcast_allowed !== false
  ) {
    throw new Error("Allbridge Core must remain preflight-only");
  }
  if (
    preRuns.checks?.ethernet?.os_switching_allowed !== false ||
    preRuns.checks?.ethernet?.interface_reconfiguration_allowed !== false ||
    preRuns.checks?.allbridge_core?.bridge_execution_allowed !== false
  ) {
    throw new Error("switch pre-run checks contain unsafe authority");
  }

  return { ethernet, allbridge };
}

async function checkAllbridgeStatus(url, fetchImpl) {
  if (!url) {
    return {
      checked: false,
      healthy: false,
      status: "external_status_not_configured"
    };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { checked: true, healthy: false, status: "invalid_status_url" };
  }

  if (parsed.protocol !== "https:") {
    return { checked: true, healthy: false, status: "https_required" };
  }

  try {
    const response = await fetchImpl(parsed, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000)
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const healthy = response.status === 200 && payload?.ok === true;
    return {
      checked: true,
      healthy,
      status: healthy ? "healthy" : "unhealthy_or_invalid_payload",
      http_status: response.status
    };
  } catch (error) {
    return {
      checked: true,
      healthy: false,
      status: "request_failed",
      error: String(error?.message || error)
    };
  }
}

export async function verifySwitchPreRuns(
  pnpk,
  {
    interfaces,
    fetchImpl = globalThis.fetch,
    allbridgeStatusUrl = process.env.ALLBRIDGE_CORE_STATUS_URL || ""
  } = {}
) {
  const { ethernet, allbridge } = assertSafeSwitchPolicy(pnpk);
  let observedInterfaces = interfaces;
  let interfaceObservationError = null;
  if (!observedInterfaces) {
    try {
      observedInterfaces = networkInterfaces();
    } catch {
      observedInterfaces = {};
      interfaceObservationError = "interface_enumeration_unavailable";
    }
  }
  const candidates = publicInterfaceCandidates(observedInterfaces);
  const status = await checkAllbridgeStatus(allbridgeStatusUrl, fetchImpl);
  const ethernetPresent = candidates.length > 0;
  const allbridgeSelectable = ethernetPresent && status.checked && status.healthy;

  return {
    ok: true,
    service: pnpk.service,
    mode: pnpk.mode,
    sentinel: pnpk.sentinel,
    verification_scope: "read_only_pre_run",
    ethernet: {
      policy_verified: true,
      presence_verified: ethernetPresent,
      observation_status: interfaceObservationError || "observed",
      media_type_asserted: false,
      verification_mode: ethernet.verification_mode,
      candidates
    },
    allbridge_core: {
      policy_verified: true,
      verification_mode: allbridge.verification_mode,
      ...status,
      selectable: allbridgeSelectable
    },
    decision: allbridgeSelectable ? "candidate_verified" : "hold_candidate",
    selection_ready: allbridgeSelectable,
    guardrails: [
      "no_os_network_switching",
      "no_interface_reconfiguration",
      "no_wallet_signing",
      "no_transaction_broadcast",
      "no_bridge_execution"
    ]
  };
}

async function main() {
  const pnpkPath = process.env.PNPK_PATH || DEFAULT_PNPK_PATH;
  try {
    const pnpk = JSON.parse(await readFile(pnpkPath, "utf8"));
    const report = await verifySwitchPreRuns(pnpk);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      decision: "fail_closed",
      reason: String(error?.message || error)
    }, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
