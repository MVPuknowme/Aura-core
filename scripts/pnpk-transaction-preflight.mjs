import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { preflightTransaction } from '../lib/pnpk-transaction-preflight.mjs';
import { createReadOnlyRpc } from '../lib/pnpk-transaction-rpc.mjs';

export async function main(args=process.argv.slice(2),env=process.env){
  if(args.length!==3)throw new Error('usage: node scripts/pnpk-transaction-preflight.mjs transaction.json policy.json receipt.json');
  const transaction=JSON.parse(await readFile(args[0],'utf8')),policy=JSON.parse(await readFile(args[1],'utf8'));
  let rpc;try{rpc=createReadOnlyRpc({url:env.PNPK_SIMULATION_RPC_URL});}catch{/* Missing provider results in a blocked receipt. */}
  const receipt=await preflightTransaction({transaction,policy,rpc});
  await writeFile(args[2],JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({decision:receipt.decision,failures:receipt.failures,receipt_hash:receipt.receipt_hash}));
  return receipt.decision==='PREFLIGHT_PASSED'?0:2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().then(code=>{process.exitCode=code;}).catch(()=>{console.error('Preflight could not read inputs or write a new receipt. Check paths and JSON; receipts are never overwritten.');process.exitCode=1;});
}
