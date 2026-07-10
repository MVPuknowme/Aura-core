# SKYGRID Security Note — First VPN / 1VPNS / Operation Saffron

Classification: **Red / High Risk / High Confidence**

This note records the First VPN Service / 1VPNS IOC set as a SKYGRID defensive deny/watch package.

## Rule

Do not visit, resolve, message, email, authenticate against, or integrate these indicators into live SKYGRID routes.

## Purpose

This entry exists only for:

- Defensive blocking
- Local IOC scanning
- SIEM/log searches
- Firewall/DNS deny-watch rules
- Incident evidence preservation
- Repo hygiene checks

## Containment Intent

SKYGRID should treat these indicators as hostile infrastructure references. They may appear only in the approved security vault paths:

- `security/iocs/operation-saffron-first-vpn.iocs.json`
- `docs/security/operation-saffron-first-vpn.md`

If they appear anywhere else in the repo, that should be reviewed as possible accidental spread, contamination, pasted evidence, unsafe config, or leaked route logic.

## Evidence Handling

Preserve:

- Timestamp
- Device name
- Local IP
- Destination IP/domain
- Port/protocol
- Process/app
- Username/account
- Auth result
- Screenshot or log excerpt

## Cleanup Reminder

Windows:
Run Microsoft Defender Offline scan, full scan, review VPN/proxy/DNS/startup apps/extensions/admin users.

iOS/iPadOS:
Review `Settings → General → VPN & Device Management`, remove unknown VPNs/profiles/MDM/certificates, update iOS, and consider Lockdown Mode if targeting is suspected.

Network:
Check router DNS, admin password, firmware, WPS, port forwards, and connected devices.
