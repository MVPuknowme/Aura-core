import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

app.get('/', (req, res) => {
  res.send('<h2>Express on localhost:3000</h2>');
});

app.get('/eth-dashboard', (req, res) => {
  res.send(`
    <main style="font-family: system-ui; padding: 2rem;">
      <h1>SkyGrid ETH Dashboard</h1>
      <p>Status: local staging</p>
      <p>Wallet connection: manual-signing only</p>
      <p>Validator lane: AWS-ready / transfer-not-executed</p>
    </main>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'SkyGrid ETH Dashboard',
    mode: 'local-staging',
    walletPolicy: 'manual-signing-only',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Running at http://localhost:${PORT}`);
});
