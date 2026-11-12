import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';

const secret='railway-fixed-bridge-key-with-more-than-forty-characters';
test('unified operator UI contains real source management, no legacy redirect or demo controls',()=>{
  const html=renderOperatorDashboard('nonce123');
  for(const item of ['id="source-form"','id="source-list"','id="account-list"',
    'id="library-results"','id="stream-probe"','id="diagnostic-media"'])
    assert.ok(html.includes(item),item);
  // All subscription-code operations stay within the STREAM operator console.
  // The protected backend bridge is internal; there must be no offsite admin link.
  assert.equal(html.includes("location.href='/sources-admin'"),false);
  assert.equal(html.includes('href="https://blofyplayer.com/sources-admin#xtream"'),false);
  assert.ok(html.includes('id="codes-dialog"'));
  assert.ok(html.includes('المميزات وإدارة الكود'));
  assert.equal(html.includes('/admin#'),false);
  assert.equal(html.includes('demo-start'),false);
  assert.equal(html.includes('blofy-demo'),false);
  const script=html.match(/<script nonce="nonce123">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
test('unconfigured bridge refuses all source mutations without outbound requests',async()=>{
  const client=createUnifiedPortalClient();
  const result=await client.addSource({name:'source',username:'user',password:'secret'});
  assert.equal(result.status,503);
});
test('bridge calls only the pinned authoritative HTTPS host and redacts auth to browser',async()=>{
  const seen=[];
  const client=createUnifiedPortalClient({secret,fetchImpl:async(input,init)=>{
    seen.push({url:String(input),header:init.headers.authorization,body:init.body});
    return new Response(JSON.stringify({ok:true,sources:[],totals:{servers:0}}),{
      status:200,headers:{'content-type':'application/json'}
    });
  }});
  const reply=await client.overview();
  assert.equal(reply.status,200);
  await client.catalog({type:'live',q:'News',serverId:''});
  assert.ok(seen.every(x=>x.url.startsWith('https://blofy-activation-portal-production.up.railway.app/internal/blofy-stream/')));
  assert.ok(seen.every(x=>x.header==='Bearer '+secret));
  assert.equal(JSON.stringify(reply.body).includes(secret),false);
});
test('arbitrary account or source actions cannot be sent to authoritative backend',async()=>{
  const client=createUnifiedPortalClient({secret});
  assert.equal((await client.sourceAction('invalid','test',{})).status,400);
  assert.equal((await client.sourceAction('550e8400-e29b-41d4-a716-446655440000','delete',{})).status,400);
  assert.equal((await client.accountAction('550e8400-e29b-41d4-a716-446655440000','reset')).status,400);
});
