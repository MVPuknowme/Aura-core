import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const calibrationUi = await readFile(new URL('./calibration-ui.mjs', import.meta.url), 'utf8');
const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

test('Speak master power fails closed on startup', () => {
  assert.match(app, /let masterEnabled = false;/);
  assert.match(app, /setMasterEnabled\(false\);/);
  assert.doesNotMatch(app, /setMasterEnabled\(true\);/);
});

test('calibration starts blocked without trusting a DOM enable signal', () => {
  assert.match(calibrationUi, /let masterEnabled = false;/);
  assert.doesNotMatch(calibrationUi, /dataset\.speakEnabled === 'true'/);
});

test('initial UI advertises the disabled state', () => {
  assert.match(html, /id="master-status"[^>]*>Off<\/span>/);
  assert.match(html, /id="master-toggle"[^>]*aria-checked="false"/);
  assert.match(html, /id="master-state">OFF<\/strong>/);
  assert.match(html, /Speak stays OFF while the approval service is unavailable/);
});
