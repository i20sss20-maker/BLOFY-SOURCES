import {createLiveIngressQueue} from './live-ingress-queue.mjs';

// One attempt only. On clean EOF drain queued bytes before reporting end.
// On error/abort discard the queue and wait for both workers before the
// caller releases its existing upstream reservation. Never opens a socket.
export async function runLiveIngressSession({
  first,read,deliver,signal,stopRead=()=>{},onRead=()=>{},onQueue=()=>{},
  maxBytes=4*1024*1024,maxChunks=256
}){
  const q=createLiveIngressQueue({maxBytes,maxChunks});
  let failure=null,cleanEof=false;
  const report=()=>onQueue(q.stats());
  const abort=error=>{
    failure??=error instanceof Error?error:Error('ingress_session_aborted');
    q.abort();
    try{stopRead()}catch{}
  };
  const onAbort=()=>abort(signal.reason);
  if(signal?.aborted)onAbort();
  else signal?.addEventListener('abort',onAbort,{once:true});
  async function enqueue(value){
    onRead(value.byteLength);
    // Split large native chunks to fit the configured queue. The producer
    // retains at most one original read chunk outside the queue budget.
    for(let i=0;i<value.byteLength;i+=Math.min(maxBytes,128*1024)){
      const n=Math.min(maxBytes,128*1024);
      await q.push(value.subarray(i,i+n));report();
    }
  }
  async function produce(){
    try{
      if(failure)throw failure;
      await enqueue(first);
      for(;;){
        if(failure)throw failure;
        const part=await read();
        if(failure)throw failure;
        if(part.done){cleanEof=true;q.finish();report();return}
        if(part.value?.byteLength)await enqueue(part.value);
      }
    }catch(error){abort(error)}
  }
  async function consume(){
    try{
      for(;;){
        const chunk=await q.take();report();
        if(chunk===null)return;
        if(failure)throw failure;
        await deliver(chunk);
      }
    }catch(error){abort(error)}
  }
  try{
    await Promise.all([produce(),consume()]);
    if(failure)throw failure;
    return {cleanEof};
  }finally{
    signal?.removeEventListener('abort',onAbort);
    q.abort();report();
  }
}
