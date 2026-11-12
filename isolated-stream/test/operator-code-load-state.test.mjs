import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('operator code list clearly identifies server failures and provides authenticated main admin link',()=>{
 const page=renderOperatorDashboard('csp-test');
 assert.match(page,/id="codes-load-state" role="status" aria-live="polite"/);
 assert.match(page,/https:\/\/blofyplayer\.com\/sources-admin#xtream/);
 assert.match(page,/هذا لا يعني حذف الأكواد/);
 assert.match(page,/تم تحميل /);
 assert.match(page,/إدارة وتجديد الكود من الموقع الرئيسي/);
 const script=page.match(/<script nonce="csp-test">([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script[1]));
});
