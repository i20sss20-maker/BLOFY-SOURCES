import test from 'node:test';
import assert from 'node:assert/strict';
import {createTsAudioInspector} from '../src/ts-audio-inspector.mjs';
const PACKET=188;
function ts(pid,payload,{first=true}={}){
 const b=Buffer.alloc(PACKET,0xff);
 b[0]=0x47;b[1]=((pid>>8)&0x1f)|(first?0x40:0);
 b[2]=pid&0xff;b[3]=0x10;
 const bytes=first?Buffer.concat([Buffer.from([0]),payload]):payload;
 assert.ok(bytes.length<=184);
 bytes.copy(b,4);return b;
}
function pat(){
 return Buffer.from([0,0xb0,13,0,1,0xc1,0,0,0,1,0xe1,0,0,0,0,0]);
}
function pmt(types){
 const length=13+types.length*5;
 const b=Buffer.from([2,0xb0,length,0,1,0xc1,0,0,0xe1,1,0xf0,0,
  ...types.flatMap((type,i)=>[type,0xe1,0x20+i,0xf0,0]),0,0,0,0]);
 return b;
}
test('passive MPEG-TS introspection discovers AAC and H264 declared in PMT',()=>{
 const i=createTsAudioInspector();
 const bytes=Buffer.concat([ts(0,pat()),ts(256,pmt([0x1b,0x0f]))]);
 i.push(bytes.subarray(0,201));
 const r=i.push(bytes.subarray(201));
 assert.equal(r.status,'audio-stream-declared');
 assert.deepEqual(r.audioCodecs,['aac']);
 assert.deepEqual(r.videoCodecs,['h264']);
 assert.equal(r.hasAudioStream,true);
 assert.equal(r.decodedAudio,false);
 assert.equal(r.sourceChanged,false);
 assert.ok(r.checkedPackets>=2);
 assert.doesNotMatch(JSON.stringify(r),/password|url|sourceId|itemId/i);
});
test('PMT with no audio flags absence in the observed primary program, not confirmed silence',()=>{
 const i=createTsAudioInspector({maxBytes:PACKET*3});
 const r=i.push(Buffer.concat([ts(0,pat()),ts(256,pmt([0x24]))]));
 assert.equal(r.status,'no-audio-stream-declared');
 assert.equal(r.hasAudioStream,false);
 assert.deepEqual(r.videoCodecs,['hevc']);
 assert.equal(r.decodedAudio,false);
});
test('when PAT or PMT not observed remain uncertain and never fabricate audio',()=>{
 const i=createTsAudioInspector({maxBytes:PACKET*2});
 assert.equal(i.push(ts(0,pat())).status,'waiting-for-pmt');
 const r=i.push(ts(321,Buffer.from('non-media')));
 assert.equal(r.status,'pmt-not-observed');
 assert.equal(r.hasAudioStream,false);
 assert.equal(r.audioCodecs.length,0);
});
test('audio codecs and alternative private-stream descriptors use fixed safe labels',()=>{
 const i=createTsAudioInspector();
 const p=Buffer.from([2,0xb0,0x1e,0,1,0xc1,0,0,0xe1,1,0xf0,0,
  0x1b,0xe1,0x20,0xf0,0,
  0x06,0xe1,0x21,0xf0,0x02,0x6a,0x00,
  0x0f,0xe1,0x22,0xf0,0,
  0,0,0,0]);
 p[2]=p.length-3;
 const r=i.push(Buffer.concat([ts(0,pat()),ts(256,p)]));
 assert.deepEqual(r.audioCodecs,['ac3','aac']);
});
test('garbage, short fragments, invalid budgets and untrusted IDs cannot crash diagnostics',()=>{
 assert.throws(()=>createTsAudioInspector({maxBytes:20}),/budget_invalid/);
 const i=createTsAudioInspector({maxBytes:PACKET});
 const a=i.push(Buffer.alloc(10,1));
 assert.equal(a.status,'not-observed');
 const r=i.push(Buffer.alloc(512,0));
 assert.equal(r.status,'pmt-not-observed');
 assert.equal(r.inspectedBytes,PACKET);
 assert.equal(i.push(null).inspectedBytes,PACKET);
 const different=createTsAudioInspector();
 assert.equal(different.push(ts(0,pat())).status,'waiting-for-pmt');
});
