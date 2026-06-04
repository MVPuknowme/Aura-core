export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    status: "online",
    service: "SKYGRID Emergency Data On-Ramp",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    public_runtime: true,
    payment_execution: false,
    device_activation: false,
    production_failover: false,
    private_data_movement: false,
    runtime: "vercel",
    generated_at: new Date().toISOString()
  });
}
