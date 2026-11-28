import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import vm from 'node:vm';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const secret='bridge-sandbox-private-source-capacity-auth-token-123456';
const admin='operator-qa-private-source-capacity-long-token';
const sample={
  ok:true,readOnly:true,
  sourceCount:1,actualConcurrentViewersMeasured:false,
  accountCountsAvailable:true,unboundActiveGatewayAccounts:0,
  directHttpTransferMeasurementAvailable:true,
  directHttpTransferCountsReliable:true,
  activeDirectHttpMediaTransfers:3,activeDirectLiveHttpTransfers:2,
  summary:{restricted:1,warning:0,unknown:0},
  sources:[{id:'4f03227d-c2ce-427c-a677-85ba1f9b725e',
    name:'Source 1',status:'online',enabled:true,
    lastTestAt:1762960000000,
    activeDirectHttpMediaTransfers:3,activeDirectLiveHttpTransfers:2,
    sourceReportedMaxConnections:1,
    sourceReportedActiveConnections:1,activeGatewayAccounts:27,
    level:'restricted',providerSnapshotFresh:true}]
};
test('private client reads one fixed URL, bearer never traverses a browser parameter',async()=>{
  const calls=[];
  const client=createUnifiedPortalClient({secret,fetchImpl:async(url,init)=>{
    calls.push({url:url.href,init});
    return new Response(JSON.stringify(sample),{
      status:200,headers:{'content-type':'application/json'}});
  }});
  const result=await client.sourceCapacity();
  assert.equal(result.status,200);
  assert.equal(result.body.sources[0].activeGatewayAccounts,27);
  assert.equal(result.body.actualConcurrentViewersMeasured,false);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,
    'https://blofy-activation-portal-production.up.railway.app/internal/blofy-stream/source-capacity');
  assert.equal(calls[0].init.method,'GET');
  assert.equal(calls[0].init.redirect,'manual');
  assert.equal(calls[0].init.headers.authorization,'Bearer '+secret);
  assert.equal(calls[0].init.body,undefined);
});

test('operator route rejects anonymous readers and POST; accepts authorized read only',async()=>{
  const calls=[];
  const view=createOperatorDashboard({
    adminToken:admin,unifiedSecret:secret,engineOrigin:'http://127.0.0.1:9',
    fetchImpl:async(url,init)=>{
      calls.push({url:String(url),init});
      return new Response(JSON.stringify(sample),{status:200,
        headers:{'content-type':'application/json'}});
    }
  });
  const server=createServer((req,res)=>{
    if(view.handle(req,res))return;
    res.writeHead(404);res.end();
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const origin='http://127.0.0.1:'+server.address().port;
    const denied=await fetch(origin+'/operator/api/source-capacity');
    assert.equal(denied.status,401);
    const authorization='Basic '+Buffer.from('operator:'+admin).toString('base64');
    const post=await fetch(origin+'/operator/api/source-capacity',{
      method:'POST',headers:{authorization,'content-type':'application/json'},
      body:'{}'
    });
    assert.equal(post.status,404);
    const ok=await fetch(origin+'/operator/api/source-capacity',{headers:{authorization}});
    assert.equal(ok.status,200);
    assert.equal(ok.headers.get('cache-control'),'no-store');
    const data=await ok.json();
    assert.deepEqual(data,sample);
    assert.equal(calls.length,1);
    assert.ok(calls[0].url.startsWith('https://blofy-activation-portal-production.up.railway.app/'));
    assert.ok(!JSON.stringify(data).includes(secret));
    assert.ok(!JSON.stringify(data).includes(admin));
  }finally{
    server.closeAllConnections();
    await new Promise(r=>server.close(r));
  }
});

test('without connected portal the operator sees unknown, never invented healthy source capacity',async()=>{
  const p=createUnifiedPortalClient({secret:''});
  const result=await p.sourceCapacity();
  assert.equal(result.status,503);
  assert.equal(result.body.ok,false);
  assert.equal(result.body.code,'unified_bridge_not_configured');
});

test('source capacity UI distinguishes active gateway subscriptions from live viewers',()=>{
  const html=renderOperatorDashboard('source-capacity-qa');
  for(const id of ['source-capacity-panel','source-capacity-refresh',
    'source-capacity-status','source-capacity-rows','source-capacity-warning'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/الاشتراكات الفعالة ليست عدد اتصالات البث/);
  assert.match(html,/data\.accountCountsAvailable/);
  assert.match(html,/sourceReportedMaxConnections/);
  assert.match(html,/row\.activeDirectHttpMediaTransfers/);
  assert.match(html,/row\.activeDirectLiveHttpTransfers/);
  assert.match(html,/data\.directHttpTransferMeasurementAvailable/);
  assert.match(html,/لا يمثل عدد المشاهدين المميزين/);
  assert.match(html,/لا يشمل التحويل 307/);
  assert.match(html,/async function loadSourceCapacity/);
  const scripts=[...html.matchAll(/<script nonce="source-capacity-qa">([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>0);
  scripts.forEach(match=>assert.doesNotThrow(()=>new vm.Script(match[1])));
});
