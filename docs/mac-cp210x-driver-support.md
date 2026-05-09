# macOS CP210x Driver Support — Aura-Core / SkyGrid

Operator: Michael Vincent Patrick / MVPuknowme
Node: 42XA-0312

## Purpose

This note tracks CP210x USB-to-serial driver support for macOS systems used with Aura-Core / SkyGrid edge hardware, LoRa/Meshtastic-style radios, serial adapters, embedded boards, and local node testing.

## Driver identified

Silicon Labs CP210x Macintosh OS VCP Driver v6.

Relevant release package components:

- `SiLabsUSBDriverDisk.dmg` — VCP Driver Installer image
- `ReleaseNotes.txt`
- `uninstaller.sh` — removal script

## Compatibility

The release notes state that v6 supports 64-bit Macintosh computers running macOS 10.11 or greater. macOS 10.9 and 10.10 require the legacy MacVCP driver folder.

## Installation notes

1. Mount the DMG.
2. Double-click `Silicon Labs VCP Driver`.
3. On macOS 10.13 or later, macOS may block the system extension.
4. If blocked, open System Settings / System Preferences → Security & Privacy and allow the Silicon Labs system extension.
5. Reconnect the CP210x USB serial device.
6. Verify `/dev/cu.SLAB_USBtoUART` or another CP210x-style serial device appears.

## Uninstall

Run `uninstaller.sh` from Terminal if removal is required.

## Current version reference

CP210x Macintosh OS VCP Driver 6.0.3 — May 23, 2025.

Notable v6.0.3 changes:

- Added XOFF signal behavior when macOS sleeps.
- Resolved an uninstall issue on macOS 13.
- Fixed a potential v6.0.2 crash during stress testing.
- Added additional VID/PID support for multiple vendors.

## Aura-Core / SkyGrid relevance

This driver helps Mac systems talk to serial-connected hardware. It is relevant for:

- local USB serial console access
- Meshtastic / LoRa adapter bring-up
- embedded board flashing and diagnostics
- packet test nodes
- field debugging
- edge hardware provisioning

## Safety boundary

Only install drivers from the official Silicon Labs source or a verified vendor package. Do not install random driver DMGs from unknown sites. Drivers and kernel/system extensions can affect system security and stability.
