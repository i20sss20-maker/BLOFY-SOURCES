import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
test('Gemini progress display distinguishes analysis from published changes',()=>{
 const html=renderOperatorDashboard('nonce-ai-progress');
 for(const id of ['library-ai-progress-refresh','library-ai-scan-progress','library-ai-progress-bar'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/analyzedItems/);assert.match(html,/estimatedPercent/);
 assert.match(html,/التحليل لا يعني اعتماد التغييرات/);
 const embedded=html.match(/<script nonce="nonce-ai-progress">([\s\S]*?)<\/script>/);
 assert.ok(embedded);assert.doesNotThrow(()=>new vm.Script(embedded[1]));
});
test('scan status uses the protected operator-to-activation bridge',async()=>{
 const server=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 const client=await readFile(new URL('../src/unified-portal-client.mjs',import.meta.url),'utf8');
 assert.match(server,/operator\/api\/library-ai\/scan-progress/);
 assert.match(server,/portal\.libraryAIScanProgress/);
 assert.match(client,/ROOT\+'\/library-ai\/scan-progress'/);
});
