import { timingSafeEqual } from 'node:crypto';
import { preflightTransaction } from '../../lib/pnpk-transaction-preflight.mjs';
import { createReadOnlyRpc } from '../../lib/pnpk-transaction-rpc.mjs';

export function createTransactionPreflightHandler({env=process.env,fetchImpl=fetch}={}){
  return async function handler(req,res){
    res.setHeader('Cache-Control','no-store');res.setHeader('X-SKYGRID-Sentinel','fail_closed');
    const blocked=(status,reason)=>res.status(status).json({decision:'BLOCKED',execution_allowed:false,wallet_signing_allowed:false,transaction_broadcast_allowed:false,reason});
    if(req.method!=='POST'){res.setHeader('Allow','POST');return blocked(405,'method_not_allowed');}
    const token=env.PNPK_PREFLIGHT_API_TOKEN;
    if(typeof token!=='string'||token.length<32)return blocked(503,'service_not_configured');
    const expected=Buffer.from('Bearer '+token),supplied=Buffer.from(String(req.headers?.authorization??''));
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return blocked(401,'unauthorized');
    let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return blocked(400,'input_invalid');}
    if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length!==1||!Object.hasOwn(body,'transaction'))return blocked(400,'transaction_only_required');
    if(JSON.stringify(body).length>4096)return blocked(413,'input_too_large');
    let policy,rpc;
    try{policy=JSON.parse(env.PNPK_TRANSACTION_POLICY_JSON);rpc=createReadOnlyRpc({url:env.PNPK_SIMULATION_RPC_URL,fetchImpl});}catch{return blocked(503,'simulation_not_configured');}
    const receipt=await preflightTransaction({transaction:body.transaction,policy,rpc});
    return res.status(receipt.decision==='PREFLIGHT_PASSED'?200:422).json(receipt);
  };
}
export default createTransactionPreflightHandler();
