import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import { reconcileAutoDrillLeaseUse, canonicalPayload } from '../lib/autodrill-lease-use.mjs';

const NOW=Date.parse('2026-10-04T09:30:00Z'),OWNER='michael-vincent-patrick',HASH='sha256:'+'a'.repeat(64);
const roles=['lease','usage','invoice','settlement','owner_payout'];
const key=generateKeyPairSync('ed25519');
const trustedKeys=Object.fromEntries(roles.map(role=>[role,{test:{publicKey:key.publicKey.export({type:'spki',format:'pem'}),revoked:false,validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-11-01T00:00:00Z'}}]));
const envelope=(role,payload)=>({key_id:'test',payload:{schema:'skygrid.autodrill-'+role+'.v1',verified_at:'2026-10-04T09:29:00Z',...payload},signature:sign(null,Buffer.from(canonicalPayload({schema:'skygrid.autodrill-'+role+'.v1',verified_at:'2026-10-04T09:29:00Z',...payload})),key.privateKey).toString('base64')});
function data({paid='10000',partner=false}={}){
  const owner=partner?'partner-001':OWNER;
  return {
    leases:[envelope('lease',{lease_id:'lease-001',offer_id:'offer-001',software_owner_id:OWNER,capacity_owner_id:owner,partnership_agreement_id:partner?'agreement-001':null,starts_at:'2026-10-04T08:00:00Z',ends_at:'2026-10-05T08:00:00Z',commercial_model:'shared_capacity_revenue_share',upfront_capacity_cost_cents:'0',skygrid_fee_bps:350,capacity_owner_share_bps:9650,pnpk_decision:'ROUTE_APPROVED',pnpk_receipt_hash:HASH,owner_agreement_hash:HASH,rates_cents:{validation:'100'}})],
    usage:[envelope('usage',{usage_id:'use-001',lease_id:'lease-001',offer_id:'offer-001',service_class:'validation',starts_at:'2026-10-04T08:30:00Z',ends_at:'2026-10-04T09:00:00Z',units:'100',pnpk_receipt_hash:HASH})],
    invoices:[envelope('invoice',{invoice_id:'invoice-001',lease_id:'lease-001',usage_id:'use-001',currency:'USD',amount_cents:'10000',due_at:'2026-10-04T09:10:00Z'})],
    settlements:paid==='0'?[]:[envelope('settlement',{settlement_id:'settled-001',source_reference_hash:HASH,invoice_id:'invoice-001',lease_id:'lease-001',rail:'bancorp',currency:'USD',amount_cents:paid,status:'posted',beneficiary_id:OWNER,posted_at:'2026-10-04T09:15:00Z'})],
    owner_payouts:[]
  };
}
const run=(input,opts={})=>reconcileAutoDrillLeaseUse(input,{trustedKeys,now:NOW,...opts});
test('settled own-capacity usage attributes all receipts to sole owner without partner payout',()=>{const r=run(data());assert.equal(r.status,'RECONCILED');assert.equal(r.rows[0].payment_status,'PAID');assert.equal(r.rows[0].skygrid_share_cents,'350');assert.equal(r.rows[0].capacity_owner_share_cents,'9650');assert.equal(r.rows[0].mvp_attributable_cents,'10000');assert.equal(r.rows[0].owner_payout_status,'SAME_OWNER_NO_EXTERNAL_PARTNER');assert.equal(r.execution_allowed,false);});
test('unpaid usage is overdue and recommends holding further billable use',()=>{const r=run(data({paid:'0'}));assert.equal(r.rows[0].payment_status,'UNPAID');assert.equal(r.rows[0].overdue,true);assert.equal(r.rows[0].continuation_recommended,false);assert.equal(r.totals.received_cents,'0');});
test('partial payment does not claim fully paid use',()=>{const r=run(data({paid:'5000'}));assert.equal(r.rows[0].payment_status,'PARTIALLY_PAID');assert.equal(r.rows[0].unpaid_cents,'5000');assert.equal(r.rows[0].continuation_recommended,false);});
test('partner requires an independently configured matching agreement',()=>{assert.equal(run(data({partner:true})).status,'BLOCKED');const r=run(data({partner:true}),{partnerships:{'partner-001':{agreement_id:'agreement-001',owner_agreement_hash:HASH}}});assert.equal(r.rows[0].owner_payout_status,'PENDING');assert.equal(r.rows[0].mvp_attributable_cents,'350');});
test('empty input remains unknown',()=>{const r=run({});assert.equal(r.status,'UNVERIFIED');assert.equal(r.totals.received_cents,'0');});
for(const [name,mutate] of [
 ['tampered amount',d=>{d.settlements[0].payload.amount_cents='20000';}],
 ['unsigned evidence',d=>{delete d.settlements[0].signature;}],
 ['duplicate usage',d=>{d.usage.push(d.usage[0]);}],
 ['duplicate settlement',d=>{d.settlements.push(d.settlements[0]);}],
 ['wrong invoice amount',d=>{d.invoices=[envelope('invoice',{...d.invoices[0].payload,amount_cents:'20000'})];}],
 ['wrong lease payment',d=>{d.settlements=[envelope('settlement',{...d.settlements[0].payload,lease_id:'wrong'})];}],
 ['unapproved billing rail',d=>{d.settlements=[envelope('settlement',{...d.settlements[0].payload,rail:'stripe'})];}],
 ['stale settlement evidence',d=>{d.settlements=[envelope('settlement',{...d.settlements[0].payload,verified_at:'2026-10-01T00:00:00Z'})];}],
 ['future usage',d=>{d.usage=[envelope('usage',{...d.usage[0].payload,ends_at:'2026-10-04T12:00:00Z'})];}],
 ['wrong PNPK receipt',d=>{d.usage=[envelope('usage',{...d.usage[0].payload,pnpk_receipt_hash:'sha256:'+'b'.repeat(64)})];}],
 ['upfront capacity rent',d=>{d.leases=[envelope('lease',{...d.leases[0].payload,upfront_capacity_cost_cents:'100'})];}],
 ['changed software owner',d=>{d.leases=[envelope('lease',{...d.leases[0].payload,software_owner_id:'unknown'})];}]
 ,['zero service rate',d=>{d.leases=[envelope('lease',{...d.leases[0].payload,rates_cents:{validation:'0'}})];d.invoices=[envelope('invoice',{...d.invoices[0].payload,amount_cents:'0'})];d.settlements=[];}]
 ,['duplicate offer assignment',d=>{d.leases.push(envelope('lease',{...d.leases[0].payload,lease_id:'lease-002'}));}]
])test('fails closed for '+name,()=>{const d=data();mutate(d);const r=run(d);assert.equal(r.status,'BLOCKED');assert.equal(r.totals.received_cents,'0');assert.equal(r.continuation_recommended,false);});
test('missing verifier keys and revoked key both block',()=>{assert.equal(run(data(),{trustedKeys:{}}).status,'BLOCKED');const keys=structuredClone(trustedKeys);keys.settlement.test.revoked=true;assert.equal(run(data(),{trustedKeys:keys}).status,'BLOCKED');});
test('reversed payment removes paid recognition',()=>{const d=data();d.settlements=[envelope('settlement',{...d.settlements[0].payload,status:'reversed'})];const r=run(d);assert.equal(r.rows[0].payment_status,'UNPAID');assert.equal(r.rows[0].continuation_recommended,false);});
