# Aura Recon Companion

Aura Recon Companion is an iPhone-oriented interface plus a bounded backend for reviewing public metadata about domains that the operator owns or is explicitly authorized to assess.

[Open this branch in GitHub Codespaces](https://codespaces.new/MVPuknowme/Aura-core?ref=agent%2Faura-recon-companion-devcontainer&quickstart=1)

## Current MVP

- SwiftUI iOS client source generated from `ios/project.yml` with XcodeGen.
- FastAPI development backend.
- Explicit target-authorization confirmation.
- Hostname-only validation.
- Blocking of private, loopback, link-local, reserved, and other non-global targets.
- DNS collection for A, AAAA, MX, NS, and TXT records.
- Optional single HTTPS metadata request with selected response headers.
- SHA-256 evidence digest for each result payload.
- GitHub Codespaces/dev-container setup.
- Automated backend tests.

## Deliberate limits

This release does not exploit services, brute-force paths, test passwords, enumerate private networks, execute arbitrary terminal commands, or claim SpiderFoot's full provider catalog. SpiderFoot-scale enrichment can be added later through an isolated adapter after provider credentials, terms, retention, and authorization controls are defined.

The Codespaces link is a development environment, not an installable iPhone application. A TestFlight or App Store download link requires Apple Developer signing, an App Store Connect record, an archived build produced with Xcode on macOS, and Apple review where applicable.

## Run in Codespaces

The dev container installs the Python dependencies automatically. In the Codespaces terminal:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open the forwarded port and visit:

- `/docs` for the interactive API console.
- `/health` for service status.

Example authorized request:

```json
{
  "target": "example.com",
  "authorized": true,
  "profile": "dns-passive"
}
```

## Run from PowerShell

From `apps/aura-recon-companion`:

```powershell
.\scripts\Start-AuraRecon.ps1
```

Then verify:

```powershell
Invoke-RestMethod http://localhost:8000/health |
    ConvertTo-Json -Depth 10
```

## Generate the iOS project

On a Mac with Xcode and XcodeGen:

```bash
cd ios
xcodegen generate
open AuraReconCompanion.xcodeproj
```

Set your Apple development team and replace the development API URL with the HTTPS URL for your deployed backend. Localhost works in the iOS Simulator; a physical iPhone needs a reachable HTTPS development endpoint or a trusted local-network configuration.

## Architecture

```text
iPhone SwiftUI client
        |
        | HTTPS JSON
        v
Authorization-gated FastAPI service
        |-- target validation and SSRF guard
        |-- bounded DNS collection
        |-- optional HTTPS metadata request
        |-- evidence digest
        v
Operator-reviewed report
```

## Next production milestones

1. Add authenticated user sessions and per-user rate limits.
2. Add durable encrypted report storage with deletion controls.
3. Add a separately sandboxed SpiderFoot adapter for approved providers.
4. Add accessibility and VoiceOver verification.
5. Add an Xcode test target and macOS CI runner.
6. Archive through Xcode and publish to TestFlight.
