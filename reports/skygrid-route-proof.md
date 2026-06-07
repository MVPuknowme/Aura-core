# SKYGRID Route Proof

SKYGRID Emergency Data On-Ramp is running with:

- Fire lane routing
- Partitioned ramp/node policy
- Auto-Drill simulation
- Arbitrum Web3 quote/proof path
- Emergency on/off control
- Fail-closed security posture

Validation:
- skygrid:verify passed
- autodrill:sim passed
- partition routing passed
- unapproved ramp/node requests fail closed
- wallet signing, transaction broadcast, payment execution, and production failover are blocked

Production deployment: https://aura-core-9wrf13u1x-home-e539c0b1.vercel.app

Final trust model: PNPK is the traffic law. Aura-Core AI decides only inside PNPK law. SKYGRID opens gate-in/gate-out only when route is available, partitioned save space exists, owner approval is present, emergency operator approval is present, and approved leasee device-owner quorum agrees. Missing approval, missing quorum, unavailable route, unavailable space, or unsafe movement fails closed.
