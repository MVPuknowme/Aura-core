const BLOCKED_QUERY_PREFIXES = ["mibex"];

export function inspectExternalUrl(raw) {
  if (typeof raw !== "string" || !/^https?:\/\//i.test(raw.trim())) {
    return { blocked: false, reason: null, parameter: null };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { blocked: true, reason: "invalid_external_url", parameter: null };
  }

  for (const [name] of url.searchParams) {
    const normalized = name.toLowerCase();
    if (BLOCKED_QUERY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      return {
        blocked: true,
        reason: "untrusted_url_indicator",
        parameter: name,
        classification: "tracking_or_opaque_share_metadata",
        malware_confirmed: false
      };
    }
  }

  return { blocked: false, reason: null, parameter: null };
}

export function findBlockedExternalUrl(value, trail = "$") {
  if (typeof value === "string") {
    const result = inspectExternalUrl(value);
    return result.blocked ? { ...result, url: value, trail } : null;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const match = findBlockedExternalUrl(value[index], `${trail}[${index}]`);
      if (match) return match;
    }
    return null;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const match = findBlockedExternalUrl(child, `${trail}.${key}`);
      if (match) return match;
    }
  }

  return null;
}

export function stripBlockedTrackingParameters(raw) {
  const url = new URL(raw);
  for (const name of [...url.searchParams.keys()]) {
    const normalized = name.toLowerCase();
    if (BLOCKED_QUERY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      url.searchParams.delete(name);
    }
  }
  return url.toString();
}
