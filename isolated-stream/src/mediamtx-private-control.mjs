// MediaMTX private control plane for BLOFY's isolated demo path.
// No arbitrary URLs, path names, shell commands, customer sources or accounts.
// User credentials live only in Railway service variables.
const HOST='http://blofy-stream-media.railway.internal:9997';
const DEMO='blofy-demo';
const PATH='/v3/config/paths/';
const bodyLimit=96*1024;
function fail(code){return Object.assign(new Error(code),{code})}
function timeoutFetch(fetchImpl,url,options,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetchImpl(url,{...options,signal:controller.signal,redirect:'manual',cache:'no-store'}).finally(()=>clearTimeout(timer));
}
async function parseBody(response){
  // Bound any JSON returned by the API, even if its Content-Length is absent.
  const contentLength=Number(response.headers?.get?.('content-length')||0);
  if(contentLength>bodyLimit)throw fail('mediamtx_response_too_large');
  const text=await response.text();
  if(Buffer.byteLength(text)>bodyLimit)throw fail('mediamtx_response_too_large');
  if(!text)return null;
  try{return JSON.parse(text)}catch{throw fail('mediamtx_invalid_response')}
}
export function createMediaControlClient({
  fetchImpl=fetch,username='',password='',origin=HOST,clock=Date.now
}={}){
  if(origin!==HOST)throw fail('mediamtx_invalid_peer');
  const enabled=username==='blofy-control'&&typeof password==='string'&&password.length>=32;
  const auth=enabled?'Basic '+Buffer.from(username+':'+password).toString('base64'):null;
  let actionAt=0,operation=false;
  async function request(path,{method='GET',data,timeoutMs=5000}={}){
    if(!enabled)throw fail('mediamtx_auth_unconfigured');
    // Dynamic paths are never allowed.
    const whitelist=new Set([
      '/v3/info','/v3/paths/list','/v3/hls/sessions/list',
      PATH+'get/'+DEMO,PATH+'add/'+DEMO,PATH+'delete/'+DEMO
    ]);
    if(!whitelist.has(path))throw fail('mediamtx_path_forbidden');
    const options={method,headers:{authorization:auth,accept:'application/json'}};
    if(data!==undefined){
      options.headers['content-type']='application/json';
      options.body=JSON.stringify(data);
    }
    let response;
    try{response=await timeoutFetch(fetchImpl,origin+path,options,timeoutMs)}
    catch{throw fail('mediamtx_unreachable')}
    const body=await parseBody(response);
    if(response.status===401||response.status===403)
      throw fail('mediamtx_auth_failed');
    if(response.status>=500)throw fail('mediamtx_internal_error');
    return {ok:response.ok,status:response.status,data:body};
  }
  const safe=async(name,check)=>{
    try{return await check()}catch(e){return {error:e?.code||'mediamtx_failed'};}
  };
  async function overview(){
    if(!enabled)return {
      configured:false,online:false,diagnostics:'mediamtx_auth_unconfigured',
      readyPaths:null,hlsSessions:null,demo:null,paths:[]
    };
    const [info,paths,hls]=await Promise.all([
      safe('info',()=>request('/v3/info')),
      safe('paths',()=>request('/v3/paths/list')),
      safe('hls',()=>request('/v3/hls/sessions/list'))
    ]);
    const anyAuthFailed=[info,paths,hls].some(x=>x.error==='mediamtx_auth_failed');
    const online=info.ok===true||paths.ok===true;
    const items=paths.ok&&Array.isArray(paths.data?.items)?paths.data.items:null;
    const hlsItems=hls.ok&&Array.isArray(hls.data?.items)?hls.data.items:null;
    // MediaMTX reports HLS sessions separately from RTSP/path readers.
    // Count only sessions with a validated live path; unknown path data is
    // never presented as zero viewers, and client IPs/IDs are not exposed.
    const liveName=/^live-[a-f0-9]{12}$/;
    const sessionPaths=hlsItems===null?null:new Map();
    if(sessionPaths){
      for(const session of hlsItems){
        const path=String(session?.path??session?.pathName??'');
        if(liveName.test(path))sessionPaths.set(path,(sessionPaths.get(path)||0)+1);
      }
    }
    const summary=items===null?[]:items.slice(0,300).map(row=>{
      const name=String(row?.name||'').slice(0,90);
      return {name,ready:row?.ready===true,
        readers:Array.isArray(row?.readers)?row.readers.length:null,
        hlsViewers:sessionPaths===null?null:sessionPaths.get(name)||0,
        tracks:Array.isArray(row?.tracks)?row.tracks.length:null};
    });
    return {
      configured:true,online,diagnostics:anyAuthFailed?'mediamtx_auth_failed':
        online?'connected':info.error||paths.error||'mediamtx_unreachable',
      readyPaths:items===null?null:items.filter(x=>x?.ready===true).length,
      hlsSessions:hlsItems===null?null:(Number.isInteger(hls.data?.itemCount)?hls.data.itemCount:hlsItems.length),
      paths:summary,
      // Explicit false; this isolated stream engine has not migrated customers.
      customerTrafficEnabled:false,realProviderVerified:false
    };
  }
  async function demoAction(action){
    if(!enabled)return {status:503,body:{ok:false,code:'mediamtx_auth_unconfigured'}};
    if(!['start','stop','restart'].includes(action))
      return {status:400,body:{ok:false,code:'operator_action_invalid'}};
    if(operation||clock()-actionAt<3000)
      return {status:429,body:{ok:false,code:'demo_action_rate_limited'}};
    operation=true;actionAt=clock();
    try{
      const current=await request(PATH+'get/'+DEMO);
      if(!current.ok&&current.status!==404)throw fail('mediamtx_config_read_failed');
      let exists=current.ok;
      if((action==='stop'||action==='restart')&&exists){
        const removed=await request(PATH+'delete/'+DEMO,{method:'DELETE'});
        if(!removed.ok)throw fail('mediamtx_demo_stop_failed');
        exists=false;
      }
      if((action==='start'||action==='restart')&&!exists){
        const created=await request(PATH+'add/'+DEMO,{
          method:'POST',
          data:{
            // Synthetic H.264/AAC path already generated by MediaMTX's
            // pinned, private FFmpeg smoke path. No external IPTV credentials.
            source:'rtsp://127.0.0.1:8554/smoke',
            sourceOnDemand:true,sourceOnDemandStartTimeout:'20s',
            sourceOnDemandCloseAfter:'10s'
          }
        });
        if(!created.ok)throw fail('mediamtx_demo_start_failed');
        exists=true;
      }
      return {status:200,body:{
        ok:true,code:exists?'demo_configured':'demo_stopped',
        demo:{exists,ready:false,onDemand:true},
        playbackVerified:false,customerTrafficChanged:false
      }};
    }catch(e){
      return {status:503,body:{ok:false,code:e?.code||'mediamtx_operation_failed'}};
    }finally{operation=false;}
  }
  return {enabled,overview,demoAction};
}
