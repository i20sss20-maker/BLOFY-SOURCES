import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('BLOFY STREAM uses Xtream order by default, never AI-grouping by default',()=>{
 const html=renderOperatorDashboard('source-order-nonce');
 assert.match(html,/var smartLibraryOn=false/);
 assert.match(html,/عرض تجميعي اختياري: إيقاف/);
 assert.match(html,/ترتيب الأقسام والقنوات والأفلام والمسلسلات يأتي من لوحة Xtream/);
 assert.match(html,/ترتيب الأقسام تديره الآن من لوحة Xtream/);
 assert.match(html,/عرض المصدر بترتيب Xtream بعد آخر مزامنة/);
 assert.doesNotMatch(html,/var smartLibraryOn=true/);
 const embedded=html.match(/<script nonce="source-order-nonce">([\s\S]*?)<\/script>/);
 assert.ok(embedded);assert.doesNotThrow(()=>new vm.Script(embedded[1]));
});
