import {analyzeSmartPlaybackHealth} from './smart-playback-triage.mjs';

// Passive administrator observatory, independent of the browser being open.
// Only existing internal telemetry is fetched, on a bounded minute cadence.
// Nothing here starts media, changes a codec, switches source or fixes users.
export function createSmartPlaybackMonitor({
  collect,clock=Date.now,intervalMs=60000,historyLimit=90,eventLimit=60
}={}){
  if(typeof collect!=='function'||typeof clock!=='function'||
     !Number.isInteger(intervalMs)||intervalMs<30000||intervalMs>300000||
     !Number.isInteger(historyLimit)||historyLimit<10||historyLimit>180||
     !Number.isInteger(eventLimit)||eventLimit<10||eventLimit>150)
    throw Error('smart_playback_monitor_config_invalid');
  let running=false,timer=null,inflight=null,latest=null,lastAt=0;
  const history=[],events=[],active=new Map();
  let samples=0,failures=0;
  function remember(target,item,max){
    target.push(item);while(target.length>max)target.shift();
  }
  function accept(result){
    const at=clock();
    lastAt=at;samples++;
    const analyzed=analyzeSmartPlaybackHealth(result,{now:at});
    latest=analyzed;
    if(analyzed.ok!==true){
      failures++;remember(history,{at,status:'unknown',issues:null},historyLimit);
      // Network failure is NOT a resolution of any earlier issue.
      return snapshot();
    }
    const present=new Map(analyzed.incidents.map(item=>[item.code,item]));
    for(const [code,item] of present){
      const existing=active.get(code);
      if(!existing){
        active.set(code,{count:1,misses:0,open:false,severity:item.severity});
        continue;
      }
      existing.count++;existing.misses=0;
      if(!existing.open&&existing.count>=2){
        existing.open=true;
        remember(events,{at,kind:'raised',code,severity:item.severity},eventLimit);
      }
    }
    for(const [code,state] of [...active]){
      if(present.has(code))continue;
      state.misses++;
      if(state.misses>=2){
        if(state.open)remember(events,{at,kind:'resolved',code,
          severity:state.severity},eventLimit);
        active.delete(code);
      }
    }
    remember(history,{at,status:analyzed.status,
      issues:analyzed.incidents.length,
      audio:analyzed.incidents.filter(x=>x.area==='audio'||x.area==='decoder').length,
      video:analyzed.incidents.filter(x=>x.area==='video').length,
      network:analyzed.incidents.filter(x=>x.area==='network'||x.area==='edge').length,
      missingLayers:analyzed.missingLayers.length},historyLimit);
    return snapshot();
  }
  function snapshot(){
    const now=clock();
    const stale=lastAt===0||now-lastAt>Math.max(150000,intervalMs*3);
    return {ok:true,readOnly:true,actionsTaken:0,
      mode:'passive_server_telemetry',
      monitorActive:running,
      dataFresh:!!latest?.ok&&!stale,
      lastCollectedAt:lastAt||null,sampleIntervalMs:intervalMs,
      samplesSinceBoot:samples,failedSamplesSinceBoot:failures,
      assessment:!stale&&latest?.ok?latest:null,
      // A stale/dropped monitor cannot promise that everything works.
      state:stale?'unknown':latest?.status||'unknown',
      activeConfirmedIncidents:[...active.entries()].filter(([,s])=>s.open)
        .map(([code,s])=>({code,severity:s.severity})).slice(0,20),
      trend:history.slice(),events:events.slice(),
      eventsRetainedMax:eventLimit,
      scope:'in_memory_this_stream_api_instance_only',
      decodedAudioVideoVerified:false,customerTrafficModified:false};
  }
  function sample(){
    if(inflight)return inflight;
    inflight=Promise.resolve().then(()=>collect()).then(accept)
      .catch(()=>{
        failures++;lastAt=clock();samples++;
        latest=null;
        remember(history,{at:lastAt,status:'unknown',issues:null},historyLimit);
        return snapshot();
      }).finally(()=>{inflight=null});
    return inflight;
  }
  function start(){
    if(running)return;
    running=true;
    void sample();
    timer=setInterval(()=>{void sample()},intervalMs);
    timer.unref?.();
  }
  function stop(){
    running=false;if(timer)clearInterval(timer);timer=null;
  }
  return {start,stop,snapshot,sample};
}
