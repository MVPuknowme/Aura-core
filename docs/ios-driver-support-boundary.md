# iOS Driver Support Boundary — Aura-Core / SkyGrid

Operator: Michael Vincent Patrick / MVPuknowme
Node: 42XA-0312

## Key point

iOS does not support installing third-party desktop-style USB serial drivers such as Silicon Labs CP210x VCP drivers.

The CP210x macOS VCP driver is for macOS computers, not iPhone/iOS.

## What this means

For CP210x, CH340, FTDI, ESP32, LoRa, Meshtastic, and other USB serial hardware:

- do not install `.dmg`, `.pkg`, kext, or DriverKit packages on iPhone
- use a Mac, Raspberry Pi, or Linux machine as the serial host
- use iPhone as the mobile control surface
- connect through Bluetooth LE, Wi-Fi, SSH, web dashboards, or vendor-supported iOS apps

## iOS-friendly paths

1. **Bluetooth LE**
   - Best path for field mobility when the device supports BLE.
   - Useful for Meshtastic-style hardware and mobile configuration flows.

2. **Wi-Fi web dashboard**
   - Device exposes a local web UI.
   - iPhone opens the dashboard in Safari.

3. **SSH into a bridge host**
   - USB serial device plugs into Mac/Pi/Linux.
   - iPhone uses an SSH app to manage the bridge.

4. **Vendor iOS app**
   - Use the official iOS app when available.
   - Prefer this for field setup and diagnostics.

5. **Cloud console / remote dashboard**
   - iPhone controls AWS, GitHub, Postman, Linear, Airtable, and SkyGrid dashboards remotely.

## Recommended Aura-Core / SkyGrid iOS pattern

```text
USB serial hardware
   ↓ USB
Mac / Raspberry Pi / Linux bridge
   ↓ API / SSH / web
SkyGrid dashboard
   ↓ Safari / iOS app
 iPhone operator console
```

## Practical hardware workflow

1. Flash or diagnose the board from Mac/Pi/Linux.
2. Confirm serial port on the bridge host.
3. Start a local API, web dashboard, or MQTT/WebSocket bridge.
4. Open that service from iPhone Safari or an iOS app.
5. Use iPhone for field monitoring, commands, and status review.

## Verification commands on the bridge host

```bash
ls /dev/cu.*
python3 -m serial.tools.list_ports
screen /dev/cu.SLAB_USBtoUART 115200
```

## iOS role in the system

The iPhone is best used as:

- operator console
- field dashboard
- BLE configurator
- SSH terminal
- camera/QR/NFC capture device
- incident reporting tool
- cloud-control surface

## Boundary

Do not attempt to install macOS driver packages on iOS. iOS does not expose a user-installable low-level driver model for USB serial devices.

For production Aura-Core / SkyGrid hardware, prefer devices that can communicate through BLE, Wi-Fi, web APIs, or a trusted bridge host.
