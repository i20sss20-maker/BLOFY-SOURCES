// Optional operator-triggered Groq interpretation: send ONLY bounded
// allowlisted anonymous telemetry codes. Never pass credentials, URLs, IDs,
// IPs, subscriber names, stream titles or video/media content to an LLM.
// Recommendations NEVER execute actions. No background paid API requests.
const URL='https://api.groq.com/openai/v1/chat/completions';
const MODEL='openai/gpt-oss-120b';
const cleanArabic=s=>typeof s==='string'&&s.length<=420&&
  /^[\p{L}\p{N}\s،؛:؟.,!()\-–—/]+$/u.test(s)&&
  !/(?:https?|www|token|password|secret|api.?key|@)/i.test(s);
export function createSmartPlaybackAi({
  key='',fetchImpl=fetch,clock=Date.now,cooldownMs=60000,maxCallsPerBoot=30
}={}){
  if(typeof fetchImpl!=='function'||typeof clock!=='function'||
     !Number.isInteger(cooldownMs)||cooldownMs<30000||cooldownMs>3600000||
     !Number.isInteger(maxCallsPerBoot)||maxCallsPerBoot<1||
     maxCallsPerBoot>100)throw Error('playback_ai_config_invalid');
  const configured=typeof key==='string'&&key.length>=30&&key.length<400;
  let lastCall=-Infinity,calls=0,inflight=null;
  const status=()=>({configured,provider:configured?'Groq':null,
    enabled:configured,manualOnly:true,actionsExecuted:false,
    callsSinceBoot:calls,maxCallsPerBoot});
  async function explain(assessment){
    if(!configured)return {ok:false,code:'playback_ai_not_configured'};
    if(!assessment?.ok||!Array.isArray(assessment.incidents))
      return {ok:false,code:'playback_ai_evidence_unavailable'};
    const now=clock();
    if(inflight)return {ok:false,code:'playback_ai_busy'};
    if(now-lastCall<cooldownMs)return {ok:false,code:'playback_ai_cooldown'};
    if(calls>=maxCallsPerBoot)return {ok:false,code:'playback_ai_boot_limit'};
    // Strict allowlist; no raw cross-service payload is sent.
    const incidents=assessment.incidents.slice(0,8).map(i=>({
      code:i.code,count:Math.min(10000,Number(i.count)||0),
      severity:i.severity,
      actionCode:i.actionCode
    }));
    const allowed=new Set(incidents.map(i=>i.code));
    const payload={incidentCodes:incidents,
      coverage:Object.entries(assessment.coverage||{})
        .filter(([k])=>['gateway','relay','relayTracks','restream','mediaMtx','edge','directTransfers'].includes(k))
        .map(([code,available])=>({code,available:available===true})),
      actualAudioDecoded:false,actualVideoDecoded:false};
    calls++;lastCall=now;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6000);timeout.unref?.();
    const run=async()=>{
      try{
        const response=await fetchImpl(URL,{
          method:'POST',redirect:'error',signal:controller.signal,
          headers:{authorization:'Bearer '+key,'content-type':'application/json'},
          body:JSON.stringify({
            model:MODEL,temperature:0,max_completion_tokens:400,
            response_format:{type:'json_object'},
            messages:[{role:'system',
              content:'You are a read-only IPTV diagnostic assistant. You receive anonymous numerical incident codes only. Output ONE JSON object {"priorityCode":"one of the exact incident code values provided or none","explanationAr":"one short Arabic sentence <= 320 chars"}. Never claim audio is audible, video decoded, entitlement verified, 500 concurrent viewers, or a definite root cause. Never suggest bypassing provider limits, automatic source switching, customer account changes or live transcoding. Explain that manual device playback validation is required.'},
              {role:'user',content:JSON.stringify(payload)}]
          })
        });
        if(response.status!==200)return {ok:false,code:'playback_ai_provider_unavailable'};
        const len=Number(response.headers?.get?.('content-length')||0);
        if(len>12000)return {ok:false,code:'playback_ai_invalid_response'};
        const body=await response.json();
        const raw=body?.choices?.[0]?.message?.content;
        if(typeof raw!=='string'||raw.length>2000)
          return {ok:false,code:'playback_ai_invalid_response'};
        const parsed=JSON.parse(raw);
        const priorityCode=parsed?.priorityCode==='none'?'none':
          allowed.has(parsed?.priorityCode)?parsed.priorityCode:null;
        const explanation=parsed?.explanationAr;
        if(priorityCode===null||!cleanArabic(explanation))
          return {ok:false,code:'playback_ai_invalid_response'};
        return {ok:true,provider:'Groq',model:MODEL,priorityCode,
          explanationAr:explanation,advisoryOnly:true,
          decodedAudioVideoVerified:false,actionsExecuted:0};
      }catch{return {ok:false,code:'playback_ai_provider_unavailable'};}
      finally{clearTimeout(timeout)}
    };
    inflight=run();
    try{return await inflight}finally{inflight=null}
  }
  return {status,explain};
}
