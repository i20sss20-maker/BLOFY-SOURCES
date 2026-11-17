// Consent-gated passive MPEG-TS capture from an existing operator feed.
// This module NEVER opens a connection, fetches HLS, or changes media packets.
const ID=/^live-[0-9a-f]{12}$/;
const PACKET=188;
const DEFAULT_MIN=188*320;     // 60,160 bytes
const DEFAULT_TARGET=188*6000; // 1,128,000 bytes; under 2 MB lab ceiling
const LIMIT=2_000_000;
const CHUNK=64*1024;

export function createPassiveTsRecorder({
  clock=Date.now,timeoutMs=18000,cooldownMs=90000,
  minBytes=DEFAULT_MIN,targetBytes=DEFAULT_TARGET
}={}){
  if(typeof clock!=='function'||!Number.isSafeInteger(timeoutMs)||
    timeoutMs<100||timeoutMs>30000||!Number.isSafeInteger(cooldownMs)||
    cooldownMs<30000||cooldownMs>300000||
    minBytes<PACKET*12||minBytes%PACKET!==0||
    targetBytes<=minBytes||targetBytes>LIMIT||targetBytes%PACKET!==0)
    throw Error('passive_sample_recorder_invalid_configuration');
  let active=null,lastStarted=-Infinity;
  const result=(status,code,more={})=>({
    status,code,readFromExistingFeedOnly:true,providerRequestsCreated:0,
    operatorPathsCreated:0,customerRoutesChanged:false,...more
  });
  function finish(slot,status,code,complete=false){
    if(active!==slot)return;
    active=null;
    clearTimeout(slot.timeout);
    let bytes=null;
    if(complete&&slot.size>=minBytes)
      bytes=Buffer.concat(slot.parts,slot.size);
    slot.parts=[];slot.tail=Buffer.alloc(0);
    slot.size=0;slot.synced=false;
    slot.resolve(result(bytes?200:status,code,bytes?{bytes}:{}));
  }
  function request(name,session){
    if(!ID.test(name)||!Number.isSafeInteger(session)||session<1)
      return Promise.resolve(result(400,'passive_capture_invalid_selection'));
    if(active)return Promise.resolve(result(409,'passive_capture_busy'));
    const now=clock();
    if(now-lastStarted<cooldownMs)
      return Promise.resolve(result(429,'passive_capture_cooldown',{
        retryAfterMs:cooldownMs-(now-lastStarted)
      }));
    lastStarted=now;
    return new Promise(resolve=>{
      const slot={name,session,size:0,parts:[],tail:Buffer.alloc(0),
        synced:false,skipped:0,resolve,timeout:null};
      active=slot;
      slot.timeout=setTimeout(()=>{
        // A partial, packet-aligned sample may still be useful. Never claim
        // its size or quality validates the entire source channel.
        finish(slot,504,slot.size>=minBytes?
          'passive_sample_partial':'passive_capture_timeout',
        slot.size>=minBytes);
      },timeoutMs);
      slot.timeout.unref?.();
    });
  }
  function offerPart(slot,part){
    if(!part.length||active!==slot)return;
    let joined=slot.tail.length?Buffer.concat([slot.tail,part]):part;
    if(!slot.synced){
      let offset=-1;
      for(let i=0;i+PACKET*3<=joined.length;i++){
        if(joined[i]===0x47&&joined[i+PACKET]===0x47&&
          joined[i+PACKET*2]===0x47){
          offset=i;break;
        }
      }
      if(offset<0){
        slot.skipped+=Math.max(0,joined.length-(PACKET*3-1));
        if(slot.skipped>LIMIT){
          finish(slot,422,'passive_ts_alignment_failed');
          return;
        }
        slot.tail=Buffer.from(joined.subarray(
          Math.max(0,joined.length-(PACKET*3-1))));
        return;
      }
      slot.skipped+=offset;slot.synced=true;
      joined=joined.subarray(offset);
    }
    const count=Math.min(Math.floor(joined.length/PACKET),
      (targetBytes-slot.size)/PACKET);
    for(let i=0;i<count;i++){
      const pos=i*PACKET;
      if(joined[pos]!==0x47||((joined[pos+3]&0x30)===0)){
        finish(slot,422,'passive_ts_sync_lost');
        return;
      }
    }
    const size=count*PACKET;
    if(size){
      slot.parts.push(Buffer.from(joined.subarray(0,size)));
      slot.size+=size;
    }
    slot.tail=Buffer.from(joined.subarray(size));
    if(slot.size>=targetBytes)finish(slot,200,'passive_sample_complete',true);
  }
  function offer(name,session,chunk){
    const slot=active;
    if(!slot||slot.name!==name||slot.session!==session||
      !Buffer.isBuffer(chunk))return;
    for(let start=0;start<chunk.length&&active===slot;start+=CHUNK)
      offerPart(slot,chunk.subarray(start,start+CHUNK));
  }
  function abort(name,session){
    if(active?.name===name&&active.session===session)
      finish(active,409,'passive_feed_session_ended');
  }
  function isBusy(){return active!==null;}
  function pending(){return active===null?null:{path:active.name,session:active.session};}
  return {request,offer,abort,isBusy,pending};
}
