import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../scripts/pnpk-transaction-preflight.mjs';
test('CLI writes blocked receipt without provider and refuses overwrite',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'pnpk-test-'));
  try{
    const tx=join(dir,'tx.json'),policy=join(dir,'policy.json'),out=join(dir,'receipt.json');
    await writeFile(tx,JSON.stringify({chainId:'0x1',from:'0x'+'1'.repeat(40),to:'0x'+'2'.repeat(40),value:'0x5',data:'0x',gas:'0x5208'}));
    await writeFile(policy,JSON.stringify({chainId:'0x1',maxNativeValueWei:'100',recipients:['0x'+'2'.repeat(40)],spenders:[],tokens:{},receiptTtlSeconds:60,maxBlockAgeSeconds:120}));
    assert.equal(await main([tx,policy,out],{}),2);const r=JSON.parse(await readFile(out));assert.equal(r.decision,'BLOCKED');assert.deepEqual(r.failures,['provider_not_configured']);
    await assert.rejects(()=>main([tx,policy,out],{}),{code:'EEXIST'});
  }finally{await rm(dir,{recursive:true,force:true});}
});
