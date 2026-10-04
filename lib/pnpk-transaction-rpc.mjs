const METHODS=new Set(['eth_chainId','eth_getBlockByNumber','eth_getCode','eth_call','eth_simulateV1']);
const LIMIT=1048576;
export function createReadOnlyRpc({url,fetchImpl=fetch,timeoutMs=8000}={}){
  let endpoint;try{endpoint=new URL(url);}catch{throw new Error('rpc_url_invalid');}
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.hash)throw new Error('rpc_url_invalid');
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw new Error('rpc_timeout_invalid');
  let sequence=0;
  return async function rpc(method,params){
    if(!METHODS.has(method))throw new Error('rpc_method_blocked');
    if(!Array.isArray(params))throw new Error('rpc_params_invalid');
    const controller=new AbortController(),id=++sequence;let timer;
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('rpc_timeout'));},timeoutMs);});
    try{
      return await Promise.race([timeout,(async()=>{
        const response=await fetchImpl(endpoint.href,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:controller.signal});
        if(!response.ok||!response.body)throw new Error('rpc_http_failed');
        const reader=response.body.getReader(),chunks=[];let length=0;
        try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>LIMIT)throw new Error('rpc_response_too_large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
        let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('rpc_response_invalid');}
        if(!payload||payload.jsonrpc!=='2.0'||payload.id!==id||payload.error||!Object.hasOwn(payload,'result'))throw new Error('rpc_response_invalid');
        return payload.result;
      })()]);
    }finally{clearTimeout(timer);controller.abort();}
  };
}
