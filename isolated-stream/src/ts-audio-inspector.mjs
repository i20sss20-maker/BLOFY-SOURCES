// Read-only, bounded MPEG-TS PAT/PMT audio track introspection.
// Works on bytes already crossing an authorized live stream; NEVER opens
// source connections, decodes audio, rewrites a packet or saves media bytes.
// Metadata is kept only in this process and never includes provider URLs,
// PID values, programme names, account data or subscriber identifiers.
const AUDIO=new Map([
  [0x03,'mpeg-audio'],[0x04,'mpeg-audio'],[0x0f,'aac'],
  [0x11,'aac-latm'],[0x81,'ac3'],[0x87,'eac3'],[0x80,'lpcm'],
  [0x8a,'dts'],[0x83,'truehd']
]);
const VIDEO=new Map([
  [0x01,'mpeg1-video'],[0x02,'mpeg2-video'],[0x10,'mpeg4-video'],
  [0x1b,'h264'],[0x24,'hevc'],[0x42,'avs-video']
]);
const DESC=new Map([[0x6a,'ac3'],[0x7a,'eac3'],[0x7b,'dts'],[0x7c,'aac']]);
const MAX_SECTION=4096;
const PACKET=188;
function descriptors(bytes){
  for(let i=0;i+2<=bytes.length;){
    const len=bytes[i+1],tag=bytes[i];
    if(i+2+len>bytes.length)break;
    if(DESC.has(tag))return DESC.get(tag);
    i+=2+len;
  }
  return '';
}
export function createTsAudioInspector({maxBytes=188*900}={}){
  if(!Number.isSafeInteger(maxBytes)||maxBytes<PACKET||maxBytes>PACKET*1500)
    throw Error('ts_audio_probe_budget_invalid');
  let used=0,buffer=Buffer.alloc(0),pmtPid=null,patSeen=false,pmtSeen=false,
    detected=false,packets=0,audioPayloadPackets=0,videoPayloadPackets=0,
    audioContinuityGaps=0,videoContinuityGaps=0,
    audioTransportErrorPackets=0,videoTransportErrorPackets=0,
    audioDuplicateCounters=0,videoDuplicateCounters=0;
  const sections=new Map(),audio=new Set(),video=new Set(),
    audioPids=new Set(),videoPids=new Set(),continuity=new Map();
  function pat(section){
    if(section[0]!==0)return;
    patSeen=true;
    for(let i=8;i+4<=section.length-4;i+=4){
      const program=(section[i]<<8)|section[i+1];
      if(!program)continue;
      const pid=((section[i+2]&31)<<8)|section[i+3];
      if(pid>0&&pid<8191){pmtPid=pid;return;}
    }
  }
  function pmt(section){
    if(section[0]!==2||section.length<16)return;
    const programInfo=((section[10]&15)<<8)|section[11];
    let pos=12+programInfo,end=section.length-4;
    if(pos>end)return;
    const a=new Set(),v=new Set(),aPids=new Set(),vPids=new Set();
    while(pos+5<=end){
      const kind=section[pos];
      const streamPid=((section[pos+1]&31)<<8)|section[pos+2];
      const info=((section[pos+3]&15)<<8)|section[pos+4];
      const next=pos+5+info;
      if(next>end)return;
      const codec=AUDIO.get(kind)||(kind===0x06?
        descriptors(section.subarray(pos+5,next)):'');
      if(codec){a.add(codec);if(streamPid>0&&streamPid<8191)aPids.add(streamPid)}
      if(VIDEO.has(kind)){
        v.add(VIDEO.get(kind));if(streamPid>0&&streamPid<8191)vPids.add(streamPid)
      }
      pos=next;
    }
    pmtSeen=true;
    // Preserve continuity on periodic repeated PMT sections; clear only
    // retired elementary PID state (e.g. a licensed source changes tracks).
    for(const pid of continuity.keys())
      if(!aPids.has(pid)&&!vPids.has(pid))continuity.delete(pid);
    // Latest PMT replaces prior program declarations. Never return raw PIDs.
    audio.clear();video.clear();audioPids.clear();videoPids.clear();
    for(const x of a)audio.add(x);
    for(const x of v)video.add(x);
    for(const pid of aPids)audioPids.add(pid);
    for(const pid of vPids)videoPids.add(pid);
    detected=audio.size>0&&video.size>0;
  }
  function psi(pid,data,pusi){
    if(pusi){
      if(!data.length)return;
      const pointer=data[0],start=1+pointer;
      if(start>=data.length)return;
      sections.set(pid,Buffer.from(data.subarray(start)));
    }else if(sections.has(pid)){
      const prev=sections.get(pid);
      if(prev.length>MAX_SECTION)return sections.delete(pid);
      sections.set(pid,Buffer.concat([prev,data]));
    }else return;
    const section=sections.get(pid);
    if(section.length<3)return;
    const size=3+(((section[1]&15)<<8)|section[2]);
    if(size<8||size>MAX_SECTION){sections.delete(pid);return}
    if(section.length<size)return;
    sections.delete(pid);
    if(pid===0)pat(section.subarray(0,size));
    else if(pid===pmtPid)pmt(section.subarray(0,size));
  }
  function packet(bytes){
    if(bytes.length!==PACKET||bytes[0]!==0x47)return;
    const pid=((bytes[1]&31)<<8)|bytes[2];
    const isAudio=audioPids.has(pid),isVideo=videoPids.has(pid);
    const tracked=isAudio||isVideo;
    // TEI marks this packet as untrustworthy: count it, do not parse its
    // media payload or treat a later CC jump as a second confirmed error.
    if(bytes[1]&0x80){
      if(isAudio)audioTransportErrorPackets++;
      if(isVideo)videoTransportErrorPackets++;
      if(tracked)continuity.delete(pid);
      return;
    }
    const control=(bytes[3]>>4)&3;
    if(!control)return; // Reserved adaptation_field_control=00.
    let offset=4,discontinuity=false;
    if(control&2){
      const adaptationLength=bytes[4];
      if(5+adaptationLength>PACKET)return;
      discontinuity=adaptationLength>0&&(bytes[5]&0x80)!==0;
      offset=5+adaptationLength;
      if(discontinuity&&tracked)continuity.delete(pid);
    }
    if(!(control&1)||offset>=PACKET)return; // No usable payload.
    // PMT-declared audio/video PID Continuity Counters increment *only*
    // for payload packets and wrap 15->0. Adaptation-only packets do not
    // increment; a signalled discontinuity resets the expected sequence.
    // A repeated same counter can be an allowed retransmission: report
    // separately and NEVER claim it proves loss or decoder malfunction.
    if(tracked){
      const cc=bytes[3]&0x0f,previous=continuity.get(pid);
      if(previous!==undefined){
        if(cc===previous){
          if(isAudio)audioDuplicateCounters++;
          if(isVideo)videoDuplicateCounters++;
        }else if(cc!==((previous+1)&0x0f)){
          if(isAudio)audioContinuityGaps++;
          if(isVideo)videoContinuityGaps++;
        }
      }
      continuity.set(pid,cc);
    }
    // Actual transport payload availability, not decoded sound/image.
    if(isAudio)audioPayloadPackets++;
    if(isVideo)videoPayloadPackets++;
    if(pid!==0&&pid!==pmtPid)return;
    psi(pid,bytes.subarray(offset),(bytes[1]&0x40)!==0);
  }
  function push(chunk){
    if(used>=maxBytes)return summary();
    if(!Buffer.isBuffer(chunk)&&!(chunk instanceof Uint8Array))return summary();
    const safe=Buffer.from(chunk);
    const take=Math.min(maxBytes-used,safe.length);
    if(!take)return summary();
    used+=take;
    // Carry at most 187 trailing bytes; reject garbage while re-syncing.
    const incoming=Buffer.concat([buffer,safe.subarray(0,take)]);
    let pos=0;
    while(pos+PACKET<=incoming.length){
      if(incoming[pos]!==0x47 ||
        (pos+PACKET*2<=incoming.length&&incoming[pos+PACKET]!==0x47)){
        pos++;continue;
      }
      packet(incoming.subarray(pos,pos+PACKET));packets++;pos+=PACKET;
    }
    buffer=Buffer.from(incoming.subarray(pos,Math.min(incoming.length,pos+PACKET-1)));
    return summary();
  }
  function summary(){
    const status=pmtSeen?(audio.size?'audio-stream-declared':'no-audio-stream-declared'):
      used>=maxBytes?'pmt-not-observed':
      patSeen?'waiting-for-pmt':packets?'waiting-for-pat':'not-observed';
    return {status,audioCodecs:[...audio].slice(0,5),
      videoCodecs:[...video].slice(0,5),
      inspectedBytes:used,checkedPackets:packets,
      audioPayloadPackets,videoPayloadPackets,
      audioContinuityGaps,videoContinuityGaps,
      audioTransportErrorPackets,videoTransportErrorPackets,
      audioDuplicateCounters,videoDuplicateCounters,
      continuityIndicatesPlaybackFailure:false,
      samplingComplete:used>=maxBytes,
      hasAudioStream:audio.size>0,
      decodedAudio:false,sourceChanged:false};
  }
  return {push,summary};
}
