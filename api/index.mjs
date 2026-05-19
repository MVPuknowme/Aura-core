export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true, powered_by: 'Aura-Core', runtime_primary: true, static_primary: false }, null, 2));
}
