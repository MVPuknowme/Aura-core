import { createHash } from 'node:crypto';
import { planRegionalLeaseFabric } from './autodrill-regional-lease-fabric.mjs';
import { reconcileAutoDrillLeaseUse, canonicalPayload } from './autodrill-lease-use.mjs';

export function planAutoDrillPaidUse({candidates=[],policy={},leaseUse={},verification={}}={}) {
  const plan = planRegionalLeaseFabric({candidates,policy});
  const billing = reconcileAutoDrillLeaseUse(leaseUse,verification);
  const selected = plan.selected.map(candidate => {
    const rows = billing.rows.filter(row => row.offer_id === candidate.offer_id);
    const signedLease = (leaseUse.leases ?? []).find(item => item.payload?.offer_id === candidate.offer_id)?.payload;
    const bound = billing.status === 'RECONCILED' && signedLease?.pnpk_receipt_hash === candidate.pnpk_receipt_hash;
    const recommend = bound && rows.length > 0 && rows.every(row => row.continuation_recommended);
    return {...candidate,activation_eligible:false,
      continuation_recommended:recommend,
      billing_status:billing.status === 'BLOCKED' ? 'BLOCKED' : !bound || !rows.length ? 'UNVERIFIED' : recommend ? 'PAID_USE_RECONCILED' : 'PAYMENT_OR_OWNER_RECONCILIATION_REQUIRED',
      billing_report_hash:billing.report_hash};
  });
  const {plan_hash,...body} = plan;
  const result = {...body,schema:'skygrid.autodrill-paid-use-plan.v1',selected,billing,
    execution:{...plan.execution,activation_allowed:false,execution_allowed:false},
    note:'Paid-use reconciliation is advisory. Separate signed activation grants and executor enforcement remain required.'};
  return {...result,plan_hash:'sha256:'+createHash('sha256').update(canonicalPayload(result)).digest('hex')};
}
