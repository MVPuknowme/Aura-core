export const CALIBRATION_TARGETS = Object.freeze([
  'Aura calibration one two three',
  'Orange sky seven ready',
  'Signal check ready now',
  'Speak control test five'
]);

export function normalizeCalibrationText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshteinDistance(left, right) {
  const a = normalizeCalibrationText(left);
  const b = normalizeCalibrationText(right);

  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

export function calibrationSimilarity(target, observed) {
  const expected = normalizeCalibrationText(target);
  const actual = normalizeCalibrationText(observed);
  const longest = Math.max(expected.length, actual.length);
  if (!longest) return 1;
  return Math.max(0, 1 - (levenshteinDistance(expected, actual) / longest));
}

export function confidenceScore(composite) {
  const value = Math.max(0, Math.min(1, Number(composite) || 0));
  if (value >= 0.92) return 5;
  if (value >= 0.78) return 4;
  if (value >= 0.60) return 3;
  if (value >= 0.40) return 2;
  return 1;
}

export function gradeCalibration(target, observed, browserConfidence = 0) {
  const similarity = calibrationSimilarity(target, observed);
  const parsedConfidence = Number(browserConfidence);
  const usableBrowserConfidence = Number.isFinite(parsedConfidence) && parsedConfidence > 0
    ? Math.max(0, Math.min(1, parsedConfidence))
    : null;

  const composite = usableBrowserConfidence == null
    ? similarity
    : (similarity * 0.8) + (usableBrowserConfidence * 0.2);

  return {
    target: normalizeCalibrationText(target),
    observed: normalizeCalibrationText(observed),
    similarity,
    browserConfidence: usableBrowserConfidence,
    composite,
    score: confidenceScore(composite)
  };
}

export function pickCalibrationTarget(randomValue = Math.random()) {
  const safe = Number.isFinite(Number(randomValue)) ? Number(randomValue) : 0;
  const bounded = Math.max(0, Math.min(0.999999, safe));
  return CALIBRATION_TARGETS[Math.floor(bounded * CALIBRATION_TARGETS.length)];
}
