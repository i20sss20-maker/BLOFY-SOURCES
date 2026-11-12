// Fixed-origin, read-only access to private EDGE aggregate metrics.
// Never reads or proxies user-supplied origins/URLs. Reuses a dedicated
// secret present only as a Railway server environment variable.
const EDGE='https://bfy.up.railway.app/__blofy_internal/edge-metrics';
export function createEdgeMetricsClient({
  fetchImpl=fetch,key='',origin=EDGE,timeoutMs=2000
}={}){
  if(origin!==EDGE||typeof fetchImpl!=='function'||
     !Number.isInteger(timeoutMs)||timeoutMs<300||timeoutMs>8000)
    throw Error('edge_metrics_config_invalid');
  const configured=typeof key==='string'&&key.length>=32&&key.length<=128;
  async function snapshot(){
    if(!configured)return {ok:false,code:'edge_metrics_not_configured'};
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    timeout.unref?.();
    try{
      const r=await fetchImpl(origin,{
        method:'GET',redirect:'manual',cache:'no-store',
        headers:{accept:'application/json','x-blofy-edge-observer':key},
        signal:controller.signal
      });
      // A deployment/secret mismatch is simply unknown; never leak headers,
      // location, response bodies, internals or the configured token.
      if(r.status!==200)return {ok:false,code:'edge_metrics_unavailable'};
      const length=Number(r.headers?.get?.('content-length')||0);
      if(length>16384)return {ok:false,code:'edge_metrics_invalid'};
      const result=await r.json();
      if(!result||result.ok!==true||
         result.scope!=='one_xtream_edge_bun_instance_origin_headers_only')
        return {ok:false,code:'edge_metrics_invalid'};
      return {ok:true,body:result};
    }catch{
      return {ok:false,code:'edge_metrics_unavailable'};
    }finally{clearTimeout(timeout)}
  }
  return {configured,snapshot};
}
