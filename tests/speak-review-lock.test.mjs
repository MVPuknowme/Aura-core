import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

function harness({ forged = false, throws = false } = {}) {
  const elements = new Map();
  const handlers = new Map();
  const events = [];
  const calls = { speak: 0, start: 0, abort: 0, stop: 0, cancel: 0 };
  const recognitions = [];
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', value: id === 'speech-text' ? 'speak hello' : '1', disabled: false,
      classList: { toggle() {}, add() {}, remove() {} },
      setAttribute(key, value) { this[key] = value; },
      addEventListener(name, fn) { this[name] = fn; },
      replaceChildren() {}, appendChild() {}, focus() {},
    });
    return elements.get(id);
  }
  const document = { getElementById: element, createElement: () => element('option'),
    documentElement: { dataset: { speakEnabled: forged ? 'true' : 'false' } } };
  class Recognition {
    constructor() { recognitions.push(this); }
    start() { calls.start++; }
    abort() { calls.abort++; if (throws) throw new Error('already ending'); }
    stop() { calls.stop++; if (throws) throw new Error('already ending'); }
  }
  const window = {
    SpeechRecognition: Recognition,
    SPEAK_APPROVALS: { medical: true, legal: true, consent: true },
    speechSynthesis: { getVoices: () => [],
      cancel() { calls.cancel++; if (throws) throw new Error('unavailable'); },
      speak() { calls.speak++; }, pause() {}, resume() {} },
    setTimeout() {},
    addEventListener(name, fn) { handlers.set(name, fn); },
    dispatchEvent(event) { events.push(event); handlers.get(event.type)?.(event); },
  };
  const context = { window, document, navigator: { language: 'en-US', clipboard: { writeText: async () => {} } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    SpeechSynthesisUtterance: class {},
    pickCalibrationTarget: () => 'test phrase', gradeCalibration: () => { throw new Error('must not grade'); } };
  function app() { runInNewContext(readFileSync(new URL('../apps/speak/app.js', import.meta.url), 'utf8'), context); }
  function calibration() {
    const source = readFileSync(new URL('../apps/speak/calibration-ui.mjs', import.meta.url), 'utf8');
    runInNewContext(source.replace(/^import .*;\n/, ''), context);
  }
  return { app, calibration, element, document, window, calls, events, recognitions };
}

test('all Speak activation controls stay closed despite local approval flags and forced clicks', async () => {
  const h = harness(); h.app(); h.calibration();
  h.element('master-toggle').click();
  assert.equal(h.document.documentElement.dataset.speakEnabled, 'false');
  for (const id of ['thought-toggle', 'action-button', 'speak-button', 'listen-button', 'calibration-button']) {
    h.element(id).disabled = false;
    await h.element(id).click();
  }
  assert.equal(h.calls.speak, 0);
  assert.equal(h.calls.start, 0);
  assert.equal(h.element('master-state').textContent, 'OFF');
  assert.match(h.element('master-status').textContent, /review/i);
});

test('calibration rejects forged dataset and master events even without app.js', () => {
  const h = harness({ forged: true }); h.calibration();
  h.window.dispatchEvent({ type: 'speak:master', detail: { enabled: true } });
  h.element('calibration-button').disabled = false;
  h.element('calibration-button').click();
  assert.equal(h.calls.start, 0);
  assert.equal(h.element('calibration-status').textContent, 'Off');
});

test('stop controls remain available and do not need approval', () => {
  const h = harness(); h.app();
  assert.equal(h.element('stop-button').disabled, false);
  assert.equal(h.element('stop-listen-button').disabled, false);
  const cancels = h.calls.cancel;
  h.element('stop-button').click();
  h.element('stop-listen-button').click();
  assert.ok(h.calls.cancel > cancels);
  assert.ok(h.calls.abort + h.calls.stop > 0);
});

test('termination errors cannot prevent OFF state and off-event delivery', () => {
  const h = harness({ throws: true });
  assert.doesNotThrow(() => h.app());
  assert.doesNotThrow(() => h.element('master-toggle').click());
  assert.equal(h.document.documentElement.dataset.speakEnabled, 'false');
  assert.equal(h.events.at(-1).detail.enabled, false);
  assert.doesNotThrow(() => h.element('stop-listen-button').click());
  assert.doesNotThrow(() => h.recognitions[0].onstart());
  assert.equal(h.element('stt-status').textContent, 'Off');
});
