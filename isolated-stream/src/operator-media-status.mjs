// Fixed-peer MediaMTX Control API status. Never accepts user-supplied origins,
// credentials, path mutation requests, or arbitrary proxy targets.
const DEFAULT_CONTROL_ORIGIN='http://blofy-stream-media.railway.internal:9997';
const ENDPOINTS={paths:'/v3/paths/list',hls:'/v3/hls/sessions/list'};

export async function getMediaEngineStatus({
  fetchImpl=fetch,controlOrigin=DEFAULT_CONTROL_ORIGIN,timeoutMs=1700
}={}){
  // Only a single known Railway private-network peer may be consulted.
  if(controlOrigin!==DEFAULT_CONTROL_ORIGIN)
    throw new Error('mediamtx_control_peer_not_allowed');
  async function retrieve(endpoint){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetchImpl(controlOrigin+endpoint,{
        method:'GET',redirect:'manual',signal:controller.signal,
        headers:{accept:'application/json'},cache:'no-store'
      });
      if(!response.ok) return {ok:false};
      const body=await response.json();
      if(!Array.isArray(body?.items))return {ok:false};
      const items=body.items;
      return {ok:true,items,reportedCount:Number.isInteger(body.itemCount)?body.itemCount:items.length};
    }catch{return {ok:false};}
    finally{clearTimeout(timer);}
  }
  const [paths,hls]=await Promise.all([retrieve(ENDPOINTS.paths),retrieve(ENDPOINTS.hls)]);
  return {
    controlAvailable:paths.ok||hls.ok,
    pathsAvailable:paths.ok,hlsSessionsAvailable:hls.ok,
    activePaths:paths.ok?paths.items.filter(x=>x?.ready===true).length:null,
    configuredPaths:paths.ok?paths.reportedCount:null,
    hlsSessions:hls.ok?hls.reportedCount:null,
    // Only summary is returned; keep source URLs, tokens, metadata private.
    diagnostics:paths.ok||hls.ok?'connected':'not_configured_or_unreachable'
  };
}
