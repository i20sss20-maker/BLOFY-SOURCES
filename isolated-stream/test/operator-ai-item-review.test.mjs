import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
test('item-level Gemini classification has review and next-batch controls',()=>{
 const html=renderOperatorDashboard('nonce-ai-category');
 assert.match(html,/id="library-ai-item-next" disabled/);
 assert.match(html,/result\.itemAssignments/);
 assert.match(html,/libraryAIItemNextOffset/);
 assert.match(html,/offset:libraryAIItemOffset/);
 assert.match(html,/r\.movedItems/);
 const embedded=html.match(/<script nonce="nonce-ai-category">([\s\S]*?)<\/script>/);
 assert.ok(embedded);
 assert.doesNotThrow(()=>new vm.Script(embedded[1]));
});
