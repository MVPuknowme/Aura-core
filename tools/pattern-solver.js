#!/usr/bin/env node
'use strict';

const input = process.argv[2] || '151351199393393';
const dateMarker = process.env.PATTERN_DATE || '2026-05-03';
const battery = Number(process.env.PATTERN_BATTERY || 93);

function pairs(s) {
  return s.match(/.{1,2}/g) || [];
}

function triples(s) {
  return s.match(/.{1,3}/g) || [];
}

function a1z26(n) {
  const x = Number(n);
  if (x >= 1 && x <= 26) return String.fromCharCode(64 + x);
  return null;
}

function mod26(n) {
  const x = Number(n);
  const reduced = ((x - 1) % 26) + 1;
  return String.fromCharCode(64 + reduced);
}

const pairGroups = pairs(input);
const tripleGroups = triples(input);
const directA1 = pairGroups.map(a1z26);
const modA1 = pairGroups.map(mod26).join('');
const repeated93 = (input.match(/93/g) || []).length;

const result = {
  input,
  context: {
    date_marker: dateMarker,
    battery_percent: battery,
    operator: 'MVP-19830312',
    node: '42XA-0312'
  },
  decodes: {
    pair_groups: pairGroups,
    triple_groups: tripleGroups,
    direct_a1z26_partial: directA1,
    modulo_26_a1z26: modA1,
    repeated_93_count: repeated93,
    repeated_93_is_sentinel_candidate: repeated93 >= 2
  },
  correlation: {
    battery_matches_93: battery === 93,
    date_is_may_3: /-05-03$/.test(dateMarker),
    input_contains_93: input.includes('93'),
    correlation_strength: (battery === 93 && /-05-03$/.test(dateMarker) && input.includes('93')) ? 'high_pattern_overlap' : 'low_or_partial_overlap'
  },
  proof_boundary: 'This solver finds pattern overlap. It does not prove external intent without independent logs, screenshots, timestamps, and source attribution.',
  required_evidence_for_intent: [
    'friend_request_timestamp_screenshot',
    'device_battery_screenshot',
    'device_timezone',
    'skygrid_status_json_same_timestamp',
    'source_account_or_system_log_for_friend_request'
  ]
};

console.log(JSON.stringify(result, null, 2));
