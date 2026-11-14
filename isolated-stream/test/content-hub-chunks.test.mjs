import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const secret='testing-stream-to-portal-secret-longer-than-forty-characters';
test('BLOFY STREAM library has safe resumable 8MiB controls, browser JS parses',()=>{
 const html=renderOperatorDashboard('safe-nonce');
 for(const id of ['content-hub-batches','content-hub-next-batch',
   'content-hub-preflight','content-hub-summary','content-hub-runs',
   'content-hub-start-copy','content-hub-pause-copy','content-hub-progress',
   'content-hub-percent','content-hub-diagnose','content-hub-canary-status'])
   assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('content-hub/status'));
 assert.ok(html.includes('content-hub/batch/next'));
 assert.ok(html.includes('content-hub/batch/start'));
 assert.ok(html.includes('content-hub/batch/pause'));
 assert.ok(html.includes('content-hub/playback/diagnose'));
 assert.ok(html.includes('canary_audio_video_decoded'));
 assert.ok(html.includes('canary_audio_video_and_seeks_verified'));
 assert.ok(html.includes('seeksVerified'));
 assert.ok(html.includes('setInterval(function()'));
 assert.ok(html.includes('data.continuousCopy'));
 assert.match(html,/id="content-hub-next-batch" type="button" aria-describedby=/);
 assert.doesNotMatch(html,/id="content-hub-next-batch" type="button" disabled/);
 assert.match(html,/hubBlockerLabels/);
 assert.match(html,/source_idle_unconfirmed/);
 assert.match(html,/hubBlockerMessage\(hubState\)/);
 assert.match(html,/hubState.chunkedBatchEnabled!==true/);
 assert.equal(html.includes('blofy-content-hub.railway.internal'),false);
 assert.equal(html.includes('BLOFY_CONTENT_HUB_ADMIN_TOKEN'),false);
 const source=html.match(/<script nonce="safe-nonce">([\s\S]*?)<\/script>/);
 assert.ok(source);
 assert.doesNotThrow(()=>new vm.Script(source[1]));
});
test('bridge explicitly confirms only one batch; blocks unapproved requests',async()=>{
 const calls=[];
 const client=createUnifiedPortalClient({secret,fetchImpl:async(url,init)=>{
  calls.push({path:new URL(url).pathname,method:init.method,
    body:init.body&&JSON.parse(init.body),
    auth:init.headers.authorization});
  return new Response(JSON.stringify({ok:true,code:'batch_accepted'}),{
   status:202,headers:{'content-type':'application/json'}
  });
 }});
 const denied=await client.contentHubNextBatch({confirmed:false});
 assert.equal(denied.status,400);
 assert.equal(calls.length,0);
 await client.contentHubStatus();
 await client.contentHubPreflight();
 const approved=await client.contentHubNextBatch({confirmed:true});
 assert.equal(approved.status,202);
 const noStart=await client.contentHubStartCopy({confirmed:false});
 assert.equal(noStart.status,400);
 const start=await client.contentHubStartCopy({confirmed:true});
 assert.equal(start.status,202);
 const pause=await client.contentHubPauseCopy();
 assert.equal(pause.status,202);
 const deniedCanary=await client.contentHubDiagnosePlayback({confirmed:false});
 assert.equal(deniedCanary.status,400);
 const playback=await client.contentHubDiagnosePlayback({confirmed:true});
 assert.equal(playback.status,202);
 assert.deepEqual(calls.map(x=>x.path),[
  '/internal/blofy-stream/content-hub/status',
  '/internal/blofy-stream/content-hub/preflight',
  '/internal/blofy-stream/content-hub/batch/next',
  '/internal/blofy-stream/content-hub/batch/start',
  '/internal/blofy-stream/content-hub/batch/pause',
  '/internal/blofy-stream/content-hub/playback/diagnose']);
 assert.equal(calls[2].method,'POST');
 assert.deepEqual(calls[2].body,{confirmed:true});
 assert.deepEqual(calls[3].body,{confirmed:true});
 assert.deepEqual(calls[5].body,{confirmed:true});
 assert.ok(calls.every(x=>x.auth==='Bearer '+secret));
});
