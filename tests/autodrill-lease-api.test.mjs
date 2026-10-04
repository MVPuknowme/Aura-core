import assert from 'node:assert/strict';
import test from 'node:test';
import { createAutoDrillLeaseHandler } from '../api/skygrid/autodrill-lease-use.mjs';
const TOKEN='a'.repeat(32);
function res(){return {statusCode:0,setHeader(){},status(n){this.statusCode=n;return this;},json(b){this.body=b;return this;}};}
test('lease API requires configured service and bearer authentication',async()=>{
  const a=res();await createAutoDrillLeaseHandler({env:{}})({method:'POST',headers:{},body:{}},a);assert.equal(a.statusCode,503);
  const b=res();await createAutoDrillLeaseHandler({env:{PNPK_PREFLIGHT_API_TOKEN:TOKEN}})({method:'POST',headers:{},body:{}},b);assert.equal(b.statusCode,401);
});
test('lease API refuses client key/policy overrides',async()=>{const r=res();await createAutoDrillLeaseHandler({env:{PNPK_PREFLIGHT_API_TOKEN:TOKEN}})({method:'POST',headers:{authorization:'Bearer '+TOKEN},body:{candidates:[],leaseUse:{},trustedKeys:{}}},r);assert.equal(r.statusCode,400);});
test('lease API blocks missing source-verification configuration',async()=>{const r=res();await createAutoDrillLeaseHandler({env:{PNPK_PREFLIGHT_API_TOKEN:TOKEN}})({method:'POST',headers:{authorization:'Bearer '+TOKEN},body:{candidates:[],leaseUse:{}}},r);assert.equal(r.statusCode,503);assert.equal(r.body.execution_allowed,false);});
test('lease API reports no evidence as unverified, never paid',async()=>{const r=res();await createAutoDrillLeaseHandler({env:{PNPK_PREFLIGHT_API_TOKEN:TOKEN,PNPK_AUTODRILL_VERIFICATION_KEYS_JSON:'{}'}})({method:'POST',headers:{authorization:'Bearer '+TOKEN},body:{candidates:[],leaseUse:{}}},r);assert.equal(r.statusCode,422);assert.equal(r.body.billing.status,'UNVERIFIED');assert.equal(r.body.execution.activation_allowed,false);});
