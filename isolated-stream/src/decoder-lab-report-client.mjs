// Read-only view of a separate Railway synthetic FFmpeg lab.
// Fixed HTTPS endpoint. The credential stays on STREAM server; no browser
// secret, source URL, media write, or decoder-run action is exposed.
const ENDPOINT='https://blofy-decoder-lab-test.up.railway.app/api/report';
const CACHE_MS=45000;
const MAX_BYTES=8192;
const VALID_AUDIO=new Set(['mp2','aac','ac3','eac3']);
const VALID_VIDEO=new Set(['mpeg2video','h264','hevc']);
const limitedInteger=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max?value:null;
const view=(data)=>({
  ok:false,readOnly:true,scope:'synthetic_local_only',
  audioDecoded:false,videoDecoded:false,productionStreamVerified:false,
  providerConnectionsFromLab:0,customerRoutesModified:false,...data
});
async function boundedJson(response){
  const input=response.body?.getReader();
  if(!input)throw Error('empty_body');
  let bytes=0,chunks=[];
  try{
    for(;;){
      const part=await input.read();
      if(part.done)break;
      bytes+=(part.value?.length||0);
      if(bytes>MAX_BYTES)throw Error('large_body');
      chunks.push(Buffer.from(part.value||[]));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }finally{try{await input.cancel()}catch{};try{input.releaseLock()}catch{}}
}
export function createDecoderLabReportClient({
  fetchImpl=fetch,viewToken='',clock=Date.now,ttlMs=CACHE_MS
}={}){
  if(typeof fetchImpl!=='function'||typeof clock!=='function'||
    !Number.isInteger(ttlMs)||ttlMs<15000||ttlMs>300000)
    throw Error('decoder_lab_client_invalid_config');
  let last=null,lastAt=0,pending=null;
  async function collect(){
    if(typeof viewToken!=='string'||viewToken.length<40)
      return view({state:'not_configured',message:'ربط مختبر فك الترميز غير مهيأ.'});
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5500);
    try{
      const reply=await fetchImpl(ENDPOINT,{
        method:'GET',redirect:'manual',signal:controller.signal,
        headers:{
          authorization:'Bearer '+viewToken,accept:'application/json',
          'user-agent':'BLOFY-STREAM-DecoderLab-ReadOnly/1.0'
        }
      });
      if(reply.status!==200){
        try{await reply.body?.cancel()}catch{}
        return view({state:reply.status===401?'authentication_error':'unavailable',
          message:'لم يصل تقرير مختبر صالح.'});
      }
      const data=await boundedJson(reply);
      const report=data?.report||{};
      const observedAt=Date.parse(data?.lastStartedAt||'');
      const age=clock()-observedAt;
      if(data?.scope!=='synthetic_local_only'||
        report.scope!=='synthetic_local_only'||
        report.productionStreamVerified!==false||
        !Number.isFinite(observedAt)||age<0||age>24*60*60*1000)
        return view({state:'invalid_or_stale',message:'نتيجة المختبر غير مكتملة أو قديمة.'});
      const audioFrames=limitedInteger(report.audioFrames,1000);
      const videoFrames=limitedInteger(report.videoFrames,1000);
      const verified=data.ok===true&&report.ok===true&&
        report.audioDecoderExecuted===true&&report.videoDecoderExecuted===true&&
        audioFrames!==null&&audioFrames>=2&&videoFrames!==null&&videoFrames>=2;
      const expectedMatrix=['aac','ac3','eac3'];
      const matrixRows=Array.isArray(report.codecMatrix)?report.codecMatrix:[];
      const matrix=expectedMatrix.map(codec=>{
        const matches=matrixRows.filter(row=>row?.codec===codec);
        const row=matches.length===1?matches[0]:null;
        const frames=limitedInteger(row?.audioFrames,1000);
        const decoded=row?.ok===true&&row?.audioDecoded===true&&
          row?.stage==='complete'&&frames!==null&&frames>=2;
        return {codec,decoded,frames:decoded?frames:null,
          state:row===null?'unknown':decoded?'synthetic_decoded':'not_verified'};
      });
      const codecMatrixVerified=report.codecMatrixAllVerified===true&&
        matrixRows.length===3&&matrix.every(row=>row.decoded);
      return view({
        ok:verified,state:verified?'synthetic_verified':'synthetic_failed',
        message:verified?'فُكّ الصوت والصورة لعينة صناعية فقط.':'فشل فك العينة الصناعية أو لم يكتمل.',
        observedAt:new Date(observedAt).toISOString(),
        audioDecoded:verified,videoDecoded:verified,
        audioFrames,videoFrames,
        audioCodec:VALID_AUDIO.has(report.audioCodec)?report.audioCodec:null,
        videoCodec:VALID_VIDEO.has(report.videoCodec)?report.videoCodec:null,
        audioCodecMatrix:matrix,codecMatrixVerified,
        allSyntheticCodecsVerified:verified&&codecMatrixVerified,
        productionStreamVerified:false,
        diagnosticsRequiresLicensedSample:true,
        noSourceContentTested:true
      });
    }catch{
      return view({state:'unavailable',message:'تعذر قراءة نتيجة مختبر فك الترميز.'});
    }finally{clearTimeout(timeout)}
  }
  async function snapshot(){
    const now=clock();
    if(last&&now-lastAt<ttlMs)return last;
    if(pending)return pending;
    pending=collect().then(result=>{
      last=result;lastAt=clock();return result;
    }).finally(()=>{pending=null});
    return pending;
  }
  return {snapshot};
}
