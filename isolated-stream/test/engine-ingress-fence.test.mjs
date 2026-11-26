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
