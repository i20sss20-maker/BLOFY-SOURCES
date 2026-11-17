// Live, read-only operator bridge QA against the authoritative Portal.
// A successful HTTP response does NOT prove a viewer decoded video,
// that writes work, or that a full Xtream library has been transferred.
// Deliberately do not GET codes or distributor listing at boot:
// their implementation currently runs DB schema migrations on reads.
const CHECKS=Object.freeze([
 Object.freeze({id:'sources',run:p=>p.overview()}),
 Object.freeze({id:'movie_catalog',run:p=>p.catalog({
  type:'movie',serverId:'',q:'',offset:0})}),
 Object.freeze({id:'private_content_hub',run:p=>p.contentHubStatus()}),
 Object.freeze({id:'season_queue_health',run:p=>p.contentHubSeasonHealth()}),
 Object.freeze({id:'daily_catalog_metadata',run:p=>p.opsDailyCatalogStatus()}),
 Object.freeze({id:'radio_source_catalog',run:p=>p.audioReadiness()}),
 Object.freeze({id:'code_distributor_store',run:p=>p.ownerAdminReadiness()})
]);

const cleanStatus=status=>Number.isInteger(status)&&status>=100&&status<=599?status:null;
async function check(target,client,clock){
 const start=clock();
 try{
  const result=await target.run(client);
  const httpStatus=cleanStatus(result?.status);
  const body=result?.body;
  const state=httpStatus===401||httpStatus===403?'blocked':
   httpStatus===null?'unknown':
   httpStatus>=500?'unavailable':
   httpStatus<200||httpStatus>=300?'unavailable':
   body?.ok===false?'degraded':body?.ok===true?'connected':'reachable';
  // Strict fields only. Do not print body (it can include subscribers,
  // source names, titles, storage keys or other sensitive metadata).
  return {id:target.id,state,httpStatus,
   elapsedMs:Math.max(0,Math.min(120000,clock()-start))};
 }catch{return {id:target.id,state:'unavailable',httpStatus:null,
  elapsedMs:Math.max(0,Math.min(120000,clock()-start))}}
}

export async function readOnlyOperatorSiteProof({
 client,clock=Date.now
}={}){
 if(!client||CHECKS.some(c=>typeof client[{
  sources:'overview',movie_catalog:'catalog',
  private_content_hub:'contentHubStatus',
  season_queue_health:'contentHubSeasonHealth',
  daily_catalog_metadata:'opsDailyCatalogStatus',
  radio_source_catalog:'audioReadiness',
  code_distributor_store:'ownerAdminReadiness'
 }[c.id]]!=='function'))throw Error('site_readiness_client_missing');
 const checks=[];
 // Limit concurrency to two to avoid a thundering herd against Portal.
 for(let i=0;i<CHECKS.length;i+=2){
  const results=await Promise.all(CHECKS.slice(i,i+2).map(x=>check(x,client,clock)));
  checks.push(...results);
 }
 return {
  ok:checks.every(x=>x.state==='connected'),
  scope:'real_authoritative_operator_read_endpoints',
  checks,
  checked:checks.length,
  connected:checks.filter(x=>x.state==='connected').length,
  reachable:checks.filter(x=>x.state==='reachable').length,
  degraded:checks.filter(x=>x.state==='degraded').length,
  unavailable:checks.filter(x=>x.state==='unavailable'||x.state==='blocked').length,
  sourceMediaRequests:0,customerWrites:0,customerCutover:false,
  fullLibraryCopiedVerified:false,realMediaDecoded:false,
  realCodeIssuanceVerified:false,realDistributorWriteVerified:false
 };
}
