import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('health endpoint identifies the standalone program as Speak', async () => {
  const port = 18081;
  const child = spawn(process.execPath, ['apps/speak/dev-server.mjs'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    let response;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/health`);
        if (response.ok) break;
      } catch {
        await delay(50);
      }
    }

    assert.ok(response?.ok, 'Speak dev server did not become healthy');
    const health = await response.json();
    assert.deepEqual(health, { ok: true, app: 'speak', port });
  } finally {
    child.kill('SIGTERM');
  }
});
