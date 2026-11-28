// One upstream session, one producer, one consumer. This queue is an
// experimental ingress/delivery boundary, not a playout or rewind buffer.
// A full queue applies backpressure; it never silently drops TS bytes.
// No provider calls, credentials, quota decisions or cross-session state.
export function createLiveIngressQueue({maxBytes=4*1024*1024,maxChunks=256}={}){
  if(!Number.isSafeInteger(maxBytes)||maxBytes<188||maxBytes>16*1024*1024||
     !Number.isSafeInteger(maxChunks)||maxChunks<1||maxChunks>4096)
    throw Error('ingress_queue_capacity_invalid');
  const items=[];
  let bytes=0,peakBytes=0,fullCount=0,finished=false,aborted=false;
  let consumer=null,producer=null;
  const wakeConsumer=()=>{const wake=consumer;consumer=null;wake?.()};
  const wakeProducer=()=>{const wake=producer;producer=null;wake?.()};
  const endError=()=>Error('ingress_queue_aborted');
  async function push(chunk){
    if(!(chunk instanceof Uint8Array)||!chunk.byteLength||chunk.byteLength>maxBytes)
      throw Error('ingress_queue_chunk_invalid');
    if(producer)throw Error('ingress_queue_multiple_producers');
    if(aborted)throw endError();
    if(finished)throw Error('ingress_queue_finished');
    // Caller transfers ownership of the chunk until push resolves.
    // At most one producer chunk may be waiting outside the byte budget.
    while(bytes+chunk.byteLength>maxBytes||items.length>=maxChunks){
      fullCount++;
      await new Promise(resolve=>{producer=resolve});
      if(aborted)throw endError();
      if(finished)throw Error('ingress_queue_finished');
    }
    const copy=new Uint8Array(chunk);
    items.push(copy);bytes+=copy.byteLength;
    peakBytes=Math.max(peakBytes,bytes);
    wakeConsumer();
  }
  async function take(){
    if(consumer)throw Error('ingress_queue_multiple_consumers');
    while(!items.length){
      if(aborted)throw endError();
      if(finished)return null;
      await new Promise(resolve=>{consumer=resolve});
    }
    if(aborted)throw endError();
    const value=items.shift();
    bytes-=value.byteLength;wakeProducer();
    return value;
  }
  function finish(){
    if(aborted)return;
    finished=true;wakeConsumer();wakeProducer();
  }
  function abort(){
    aborted=true;finished=true;items.length=0;bytes=0;
    wakeConsumer();wakeProducer();
  }
  return {push,take,finish,abort,stats:()=>({
    queuedBytes:bytes,peakBytes,fullCount,maxBytes,maxChunks,queuedChunks:items.length,
    finished,aborted
  })};
}
