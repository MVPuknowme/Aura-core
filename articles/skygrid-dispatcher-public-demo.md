# SkyGrid Dispatcher Public Demo

SkyGrid Dispatcher is a phone-first public demo for network resilience planning. It helps users see how an advisory system can monitor live network conditions, simulate outages, compare fallback paths, and record incident decisions in a way that is understandable in under one minute.

The current release is designed for public demonstration, testing, and resilience planning. It does not replace 911, FirstNet, GMDSS, VHF, AIS, EPIRB, certified dispatch systems, carrier infrastructure, or official emergency procedures. The demo does not perform OS-level network switching. It shows how a future failover advisory layer could evaluate conditions and recommend safer communication paths during degraded connectivity.

## What the demo shows

A user opens the app on a phone, taps **Arm Dispatcher**, and sees live network-health signals from browser-visible endpoints. The dispatcher displays transport cards for WiFi, cellular, LoRa, Tor, and satellite-style paths. WiFi and cellular use real browser-visible signal behavior where available. LoRa, Tor, and satellite are clearly labeled as simulated unless connected to a verified live feed.

The user can inject a scenario such as an ISP outage, power loss, cellular degradation, DNS disruption, hurricane-style connectivity loss, off-grid LoRa/Satellite fallback, or marine dead-in-water advisory mode. The dispatcher then ranks available fallback paths and presents a clear recommendation prompt with a large **YES, take over** control, a smaller **NO** option, and a 10-second auto-cancel countdown.

Every decision is logged with a timestamp, scenario trigger, health state, recommendation, user choice, and plain-language incident summary. The incident history can be reviewed and exported as JSON for demos, planning discussions, or future technical review.

## Why it matters

Connectivity failures are hard to explain until people can see them. SkyGrid Dispatcher turns network resilience into a simple visual workflow: measure the signal, simulate the failure, recommend a fallback, confirm the decision, and preserve the incident record. That makes it easier for communities, builders, infrastructure partners, and emergency-planning teams to discuss resilience without needing to understand the entire technical stack first.

## Public safety guidance

**Advisory / Simulation Mode.** SkyGrid helps evaluate network health and recommend fallback paths. It is not certified emergency infrastructure and does not replace 911, FirstNet, GMDSS, VHF, AIS, EPIRB, or official emergency procedures.

For marine scenarios, official maritime distress and safety systems should be used first whenever available. SkyGrid Marine only supports connectivity triage and incident snapshot preparation.

## Current product direction

The public demo is built to stay transparent, safe, and easy to understand. Simulated transports remain visibly labeled. Recommendation prompts require user confirmation. Incident logs preserve decision context. Future enhancements may include marine presets, local daemon integrations, real LoRa and satellite gateway feeds, expanded resilience analytics, on-device advisory agents, and shareable private or public demo sessions.

SkyGrid Dispatcher is an early public demonstration of infrastructure intelligence for resilient connectivity: a practical way to show what happens when networks degrade and how advisory failover planning could help people make clearer decisions under pressure.
