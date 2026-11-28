// Passive MPEG-TS clock diagnostics for one upstream session.
// Never changes payloads, timestamps or continuity counters.
export function createLiveTsClockMonitor(){
  const WRAP=2**33, HALF=WRAP/2;
  let tail=new Uint8Array(0),packets=0,syncLosses=0,clockSamples=0;
  let backwards=0,largeForward=0,declaredDiscontinuities=0,maxGapMs=0;
  const clocks=new Map();
  function inspect(p){
    packets++;
    if((p[1]&128)!==0)return;
    const pid=((p[1]&31)<<8)|p[2],afc=(p[3]>>4)&3;
    if((afc!==2&&afc!==3)||p[4]<1||p[4]>183)return;
    const flags=p[5];
    if(flags&128){clocks.delete(pid);declaredDiscontinuities++}
    if(!(flags&16)||p[4]<7)return;
    const base=p[6]*2**25+p[7]*2**17+p[8]*512+p[9]*2+(p[10]>>7);
    const prior=clocks.get(pid);
    if(prior!==undefined){
      let delta=base-prior;
      if(delta>HALF)delta-=WRAP;
      if(delta< -HALF)delta+=WRAP;
      const ms=delta/90;
      if(ms< -100)backwards++;
      if(ms>1000)largeForward++;
      maxGapMs=Math.max(maxGapMs,Math.abs(ms));
    }
    if(clocks.has(pid)||clocks.size<64){clocks.set(pid,base);clockSamples++}
  }
  function push(chunk){
    const bytes=new Uint8Array(tail.length+chunk.length);
    bytes.set(tail);bytes.set(chunk,tail.length);
    let i=0;
    while(i+188<=bytes.length){
      if(bytes[i]!==71){
        syncLosses++;i++;
        while(i+188<=bytes.length&&bytes[i]!==71)i++;
        continue;
      }
      // Require a second sync byte when available before accepting alignment.
      if(i+188<bytes.length&&bytes[i+188]!==71){syncLosses++;i++;continue}
      inspect(bytes.subarray(i,i+188));i+=188;
    }
    tail=bytes.slice(i);
  }
  return {push,stats:()=>({packets,syncLosses,clockSamples,backwards,largeForward,
    declaredDiscontinuities,maxGapMs:Math.round(maxGapMs),decodedVideoVerified:false})};
}
