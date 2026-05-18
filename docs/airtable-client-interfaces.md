# Airtable Client Interface Options

This document defines the supported Airtable integration approaches for SkyGrid / Aura-Core. It prevents the system from confusing Airtable AI, Airtable scripting, the Airtable REST API, and external automation tools.

## Purpose

SkyGrid uses Airtable as an operational data layer for route maps, packet tests, income projections, wallet tracking, node ledgers, payout logs, proof records, and device onboarding state.

The correct client must be selected based on where the work runs:

- inside Airtable
- inside Airtable scripting/automation
- from an external API client
- from a third-party automation runner
- from ChatGPT through the connected Airtable MCP/table client

## Supported approaches

| Approach | Supported role | Notes |
| --- | --- | --- |
| Airtable AI block inside the base | In-base AI assistance | Officially supported inside Airtable. Use prompts for summarization, automation support, record enrichment, and structured field generation inside the base. |
| Airtable Scripts / Scripting app | In-Airtable scripting and automation | Node.js-style scripting inside Airtable. Use for CRUD workflows, record transforms, field cleanup, automation actions, and controlled table maintenance. |
| External GPT / API + Airtable REST API | External intelligence and backend automation | Works through Airtable API credentials. This is not Airtable AI. The external service must handle moderation, consent checks, proof logging, and business logic before writing to Airtable. |
| Zapier / Make / n8n + GPT | No-code/low-code orchestration | Useful for automating GPT decisions and pushing results into Airtable through official connectors. Similar limitation: it is external automation, not Airtable AI running inside the base. |
| ChatGPT connected Airtable MCP/table client | Conversation-to-Airtable operational updates | Use for reading base/table schemas, listing records, creating records, updating records, and saving structured project information from operator conversations. Writes require field IDs through this connector. |

## Client selection rules

```yaml
client_selection:
  airtable_ai_block:
    use_when:
      - prompt_runs_inside_airtable
      - summarize_attachments_or_records
      - enrich_fields_from_existing_table_data
    do_not_use_when:
      - external_backend_needs_api_control
      - kafka_or_web3_event_generation_is_required
      - secrets_or_credentials_are_needed

  airtable_scripts:
    use_when:
      - transform_records_inside_airtable
      - create_or_update_records_from_airtable_automation
      - run_lightweight_node_style_scripts
    do_not_use_when:
      - long_running_backend_worker_required
      - external_kafka_or_web3_socket_required_without_bridge

  external_gpt_api_airtable_rest:
    use_when:
      - external_moderation_required
      - device_onboarding_backend_required
      - consent_and_proof_logic_required
      - sentinel_or_kafka_bridge_required
    do_not_use_when:
      - calling_it_airtable_ai
      - storing_secrets_in_records

  zapier_make_n8n_gpt:
    use_when:
      - simple_cross_app_automation_required
      - form_submission_to_airtable_required
      - notifications_or_status_updates_required
    do_not_use_when:
      - strict_low_latency_failover_required
      - private_keys_or_sensitive_credentials_would_be_exposed

  chatgpt_airtable_mcp:
    use_when:
      - operator_wants_chatgpt_to_save_project_data
      - base_schema_needs_analysis
      - route_map_or_packet_tests_need_refill
    do_not_use_when:
      - direct_live_network_control_required
      - secrets_or_wallet_keys_would_be_written
```

## SkyGrid implementation posture

```yaml
skygrid_airtable_posture:
  base_id: appUF24vYBBQnpeQl
  primary_tables:
    - Route Map
    - SkyGrid Packet Tests
    - Income Dashboard
    - Wallet Assets
    - Sun Pay Node Ledger
    - Sun Pay Payout Logs
  active_chat_client: Airtable MCP direct table client
  external_backend_client: Airtable REST API or SDK
  in_base_ai_client: Airtable AI block
  no_code_client: Zapier / Make / n8n
```

## Safety boundaries

```yaml
safety_boundaries:
  never_store:
    - private_keys
    - seed_phrases
    - raw_api_tokens
    - full_bank_details
    - private_user_files
    - unmasked_credentials
  allowed_refs:
    - masked_wallet_reference
    - secret_name_reference
    - github_run_id
    - postman_collection_name
    - proof_reference
    - airtable_record_id
  claims_policy:
    projected: estimates_or_models_only
    pending: waiting_for_logs_or_confirmation
    usable: validated_enough_for_internal_tracking
    verified: backed_by_external_logs_or_signed_records
```

## Recommended SkyGrid architecture

```text
Website / form / operator conversation
        |
        v
Consent and privacy check
        |
        v
External GPT/Aura or Airtable AI block, depending on runtime
        |
        v
Airtable MCP or Airtable REST API
        |
        v
Route Map / Packet Tests / Node Ledger / Proof Logs
        |
        v
Kafka / Sentinel / Web3 event bridge, only after policy approval
```

## Key rule

Do not call an external GPT client "Airtable AI." If the AI is not running inside Airtable, describe it as:

```text
External GPT/Aura client using the Airtable REST API or connected Airtable MCP/table client.
```

## Implementation status

```yaml
implementation_status:
  documentation: added
  airtable_route_records: recommended
  live_backend_client: pending
  airtable_ai_block_prompt: pending_in_airtable_ui
  scripts_app_template: pending
  external_api_client_template: pending
  zapier_make_n8n_recipe: pending
```
