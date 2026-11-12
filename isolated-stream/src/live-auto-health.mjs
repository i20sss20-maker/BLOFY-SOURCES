// BLOFY AUTO HEALTH — bounded, privacy-preserving read-only health monitor.
// Scans *operator-created* MediaMTX paths, not customer subscriptions.
// A failed HLS probe is evidence of transport failure, not proof that the
// licensed source is unavailable or that a particular video codec is broken.
const PATH=/^live-[a-f0-9]{12}$/;
const MAX_EVENTS=60;
export function createLiveAutoHealth({
  liveSupervisor,relayStats=()=>null,clock=Date.now,
  scanIntervalMs=60000,staleAfterMs=600000,
  recoveryProbeEnabled=false,reprobeAfterMs=300000
}={}){
  if(!liveSupervisor||typeof liveSupervisor.list!=='function'||
     !Number.isInteger(scanIntervalMs)||scanIntervalMs<1000||scanIntervalMs>3600000||
     !Number.isInteger(staleAfterMs)||staleAfterMs<30000||staleAfterMs>86400000||
     !Number.isInteger(reprobeAfterMs)||reprobeAfterMs<60000||reprobeAfterMs>86400000)
    throw Error('auto_health_configuration_invalid');
  const tracking=new Map(),events=[];
  let lastCheck=null,timer=null,checking=false,lastError=null;
  let dashboard={ok:true,checkedAt:null,configured:true,recoveryProbeEnabled,
    scope:'operator_restream_only',customerTrafficChanged:false,
    realVideoDecoded:false,totals:{paths:0,healthy:0,failed:0,untested:0,
      checking:0,stale:0,warning:0},
    paths:[],events:[],relay:null};
  function event(path,kind,code){
    events.unshift({at:clock(),path,kind,code});
    if(events.length>MAX_EVENTS)events.length=MAX_EVENTS;
  }
  function statusOf(row){
    if(row.probePending===true)return 'checking';
    const probe=row.lastProbe;
    if(probe&&Number.isFinite(probe.at)&&clock()-probe.at>staleAfterMs)
      return 'stale';
    if(probe?.ok===true)return 'healthy';
    if(probe?.ok===false)return 'failed';
    if(typeof row.lastError==='string'&&
       /^restream_(?!switched_source)[a-z_]+$/.test(row.lastError))
      return 'warning';
    return 'untested';
  }
  function safeCode(row){
    const code=row.lastProbe?.code||row.lastError||'no_probe';
    return /^restream_[a-z_]{3,65}$/.test(code)||code==='ok'
      ?code:'unknown';
  }
  async function scan(){
    if(checking)return dashboard;
    checking=true;
    try{
      const snapshot=liveSupervisor.list();
      if(!snapshot||snapshot.ok!==true||!Array.isArray(snapshot.items))
        throw Error('auto_health_supervisor_unavailable');
      const known=new Set(),rows=[];
      const totals={paths:0,healthy:0,failed:0,untested:0,
        checking:0,stale:0,warning:0};
      let eligible=null;
      for(const item of snapshot.items.slice(0,256)){
        if(!PATH.test(item.path)||known.has(item.path))continue;
        known.add(item.path);
        const status=statusOf(item),reason=safeCode(item);
        let old=tracking.get(item.path);
        if(!old){
          old={lastSignal:null,failures:0,lastRecoveryAt:0,lastStatus:null};
          tracking.set(item.path,old);
        }
        const signal=typeof item.lastProbe?.at==='number'
          ?'probe:'+item.lastProbe.at+':'+String(item.lastProbe.ok)
          :item.lastError?'error:'+item.lastError:null;
        const failed=status==='failed'||status==='warning';
        if(failed&&signal&&signal!==old.lastSignal){
          old.failures++;old.lastSignal=signal;
          event(item.path,'transport_failure',reason);
        }
        if(status==='healthy'){
          if(old.failures>0)event(item.path,'transport_restored','probe_success');
          old.failures=0;old.lastSignal=signal;
        }
        old.lastStatus=status;
        totals.paths++;totals[status]++;
        rows.push({path:item.path,title:String(item.title||'').slice(0,120),
          status,reason,checkedAt:item.lastProbe?.at||null,
          consecutiveFailures:old.failures,
          sourceConnections:Number.isInteger(item.connections)?item.connections:null,
          backupConfigured:item.backupConfigured===true,
          failovers:Number.isInteger(item.failovers)?item.failovers:0});
        // Recovery is strictly opt-in: one operator HLS re-probe per cycle,
        // only on a path with a configured backup after distinct failures.
        if(recoveryProbeEnabled&&item.backupConfigured===true&&
           !item.probePending&&old.failures>=2&&
           clock()-old.lastRecoveryAt>=reprobeAfterMs&&!eligible){
          eligible={path:item.path,old};
        }
      }
      for(const path of tracking.keys())if(!known.has(path))tracking.delete(path);
      const raw=relayStats();
      const relay=raw&&typeof raw==='object'?{
        enabled:raw.enabled===true,sharedLiveEnabled:raw.sharedLiveEnabled===true,
        relayFailureTotal:Number.isInteger(raw.relayFailureTotal)?raw.relayFailureTotal:0,
        relayFailureCounts:Object.fromEntries(Object.entries(raw.relayFailureCounts||{})
          .filter(([code,count])=>/^relay_[a-z_]{3,60}$/.test(code)&&
            Number.isInteger(count)&&count>=0).slice(0,20))
      }:null;
      lastCheck=clock();lastError=null;
      dashboard={ok:true,checkedAt:lastCheck,configured:true,
        recoveryProbeEnabled,scope:'operator_restream_only',
        customerTrafficChanged:false,realVideoDecoded:false,
        totals,paths:rows,events:events.slice(),relay};
      if(eligible){
        eligible.old.lastRecoveryAt=clock();
        // Never stop or restart paths and never change the subscriber route.
        void Promise.resolve().then(()=>liveSupervisor.probe(eligible.path))
          .then(result=>{
            event(eligible.path,result?.body?.ok===true?
              'controlled_reprobe_requested':'reprobe_unavailable',
              'operator_path_only');
          }).catch(()=>event(eligible.path,'reprobe_unavailable','probe_failed'));
      }
      return dashboard;
    }catch{
      lastError='auto_health_read_unavailable';
      dashboard={...dashboard,ok:false,checkedAt:clock(),
        error:lastError,events:events.slice()};
      return dashboard;
    }finally{checking=false}
  }
  function start(){
    if(timer)return;
    void scan();
    timer=setInterval(()=>{void scan()},scanIntervalMs);
    timer.unref?.();
  }
  function stop(){if(timer){clearInterval(timer);timer=null}}
  return {start,stop,scan,snapshot:()=>({
    ...dashboard,events:events.slice(),
    isMonitoring:timer!==null,checkedAt:lastCheck,
    error:lastError
  })};
}
