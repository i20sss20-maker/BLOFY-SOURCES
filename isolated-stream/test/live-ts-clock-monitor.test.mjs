import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveTsClockMonitor} from '../src/live-ts-clock-monitor.mjs';
function packet(base,{pid=256,discontinuity=false}={}){
 const p=new Uint8Array(188).fill(255);
 p[0]=71;p[1]=pid>>8;p[2]=pid&255;p[3]=0x20;p[4]=183;
 p[5]=16|(discontinuity?128:0);
 p[6]=Math.floor(base/2**25)&255;p[7]=Math.floor(base/2**17)&255;
 p[8]=Math.floor(base/512)&255;p[9]=Math.floor(base/2)&255;
 p[10]=(base%2)*128|126;p[11]=0;return p;
}
test('PCR handles fragmented TS packets and wrap without false regression',()=>{
 const m=createLiveTsClockMonitor(),a=packet(2**33-9000),b=packet(9000);
 m.push(a.subarray(0,51));m.push(a.subarray(51));m.push(b);
 assert.equal(m.stats().clockSamples,2);assert.equal(m.stats().backwards,0);
 assert.equal(m.stats().maxGapMs,200);
});
test('PCR records backward jump and large forward gap but honors declared reset',()=>{
 const m=createLiveTsClockMonitor();
 for(const p of [packet(900000),packet(810000),packet(990000),packet(0,{discontinuity:true}),packet(9000)])m.push(p);
 assert.equal(m.stats().backwards,1);assert.equal(m.stats().largeForward,1);
 assert.equal(m.stats().declaredDiscontinuities,1);assert.equal(m.stats().maxGapMs,2000);
});
test('PCR comparisons stay scoped to PID and session',()=>{
 const m=createLiveTsClockMonitor();m.push(packet(900000));m.push(packet(0,{pid:257}));
 assert.equal(m.stats().backwards,0);
 const next=createLiveTsClockMonitor();next.push(packet(0));
 assert.equal(next.stats().backwards,0);
});
