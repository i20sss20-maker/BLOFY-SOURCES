// Private HLS read-through edge reachability for BLOFY operator.
// Non-media GET / never starts an Origin path. It is a CONTROL-PLANE signal,
// not a test of video playback, provider connections, or customer availability.
const PRIVATE_EDGE='http://blofy-stream-read-replica.railway.internal:8888';
export function createReadReplicaObserver({fetchImpl=fetch,timeoutMs=1800}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<250||timeoutMs>5000)
   throw Error('read_replica_timeout_invalid');
 let latest=null;
 async function check(){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),timeoutMs);
   timer.unref?.();
   const now=new Date().toISOString();
   try{
     const response=await fetchImpl(PRIVATE_EDGE+'/',{
       method:'GET',redirect:'manual',cache:'no-store',signal:controller.signal,
       headers:{accept:'text/plain'}
     });
     await response.body?.cancel?.().catch(()=>{});
     // HLS root commonly returns 404. This establishes that the isolated
     // read-replica service is alive, not that a stream is ready.
     const reachable=response.status>=200&&response.status<500;
     latest={configured:true,reachable,privateNetworkOnly:true,
       service:'BLOFY private HLS read edge',httpStatus:response.status,
       probedAt:now,transport:'private_hls_root_only',
       providerRequests:0,originPathsRequested:0,
       actualVideoVerified:false,customersRouted:false,
       code:reachable?'private_edge_reachable':'private_edge_http_error'};
     return {...latest};
   }catch{
     latest={configured:true,reachable:false,privateNetworkOnly:true,
       service:'BLOFY private HLS read edge',httpStatus:null,probedAt:now,
       transport:'private_hls_root_only',providerRequests:0,
       originPathsRequested:0,actualVideoVerified:false,customersRouted:false,
       code:'private_edge_unreachable'};
     return {...latest};
   }finally{clearTimeout(timer)}
 }
 return {check,snapshot:()=>latest?{...latest}:{configured:true,reachable:null,
    privateNetworkOnly:true,service:'BLOFY private HLS read edge',
    actualVideoVerified:false,customersRouted:false,code:'not_checked'}};
}
