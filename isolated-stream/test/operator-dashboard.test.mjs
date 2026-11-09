import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createStreamServer} from '../src/server.mjs';

const secret='operator-dashboard-test-token-1234567890-long';
async function withServer(options,fn){
  const {app}=createStreamServer(options);
  app.listen(0,'127.0.0.1');
  await once(app,'listening');
  try{await fn('http://127.0.0.1:'+app.address().port);}
  finally{await new Promise(resolve=>app.close(resolve));}
}
const auth='Basic '+Buffer.from('operator:'+secret).toString('base64');

test('console stays disabled when no operator secret is configured',async()=>{
  await withServer({},async base=>{
    const response=await fetch(base+'/operator');
    assert.equal(response.status,404);
    assert.equal((await response.json()).code,'operator_console_not_configured');
  });
});

test('console requires operator authentication for page and status',async()=>{
  await withServer({adminToken:secret,fetchImpl:async()=>new Response('',{status:404})},async base=>{
    const denied=await fetch(base+'/operator');
    assert.equal(denied.status,401);
    assert.match(denied.headers.get('www-authenticate'),/Basic/);
    const wrong=await fetch(base+'/operator/api/state',{headers:{authorization:'Basic '+Buffer.from('operator:wrong').toString('base64')}});
    assert.equal(wrong.status,401);
    const view=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(view.status,200);
    assert.match(await view.text(),/مركز الإدارة المتكامل/);
    assert.match(view.headers.get('content-security-policy'),/script-src/);
    const status=await fetch(base+'/operator/api/state',{headers:{authorization:auth}});
    assert.equal(status.status,200);
    const data=await status.json();
    assert.equal(data.customerTrafficEnabled,false);
    assert.equal(data.realSourceMediaVerified,false);
    assert.equal(data.engine.reachable,true); // MediaMTX root 404 still means listener responded
    assert.equal(data.engine.httpStatus,404);
  });
});

test('mutating real-source request rejects missing action header',async()=>{
  await withServer({adminToken:secret},async base=>{
    const rejected=await fetch(base+'/operator/api/sources',{method:'POST',headers:{authorization:auth}});
    assert.equal(rejected.status,403);
    assert.equal((await rejected.json()).code,'operator_action_header_required');
  });
});

test('real-source mutations require Basic auth and anti-CSRF header',async()=>{
  await withServer({adminToken:secret},async base=>{
    const denied=await fetch(base+'/operator/api/sources',{method:'POST'});
    assert.equal(denied.status,401);
    const forbidden=await fetch(base+'/operator/api/sources',{
      method:'POST',headers:{authorization:auth}
    });
    assert.equal(forbidden.status,403);
    const unavailable=await fetch(base+'/operator/api/sources',{
      method:'POST',headers:{authorization:auth,
        'x-blofy-operator-action':'source-add','content-type':'application/json'},
      body:JSON.stringify({name:'x'})
    });
    assert.equal(unavailable.status,503);
    assert.equal((await unavailable.json()).code,'unified_bridge_not_configured');
  });
});

test('code issuance view exposes copy, export and safe masked ledger',async()=>{
  await withServer({adminToken:secret},async base=>{
    const response=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(response.status,200);
    const html=await response.text();
    assert.match(html,/id="codes-issued"/);
    assert.match(html,/id="codes-list"/);
    assert.match(html,/نسخ جميع الأكواد/);
    assert.match(html,/حفظ الأكواد TXT/);
    assert.match(html,/لم تصل الأكواد الكاملة/);
    assert.match(html,/code\.codeHint/);
    assert.match(html,/recentlyIssuedCodes/);
    assert.match(html,/نسخ الكود/);
    assert.match(html,/الرقم الكامل غير قابل للاسترجاع/);
    assert.doesNotMatch(html,/localStorage\.setItem\([^)]*code/);
  });
});

test('live dashboard refreshes running HLS probes and clarifies unsupported native HLS',async()=>{
  await withServer({adminToken:secret},async base=>{
    const reply=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(reply.status,200);
    const html=await reply.text();
    assert.match(html,/liveProbeRefresh=setTimeout\(loadLive,4000\)/);
    assert.match(html,/canPlayType\("application\/vnd\.apple\.mpegurl"\)/);
    assert.match(html,/restream_provider_denied/);
    assert.match(html,/القناة غير موجودة لدى المصدر/);
  });
});

test('newly issued encrypted codes have a persistent authenticated copy control',async()=>{
  await withServer({adminToken:secret},async base=>{
    const reply=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(reply.status,200);
    const html=await reply.text();
    assert.match(html,/id="codes-copy-visible"/);
    assert.match(html,/id="library-refresh-source"/);
    assert.match(html,/id="library-smart-toggle"/);
    assert.match(html,/code\.copyAvailable/);
    assert.match(html,/copyCode\(code\)/);
    assert.match(html,/api\("code\/"\+key\+"\/reveal"\)/);
    assert.match(html,/source-sync/);
    assert.match(html,/لا يستخدم نموذج AI خارجي/);
  });
});

test('full-library review UI is valid JavaScript with separate deliberate approval actions',async()=>{
  await withServer({adminToken:secret},async base=>{
    const r=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(r.status,200);
    const page=await r.text();
    assert.match(page,/id="library-review-run"/);
    assert.match(page,/id="library-review-export"/);
    assert.match(page,/id="library-review-summary"/);
    assert.match(page,/id="library-review-suggestions"/);
    assert.match(page,/action\("library-title","library-title"/);
    assert.match(page,/library-review\?/);
    const script=page.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
    assert.ok(script,'operator script exists');
    assert.doesNotThrow(()=>new Function(script[1]),'embedded operator JS parses');
  });
});

test('optional model AI is visibly distinct from local rules and requires affirmative action',async()=>{
  await withServer({adminToken:secret},async base=>{
    const reply=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(reply.status,200);
    const html=await reply.text();
    assert.match(html,/id="library-ai-run"/);
    assert.match(html,/id="library-ai-status"/);
    assert.match(html,/id="library-ai-results"/);
    assert.match(html,/api\("library-ai\/status"\)/);
    assert.match(html,/action\("library-ai","library-ai"/);
    assert.match(html,/libraryAIProvider==="gemini"/);
    assert.match(html,/id="library-ai-check"/);
    assert.match(html,/لا تُطبّق اقتراحات AI تلقائيًا/);
    const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
    assert.ok(script);
    assert.doesNotThrow(()=>new Function(script[1]));
  });
});

test('operator shows sanitized relay error counts separately from viewer numbers',async()=>{
  await withServer({adminToken:secret},async base=>{
    const response=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(response.status,200);
    const html=await response.text();
    assert.match(html,/id="relay-errors"/);
    assert.match(html,/id="relay-error-breakdown"/);
    assert.match(html,/relayFailureCounts/);
    assert.match(html,/أخطاء Relay منذ آخر تشغيل/);
    assert.match(html,/لا يشمل النسخ القديمة/);
  });
});

test('shared source circuit and slow-viewer metrics are visible only in operator view',async()=>{
  await withServer({adminToken:secret},async base=>{
    const r=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(r.status,200);
    const html=await r.text();
    assert.match(html,/id="fanout-cooldowns"/);
    assert.match(html,/id="fanout-provider-failures"/);
    assert.match(html,/id="fanout-slow-disconnects"/);
    assert.match(html,/fanout\.cooldownFeeds/);
    const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
    assert.ok(script);
    assert.doesNotThrow(()=>new Function(script[1]));
  });
});

test('premium operator UX preserves every workflow and is accessible on TV/mobile',async()=>{
  await withServer({adminToken:secret},async base=>{
    const response=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(response.status,200);
    const html=await response.text();
    assert.match(html,/class="quick-hero"/);
    assert.match(html,/data-go="codes" data-focus="codes-label"/);
    assert.match(html,/data-go="library" data-focus="library-source"/);
    assert.match(html,/data-go="restream" data-focus="live-source"/);
    assert.match(html,/data-go="diagnostics" data-focus="diagnostic-source"/);
    assert.match(html,/id="command-palette"/);
    assert.match(html,/id="command-search"/);
    assert.match(html,/aria-keyshortcuts="Control\+K"/);
    assert.match(html,/aria-pressed="false"/);
    assert.match(html,/id="last-updated"/);
    assert.match(html,/prefers-reduced-motion/);
    assert.match(html,/code\.copyAvailable/);
    assert.match(html,/id="library-review-run"/);
    assert.match(html,/id="library-ai-run"/);
    assert.match(html,/id="fanout-cooldowns"/);
    assert.match(html,/timeZone:"Asia\/Riyadh"/);
    assert.doesNotMatch(html,/https:\/\/fonts\./);
    const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
    assert.ok(script,'nonce-bound operator script exists');
    assert.doesNotThrow(()=>new Function(script[1]),'all dashboard JS remains valid');
  });
});

test('AUTO HEALTH read endpoint requires operator credentials and never exposes subscriber secrets',async()=>{
  await withServer({adminToken:secret},async base=>{
    const noAuth=await fetch(base+'/operator/api/auto-health');
    assert.equal(noAuth.status,401);
    const response=await fetch(base+'/operator/api/auto-health',{
      headers:{authorization:auth}});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.customerTrafficChanged,false);
    assert.equal(data.scope,'operator_restream_only');
    assert.equal(data.recoveryProbeEnabled,false);
    assert.equal(JSON.stringify(data).includes('password'),false);
    const html=await (await fetch(base+'/operator',{headers:{authorization:auth}})).text();
    assert.match(html,/id="auto-health-panel"/);
    assert.match(html,/id="auto-health-status"/);
    assert.match(html,/id="auto-health-events"/);
    assert.match(html,/loadAutoHealth\(\)/);
    assert.match(html,/لا نعيد الاتصال بالمصدر تلقائيًا/);
    const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
    assert.ok(script);assert.doesNotThrow(()=>new Function(script[1]));
  });
});
