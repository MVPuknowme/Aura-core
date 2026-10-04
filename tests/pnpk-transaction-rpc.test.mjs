import assert from 'node:assert/strict';
import test from 'node:test';
import { createReadOnlyRpc } from '../lib/pnpk-transaction-rpc.mjs';
function response(body,status=200){return new Response(JSON.stringify(body),{status});}
test('transport only accepts the five read-only methods',async()=>{
  const rpc=createReadOnlyRpc({url:'https://rpc.example',fetchImpl:async(_,o)=>{const req=JSON.parse(o.body);return response({jsonrpc:'2.0',id:req.id,result:'0x1'});}});
  assert.equal(await rpc('eth_chainId',[]),'0x1');
  for(const method of ['eth_sendTransaction','eth_sendRawTransaction','eth_sign','personal_sign','eth_signTypedData_v4'])await assert.rejects(()=>rpc(method,[]),/rpc_method_blocked/);
});
test('rejects HTTP, credentials in URL and missing provider',()=>{for(const url of [undefined,'http://rpc.example','https://user:pass@rpc.example'])assert.throws(()=>createReadOnlyRpc({url}),/rpc_url_invalid/);});
for(const [name,payload] of [['wrong ID',{jsonrpc:'2.0',id:9,result:'0x1'}],['provider error',{jsonrpc:'2.0',id:1,error:{message:'secret'}}],['missing result',{jsonrpc:'2.0',id:1}]])test('transport blocks '+name,async()=>{await assert.rejects(()=>createReadOnlyRpc({url:'https://rpc.example',fetchImpl:async()=>response(payload)})('eth_chainId',[]),/rpc_response_invalid/);});
test('bounds response size',async()=>{await assert.rejects(()=>createReadOnlyRpc({url:'https://rpc.example',fetchImpl:async()=>new Response('x'.repeat(1048577))})('eth_chainId',[]),/rpc_response_too_large/);});
test('times out even if provider ignores AbortSignal',async()=>{await assert.rejects(()=>createReadOnlyRpc({url:'https://rpc.example',timeoutMs:10,fetchImpl:()=>new Promise(()=>{})})('eth_chainId',[]),/rpc_timeout/);});
