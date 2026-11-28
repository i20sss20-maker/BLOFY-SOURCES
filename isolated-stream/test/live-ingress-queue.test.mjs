import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveIngressQueue} from '../src/live-ingress-queue.mjs';
const packet=n=>new Uint8Array(188).fill(n);

test('independent ingress queue preserves order and drains on clean EOF',async()=>{
  const q=createLiveIngressQueue({maxBytes:376});
  await q.push(packet(1));await q.push(packet(2));q.finish();
  assert.deepEqual(await q.take(),packet(1));
  assert.deepEqual(await q.take(),packet(2));
  assert.equal(await q.take(),null);
  assert.equal(q.stats().queuedBytes,0);
  await assert.rejects(q.push(packet(3)),/finished/);
});
test('full queue bounds memory, waits, and never loses transport bytes',async()=>{
  const q=createLiveIngressQueue({maxBytes:188});
  await q.push(packet(1));
  let accepted=false;
  const pending=q.push(packet(2)).then(()=>{accepted=true});
  assert.equal(accepted,false);
  assert.equal(q.stats().queuedBytes,188);
  assert.equal(q.stats().fullCount,1);
  assert.deepEqual(await q.take(),packet(1));
  await pending;
  assert.deepEqual(await q.take(),packet(2));
  assert.equal(q.stats().peakBytes,188);
  q.finish();
});
test('abort discards old session and wakes blocked readers or writers',async()=>{
  const old=createLiveIngressQueue({maxBytes:188});
  await old.push(packet(1));
  const waiting=old.push(packet(2));
  old.abort();
  await assert.rejects(waiting,/aborted/);
  await assert.rejects(old.take(),/aborted/);
  assert.equal(old.stats().queuedBytes,0);
  const next=createLiveIngressQueue({maxBytes:188});
  await next.push(packet(3));
  assert.deepEqual(await next.take(),packet(3));
  const blocked=next.take();next.abort();
  await assert.rejects(blocked,/aborted/);
});
test('a blocked channel does not block a second independent queue',async()=>{
  const a=createLiveIngressQueue({maxBytes:188});
  const b=createLiveIngressQueue({maxBytes:188});
  await a.push(packet(1));
  const blocked=a.push(packet(2));
  await b.push(packet(3));
  assert.deepEqual(await b.take(),packet(3));
  a.abort();await assert.rejects(blocked,/aborted/);b.finish();
});
test('rejects oversize chunks and makes an owned copy',async()=>{
  assert.throws(()=>createLiveIngressQueue({maxBytes:0}),/capacity/);
  const q=createLiveIngressQueue({maxBytes:188});
  await assert.rejects(q.push(new Uint8Array(189)),/chunk/);
  const input=packet(1);await q.push(input);input.fill(9);
  assert.deepEqual(await q.take(),packet(1));q.finish();
});
