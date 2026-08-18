import { gradeCalibration, pickCalibrationTarget } from './calibration.mjs';

const button = document.getElementById('calibration-button');
const targetEl = document.getElementById('calibration-target');
const resultEl = document.getElementById('calibration-result');
const statusEl = document.getElementById('calibration-status');
const scoreEl = document.getElementById('calibration-score');

let target = pickCalibrationTarget();

targetEl.textContent = target;

function setStatus(message) {
  statusEl.textContent = message;
}

function setResult(result, rawObserved) {
  const similarityPercent = Math.round(result.similarity * 100);
  const browser = result.browserConfidence == null ? 'n/a' : result.browserConfidence.toFixed(2);
  scoreEl.textContent = `${result.score}/5`;
  resultEl.textContent = `Read: “${rawObserved}” · match ${similarityPercent}% · browser confidence ${browser}`;
  setStatus(result.score >= 4 ? 'Calibrated' : 'Calibration needs another read');
}

button.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setStatus('Speech recognition unsupported');
    return;
  }

  target = pickCalibrationTarget();
  targetEl.textContent = target;
  scoreEl.textContent = '—/5';
  resultEl.textContent = 'Say the displayed phrase exactly once.';
  setStatus('Listening for calibration');
  button.disabled = true;

  const read = new SpeechRecognition();
  read.continuous = false;
  read.interimResults = false;
  read.maxAlternatives = 1;
  read.lang = navigator.language || 'en-US';

  read.onresult = (event) => {
    const alternative = event.results?.[0]?.[0];
    const observed = alternative?.transcript?.trim() || '';
    const confidence = alternative?.confidence ?? 0;
    setResult(gradeCalibration(target, observed, confidence), observed || '(no transcript)');
  };

  read.onerror = (event) => {
    setStatus(`Calibration error: ${event.error || 'unknown'}`);
    resultEl.textContent = 'No calibration score recorded.';
  };

  read.onend = () => {
    button.disabled = false;
    if (statusEl.textContent === 'Listening for calibration') setStatus('No read returned');
  };

  try {
    read.start();
  } catch (error) {
    button.disabled = false;
    setStatus(`Could not start calibration: ${error.message}`);
  }
});
