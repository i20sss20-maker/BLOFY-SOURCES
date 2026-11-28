// Owner-only short TS lab transfer. No arbitrary URL, provider connection,
// persistent storage or control plane mutation.
const ENDPOINT='https://blofy-decoder-lab-test.up.railway.app/api/owner-sample';
export const MAX_OWNER_SAMPLE_BYTES=2_000_000;
const MIN_OWNER_SAMPLE_BYTES=188*12;
const safeMsg='لا تتغير قنوات المشتركين. نتيجة هذا الفحص تخص العينة المرفوعة فقط.';
function result(ok,data={}){
  return {ok,scope:'approved_short_ts_sample',productionStreamVerified:false,
    androidPlaybackVerified:false,windowsPlaybackVerified:false,
    customerRoutesChanged:false,...data};
}
export async function readOperatorSample(req){
  const raw=req.headers?.['content-length']||'';
  const contentType=req.headers?.['content-type'];
  if(!/^[0-9]{1,8}$/.test(raw)||contentType!=='video/mp2t'||
    req.headers?.['transfer-encoding'])
    return {ok:false,status:415,code:'operator_sample_content_type_or_length_required'};
  const expected=Number(raw);
  if(expected<MIN_OWNER_SAMPLE_BYTES||expected>MAX_OWNER_SAMPLE_BYTES||expected%188!==0)
    return {ok:false,status:413,code:'operator_sample_size_invalid'};
  const chunks=[];let size=0;
  try{
    for await(const part of req){
      size+=part.length;
      if(size>expected||size>MAX_OWNER_SAMPLE_BYTES)
        return {ok:false,status:413,code:'operator_sample_overflow'};
      chunks.push(part);
    }
  }catch{return {ok:false,status:400,code:'operator_sample_interrupted'}}
  if(size!==expected)return {ok:false,status:400,code:'operator_sample_truncated'};
  const bytes=Buffer.concat(chunks,size);
  if(bytes.length%188!==0||bytes[0]!==0x47)
    return {ok:false,status:415,code:'operator_sample_not_ts'};
  return {ok:true,bytes};
}
async function limitedJson(response){
  if(!response.body)return null;
  const reader=response.body.getReader();
  let total=0;const chunks=[];
  try{
    for(;;){
      const item=await reader.read();
      if(item.done)break;
      total+=item.value.length;
      if(total>8192)return null;
      chunks.push(Buffer.from(item.value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch{return null}
  finally{try{await reader.cancel()}catch{};reader.releaseLock();}
}
const allowedAudio=new Set(['aac','ac3','eac3','mp2','mp3','opus','dts','truehd','pcm_s16le']);
const allowedVideo=new Set(['h264','hevc','mpeg2video','mpeg4','av1','vp9']);
const allowedCode=new Set(['short_sample_decoded','audio_stream_not_present_in_short_sample',
  'audio_decoder_failed_on_sample','audio_codec_unrecognized',
  'video_decoder_failed_on_sample','sample_analysis_failed','invalid_mpegts_sample']);
const n=(x,m)=>Number.isSafeInteger(x)&&x>=0&&x<=m?x:null;
export function sanitizeOwnerSampleResult(upstream){
  if(!upstream||upstream.scope!=='approved_short_ts_sample'||
    upstream.productionStreamVerified!==false||
    upstream.customerRoutesChanged!==false||!allowedCode.has(upstream.code))
    return result(false,{code:'sample_response_invalid'});
  const audioCodec=allowedAudio.has(upstream.audioCodec)?upstream.audioCodec:null;
  const videoCodec=allowedVideo.has(upstream.videoCodec)?upstream.videoCodec:null;
  const a=n(upstream.audioFrames,1000),v=n(upstream.videoFrames,1000);
  const decodedAudio=upstream.decodedAudio===true&&a!==null&&a>=2;
  const decodedVideo=upstream.decodedVideo===true&&v!==null&&v>=2;
  return result(upstream.ok===true&&upstream.code==='short_sample_decoded'&&
    decodedAudio&&(!upstream.hasVideo||decodedVideo),{
    code:upstream.code,hasAudio:upstream.hasAudio===true,
    hasVideo:upstream.hasVideo===true,audioCodec,videoCodec,
    decodedAudio,decodedVideo,
    audioFrames:a,videoFrames:v,
    audioPackets:n(upstream.audioPackets,100000),
    videoPackets:n(upstream.videoPackets,100000),
    bytesExamined:n(upstream.bytesExamined,MAX_OWNER_SAMPLE_BYTES),
    explanation:upstream.code==='audio_stream_not_present_in_short_sample'?
      'العينة القصيرة لا تحتوي مسار صوت معلنًا. لا يعني ذلك أن القناة كاملة صامتة.':
      upstream.code==='audio_decoder_failed_on_sample'?
      'رُصد مسار صوت، لكن المختبر لم يفك إطاراته. يحتاج تحليل الترميز أو سلامة TS.':
      upstream.code==='short_sample_decoded'?
      'فُك ترميز العينة على FFmpeg، وليس على جهاز Android أو Windows.':
      'النتيجة جزئية أو تعذّر فك بعض محتوى العينة.',
    note:safeMsg,
    analysisFromRealSample:true,
    noAutomaticRepairs:true
  });
}
export function createOwnerSampleBridge({
  fetchImpl=fetch,uploadToken='',clock=Date.now,cooldownMs=90000
}={}){
  if(typeof fetchImpl!=='function'||typeof clock!=='function'||
    !Number.isSafeInteger(cooldownMs)||cooldownMs<30000||cooldownMs>300000)
    throw Error('sample_bridge_invalid_config');
  let busy=false,lastStart=-Infinity;
  async function submit(bytes){
    if(typeof uploadToken!=='string'||uploadToken.length<40)
      return {status:503,body:result(false,{code:'sample_lab_not_configured'})};
    if(!Buffer.isBuffer(bytes)||bytes.length<MIN_OWNER_SAMPLE_BYTES||
      bytes.length>MAX_OWNER_SAMPLE_BYTES||bytes.length%188!==0)
      return {status:413,body:result(false,{code:'sample_invalid_size'})};
    if(busy)return {status:409,body:result(false,{code:'sample_lab_busy'})};
    const now=clock();
    if(now-lastStart<cooldownMs)
      return {status:429,body:result(false,{code:'sample_lab_cooldown',
        retryAfterMs:cooldownMs-(now-lastStart)})};
    busy=true;lastStart=now;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),50000);
    try{
      const response=await fetchImpl(ENDPOINT,{
        method:'POST',redirect:'manual',signal:controller.signal,
        headers:{
          authorization:'Bearer '+uploadToken,
          'content-type':'video/mp2t',
          'content-length':String(bytes.length),
          'x-blofy-sample-rights':'confirmed',
          'user-agent':'BLOFY-STREAM-OwnerSampleBridge/1.0'
        },
        body:bytes
      });
      const reply=await limitedJson(response);
      if(response.status!==200)
        return {status:response.status===429?429:502,
          body:result(false,{code:response.status===429?
            'sample_lab_cooldown':'sample_lab_unavailable'})};
      const sanitized=sanitizeOwnerSampleResult(reply);
      return {status:sanitized.code==='sample_response_invalid'?502:200,body:sanitized};
    }catch{
      return {status:502,body:result(false,{code:'sample_lab_unreachable'})};
    }finally{clearTimeout(timeout);busy=false;}
  }
  return {submit};
}
