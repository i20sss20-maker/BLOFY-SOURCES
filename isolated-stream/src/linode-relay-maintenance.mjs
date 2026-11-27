// Maintenance is deliberately explicit and default off. In maintenance the
// independent service permits only read-only health/status routes. No grant,
// existing ticket redemption, diagnostic or dashboard action can open a feed.
// This is not a provider-wide drain or proof that remote sockets are closed.
const healthPaths=new Set(['/health','/health/media','/internal/relay-health',
 '/internal/engine-quality-metrics','/internal/media-hour-report']);
export function relayMaintenanceActive(env=process.env){
 return env.BLOFY_LINODE_RELAY_MAINTENANCE==='1';
}
export function relayMaintenanceBlocks(method,url,active){
 if(active!==true)return false;
 if(method==='POST'&&url==='/internal/xtream-catalog-relay')return false;
 if(method!=='GET'&&method!=='HEAD')return true;
 try{return !healthPaths.has(new URL(url||'/','http://localhost').pathname)}
 catch{return true}
}
export function drainObservation(stats){
 const f=stats?.fanout;
 const counters={activeFeeds:f?.activeFeeds,viewers:f?.viewers,
  pendingSourceHandoffs:f?.pendingSourceHandoffs,
  activeDirectMediaClients:stats?.activeDirectMediaClients};
 const localRelayIdle=Object.values(counters).every(v=>Number.isSafeInteger(v)&&v===0);
 return {...Object.fromEntries(Object.entries(counters).map(([k,v])=>[k,Number.isSafeInteger(v)&&v>=0?v:null])),
  localRelayIdle,providerSlotVerified:false,allPathsDrained:false};
}
