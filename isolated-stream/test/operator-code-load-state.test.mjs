import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('BLOFY STREAM operator manages code renewals and device transfers without leaving the console',()=>{
 const page=renderOperatorDashboard('csp-test');
 assert.match(page,/id="codes-load-state" role="status" aria-live="polite"/);
 assert.match(page,/id="codes-dialog" aria-labelledby="codes-dialog-title"/);
 assert.match(page,/id="codes-dialog-close"/);
 assert.match(page,/id="codes-search"/);
 assert.match(page,/id="codes-selected"/);
 assert.match(page,/id="codes-list"/);
 assert.match(page,/المميزات وإدارة الكود/);
 assert.match(page,/إعادة صلاحية/);
 assert.match(page,/نقل الجهاز/);
 assert.match(page,/code-extend/);
 assert.match(page,/code-transfer/);
 assert.match(page,/هذا لا يعني حذف الأكواد/);
 assert.match(page,/تم تحميل /);
 assert.doesNotMatch(page,/href="https:\/\/blofyplayer\.com\/sources-admin#xtream"/);
 assert.doesNotMatch(page,/إدارة وتجديد الكود من الموقع الرئيسي/);
 // A regression previously injected an undefined code variable into the sources table.
 const sources=page.slice(page.indexOf('function renderSources()'),page.indexOf('function doSource('));
 assert.doesNotMatch(sources,/manageCode\(code\.id\)/);
 const script=page.match(/<script nonce="csp-test">([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script[1]));
});

test('code management actions require the authenticated same-origin operator API',()=>{
 const page=renderOperatorDashboard('nonce');
 assert.match(page,/fetch\("\/operator\/api\/"\+path/);
 assert.match(page,/x-blofy-operator-action/);
 assert.match(page,/action\("code\/"\+c\.id\+"\/extend","code-extend"/);
 assert.match(page,/action\("code\/"\+c\.id\+"\/transfer","code-transfer"/);
 assert.match(page,/if\(!confirm\("نقل الكود/);
 assert.match(page,/if\(!confirm\("تجديد الكود/);
});

test('code reuse is explicitly admin-approved once per 10-minute window, without a new code',()=>{
 const page=renderOperatorDashboard('csp-test');
 assert.match(page,/↻ إعادة دخول/);
 assert.match(page,/إعادة دخول بنفس الكود/);
 assert.match(page,/10 دقائق/);
 assert.match(page,/code-relogin/);
 assert.match(page,/authorizeSameCodeRelogin/);
 assert.match(page,/السماح بإعادة الدخول/);
 assert.doesNotMatch(page,/adminReloginUntil.*localStorage/);
 const script=page.match(/<script nonce="csp-test">([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script[1]));
});
