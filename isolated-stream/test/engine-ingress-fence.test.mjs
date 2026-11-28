import test from 'node:test';
import assert from 'node:assert/strict';
import {createRelayIngressFence} from '../src/engine-ingress-fence.mjs';
test('central relay fence defaults off, configured mode denies stale or missing authority',async()=>{
 const env={BLOFY_RELAY_INGRESS_FENCE:'1',BLOFY_STREAM_RELAY_SHARED_TOKEN:'t'.repeat(40)};
 const response=body=>new Response(JSON.stringify(body),{status:200});
 const now=Date.now();
 let calls=0;
 assert.equal(await createRelayIngressFence({env:{},fetchImpl:async()=>{calls++;throw Error()}})(),true);
 assert.equal(calls,0);
 assert.equal(await createRelayIngressFence({env:{...env,BLOFY_STREAM_RELAY_SHARED_TOKEN:''}})(),false);
 const check=body=>createRelayIngressFence({env,fetchImpl:async(url,opts)=>{
  assert.equal(url,'https://blofy-activation-portal-production.up.railway.app/internal/legacy-ingress');
  assert.equal(opts.redirect,'error');assert.equal(opts.headers.authorization,'Bearer '+env.BLOFY_STREAM_RELAY_SHARED_TOKEN);
  return response(body);
 }})();
 assert.equal(await check({ok:true,mode:'legacy',observedAt:now}),true);
 assert.equal(await check({ok:true,mode:'draining',observedAt:now}),false);
 assert.equal(await check({ok:true,mode:'engine',observedAt:now}),false);
 assert.equal(await check({ok:true,mode:'legacy',observedAt:now-10000}),false);
 assert.equal(await check({ok:true,mode:'legacy',observedAt:now,extra:'x'.repeat(600)}),false);
 assert.equal(await createRelayIngressFence({env,fetchImpl:async()=>{throw Error('network')}})(),false);
});

test('ownership fence requires distinct credential and fails closed if not configured',async()=>{
 const env={BLOFY_RELAY_INGRESS_FENCE:'1',BLOFY_RELAY_ENGINE_OWNERSHIP:'1',BLOFY_STREAM_RELAY_SHARED_TOKEN:'s'.repeat(40),BLOFY_RELAY_ENGINE_HOLD_TOKEN:'o'.repeat(40)};
 let calls=0;
 const fetchImpl=async(url,opts)=>{calls++;assert.equal(opts.headers.authorization,'Bearer '+env.BLOFY_RELAY_ENGINE_HOLD_TOKEN);return new Response(JSON.stringify({ok:true,mode:'legacy',observedAt:Date.now()}))};
 assert.equal(await createRelayIngressFence({env:{...env,BLOFY_RELAY_INGRESS_FENCE:'0'},fetchImpl})(),false);
 assert.equal(await createRelayIngressFence({env:{...env,BLOFY_RELAY_ENGINE_HOLD_TOKEN:''},fetchImpl})(),false);
 assert.equal(await createRelayIngressFence({env:{...env,BLOFY_RELAY_ENGINE_HOLD_TOKEN:env.BLOFY_STREAM_RELAY_SHARED_TOKEN},fetchImpl})(),false);
 assert.equal(calls,0);
 assert.equal(await createRelayIngressFence({env,fetchImpl})(),true);
 assert.equal(calls,1);
 assert.equal(await createRelayIngressFence({env,fetchImpl:async()=>new Response('{}',{status:503})})(),false);
});
