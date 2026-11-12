// Privacy-safe operator support bundle. Whitelist enum codes and numeric
// counters only; no provider URL, credentials, source IDs, phone numbers,
// device IDs, media titles, customer counts by identity or IP addresses.
const SAFE_CHECK=/^[a-z][a-z0-9_]{1,50}$/;
const SAFE_STATUS=new Set(['ok','warning','unknown']);
const KEYS=new Set([
 'total','enabled','online','items','missing','due','recovered',
 'started','failed','interrupted','slowStarts','p95StartMs','medianStartMs',
 'clientClosed','sourceOutages','activeFeeds','viewers','paths','untested',
 'stale','checking','warning','hlsSessions','readyPaths','observed',
 'declaredAudio','missingAudio','errorPercent','versionCode','expiringSoon',
 'active','decodedOnClient','verifiedPlayback','apkBytesVerified',
 'signatureVerified','deviceUpdateTested','sha256FieldPresent','inspectedBytes'
]);
const allowed=code=>typeof code==='string'&&SAFE_CHECK.test(code)?code:'unrecognized';
const values=obj=>{
 const result={};
 if(!obj||typeof obj!=='object')return result;
 for(const [k,value] of Object.entries(obj).slice(0,50)){
  if(!KEYS.has(k))continue;
  if(typeof value==='boolean'){result[k]=value;continue}
  if(typeof value!=='number'||!Number.isFinite(value))continue;
  result[k]=Math.max(0,Math.min(1000000000,Math.trunc(value)));
 }
 return result;
};
export function buildOperatorSupportBundle(report,{createdAt=new Date().toISOString()}={}){
 if(!report||report.ok!==true||!Array.isArray(report.checks))
  return {ok:false,code:'audit_not_available'};
 const checks=report.checks.slice(0,50).map(c=>({
  type:allowed(c.id),
  status:SAFE_STATUS.has(c.status)?c.status:'unknown',
  code:allowed(c.code),
  metrics:values(c.metrics)
 }));
 const recommendations=(Array.isArray(report.recommendations)?
  report.recommendations:[]).slice(0,12).map(r=>({
  type:allowed(r.checkId),code:allowed(r.code),
  priority:['high','medium','low'].includes(r.priority)?r.priority:'low',
  applied:false
 }));
 const counts={ok:checks.filter(c=>c.status==='ok').length,
  warning:checks.filter(c=>c.status==='warning').length,
  unknown:checks.filter(c=>c.status==='unknown').length};
 return {
  ok:true,schema:'blofy-stream-support-v1',
  reportTime:typeof createdAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(createdAt)?
    createdAt.slice(0,32):new Date().toISOString(),
  checkedAt:Number.isFinite(report.checkedAt)?report.checkedAt:null,
  readOnly:true,sourceIdIncluded:false,credentialsIncluded:false,
  customerIdentifiersIncluded:false,mediaSampleFetched:false,
  playbackOnDeviceVerified:false,
  totals:counts,checks,recommendations
 };
}
