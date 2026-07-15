# SKYGRID Deployment Broker — On-Ramp Steps

## Purpose

The SKYGRID Deployment Broker adds an engineer-safe enrollment step to the **SKYGRID Emergency Data On-Ramp**. It issues a short-lived, signed link that identifies the authorized organization, deployment profile, and permitted device platforms.

Opening an enrollment link does not install software. The engineer sees the detected platform and whether a signed package is configured. Package redemption remains fail-closed when the platform is unauthorized, the token is invalid or expired, or the signed artifact is missing.

## Controlled-pilot boundaries

- Mode: `controlled_pilot`
- Sentinel: `fail_closed`
- Maximum token lifetime: 24 hours
- Intended maximum uses: 1
- Durable one-time-use enforcement is **not complete** until a persistent enrollment store is connected.
- No payment execution
- No wallet signing
- No transaction broadcast
- No production failover
- No private-key transfer
- Opening a link never executes an installer

## Updated on-ramp sequence

1. **Lease intake**
   - Submit the proposed node through `POST /api/node-lease/intake`.
   - Record organization, engineer, region, intended device class, and pilot purpose.

2. **Operator review**
   - Confirm the engineer is authorized.
   - Confirm the deployment profile is `diagnostic` or another explicitly approved controlled-pilot profile.
   - Select the allowed platform list.

3. **Enrollment-link issuance**
   - Call `POST /api/enrollments` with the deployment-admin header.
   - Receive a signed, expiring `/enroll/{token}` link.
   - Send the link only to the approved engineer.

4. **Engineer device check**
   - The engineer opens the enrollment link.
   - The broker detects the device platform.
   - The page shows organization, profile, detected platform, and allowed platforms.
   - No software runs at this stage.

5. **Signed artifact redemption**
   - An authenticated bootstrap client calls `POST /api/enrollments/{token}/redeem`.
   - The broker verifies token signature, expiration, and platform authorization.
   - The broker returns only a configured artifact URL plus its required digest.
   - The bootstrap client must verify signature and digest before execution.

6. **Node enrollment**
   - The device generates its private key locally.
   - The node submits its public identity and capabilities to the control plane.
   - The control plane starts the node in `quarantine` or `diagnostic`, never direct production.

7. **Capacity and policy validation**
   - Verify memory, disk, architecture, service support, and permitted workload types.
   - Apply the signed SKYGRID policy manifest.
   - Reject prohibited actions and unsupported devices.

8. **Bounded workload proof**
   - Assign a non-production diagnostic workload.
   - Record acceptance, execution, completion, output digest, and evidence receipt.

9. **Lifecycle enforcement**
   - Record heartbeat and status.
   - Revoke the node when the pilot ends or authorization changes.
   - Verify that a revoked node rejects reassignment.

10. **Evidence export**
    - Preserve enrollment, assignment, completion, revocation, and rejection receipts.
    - Hash every receipt and produce a lifecycle manifest.

## API routes

### Health

```http
GET /api/deployment-broker/health
```

### Issue an enrollment link

```http
POST /api/enrollments
X-SKYGRID-Admin-Key: <deployment-admin-key>
Content-Type: application/json
```

Example body:

```json
{
  "organization_id": "org_example",
  "engineer_email": "engineer@example.com",
  "deployment_profile": "diagnostic",
  "allowed_platforms": ["windows-x64"],
  "ttl_seconds": 3600
}
```

### Open the engineer link

```http
GET /enroll/{token}
```

An explicit platform can be supplied for controlled testing:

```http
GET /enroll/{token}?platform=windows-x64
```

### Redeem the approved artifact profile

```http
POST /api/enrollments/{token}/redeem
Content-Type: application/json
```

```json
{
  "platform": "windows-x64"
}
```

## Supported platform identifiers

- `windows-x64`
- `windows-arm64`
- `macos-arm64`
- `macos-x64`
- `linux-x64`
- `linux-arm64`
- `container`

Mobile devices should use a companion or operator experience rather than an unrestricted persistent worker.

## Required environment variables

### Broker security

```text
SKYGRID_DEPLOYMENT_BROKER_SECRET=<random secret of at least 32 characters>
SKYGRID_DEPLOYMENT_ADMIN_KEY=<separate admin key of at least 24 characters>
SKYGRID_DEPLOYMENT_ORIGIN=https://deploy.skygrid-protocol.net
```

Use a cryptographically random secret manager value. Do not commit these values.

### Signed artifact catalog

Each artifact is considered configured only when both its location and digest are present.

```text
SKYGRID_WINDOWS_X64_URL=
SKYGRID_WINDOWS_X64_SHA256=
SKYGRID_WINDOWS_ARM64_URL=
SKYGRID_WINDOWS_ARM64_SHA256=
SKYGRID_MACOS_ARM64_URL=
SKYGRID_MACOS_ARM64_SHA256=
SKYGRID_MACOS_X64_URL=
SKYGRID_MACOS_X64_SHA256=
SKYGRID_LINUX_X64_URL=
SKYGRID_LINUX_X64_SHA256=
SKYGRID_LINUX_ARM64_URL=
SKYGRID_LINUX_ARM64_SHA256=
SKYGRID_CONTAINER_IMAGE=
SKYGRID_CONTAINER_DIGEST=
```

The digest field does not replace code signing. Production packages must also be signed, and macOS packages must be notarized.

## Local verification

```powershell
cd E:\Aura-core
node --test .\tests\skygrid-deployment-broker.test.mjs
```

Run the existing policy regression suite as well:

```powershell
node --test .\tests\skygrid-intake-policy.test.mjs
```

## Production blockers remaining

Before calling the broker production ready, add:

1. A persistent enrollment database with atomic single-use redemption.
2. Identity-provider authentication and role-based authorization instead of a single static admin header.
3. Rate limiting and abuse controls.
4. Per-organization tenant isolation.
5. Signed MSI/MSIX, PKG, DEB/RPM, and OCI releases.
6. Device-generated keys and short-lived node certificates.
7. Artifact signature verification in the bootstrap client.
8. Append-only audit storage and export.
9. Canary updates, rollback, repair, and uninstall workflows.
10. End-to-end tests on Windows x64, Windows ARM64, Apple Silicon, Intel macOS, Linux x64/ARM64, and containers.
