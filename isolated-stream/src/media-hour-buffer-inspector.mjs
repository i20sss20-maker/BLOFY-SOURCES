// Operator-only inspection of the synthetic 1-hour ring-buffer pilot.
// Does not retrieve media bytes, expose recording paths, access Xtream sources,
// or turn on recordings for customer channels.
const TARGET='http://blofy-stream-media-standby.railway.internal:9997/v3/recordings/list';
export function createMediaHourBufferInspector({
 fetchImpl=fetch,controlPassword='',clock=Date.now,logger=()=>{},
 intervalMs=300000
}={}){
 if(typeof fetchImpl!=='function'||typeof clock!=='function'||
    typeof logger!=='function'||!Number.isInteger(intervalMs)||
    intervalMs<60000||intervalMs>3600000)
   throw new Error('hour_buffer_inspector_invalid');
 const configured=typeof controlPassword==='string'&&controlPassword.length>=32;
 const authorization=configured?'Basic '+
  Buffer.from('blofy-control:'+controlPassword).toString('base64'):null;
 let last=null,lastCode=null,timer=null,starting=null,running=false;
 async function check(){
  if(running)return snapshot();
  running=true;
  const now=clock();
  try{
   if(!configured)throw new Error('recording_control_unconfigured');
   const controller=new AbortController();
   const t=setTimeout(()=>controller.abort(),5000);
   let reply;
   try{
    reply=await fetchImpl(TARGET,{method:'GET',redirect:'error',
     signal:controller.signal,cache:'no-store',headers:{
      authorization,accept:'application/json'
     }});
    if(reply.status===401||reply.status===403)
     throw new Error('recording_control_denied');
    if(!reply.ok)throw new Error('recording_control_unavailable');
    if(Number(reply.headers.get('content-length')||0)>100000)
     throw new Error('recording_control_response_invalid');
    const raw=await reply.text();
    if(Buffer.byteLength(raw)>100000)
     throw new Error('recording_control_response_invalid');
    let result;try{result=JSON.parse(raw)}catch{}
    if(!Array.isArray(result?.items))
     throw new Error('recording_control_response_invalid');
    const synthetic=result.items.find(x=>x?.name==='smoke');
    const segments=Array.isArray(synthetic?.segments)?synthetic.segments:[];
    const starts=segments
     .map(x=>Date.parse(x?.start))
     .filter(x=>Number.isFinite(x)&&x>=now-3600000&&x<=now+10000);
    last={ok:true,state:starts.length?'synthetic_hour_buffer_has_segments':
     'synthetic_hour_buffer_not_yet_verified',
     syntheticSegmentsWithinHour:starts.length,recordedMediaBytesRetrieved:0,
     providerRequests:0,customerTrafficChanged:false,recordingsStarted:false,
     realContentRecordingEnabledByInspector:false,
     inspectedAt:new Date(now).toISOString()};
   }finally{clearTimeout(t)}
  }catch(error){
   const allow=['recording_control_unconfigured','recording_control_denied',
    'recording_control_unavailable','recording_control_response_invalid'];
   const code=allow.includes(error?.message)?error.message:'recording_control_unavailable';
   last={ok:false,state:code,syntheticSegmentsWithinHour:null,
    recordedMediaBytesRetrieved:0,providerRequests:0,
    customerTrafficChanged:false,recordingsStarted:false,
    realContentRecordingEnabledByInspector:false,
    inspectedAt:new Date(now).toISOString()};
  }finally{running=false}
  if(lastCode!==last.state){
   lastCode=last.state;
   logger({code:'hour_buffer_state',state:last.state,
    syntheticSegmentsWithinHour:last.syntheticSegmentsWithinHour,
    providerRequests:0,customerTrafficChanged:false});
  }
  return snapshot();
 }
 function snapshot(){
  return{configured,readOnly:true,scope:'synthetic_smoke_path_only',
   oneHourRetentionConfiguredForSynthetic:true,playbackEnabledByInspector:false,
   monitorActive:timer!==null,...(last||{
    ok:false,state:'not_checked',syntheticSegmentsWithinHour:null
   })};
 }
 function start({delayMs=90000}={}){
  if(timer)return;
  if(!Number.isInteger(delayMs)||delayMs<0||delayMs>180000)
   throw new Error('hour_buffer_inspector_delay_invalid');
  starting=setTimeout(()=>{void check().catch(()=>{})},delayMs);starting.unref?.();
  timer=setInterval(()=>{void check().catch(()=>{})},intervalMs);timer.unref?.();
 }
 function stop(){
  if(timer)clearInterval(timer);if(starting)clearTimeout(starting);
  timer=null;starting=null;
 }
 return{start,stop,check,snapshot};
}
