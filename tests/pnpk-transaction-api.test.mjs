import assert from 'node:assert/strict';
import test from 'node:test';
import { createTransactionPreflightHandler } from '../api/skygrid/transaction-preflight.mjs';
function res(){return {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};}
test('API requires server-configured authentication',async()=>{const r=res();await createTransactionPreflightHandler({env:{PNPK_PREFLIGHT_API_TOKEN:'a'.repeat(32)}})({method:'POST',headers:{},body:{}},r);assert.equal(r.statusCode,401);});
test('API refuses unconfigured service',async()=>{const r=res();await createTransactionPreflightHandler({env:{}})({method:'POST',headers:{},body:{}},r);assert.equal(r.statusCode,503);});
test('API rejects caller-supplied policy and provider',async()=>{const r=res();const token='a'.repeat(32);await createTransactionPreflightHandler({env:{PNPK_PREFLIGHT_API_TOKEN:token}})({method:'POST',headers:{authorization:'Bearer '+token},body:{transaction:{},policy:{},rpcUrl:'https://evil.example'}},r);assert.equal(r.statusCode,400);});
test('API returns blocked receipt when simulation config missing',async()=>{const r=res();const token='a'.repeat(32);await createTransactionPreflightHandler({env:{PNPK_PREFLIGHT_API_TOKEN:token}})({method:'POST',headers:{authorization:'Bearer '+token},body:{transaction:{}}},r);assert.equal(r.statusCode,503);assert.equal(r.body.execution_allowed,false);});
test('API refuses GET',async()=>{const r=res();await createTransactionPreflightHandler({env:{}})({method:'GET',headers:{}},r);assert.equal(r.statusCode,405);});
test('API evaluates native transfer through JSON-RPC transport end to end',async()=>{
  const from='0x'+'1'.repeat(40),to='0x'+'2'.repeat(40),hash='0x'+'a'.repeat(64),token='a'.repeat(32);
  const policy={chainId:'0x1',maxNativeValueWei:'100',recipients:[to],spenders:[],tokens:{},receiptTtlSeconds:60,maxBlockAgeSeconds:120};
  const methods=[];
  const fetchImpl=async(_,opts)=>{
    const q=JSON.parse(opts.body);methods.push(q.method);let result;
    if(q.method==='eth_chainId')result='0x1';
    else if(q.method==='eth_getBlockByNumber')result={hash,number:'0x10',timestamp:'0x'+Math.floor(Date.now()/1000).toString(16)};
    else if(q.method==='eth_getCode')result='0x';
    else if(q.method==='eth_simulateV1')result=[{calls:[{status:'0x1',gasUsed:'0x5208',returnData:'0x',logs:[{address:'0x'+'e'.repeat(40),topics:['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef','0x'+from.slice(2).padStart(64,'0'),'0x'+to.slice(2).padStart(64,'0')],data:'0x'+'5'.padStart(64,'0')}]}]}];
    else assert.fail('unexpected RPC');
    return new Response(JSON.stringify({jsonrpc:'2.0',id:q.id,result}));
  };
  const r=res();await createTransactionPreflightHandler({env:{PNPK_PREFLIGHT_API_TOKEN:token,PNPK_TRANSACTION_POLICY_JSON:JSON.stringify(policy),PNPK_SIMULATION_RPC_URL:'https://rpc.example'},fetchImpl})({method:'POST',headers:{authorization:'Bearer '+token},body:{transaction:{chainId:'0x1',from,to,value:'0x5',gas:'0x5208',data:'0x'}}},r);
  assert.equal(r.statusCode,200);assert.equal(r.body.decision,'PREFLIGHT_PASSED');assert.equal(r.body.execution_allowed,false);assert.ok(methods.includes('eth_simulateV1'));
});
