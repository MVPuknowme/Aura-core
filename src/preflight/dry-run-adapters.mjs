const PROVIDER_NAMES = [
  "github",
  "railway",
  "azure",
  "vercel",
  "airtable",
  "clio",
  "skygrid-dashboard"
];

function fixtureAdapter(provider) {
  return async function dryRunAdapter(intent) {
    if (intent.mode !== "dry-run") {
      return {
        provider,
        state: "Blocked",
        reason: "dry_run_required",
        mutated: false,
        evidence: {}
      };
    }

    const fixture = intent.adapterFixture ?? {};

    if (
      (provider === "airtable" || provider === "clio") &&
      fixture.credentialsPresent === false
    ) {
      return {
        provider,
        state: fixture.requiredForClient === true ? "Failed" : "Skipped",
        reason:
          fixture.requiredForClient === true
            ? "required_credentials_missing"
            : "optional_credentials_missing",
        mutated: false,
        evidence: {
          credentialsPresent: false,
          requiredForClient: fixture.requiredForClient === true
        }
      };
    }

    if (fixture.state === "Failed" || fixture.state === "Blocked") {
      return {
        provider,
        state: fixture.state,
        reason: fixture.reason ?? "fixture_preflight_failed",
        mutated: false,
        evidence: fixture.evidence ?? {}
      };
    }

    return {
      provider,
      state: fixture.state === "Warning" ? "Warning" : "Passed",
      reason: fixture.reason ?? "dry_run_fixture_passed",
      mutated: false,
      evidence: {
        targetEnvironment: intent.targetEnvironment,
        gitCommit: intent.gitCommit ?? null,
        ...(fixture.evidence ?? {})
      }
    };
  };
}

export const dryRunAdapters = Object.freeze(
  Object.fromEntries(PROVIDER_NAMES.map((provider) => [provider, fixtureAdapter(provider)]))
);

export function getDryRunAdapter(provider) {
  const adapter = dryRunAdapters[provider];
  if (!adapter) throw new Error(`Unsupported preflight provider: ${provider}`);
  return adapter;
}
