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
    const budget=path===ROOT+'/content-hub/episodes/next'&&method==='POST'?15000:
      path===ROOT+'/content-hub/episodes/probe'&&method==='POST'?60000:
      path===ROOT+'/media-failures/recheck-now'&&method==='POST'?60000:
      (path===ROOT+'/library-ai'||path===ROOT+'/library-ai/connection-test'||path===ROOT+'/library-ai/chat')&&method==='POST'?25000:timeoutMs;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),budget);
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

  const distributorAdmins=()=>call(ROOT+'/distributors');
  function createDistributor(data){
    return call(ROOT+'/distributors',{method:'POST',body:{
      name:String(data.name||'').trim().slice(0,80),
      username:String(data.username||'').trim().toLowerCase().slice(0,32),
      credits:Number(data.credits)||0
    }});
  }
  function distributorAdminAction(id,kind,data={}){
    if(!UUID.test(id)||!['credits','status','reset','limits'].includes(kind))
      return Promise.resolve({status:400,body:{ok:false,code:'distributor_action_denied'}});
    return call(ROOT+'/distributors/'+id+'/'+kind,{method:'POST',body:data});
  }
  function distributorRequest(kind,body={}){
    if(!['login','me','logout','list','issue','reveal','library','organize','clients','customer','renew','relogin','activity','analytics','export'].includes(kind))
      return Promise.resolve({status:400,body:{ok:false,code:'distributor_route_denied'}});
    return call(ROOT+'/distributor/'+kind,{method:'POST',body});
  }
  const overview=()=>call(ROOT+'/overview');
  // Cached, provider-reported connection metadata. This endpoint makes NO
  // source requests and cannot return subscriber identities or source URLs.
  const sourceCapacity=()=>call(ROOT+'/source-capacity');
  const sources=()=>call(ROOT+'/overview');
  const accounts=({offset=0}={})=>call(ROOT+'/accounts?'+
    new URLSearchParams({offset:String(Math.max(0,Math.min(100000,Number(offset)||0)))}));
  const codes=({offset=0}={})=>call(ROOT+'/codes?'+
    new URLSearchParams({offset:String(Math.max(0,Math.min(100000,Number(offset)||0)))}));
  const salesSummary=()=>call(ROOT+'/codes/sales-summary');
  const mediaQuality=()=>call(ROOT+'/media-quality');
  const codeReveal=id=>UUID.test(String(id||''))
    ?call(ROOT+'/codes/'+id+'/reveal')
    :Promise.resolve({status:400,body:{ok:false,code:'invalid_code_id'}});
  function codeAction(id,action,data={}){
    if(!UUID.test(id)||!['sell','extend','transfer','relogin'].includes(action))
      return Promise.resolve({status:400,body:{ok:false,code:'invalid_code_action'}});
    return call(ROOT+'/codes/'+id+'/'+action,{method:'POST',body:data});
  }
  function issueCodes(data){
    return call(ROOT+'/codes',{method:'POST',body:{
      label:String(data.label||'BLOFY STREAM').slice(0,100),
      durationDays:Number(data.durationDays),quantity:Number(data.quantity)||1,
      maxConnections:Number(data.maxConnections)||1,
      sourceId:data.sourceId||null,
      channel:data.channel==='app'?'app':'xtream'
    }});
  }
  function revokeCode(id){
    if(!UUID.test(id))return Promise.resolve({status:400,
      body:{ok:false,code:'invalid_code_id'}});
    return call(ROOT+'/codes/'+id+'/revoke',{method:'POST',body:{}});
  }
  function accountCredentials(id){
    if(!UUID.test(id))return Promise.resolve({status:400,
      body:{ok:false,code:'invalid_account_id'}});
    return call(ROOT+'/accounts/'+id+'/credentials');
  }
  function accountCompatibility(id){
    if(!UUID.test(id))return Promise.resolve({status:400,
      body:{ok:false,code:'invalid_account_id'}});
    return call(ROOT+'/accounts/'+id+'/compatibility');
  }
  function resetAccount(id){
    if(!UUID.test(id))return Promise.resolve({status:400,
      body:{ok:false,code:'invalid_account_id'}});
    return call(ROOT+'/accounts/'+id+'/reset',{method:'POST',body:{}});
  }
  function libraryReview({sourceId,type}={}){
    if(!UUID.test(String(sourceId||''))||!['live','movie','series'].includes(type))
      return Promise.resolve({status:400,body:{ok:false,code:'stream_library_selection_invalid'}});
    return call(ROOT+'/library-review?'+new URLSearchParams({sourceId,type}));
  }
  const libraryAIStatus=()=>call(ROOT+'/library-ai/status');
  const libraryAIConnectionTest=()=>call(ROOT+'/library-ai/connection-test',{method:'POST',body:{}});
  // Reuse the verified private bridge; the STREAM API never receives
  // original Xtream credentials or arbitrary host URLs.
  function opsRead(path,{sourceId}={}){
    if(!UUID.test(String(sourceId||'')))
      return Promise.resolve({status:400,body:{ok:false,code:'stream_invalid_source_id'}});
    return call(ROOT+'/ops/'+path+'?'+new URLSearchParams({sourceId}));
  }
  function opsSchedule({sourceId,enabled,intervalHours}={}){
    if(!UUID.test(String(sourceId||''))||typeof enabled!=='boolean'||
       ![6,12,24,48,168].includes(Number(intervalHours)))
      return Promise.resolve({status:400,body:{ok:false,code:'stream_invalid_schedule'}});
    return call(ROOT+'/ops/schedule',{method:'POST',body:{
      sourceId,enabled,intervalHours:Number(intervalHours)
    }});
  }
  function opsSnapshot({sourceId,label,confirmed}={}){
    if(!UUID.test(String(sourceId||''))||confirmed!==true||
       typeof label!=='string'||label.length<4||label.length>60)
      return Promise.resolve({status:400,body:{ok:false,code:'stream_snapshot_confirmation_required'}});
    return call(ROOT+'/ops/snapshot',{method:'POST',body:{sourceId,label,confirmed:true}});
  }
  const opsScheduleStatus=(args)=>opsRead('schedule',args);
  const opsSnapshots=(args)=>opsRead('snapshots',args);
  const opsSourceStats=(args)=>opsRead('source-stats',args);
  function libraryAIScanProgress({sourceId,type}={}){
    if(!UUID.test(String(sourceId||''))||!['live','movie','series'].includes(type))
      return Promise.resolve({status:400,body:{ok:false,code:'stream_ai_selection_invalid'}});
    return call(ROOT+'/library-ai/scan-progress?'+new URLSearchParams({sourceId,type}));
  }
  function libraryAIPublishStatus({sourceId}={}){
    if(!UUID.test(String(sourceId||'')))
      return Promise.resolve({status:400,body:{ok:false,code:'stream_ai_selection_invalid'}});
    return call(ROOT+'/library-ai/publish-status?'+new URLSearchParams({sourceId}));
  }
  function libraryAIRollback({sourceId,planId}={}){
    if(!UUID.test(String(sourceId||''))||!/^[0-9a-f]{48}$/.test(String(planId||'')))
      return Promise.resolve({status:400,body:{ok:false,code:'stream_ai_rollback_invalid'}});
    return call(ROOT+'/library-ai/rollback',{method:'POST',body:{sourceId,planId}});
  }

  function libraryAIChat({sourceId,type,message,history=[]}={}){
    if(!UUID.test(String(sourceId||''))||!['live','movie','series'].includes(type)||
       typeof message!=='string'||message.trim().length<4||message.length>480)
      return Promise.resolve({status:400,body:{ok:false,code:'ai_instruction_invalid'}});
    const previous=Array.isArray(history)?history.slice(-4)
      .filter(x=>typeof x==='string'&&x.length>=4&&x.length<=480):[];
    return call(ROOT+'/library-ai/chat',{method:'POST',body:{sourceId,type,message,history:previous}});
  }
  function libraryAIApply({planId,approve}={}){
    if(typeof planId!=='string'||!/^[0-9a-f]{48}$/.test(planId)||approve!==true)
      return Promise.resolve({status:400,body:{ok:false,code:'stream_ai_approval_invalid'}});
    return call(ROOT+'/library-ai/apply',{method:'POST',body:{planId,approve:true}});
  }

  function libraryAISuggest({sourceId,type,offset=0}={}){
    if(!UUID.test(String(sourceId||''))||!['live','movie','series'].includes(type)||
      !Number.isInteger(offset)||offset<0||offset>40000||offset%12!==0)
      return Promise.resolve({status:400,body:{ok:false,code:'stream_ai_selection_invalid'}});
    return call(ROOT+'/library-ai',{method:'POST',body:{sourceId,type,offset}});
  }
  function libraryTitle({sourceId,type,itemId,currentName,proposedName}={}){
    if(!UUID.test(String(sourceId||''))||!['live','movie','series'].includes(type)||
      !/^[A-Za-z0-9._-]{1,128}$/.test(String(itemId||''))||
      typeof proposedName!=='string'||proposedName.length>180||
      typeof currentName!=='string'||currentName.length>220)
      return Promise.resolve({status:400,body:{ok:false,code:'stream_library_title_invalid'}});
    return call(ROOT+'/library-title',{method:'POST',
      body:{sourceId,type,itemId,currentName,proposedName}});
  }
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
  // Content Hub lives behind the authoritative portal in a different
  // Railway project. Never expose its private token, S3 keys or URL in UI.
  // Binary owner preview uses a fixed HTTPS endpoint. Does not return a
  // storage URL or bridge secret to the frontend; upstream body is streamed.
  async function contentHubPreviewRaw({signal}={}){
    if(!configured)throw Error('unified_bridge_not_configured');
    return fetchImpl(ORIGIN+ROOT+'/content-hub/preview',{
      method:'GET',redirect:'manual',cache:'no-store',
      signal:signal?AbortSignal.any([signal,AbortSignal.timeout(85000)]):
        AbortSignal.timeout(85000),
      headers:{authorization:'Bearer '+secret,accept:'video/mp4'}
    });
  }
  const contentHubStatus=()=>call(ROOT+'/content-hub/status');
  const contentHubEpisodeCandidates=()=>call(ROOT+'/content-hub/episodes/candidates');
  const contentHubStartEpisodeCopy=({gatewayId,confirmed}={})=>{
    const id=Number(gatewayId);
    if(confirmed!==true||!Number.isSafeInteger(id)||id<1)
      return Promise.resolve({status:400,body:{
       ok:false,code:'episode_start_confirmation_required'}});
    return call(ROOT+'/content-hub/episodes/start',{
     method:'POST',body:{gatewayId:id,confirmed:true}});
  };
  const contentHubPauseEpisodeCopy=()=>call(
    ROOT+'/content-hub/episodes/pause',{method:'POST',body:{confirmed:true}});
  const contentHubNextEpisodeChunk=({gatewayId,confirmed}={})=>{
    const id=Number(gatewayId);
    if(confirmed!==true||!Number.isSafeInteger(id)||id<1)
      return Promise.resolve({status:400,body:{
       ok:false,code:'episode_copy_explicit_confirmation_required'}});
    return call(ROOT+'/content-hub/episodes/next',{
      method:'POST',body:{gatewayId:id,confirmed:true}});
  };
  const contentHubProbeEpisode=({gatewayId,confirmed}={})=>{
    const id=Number(gatewayId);
    if(confirmed!==true||!Number.isSafeInteger(id)||id<1)
      return Promise.resolve({status:400,body:{
        ok:false,code:'episode_probe_explicit_confirmation_required'}});
    return call(ROOT+'/content-hub/episodes/probe',{
      method:'POST',body:{gatewayId:id,confirmed:true}});
  };
  const contentHubPreflight=()=>call(ROOT+'/content-hub/preflight');
  const contentHubDiagnoseEpisode=({confirmed}={})=>{
    if(confirmed!==true)return Promise.resolve({
      status:400,body:{ok:false,code:'episode_canary_confirmation_required'}
    });
    return call(ROOT+'/content-hub/episodes/playback/diagnose',{
      method:'POST',body:{confirmed:true}});
  };
  const contentHubDiagnosePlayback=({confirmed}={})=>{
    if(confirmed!==true)return Promise.resolve({
      status:400,body:{ok:false,code:'playback_diagnostic_confirmation_required'}
    });
    return call(ROOT+'/content-hub/playback/diagnose',{
      method:'POST',body:{confirmed:true}});
  };
  const contentHubStartCopy=({confirmed}={})=>{
    if(confirmed!==true)return Promise.resolve({
      status:400,body:{ok:false,code:'copy_confirmation_required'}
    });
    return call(ROOT+'/content-hub/batch/start',{
      method:'POST',body:{confirmed:true}});
  };
  const contentHubPauseCopy=()=>call(ROOT+'/content-hub/batch/pause',{
    method:'POST',body:{confirmed:true}});
  const contentHubNextBatch=({confirmed}={})=>{
    if(confirmed!==true)return Promise.resolve({
      status:400,body:{ok:false,code:'batch_confirmation_required'}
    });
    return call(ROOT+'/content-hub/batch/next',{
      method:'POST',body:{confirmed:true}});
  };
  function mediaFailuresRecheck({sourceId,confirmed}={}){
    if(!UUID.test(String(sourceId||''))||confirmed!==true)
      return Promise.resolve({status:400,body:{ok:false,code:'unavailable_source_not_allowed'}});
    return call(ROOT+'/media-failures/recheck-now',{method:'POST',
      body:{sourceId,confirmed:true}});
  }
  function mediaFailureItems({sourceId=''}={}){
    if(sourceId&&!UUID.test(String(sourceId)))
      return Promise.resolve({status:400,body:{ok:false,code:'stream_invalid_source_id'}});
    const query=sourceId?'?'+new URLSearchParams({sourceId}):'';
    return call(ROOT+'/media-failure-items'+query);
  }
  function mediaFailures({sourceId=''}={}){
    if(sourceId&&!UUID.test(sourceId))
      return Promise.resolve({status:400,body:{ok:false,code:'invalid_source_id'}});
    const params=sourceId?'?'+new URLSearchParams({sourceId}):'';
    return call(ROOT+'/media-failures'+params);
  }
  function episodes({sourceId,seriesId}={}){
    if(!UUID.test(sourceId)||!/^[a-zA-Z0-9._-]{1,100}$/.test(String(seriesId||'')))
      return Promise.resolve({status:400,body:{ok:false,code:'stream_series_invalid'}});
    const search=new URLSearchParams({sourceId,seriesId});
    return call(ROOT+'/episodes?'+search);
  }
  function vodItem({sourceId,itemId,type,rightsConfirmed}={}){
    if(!UUID.test(sourceId)||!/^[a-zA-Z0-9._-]{1,110}$/.test(String(itemId||''))||
       !['movie','episode'].includes(type)||rightsConfirmed!==true)
      return Promise.resolve({status:400,body:{ok:false,code:'stream_vod_invalid'}});
    return call(ROOT+'/vod-item',{method:'POST',body:{sourceId,itemId,type,rightsConfirmed:true}});
  }
  function liveChannel({sourceId,channelId,rightsConfirmed}={}){
    if(!UUID.test(sourceId)||!/^[a-zA-Z0-9._-]{1,100}$/.test(String(channelId||''))||rightsConfirmed!==true)
      return Promise.resolve({status:400,body:{ok:false,code:'stream_live_selection_invalid'}});
    return call(ROOT+'/live-channel',{method:'POST',body:{
      sourceId,channelId,rightsConfirmed:true
    }});
  }
  function accountAction(id,action){
    if(!UUID.test(id)||!accountActions.has(action))
      return Promise.resolve({status:400,body:{ok:false,code:'invalid_account_action'}});
    return call(ROOT+'/accounts/'+id+'/'+action,{method:'POST',body:{}});
  }
  return {configured,distributorAdmins,createDistributor,distributorAdminAction,distributorRequest,overview,sourceCapacity,sources,accounts,codes,issueCodes,revokeCode,codeReveal,salesSummary,mediaQuality,codeAction,resetAccount,accountCredentials,accountCompatibility,catalog,libraryReview,libraryTitle,opsScheduleStatus,opsSchedule,opsSnapshots,opsSnapshot,opsSourceStats,
    libraryAIStatus,libraryAIConnectionTest,libraryAIScanProgress,libraryAIPublishStatus,libraryAIRollback,libraryAIChat,libraryAIApply,libraryAISuggest,addSource,sourceAction,addAccount,accountAction,liveChannel,episodes,vodItem,mediaFailures,mediaFailureItems,mediaFailuresRecheck,
    contentHubStatus,contentHubEpisodeCandidates,contentHubProbeEpisode,
    contentHubNextEpisodeChunk,contentHubStartEpisodeCopy,
    contentHubPauseEpisodeCopy,contentHubPreflight,contentHubNextBatch,
    contentHubStartCopy,contentHubPauseCopy,contentHubDiagnosePlayback,
    contentHubDiagnoseEpisode,
    contentHubPreviewRaw};
}
