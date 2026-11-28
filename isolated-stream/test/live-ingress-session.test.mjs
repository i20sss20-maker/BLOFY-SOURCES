import test from 'node:test';
import assert from 'node:assert/strict';
import {runLiveIngressSession} from '../src/live-ingress-session.mjs';
const p=n=>new Uint8Array(188).fill(n);

test('reader advances while delivery waits and drains clean EOF in order',{timeout:3000},async()=>{
  let release,started,reads=0;
  const waiting=new Promise(r=>release=r), entered=new Promise(r=>started=r);
  const got=[],metrics=[];
  const running=runLiveIngressSession({
    first:p(1),maxBytes:376,maxChunks:2,
    read:async()=>++reads===1?{value:p(2),done:false}:{done:true},
    deliver:async v=>{if(!got.length){started();await waiting}got.push(v[0])},
    onQueue:s=>metrics.push(s)
  });
  try{
    await entered;
    for(let i=0;i<50&&reads<2;i++)await new Promise(r=>setTimeout(r,5));
    assert.equal(reads,2);
    assert.deepEqual(got,[]);
  }finally{release()}
  assert.deepEqual(await running,{cleanEof:true});
  assert.deepEqual(got,[1,2]);
  assert.ok(metrics.every(s=>s.queuedBytes<=376));
});

test('delivery failure stops pending upstream read and propagates original error',{timeout:3000},async()=>{
  let stop,stopped=0;
  const pending=new Promise(r=>stop=r);
  await assert.rejects(runLiveIngressSession({
    first:p(1),read:()=>pending,
    stopRead:()=>{stopped++;stop({done:true})},
    deliver:async()=>{throw Error('delivery_failed')}
  }),/delivery_failed/);
  assert.ok(stopped>=1);
});

test('abort retires buffered session without mixing data into next session',{timeout:3000},async()=>{
  const controller=new AbortController();
  let stop;
  const pending=new Promise(r=>stop=r);
  const received=[];
  await assert.rejects(runLiveIngressSession({
    first:p(1),signal:controller.signal,read:()=>pending,
    stopRead:()=>stop({done:true}),
    deliver:async v=>{received.push(v[0]);controller.abort(Error('retired'))}
  }),/retired/);
  await runLiveIngressSession({first:p(2),read:async()=>({done:true}),
    deliver:async v=>received.push(v[0])});
  assert.deepEqual(received,[1,2]);
});
