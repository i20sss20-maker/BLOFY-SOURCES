import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
test('auto sync and code stats controls are source-scoped and never silently enabled',()=>{
 const html=renderOperatorDashboard('nonce-ops');
 for(const id of ['library-auto-enable','library-auto-disable','library-auto-hours',
  'library-ops-refresh','library-ops-stats','library-snapshot-create',
  'library-snapshots-refresh'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/types:\['live','movie','series'\]|types:\["live","movie","series"\]|intervalHours:hours/);
 assert.match(html,/action\("ops\/schedule","ops-schedule"/);
 assert.match(html,/action\("ops\/snapshot","ops-snapshot"/);
 assert.match(html,/scope|ليست نسخة احتياطية كاملة/);
 assert.match(html,/if\(!confirm\(desc/);
 assert.match(html,/لا يبدأ النقل فورًا/);
 assert.match(html,/مشاهدون حاليون: غير مقاس/);
 const script=html.match(/<script nonce="nonce-ops">([\s\S]*?)<\/script>/);
 assert.ok(script);assert.doesNotThrow(()=>new vm.Script(script[1]));
});
test('operations are protected by operator session and have private bridge origin',async()=>{
 const controller=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 const client=await readFile(new URL('../src/unified-portal-client.mjs',import.meta.url),'utf8');
 assert.match(controller,/\/operator\/api\/ops\/schedule/);
 assert.match(controller,/\/operator\/api\/ops\/snapshot/);
 assert.match(controller,/portal\.opsSchedule\(data\)/);
 assert.match(controller,/portal\.opsSnapshot\(data\)/);
 assert.match(controller,/operator_action_header_required/);
 assert.match(client,/ROOT\+'\/ops\/schedule'/);
 assert.match(client,/ROOT\+'\/ops\/snapshot'/);
 assert.match(client,/sourceId,enabled,intervalHours:Number\(intervalHours\)/);
});
