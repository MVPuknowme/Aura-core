import { createHash } from 'node:crypto';

const ADDRESS=/^0x[0-9a-f]{40}$/;
const QUANTITY=/^0x(?:0|[1-9a-f][0-9a-f]*)$/;
const WORD=/^0x[0-9a-f]{64}$/;
const TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const APPROVAL='0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
const NATIVE='0x'+'e'.repeat(40), UINT_MAX=(1n<<256n)-1n;
function check(ok,reason){if(!ok)throw new Error(reason);}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
export function digest(v){return 'sha256:'+createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');}
function quantity(v,n){check(typeof v==='string'&&QUANTITY.test(v)&&v.length<=66,n+'_invalid');return BigInt(v);}
function units(v,n){check(typeof v==='string'&&/^(0|[1-9][0-9]{0,77})$/.test(v)&&BigInt(v)<=UINT_MAX,n+'_invalid');return BigInt(v);}
const word=a=>a.slice(2).padStart(64,'0');
function readWord(v){check(typeof v==='string'&&WORD.test(v),'simulation_read_invalid');return BigInt(v);}
function validateTransaction(t){
  check(t&&typeof t==='object'&&!Array.isArray(t),'transaction_invalid');
  check(Object.keys(t).every(k=>['chainId','from','to','value','data','gas'].includes(k)),'unsupported_transaction_field');
  check(ADDRESS.test(t.from)&&ADDRESS.test(t.to)&&t.from!==t.to,'address_invalid');
  quantity(t.chainId,'chain_id');quantity(t.value,'value');const gas=quantity(t.gas,'gas');
  check(gas>=21000n&&gas<=16000000n,'gas_out_of_range');
  check(typeof t.data==='string'&&/^0x(?:[0-9a-f]{2})*$/.test(t.data)&&t.data.length<=138,'calldata_invalid');
}
function validatePolicy(p){
  check(p&&typeof p==='object','policy_missing');quantity(p.chainId,'policy_chain');units(p.maxNativeValueWei,'native_limit');
  for(const key of ['recipients','spenders'])check(Array.isArray(p[key])&&p[key].every(a=>ADDRESS.test(a)),key+'_invalid');
  check(p.tokens&&typeof p.tokens==='object'&&!Array.isArray(p.tokens),'tokens_invalid');
  for(const [a,c] of Object.entries(p.tokens)){check(ADDRESS.test(a)&&c&&/^[0-9a-f]{64}$/.test(c.codeSha256),'token_code_pin_required');units(c.maxTransferUnits,'transfer_limit');units(c.maxApprovalUnits,'approval_limit');}
  check(Number.isInteger(p.receiptTtlSeconds)&&p.receiptTtlSeconds>0&&p.receiptTtlSeconds<=120,'receipt_ttl_invalid');
  check(Number.isInteger(p.maxBlockAgeSeconds)&&p.maxBlockAgeSeconds>0&&p.maxBlockAgeSeconds<=300,'block_age_invalid');
}
function decodeIntent(t,p){
  check(t.chainId===p.chainId,'policy_chain_mismatch');
  if(t.data==='0x'){const amount=quantity(t.value,'value');check(p.recipients.includes(t.to),'recipient_not_approved');check(amount<=units(p.maxNativeValueWei,'native_limit'),'native_limit_exceeded');return {kind:'native_transfer',recipient:t.to,amount:amount.toString()};}
  check(t.value==='0x0','token_call_with_native_value');check(p.tokens[t.to],'token_not_approved');
  check(t.data.length===138&&['0xa9059cbb','0x095ea7b3'].includes(t.data.slice(0,10)),'unsupported_calldata');
  check(t.data.slice(10,34)==='0'.repeat(24),'abi_address_invalid');
  const target='0x'+t.data.slice(34,74),amount=BigInt('0x'+t.data.slice(74)),approve=t.data.startsWith('0x095ea7b3');
  check(target!==t.from,'self_target_unsupported');check((approve?p.spenders:p.recipients).includes(target),approve?'spender_not_approved':'recipient_not_approved');
  check(amount!==UINT_MAX,'unlimited_approval_or_transfer');check(amount<=units(p.tokens[t.to][approve?'maxApprovalUnits':'maxTransferUnits'],'token_limit'),'token_limit_exceeded');
  return {kind:approve?'erc20_approval':'erc20_transfer',token:t.to,recipient:target,amount:amount.toString()};
}
function inspectLogs(logs,t,i){
  check(Array.isArray(logs)&&logs.length<=1000,'simulation_logs_invalid');
  for(const log of logs){
    check(log&&log.removed!==true&&Array.isArray(log.topics)&&log.topics.length===3,'unsupported_event');
    check(log.topics[0]===(i.kind==='erc20_approval'?APPROVAL:TRANSFER),'unexpected_event_type');
    check(log.topics[1]==='0x'+word(t.from)&&log.topics[2]==='0x'+word(i.recipient),'unexpected_event_participant');
    check(log.address===(i.kind==='native_transfer'?NATIVE:t.to),'unexpected_event_contract');
    check(readWord(log.data)===BigInt(i.amount),'unexpected_event_amount');
  }
  if(i.kind==='native_transfer'&&BigInt(i.amount)>0n)check(logs.length===1,'native_transfer_evidence_missing');
  if(i.kind!=='native_transfer')check(logs.length===1,'token_event_evidence_missing');
}

/** Operator supplies the trusted read-only provider. No signer or broadcast rail exists. */
export async function preflightTransaction({transaction,policy,rpc,now=Date.now}={}){
  const time=now();check(Number.isFinite(time),'clock_invalid');
  const r={schema:'pnpk.transaction-preflight.v1',service:'SKYGRID Emergency Data On-Ramp',mode:'controlled_pilot',sentinel:'fail_closed',created_at:new Date(time).toISOString(),expires_at:new Date(time).toISOString(),decision:'BLOCKED',execution_allowed:false,wallet_signing_allowed:false,transaction_broadcast_allowed:false,failures:[],observed:{},coverage:'native EOA transfers; pinned ERC20 direct transfer/approve; no arbitrary contracts, NFT, permit, proxy assurance or gas/fee prediction',limitations:['Simulation is a snapshot, not a safety guarantee.','Unobserved token behavior may remain outside coverage.','Receipt hash is a checksum, not an operator signature or authorization.','RPC provider receives public addresses and unsigned calldata.']};
  let stage='input';
  try{
    validateTransaction(transaction);validatePolicy(policy);const t=structuredClone(transaction),p=structuredClone(policy);
    r.transaction_hash=digest(t);r.policy_hash=digest(p);r.expires_at=new Date(time+p.receiptTtlSeconds*1000).toISOString();
    const i=decodeIntent(t,p);r.intent=i;check(typeof rpc==='function','provider_not_configured');stage='provider';
    check(await rpc('eth_chainId',[])===t.chainId,'rpc_chain_mismatch');
    const b=await rpc('eth_getBlockByNumber',['latest',false]);check(b&&WORD.test(b.hash),'block_invalid');quantity(b.number,'block_number');
    const blockTime=Number(quantity(b.timestamp,'block_time'))*1000;check(Number.isSafeInteger(blockTime)&&blockTime<=time&&time-blockTime<=p.maxBlockAgeSeconds*1000,'stale_or_future_block');
    r.block={number:b.number,hash:b.hash,timestamp:b.timestamp};
    check(await rpc('eth_getCode',[t.from,b.number])==='0x','contract_or_delegated_sender_unsupported');
    const code=await rpc('eth_getCode',[t.to,b.number]);
    if(i.kind==='native_transfer')check(code==='0x','contract_recipient_unsupported');
    else check(typeof code==='string'&&/^0x(?:[0-9a-f]{2})+$/.test(code)&&createHash('sha256').update(code).digest('hex')===p.tokens[t.to].codeSha256,'token_code_mismatch');
    const {chainId,...call}=t,calls=[call];let before,recipientBefore;
    const read=data=>({from:t.from,to:t.to,value:'0x0',data,gas:'0x186a0'});
    if(i.kind==='erc20_transfer'){
      const ownerRead=read('0x70a08231'+word(t.from)),recipientRead=read('0x70a08231'+word(i.recipient));
      before=readWord(await rpc('eth_call',[ownerRead,b.number]));recipientBefore=readWord(await rpc('eth_call',[recipientRead,b.number]));calls.push(ownerRead,recipientRead);
    }else if(i.kind==='erc20_approval'){
      const ownerRead=read('0x70a08231'+word(t.from));before=readWord(await rpc('eth_call',[ownerRead,b.number]));
      const allowanceRead=read('0xdd62ed3e'+word(t.from)+word(i.recipient));
      const previousAllowance=readWord(await rpc('eth_call',[allowanceRead,b.number]));
      check(previousAllowance===0n||BigInt(i.amount)===0n,'approval_reset_required');
      calls.push(allowanceRead,ownerRead);
    }
    const result=await rpc('eth_simulateV1',[{blockStateCalls:[{calls}],traceTransfers:true,validation:false,returnFullTransactions:false},b.number]);
    check(Array.isArray(result)&&result.length===1&&Array.isArray(result[0].calls)&&result[0].calls.length===calls.length,'simulation_response_invalid');
    for(const c of result[0].calls)check(c&&c.status==='0x1'&&!c.error&&typeof c.returnData==='string'&&Array.isArray(c.logs),'simulation_failed');
    inspectLogs(result[0].calls[0].logs,t,i);for(const c of result[0].calls.slice(1))check(c.logs.length===0,'read_emitted_events');
    r.simulation={method:'eth_simulateV1',validation:false,state_overrides:false,gas_used:result[0].calls[0].gasUsed??null};
    if(i.kind==='erc20_transfer'){
      const after=readWord(result[0].calls[1].returnData),recipientAfter=readWord(result[0].calls[2].returnData);
      r.observed={balance_delta_units:(after-before).toString(),recipient_delta_units:(recipientAfter-recipientBefore).toString()};
      check(before-after===BigInt(i.amount)&&recipientAfter-recipientBefore===BigInt(i.amount),'unexpected_asset_movement');
    }else if(i.kind==='erc20_approval'){
      const allowance=readWord(result[0].calls[1].returnData),after=readWord(result[0].calls[2].returnData);
      r.observed={allowance_units:allowance.toString(),balance_delta_units:(after-before).toString()};
      check(allowance===BigInt(i.amount),'unexpected_allowance');check(after===before,'approval_changed_balance');
    }
    check((await rpc('eth_getBlockByNumber',[b.number,false]))?.hash===b.hash,'block_reorganized');check(now()<Date.parse(r.expires_at),'simulation_expired');r.decision='PREFLIGHT_PASSED';
  }catch(e){
    // Provider exceptions may contain credentials. Only our known fixed errors are returned.
    const safe=['transaction_invalid','unsupported_transaction_field','address_invalid','chain_id_invalid','value_invalid','gas_invalid','gas_out_of_range','calldata_invalid','policy_missing','policy_chain_invalid','native_limit_invalid','recipients_invalid','spenders_invalid','tokens_invalid','token_code_pin_required','transfer_limit_invalid','approval_limit_invalid','receipt_ttl_invalid','block_age_invalid','policy_chain_mismatch','recipient_not_approved','native_limit_exceeded','token_call_with_native_value','token_not_approved','unsupported_calldata','abi_address_invalid','self_target_unsupported','spender_not_approved','unlimited_approval_or_transfer','token_limit_invalid','token_limit_exceeded','provider_not_configured','rpc_chain_mismatch','block_invalid','block_number_invalid','block_time_invalid','stale_or_future_block','contract_or_delegated_sender_unsupported','contract_recipient_unsupported','token_code_mismatch','simulation_read_invalid','simulation_response_invalid','simulation_failed','simulation_logs_invalid','unsupported_event','unexpected_event_type','unexpected_event_participant','unexpected_event_contract','unexpected_event_amount','native_transfer_evidence_missing','read_emitted_events','unexpected_asset_movement','unexpected_allowance','block_reorganized','simulation_expired'];
    r.failures=[safe.includes(e?.message)||['token_event_evidence_missing','approval_changed_balance','approval_reset_required'].includes(e?.message)?e.message:stage==='provider'?'simulation_provider_failed':'input_invalid'];
  }
  return {...r,receipt_hash:digest(r)};
}

export function verifyReceipt(r,t,p,time=Date.now()){
  try{validateTransaction(t);validatePolicy(p);const {receipt_hash,...b}=r;return b.schema==='pnpk.transaction-preflight.v1'&&b.decision==='PREFLIGHT_PASSED'&&b.execution_allowed===false&&b.wallet_signing_allowed===false&&b.transaction_broadcast_allowed===false&&Array.isArray(b.failures)&&b.failures.length===0&&receipt_hash===digest(b)&&b.transaction_hash===digest(t)&&b.policy_hash===digest(p)&&Number.isFinite(time)&&Date.parse(b.created_at)<=time&&time<Date.parse(b.expires_at);}catch{return false;}
}
