// Authenticated STREAM -> authoritative BLOFY PLAYER bridge.
// Only HTTPS, a fixed Railway deployment host, and enumerated operations.
// Source credentials are NEVER persisted in STREAM or sent in browser URLs.
const ORIGIN='https://blofy-activation-portal-production.up.railway.app';
const ROOT='/internal/blofy-stream';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sourceActions=new Set(['test','sync','probe','pause','resume','publish','unpublish','cancel-sync']);
const accountActions=new Set(['enable','disable']);
export function createUnifiedPortalClient({secret='',fetchImpl=fetch,timeoutMs=13500}={}){
  const configured=typeof secret==='string'&&secret.length>=40;
  async function call(path,{method='GET',body}={}){
    if(!configured)return {status:503,body:{ok:false,code:'unified_bridge_not_configured'}};
    if(!path.startsWith(ROOT+'/')||/[\\\r\n]/.test(path))
      return {status:400,body:{ok:false,code:'unified_bridge_invalid_path'}};
    const url=new URL(ORIGIN+path);
    if(url.origin!==ORIGIN||!url.pathname.startsWith(ROOT+'/'))
      return {status:400,body:{ok:false,code:'unified_bridge_invalid_origin'}};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetchImpl(url,{
        method,redirect:'manual',signal:controller.signal,cache:'no-store',
        headers:{authorization:'Bearer '+secret,accept:'application/json',
          ...(body!==undefined?{'content-type':'application/json'}:{})},
        ...(body!==undefined?{body:JSON.stringify(body)}:{})
      });
      if(response.status>=300&&response.status<400)
        return {status:502,body:{ok:false,code:'unified_bridge_redirect_denied'}};
      if(Number(response.headers.get('content-length')||0)>512000)
        return {status:502,body:{ok:false,code:'unified_bridge_large_response'}};
      const raw=await response.text();
      if(Buffer.byteLength(raw)>512000)
        return {status:502,body:{ok:false,code:'unified_bridge_large_response'}};
      let data;try{data=JSON.parse(raw)}catch{
        return {status:502,body:{ok:false,code:'unified_bridge_invalid_response'}};
      }
      return {status:response.status,body:data};
    }catch{return {status:503,body:{ok:false,code:'unified_bridge_unreachable'}}}
    finally{clearTimeout(timer);}
  }
  const overview=()=>call(ROOT+'/overview');
  const sources=()=>call(ROOT+'/overview');
  const accounts=()=>call(ROOT+'/accounts');
  function catalog({type,serverId='',q='',offset=0}={}){
    if(!['live','movie','series'].includes(type))
      return Promise.resolve({status:400,body:{ok:false,code:'invalid_media_type'}});
    if(serverId&&!UUID.test(serverId))
      return Promise.resolve({status:400,body:{ok:false,code:'invalid_source_id'}});
    const query=new URLSearchParams({type,offset:String(Math.max(0,Math.min(1000000,Number(offset)||0)))});
    if(serverId)query.set('serverId',serverId);
    if(q)query.set('q',String(q).slice(0,85));
    return call(ROOT+'/catalog?'+query);
  }
  function addSource(data){
    return call(ROOT+'/sources',{method:'POST',body:{
      name:String(data.name||'').slice(0,160),
      baseUrl:String(data.baseUrl||'').slice(0,600),
      username:String(data.username||'').slice(0,512),
      password:String(data.password||'').slice(0,1024),
      rightsConfirmed:data.rightsConfirmed===true
    }});
  }
  function sourceAction(id,action,data={}){
    if(!UUID.test(id)||!sourceActions.has(action))
      return Promise.resolve({status:400,body:{ok:false,code:'invalid_source_action'}});
    const body=action==='sync'?{types:Array.isArray(data.types)?data.types:['live','movie','series']}:
      action==='probe'?{type:data.type||'live'}:{};
    return call(ROOT+'/sources/'+id+'/'+action,{method:'POST',body});
  }
  function addAccount(data){
    return call(ROOT+'/accounts',{method:'POST',body:{
      label:String(data.label||'').slice(0,120),
      sourceId:data.sourceId||null,
      maxConnections:Number(data.maxConnections)||1,
      expiresAt:data.expiresAt||null
    }});
  }
  function accountAction(id,action){
    if(!UUID.test(id)||!accountActions.has(action))
      return Promise.resolve({status:400,body:{ok:false,code:'invalid_account_action'}});
    return call(ROOT+'/accounts/'+id+'/'+action,{method:'POST',body:{}});
  }
  return {configured,overview,sources,accounts,catalog,addSource,sourceAction,addAccount,accountAction};
}
