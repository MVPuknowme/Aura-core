export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    status: "online",
    service: "SKYGRID Emergency Data On-Ramp",
    route: "/api/stripe/device-link",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    stripe_mode: "test_or_disabled",
    livemode: false,
    payment_execution: false,
    device_activation: false,
    runtime: "vercel",
    generated_at: new Date().toISOString()
  });
}
