import test from 'node:test';
import assert from 'node:assert/strict';
import { planAutoDrillPaidUse } from '../lib/autodrill-paid-use-plan.mjs';

const candidate={region:'us-west-2',provider:'aws',offer_id:'offer-001',resource_class:'compute',latency_ms:40,health_score:99,pnpk_preflight_decision:'ROUTE_APPROVED',pnpk_receipt_hash:'sha256:'+'a'.repeat(64),owner_agreement_status:'approved_pending_activation',activation_grant_present:true};
test('unmetered planning candidate cannot become activation eligible',()=>{const r=planAutoDrillPaidUse({candidates:[candidate]});assert.equal(r.selected.length,1);assert.equal(r.selected[0].activation_eligible,false);assert.equal(r.selected[0].billing_status,'UNVERIFIED');assert.equal(r.execution.payment_execution_allowed,false);assert.equal(r.billing.continuation_recommended,false);});
test('untrusted billing data blocks paid-use recommendation',()=>{const r=planAutoDrillPaidUse({candidates:[candidate],leaseUse:{usage:[{payload:{usage_id:'made-up'},signature:'made-up'}]}});assert.equal(r.billing.status,'BLOCKED');assert.equal(r.selected[0].continuation_recommended,false);});
