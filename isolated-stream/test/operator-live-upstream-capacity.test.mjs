import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('STREAM operator warns when two BLOFY codes share a one-connection Xtream source',()=>{
 const html=renderOperatorDashboard('live-capacity-nonce');
 assert.match(html,/id="library-live-capacity-status"/);
 assert.match(html,/stats\.liveSourceCapacity/);
 assert.match(html,/stats\.livePlayback/);
 assert.match(html,/source_single_upstream_connection/);
 assert.match(html,/كودين BLOFY لا يضاعف سعة المصدر/);
 assert.match(html,/source_restream_not_authorized/);
 assert.match(html,/shortLiveUpstreamEnds/);
 assert.match(html,/هذه مؤشرات من عملية السيرفر الحالية/);
 assert.match(html,/لا يمكن ضمان تشغيل كودين في الوقت نفسه/);
 const script=html.match(/<script nonce="live-capacity-nonce">([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script[1]));
});
