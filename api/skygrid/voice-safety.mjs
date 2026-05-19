const VERSION = '1.3.3-voice-safety';
const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: true,
    status: 'ready',
    service: 'SKYGRID Voice Interaction Safety',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    commander_call_sign: 'MVP',
    runtime_primary: true,
    static_primary: false,
    generated_at: new Date().toISOString(),
    safety_posture: {
      voice_control_is_optional: true,
      voice_only_identity_allowed: false,
      shutdown_available: true,
      default_mode: 'listen-only-until-consent',
      safe_fallback: 'text-and-button-controls'
    },
    controls: {
      disable_voice_command: 'SKYGRID, voice off',
      emergency_mute_command: 'SKYGRID, mute now',
      restore_voice_command: 'SKYGRID, voice on',
      manual_shutdown_required: true,
      remote_forced_activation_allowed: false
    },
    guardrails: [
      'Voice interaction must be opt-in and visibly controllable.',
      'The user must be able to shut voice interaction off at any time.',
      'Voice alone is not sufficient for identity verification.',
      'No always-on hidden recording.',
      'No emergency escalation based only on ambiguous voice input.',
      'Text and button controls must remain available when voice is disabled.'
    ],
    implementation_notes: [
      'Persist voice_enabled=false when the user disables voice.',
      'Expose a visible mute/off control in the UI.',
      'Require explicit user confirmation before turning voice back on.',
      'Log only safety state transitions, not raw private speech content.'
    ]
  }, null, 2));
}
