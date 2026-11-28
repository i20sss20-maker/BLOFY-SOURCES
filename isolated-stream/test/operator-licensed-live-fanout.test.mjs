import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
import {readFile} from 'node:fs/promises';
test('operator warns about upstream rights and shows actual shared viewers only when measured',()=>{
 const html=renderOperatorDashboard('licensed-fanout-ui');
 assert.match(html,/licensedLiveFanout/);
 assert.match(html,/sharedMediaHealth/);
 assert.match(html,/activeSharedViewers/);
 assert.match(html,/upstreamReconnects/);
 assert.match(html,/لا تحقق|ليس ضمانًا فعليًا|ليس ضمانًا فعليًا قبل اختبار الضغط/);
 assert.match(html,/إذنًا صريحًا من مزود Xtream/);
 assert.match(html,/تحتاج إذنًا|التحقق من الإذن المكتوب/);
 const script=html.match(/<script nonce="licensed-fanout-ui">([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script[1]));
});
test('private relay-health never shows source URLs or viewer identity',async()=>{
 const source=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
 const start=source.indexOf("if(url.pathname==='/internal/relay-health'");
 const end=source.indexOf("if(url.pathname==='/internal/relay-grants')",start);
 assert.ok(start>0&&end>start);
 const block=source.slice(start,end);
 assert.match(block,/!authorized\(req.headers.authorization,relaySharedToken\)/);
 assert.match(block,/maxViewersPerFeed/);
 assert.match(block,/viewers:f.viewers/);
 assert.doesNotMatch(block,/sourceUrl|subscriberIp|password/);
});
