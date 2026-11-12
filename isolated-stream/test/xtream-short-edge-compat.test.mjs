import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';

test('Xtream customer credentials and copy button use a distinct short host',()=>{
  const html=renderOperatorDashboard('nonce-xtream');
  assert.match(html,/https:\/\/bfy\.up\.railway\.app/);
  assert.match(html,/state\.accountHost/);
  assert.match(html,/فحص Xtream/);
  const script=html.match(/<script nonce="nonce-xtream">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
test('Xtream account compatibility uses pinned authenticated bridge only',async()=>{
  const seen=[];
  const client=createUnifiedPortalClient({
    secret:'long-test-bridge-secret-aaaaaaaaaaaaaaaaaaaaa',
    fetchImpl:async (input,init)=>{
      seen.push({url:String(input),auth:init.headers.authorization});
      return new Response(JSON.stringify({ok:true,code:'xtream_login_compatible'}),{
        status:200,headers:{'content-type':'application/json'}
      });
    }
  });
  const valid='550e8400-e29b-41d4-a716-446655440000';
  const result=await client.accountCompatibility(valid);
  assert.equal(result.status,200);
  assert.equal(seen.length,1);
  assert.ok(seen[0].url.endsWith('/internal/blofy-stream/accounts/'+valid+'/compatibility'));
  assert.ok(seen[0].auth.startsWith('Bearer '));
  assert.equal((await client.accountCompatibility('not-an-id')).status,400);
});
