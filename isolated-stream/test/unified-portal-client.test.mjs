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

test('distributor customer directory route reaches the protected backend (regression: route_denied)',async()=>{
 const calls=[];
 const client=createUnifiedPortalClient({secret,fetchImpl:async(input,init)=>{
  calls.push({path:new URL(input).pathname,method:init.method,body:JSON.parse(init.body)});
  return new Response(JSON.stringify({ok:true,items:[{name:'Store client',phone:'966555555555',subscriptions:2}]}),{
   status:200,headers:{'content-type':'application/json'}
  });
 }});
 const result=await client.distributorRequest('clients',{sessionToken:'session',q:'555'});
 assert.equal(result.status,200);
 assert.equal(result.body.items[0].subscriptions,2);
 assert.equal(calls.length,1);
 assert.equal(calls[0].path,'/internal/blofy-stream/distributor/clients');
 assert.equal(calls[0].method,'POST');
 assert.equal(calls[0].body.q,'555');
 assert.equal((await client.distributorRequest('sources',{sessionToken:'session'})).status,400);
});

test('operator non-distributor modules expose independent read-only health checks',()=>{
 const html=renderOperatorDashboard('checknonce');
 for(const id of ['home-checks-panel','home-check-all','check-api','check-sources',
  'check-media','check-health','check-security','home-checks-time'])
  assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 assert.match(html,/api\("overview"\),api\("state"\),api\("auto-health"\),api\("security"\)/);
 assert.match(html,/state\.live\.overview\?"متصل":"آخر بيانات معروفة"/);
 assert.match(html,/if\(current!==state\.refreshVersion\)return/);
 assert.match(html,/لم تُحذف آخر البيانات المعروفة/);
 const script=html.match(/<script nonce="checknonce">([\s\S]*?)<\/script>/);
 assert.ok(script);assert.doesNotThrow(()=>new vm.Script(script[1]));
});
test('operator catalog and code/account pagination cannot mix stale responses or invent host',()=>{
 const html=renderOperatorDashboard('checknonce');
 assert.match(html,/id="accounts-host-value"/);
 assert.doesNotMatch(html,/bfy\.up\.railway\.app/);
 assert.match(html,/state\.libEpoch/);
 assert.match(html,/if\(requestEpoch!==state\.libEpoch\)return/);
 assert.match(html,/state\.libLoading/);
 assert.match(html,/if\(current!==state\.codesEpoch\)return/);
 assert.match(html,/if\(current!==state\.accountsEpoch\)return/);
 assert.match(html,/var seen=new Set\(state\.codes\.map/);
 assert.match(html,/var seen=new Set\(state\.accounts\.map/);
 assert.match(html,/if\(!state\.accountHost\)/);
 const script=html.match(/<script nonce="checknonce">([\s\S]*?)<\/script>/);
 assert.ok(script);assert.doesNotThrow(()=>new vm.Script(script[1]));
});
