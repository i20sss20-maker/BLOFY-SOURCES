import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import vm from 'node:vm';
import {analyzeSmartPlaybackHealth} from '../src/smart-playback-triage.mjs';
import {createSmartPlaybackMonitor} from '../src/smart-playback-monitor.mjs';
import {createSmartPlaybackAi} from '../src/smart-playback-ai.mjs';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const now=1800000000000;
const evidence=({
  faults=[
    {code:'provider_admission_refused',scope:'gateway_last_hour',count:3,severity:'warning'},
    {code:'relay_audio_codec_support_review',scope:'relay_input_sample',count:2,severity:'notice'},
    {code:'relay_video_ts_transport_anomaly',scope:'relay_input_sample',count:1,severity:'warning'}],
  edgeAvailable=true
}={})=>({
  ok:true,checkedAt:now,readOnly:true,
  observations:{
    gateway:{dataAvailable:true},relay:{dataAvailable:true},
    sharedRelayTracks:{dataAvailable:true},operatorRestream:{dataAvailable:true},
    edge:{dataAvailable:edgeAvailable},mediaMtx:{dataAvailable:true},
    direct:{dataAvailable:true}
  },
  problems:faults,
  rawUrl:'https://private.invalid?username=test&password=NEVER_EXPORT',
  source:{name:'NEVER_EXPORT',token:'NEVER_EXPORT'}
});

test('Smart Playback identifies likely source/decoder/video faults from real sanitized codes only',()=>{
  const result=analyzeSmartPlaybackHealth(evidence(),{now});
  assert.equal(result.ok,true);
  assert.equal(result.status,'attention');
  assert.equal(result.incidents[0].code,'provider_admission_refused');
  assert.equal(result.incidents[0].severity,'high');
  assert.equal(result.incidents[0].actionCode,'verify_provider_entitlement');
  assert.ok(result.incidents.some(x=>x.area==='decoder'&&
    x.actionCode==='test_android9_audio_decoder'));
  assert.ok(result.incidents.some(x=>x.area==='video'));
  assert.ok(result.recommendations.includes('verify_audio_on_real_device'));
  assert.equal(result.actionsTaken,0);
  assert.equal(result.actualDecodedAudioVerified,false);
  assert.equal(result.actualDecodedVideoVerified,false);
  assert.equal(result.uniqueViewersMeasured,false);
  for(const bad of ['NEVER_EXPORT','private.invalid','username=','password=','token='])
    assert.ok(!JSON.stringify(result).includes(bad),'leaked '+bad);
});

test('Smart Playback rejects malicious unknown source and prevents false all-healthy result',()=>{
  const unknown=analyzeSmartPlaybackHealth(evidence({faults:[
    {code:'https://provider.invalid/password=SECRET',count:999,severity:'high'},
    {code:'provider_admission_refused',count:-3,scope:'gateway_last_hour'}
  ],edgeAvailable:false}),{now});
  assert.equal(unknown.status,'partial');
  assert.equal(unknown.knownIncidents,0);
  assert.ok(unknown.missingLayers.includes('edge'));
  assert.ok(!JSON.stringify(unknown).includes('SECRET'));
  assert.equal(unknown.actualDecodedAudioVerified,false);
  const lost=analyzeSmartPlaybackHealth({ok:false},{now});
  assert.equal(lost.ok,false);
  assert.equal(lost.status,'unknown');
  assert.equal(lost.incidents.length,0);
});

test('Read-only health sampling continues without dashboard and records raised/resolved after repeated samples',async()=>{
  let current=now,count=0;
  let faults=[{code:'gateway_media_interrupted',count:2,scope:'gateway_last_hour'}];
  const monitor=createSmartPlaybackMonitor({
    clock:()=>current,collect:async()=>{count++;return evidence({faults})},
    intervalMs:60000,historyLimit:10,eventLimit:10
  });
  assert.equal(monitor.snapshot().dataFresh,false);
  const [a,b,c]=await Promise.all([monitor.sample(),monitor.sample(),monitor.sample()]);
  assert.equal(count,1);
  assert.equal(a.samplesSinceBoot,1);
  assert.equal(b.state,'attention');
  assert.equal(c.events.length,0);
  current+=60000;
  await monitor.sample();
  let s=monitor.snapshot();
  assert.equal(s.activeConfirmedIncidents.length,1);
  assert.equal(s.events[0].kind,'raised');
  faults=[];
  current+=60000;await monitor.sample();
  assert.equal(monitor.snapshot().activeConfirmedIncidents.length,1);
  current+=60000;await monitor.sample();
  s=monitor.snapshot();
  assert.equal(s.activeConfirmedIncidents.length,0);
  assert.equal(s.events.at(-1).kind,'resolved');
  for(let i=0;i<16;i++){current+=60000;await monitor.sample()}
  s=monitor.snapshot();
  assert.equal(s.trend.length,10);
  assert.ok(!JSON.stringify(s).includes('NEVER_EXPORT'));
  current+=300000;
  s=monitor.snapshot();
  assert.equal(s.state,'unknown');
  assert.equal(s.dataFresh,false);
  assert.equal(s.assessment,null);
  monitor.stop();
});

test('Failed telemetry samples cannot magically resolve previous confirmed incidents',async()=>{
  let nowMs=now,down=false;
  const monitor=createSmartPlaybackMonitor({
    clock:()=>nowMs,collect:async()=>{
      if(down)throw Error('https://private.invalid/?password=SECRET');
      return evidence({faults:[
        {code:'gateway_media_interrupted',scope:'gateway_last_hour',count:1}]});
    }
  });
  await monitor.sample();nowMs+=60000;await monitor.sample();
  assert.equal(monitor.snapshot().activeConfirmedIncidents.length,1);
  down=true;nowMs+=60000;
  await monitor.sample();
  assert.equal(monitor.snapshot().state,'unknown');
  assert.equal(monitor.snapshot().dataFresh,false);
  assert.equal(monitor.snapshot().activeConfirmedIncidents.length,1);
  assert.ok(!JSON.stringify(monitor.snapshot()).includes('SECRET'));
});

test('Groq is optional and never called in background; only curated incident codes transmitted on click',async()=>{
  let calls=0,nowMs=now;
  const notReady=createSmartPlaybackAi({key:'',fetchImpl:async()=>{calls++}});
  assert.equal(notReady.status().configured,false);
  assert.equal((await notReady.explain(analyzeSmartPlaybackHealth(evidence(),{now}))).code,
    'playback_ai_not_configured');
  assert.equal(calls,0);
  const key='qa-groq-key-only-not-a-real-secret-987654321234567890';
  const llm=createSmartPlaybackAi({key,clock:()=>nowMs,
    fetchImpl:async(url,opts)=>{
      calls++;
      assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
      assert.equal(opts.method,'POST');
      assert.equal(opts.redirect,'error');
      assert.equal(opts.headers.authorization,'Bearer '+key);
      const body=opts.body;
      for(const secret of ['NEVER_EXPORT','private.invalid','username=','password=','rawUrl'])
        assert.ok(!body.includes(secret),'AI payload leak: '+secret);
      assert.match(body,/openai\/gpt-oss-120b/);
      assert.match(body,/provider_admission_refused/);
      return new Response(JSON.stringify({choices:[{message:{
        content:JSON.stringify({priorityCode:'provider_admission_refused',
          explanationAr:'راجع قيود المصدر واحرص على اختبار تشغيل القناة على الجهاز دون تغيير البث تلقائيا'})}}]}),{status:200});
    }});
  assert.equal(llm.status().callsSinceBoot,0);
  const diagnosis=analyzeSmartPlaybackHealth(evidence(),{now});
  const result=await llm.explain(diagnosis);
  assert.equal(result.ok,true);
  assert.equal(result.priorityCode,'provider_admission_refused');
  assert.equal(result.advisoryOnly,true);
  assert.equal(result.actionsExecuted,0);
  assert.equal(calls,1);
  assert.equal((await llm.explain(diagnosis)).code,'playback_ai_cooldown');
  nowMs+=60001;
  assert.equal((await llm.explain(diagnosis)).ok,true);
  assert.equal(calls,2);
});

test('Groq ignores hallucinated codes and URLs rather than turning model output into actions',async()=>{
  const key='qa-groq-key-only-not-a-real-secret-987654321234567890';
  const ai=createSmartPlaybackAi({key,fetchImpl:async()=>new Response(
    JSON.stringify({choices:[{message:{content:JSON.stringify({
      priorityCode:'delete_subscriber_account',
      explanationAr:'افتح https://malicious.private وبطل الاشتراك'})}}]}),{status:200})});
  const r=await ai.explain(analyzeSmartPlaybackHealth(evidence(),{now}));
  assert.equal(r.ok,false);
  assert.equal(r.code,'playback_ai_invalid_response');
  assert.ok(!JSON.stringify(r).includes('malicious.private'));
});

test('Operator Basic auth protects playback API, POST needs explicit action, no consumer source probes',async()=>{
  const secret='qa-smart-health-operator-token-strong-length';
  const originKey='qa-portal-bridge-strong-length-1234567890';
  let forwarded=0;
  const app=createOperatorDashboard({
    adminToken:secret,unifiedSecret:originKey,engineOrigin:'http://127.0.0.1:9',
    fetchImpl:async()=>{forwarded++;throw Error('should not fetch without sample')}
  });
  const server=createServer((req,res)=>{
    if(app.handle(req,res))return;
    res.writeHead(404);res.end();
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const denied=await fetch(base+'/operator/api/playback-health');
    assert.equal(denied.status,401);
    const auth='Basic '+Buffer.from('operator:'+secret).toString('base64');
    const allowed=await fetch(base+'/operator/api/playback-health',
      {headers:{authorization:auth}});
    assert.equal(allowed.status,200);
    assert.equal(allowed.headers.get('cache-control'),'no-store');
    const report=await allowed.json();
    assert.equal(report.ok,true);
    assert.equal(report.state,'unknown');
    assert.equal(report.dataFresh,false);
    assert.equal(report.ai.configured,false);
    assert.equal(forwarded,0,'dashboard GET does not poll providers');
    const wrong=await fetch(base+'/operator/api/playback-health/ai',{
      method:'POST',headers:{authorization:auth,
        'content-type':'application/json'},body:'{}'});
    assert.equal(wrong.status,403);
    const noKey=await fetch(base+'/operator/api/playback-health/ai',{
      method:'POST',headers:{authorization:auth,
        'x-blofy-operator-action':'playback-ai-explain'},body:'{}'});
    assert.equal(noKey.status,503);
    assert.equal((await noKey.json()).code,'playback_ai_not_configured');
    assert.equal(forwarded,0);
  }finally{
    app.stop();server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});

test('Smart Playback UI is CSP-safe, Arabic, separately displays real incidents and manual AI status',()=>{
  const html=renderOperatorDashboard('smart-playback-health-nonce');
  for(const id of ['smart-playback-panel','playback-health-refresh',
    'playback-health-status','playback-health-issues','playback-health-audio',
    'playback-health-video','playback-health-missing','playback-health-samples',
    'playback-health-incidents','playback-health-events',
    'playback-health-ai-button','playback-health-ai-result'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/عدم رصدها في العينة ليس إثباتًا/);
  assert.match(html,/Groq AI/);
  assert.match(html,/playback-ai-explain/);
  const script=html.match(/<script nonce="smart-playback-health-nonce">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
