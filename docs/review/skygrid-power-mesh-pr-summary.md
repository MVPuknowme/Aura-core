# PR summary: SKYGRID Power Mesh node telemetry

## What changed

- Added a Klamath Falls telemetry fixture for a SKYGRID Power Mesh node.
- Added a JSON schema for node telemetry review.
- Added positive and negative fixtures for mode validation.
- Added documentation and review checklists.
- Added a local Node.js fixture validator.
- Added a lightweight Postman review note without wiring a public endpoint.

## Why

This prepares the SKYGRID Power Mesh concept for safe review before route integration. The payload can become a future emergency power-state proof packet, but this PR does not introduce live grid control behavior.

## Safety posture

Telemetry-only. No AC grid-tie logic. No transfer-switching logic. No critical-load control. No utility interconnection behavior.
