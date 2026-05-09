# iPad Driver Support Boundary — Aura-Core / SkyGrid

Operator: Michael Vincent Patrick / MVPuknowme
Node: 42XA-0312

## Key point

iPadOS does not support installing third-party Mac-style USB serial drivers such as Silicon Labs CP210x VCP drivers.

The CP210x macOS VCP driver is for macOS computers, not iPadOS.

## What this means

For CP210x / USB serial hardware:

- install drivers on a Mac, not directly on iPad
- use the Mac for firmware flashing, serial console, and low-level diagnostics
- use iPad for dashboards, web UI, SSH clients, cloud consoles, GitHub, Postman, and remote management

## iPad-friendly hardware paths

1. Use hardware that exposes a web interface over Wi-Fi.
2. Use Bluetooth LE apps where the device/vendor supports iPadOS.
3. Use a Mac, Raspberry Pi, or Linux box as the serial bridge.
4. Access that bridge from iPad over SSH, browser, or web dashboard.
5. Prefer devices with native iOS/iPadOS companion apps when field mobility matters.

## Recommended Aura-Core / SkyGrid pattern

```text
USB serial hardware
   ↓
Mac / Raspberry Pi / Linux bridge
   ↓
SSH / web dashboard / API
   ↓
iPad control surface
```

## Practical examples

- Flash ESP32 / LoRa / Meshtastic hardware from Mac or Linux.
- Run serial monitor on Mac/Linux.
- Expose status through local web endpoint.
- Open dashboard from iPad Safari.
- Use iPad as the operator console, not the driver host.

## Boundary

Do not try to install macOS `.dmg`, `.pkg`, kext, or DriverKit system extensions on iPadOS. iPadOS does not expose that driver installation model.
