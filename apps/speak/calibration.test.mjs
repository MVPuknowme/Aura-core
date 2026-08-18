import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calibrationSimilarity,
  confidenceScore,
  gradeCalibration,
  normalizeCalibrationText,
  pickCalibrationTarget
} from './calibration.mjs';

test('normalizes punctuation and case', () => {
  assert.equal(normalizeCalibrationText(' Aura, CALIBRATION!  One '), 'aura calibration one');
});

test('exact known-target read scores 5 of 5', () => {
  const result = gradeCalibration('Aura calibration one two three', 'Aura calibration one two three', 0.95);
  assert.equal(result.score, 5);
  assert.equal(result.similarity, 1);
});

test('minor recognition drift remains below exact confidence', () => {
  const similarity = calibrationSimilarity('Signal check ready now', 'Signal check ready');
  assert.ok(similarity > 0.7 && similarity < 1);
  assert.ok([3, 4].includes(confidenceScore(similarity)));
});

test('unrelated phrase scores low even with browser confidence', () => {
  const result = gradeCalibration('Orange sky seven ready', 'Turn the lights on', 0.99);
  assert.ok(result.score <= 2);
});

test('target selection is deterministic for supplied random value', () => {
  assert.equal(pickCalibrationTarget(0), 'Aura calibration one two three');
  assert.equal(pickCalibrationTarget(0.99), 'Speak control test five');
});
