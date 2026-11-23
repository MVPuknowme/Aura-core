import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { preflightTransaction, verifyReceipt } from '../lib/pnpk-transaction-preflight.mjs';

const A='0x'+'1'.repeat(40), B='0x'+'2'.repeat(40), T='0x'+'3'.repeat(40);
const BLOCK='0x'+'a'.repeat(64), NOW=1791100000000;
const word=n=>BigInt(n).toString(16).padStart(64,'0');
const addressWord=a=>a.slice(2).padStart(64,'0');
const code='0x6000';
const policy={chainId:'0x1',maxNativeValueWei:'100',recipients:[B],spenders:[B],tokens:{[T]:{codeSha256:createHash('sha256').update(code).digest('hex'),maxTransferUnits:'100',maxApprovalUnits:'100'}},receiptTtlSeconds:60,maxBlockAgeSeconds:120};
const native={chainId:'0x1',from:A,to:B,value:'0x5',data:'0x',gas:'0x5208'};
const transfer={...native,to:T,value:'0x0',data:'0xa9059cbb'+addressWord(B)+word(5),gas:'0x186a0'};
const approve={...transfer,data:'0x095ea7b3'+addressWord(B)+word(5)};
function provider(options={}) {
  const methods=[];
  const rpc=async(method,params)=>{
    methods.push(method);
    assert.ok(['eth_chainId','eth_getBlockByNumber','eth_getCode','eth_call','eth_simulateV1'].includes(method),'read-only RPC');
    if(options.error) throw new Error('secret-provider-url');
    if(method==='eth_chainId')return options.chain??'0x1';
    if(method==='eth_getBlockByNumber')return {number:'0x10',hash:options.reorg&&params[0]==='0x10'?'0x'+'b'.repeat(64):BLOCK,timestamp:'0x'+Math.floor((NOW-(options.stale?300000:0))/1000).toString(16)};
    if(method==='eth_getCode')return options.contractSender&&params[0]===A?'0x6001':params[0]===T?(options.code??code):'0x';
    if(method==='eth_call')return '0x'+word(params[0].data.startsWith('0xdd62ed3e')?(options.existingAllowance??0):params[0].data.includes(addressWord(B))?10:100);
    if(method==='eth_simulateV1'){
      const calls=params[0].blockStateCalls[0].calls;
      assert.equal(params[0].traceTransfers,true);
      assert.equal(params[0].validation,false);
      assert.equal(params[0].blockStateCalls[0].stateOverrides,undefined);
      if(options.malformed)return [];
      const isApproval=calls[0].data.startsWith('0x095ea7b3');
      const logs=[{address:calls[0].data==='0x'?'0x'+'e'.repeat(40):T,topics:[isApproval?'0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925':'0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef','0x'+addressWord(A),'0x'+addressWord(options.evilEvent?T:B)],data:'0x'+word(5)}];
      return [{calls:calls.map((c,i)=>({status:options.revert&&i===0?'0x0':'0x1',gasUsed:'0x5208',returnData:i===0?'0x':'0x'+word(i===2?(isApproval?(options.approvalBalance??100):(options.recipientAfter??15)):(options.after??(isApproval?5:95))),logs:i===0?(options.noLogs?[]:logs):[]}))}];
    }
  };
  return {rpc,methods};
}
async function run(transaction=native,opts={},p=policy){const r=provider(opts);let clockCalls=0;return {receipt:await preflightTransaction({transaction,policy:p,rpc:r.rpc,now:()=>NOW+(opts.expire&&clockCalls++?61000:0)}),methods:r.methods};}

test('native transfer passes policy with no execution authority',async()=>{const {receipt:r}=await run();assert.equal(r.decision,'PREFLIGHT_PASSED');assert.equal(r.execution_allowed,false);assert.equal(r.simulation.validation,false);assert.equal(verifyReceipt(r,native,policy,NOW),true);});
test('ERC20 transfer verifies exact owner balance change',async()=>{const {receipt:r}=await run(transfer);assert.equal(r.decision,'PREFLIGHT_PASSED');assert.equal(r.observed.balance_delta_units,'-5');});
test('finite approval verifies resulting allowance',async()=>{assert.equal((await run(approve)).receipt.decision,'PREFLIGHT_PASSED');});
for(const [name,tx,options,p] of [
  ['unknown native recipient',{...native,to:T},{},policy],
  ['native amount over limit',{...native,value:'0x65'},{},policy],
  ['unlimited approval',{...approve,data:'0x095ea7b3'+addressWord(B)+'f'.repeat(64)},{},policy],
  ['unexpected balance drain',transfer,{after:0},policy],
  ['recipient undercredited',transfer,{recipientAfter:14},policy],
  ['native transfer evidence missing',native,{noLogs:true},policy],
  ['unexpected allowance',approve,{after:50},policy],
  ['approval drains owner balance',approve,{approvalBalance:50},policy],
  ['approval event missing',approve,{noLogs:true},policy],
  ['unexpected transfer event',transfer,{evilEvent:true},policy],
  ['contract sender',native,{contractSender:true},policy],
  ['token bytecode changed',transfer,{code:'0x6001'},policy],
  ['unapproved spender',{...approve,data:'0x095ea7b3'+addressWord(T)+word(5)},{},policy],
  ['nonzero approval replacement',approve,{existingAllowance:10},policy],
  ['wrong chain',native,{chain:'0xa'},policy],
  ['reverted simulation',native,{revert:true},policy],
  ['malformed simulation',native,{malformed:true},policy],
  ['stale block',native,{stale:true},policy],
  ['block reorganization',native,{reorg:true},policy],
  ['receipt expires during simulation',native,{expire:true},policy],
  ['provider failure',native,{error:true},policy],
  ['unknown calldata',{...transfer,data:'0xdeadbeef'},{},policy],
  ['extra transaction fields',{...native,nonce:'0x1'},{},policy],
  ['missing code pin',transfer,{}, {...policy,tokens:{[T]:{maxTransferUnits:'100',maxApprovalUnits:'100'}}}],
  ['unsafe policy',native,{}, {...policy,receiptTtlSeconds:0}],
  ['missing policy',native,{}, {}]
])test('blocks '+name,async()=>{const {receipt:r}=await run(tx,options,p);assert.equal(r.decision,'BLOCKED');assert.equal(r.execution_allowed,false);assert.ok(r.failures.length);assert.ok(!JSON.stringify(r).includes('secret-provider-url'));});
test('receipt rejects changed transaction, policy, expiration and tampering',async()=>{const {receipt:r}=await run();assert.equal(verifyReceipt(r,{...native,value:'0x6'},policy,NOW),false);assert.equal(verifyReceipt(r,native,{...policy,maxNativeValueWei:'200'},NOW),false);assert.equal(verifyReceipt(r,native,policy,NOW+60000),false);assert.equal(verifyReceipt({...r,execution_allowed:true},native,policy,NOW),false);});
