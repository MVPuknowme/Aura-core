import { timingSafeEqual } from 'node:crypto';
import { planAutoDrillPaidUse } from '../../lib/autodrill-paid-use-plan.mjs';

export function createAutoDrillLeaseHandler({env=process.env}={}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-SKYGRID-Sentinel','fail_closed');
    const blocked=(status,reason)=>res.status(status).json({status:'BLOCKED',reason,execution_allowed:false,payment_execution_allowed:false});
    if(req.method!=='POST'){res.setHeader('Allow','POST');return blocked(405,'method_not_allowed');}
    const token=env.PNPK_PREFLIGHT_API_TOKEN;
    if(typeof token!=='string'||token.length<32)return blocked(503,'service_not_configured');
    const expected=Buffer.from('Bearer '+token),supplied=Buffer.from(String(req.headers?.authorization??''));
    if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return blocked(401,'unauthorized');
    let body;
    try {
      if(typeof req.body==='string'&&req.body.length>262144)return blocked(413,'input_too_large');
      body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(!body||typeof body!=='object'||Array.isArray(body)||!Object.hasOwn(body,'candidates')||!Object.hasOwn(body,'leaseUse')||Object.keys(body).some(k=>!['candidates','leaseUse'].includes(k)))return blocked(400,'candidates_and_evidence_only_required');
      if(JSON.stringify(body).length>262144)return blocked(413,'input_too_large');
      if(!Array.isArray(body.candidates)||body.candidates.length>64||!body.leaseUse||typeof body.leaseUse!=='object'||Array.isArray(body.leaseUse))return blocked(400,'input_invalid');
    }catch{return blocked(400,'input_invalid');}
    let trustedKeys,partnerships,policy;
    try {
      trustedKeys=JSON.parse(env.PNPK_AUTODRILL_VERIFICATION_KEYS_JSON);
      partnerships=JSON.parse(env.PNPK_AUTODRILL_PARTNERSHIPS_JSON??'{}');
      policy=JSON.parse(env.PNPK_AUTODRILL_SELECTION_POLICY_JSON??'{}');
      if(!trustedKeys||typeof trustedKeys!=='object'||Array.isArray(trustedKeys))throw new Error();
    }catch{return blocked(503,'verification_not_configured');}
    try {
      const plan=planAutoDrillPaidUse({candidates:body.candidates,leaseUse:body.leaseUse,policy,verification:{trustedKeys,partnerships}});
      const paid=plan.selected.length>0&&plan.selected.every(c=>c.continuation_recommended);
      return res.status(paid?200:422).json(plan);
    }catch{return blocked(400,'planning_input_invalid');}
  };
}
export default createAutoDrillLeaseHandler();
