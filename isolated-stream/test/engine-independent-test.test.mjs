import test from 'node:test';
import assert from 'node:assert/strict';
import {handleIndependentEngineTest} from '../src/engine-independent-test.mjs';
function invoke(url,method='GET',host='engine.blofyplayer.com',now=()=>Date.UTC(2026,10,25)){
 const out={};const res={writeHead(status,headers){Object.assign(out,{status,headers})},end(body){out.body=body}};
 out.handled=handleIndependentEngineTest({url,method,headers:{host}},res,{now});return out;
}
test('independent engine M3U points only to its own generated media',()=>{
 const p=invoke('/engine/test.m3u');assert.equal(p.status,200);
 assert.match(p.body.toString(),/^#EXTM3U\n#EXTINF:2,/);
 assert.equal(p.body.toString().split('\n')[2],'https://engine.blofyplayer.com/engine/test.ts');
 const m=invoke('/engine/test.ts');assert.equal(m.status,200);
 assert.equal(m.headers['content-type'],'video/mp2t');assert.equal(m.body.length,3572);
 for(let i=0;i<m.body.length;i+=188)assert.equal(m.body[i],0x47);
 assert.equal(invoke('/engine/test.ts','HEAD').body,undefined);
 assert.equal(invoke('/engine/test.ts','POST').status,405);
 assert.equal(invoke('/engine/test.ts','GET','connect.blofyplayer.com').handled,false);
 assert.equal(invoke('/engine/test.ts?url=external').handled,false);
});

test('rolling HLS window advances with wall clock and shares identical segments across viewers',()=>{
 const now=Date.UTC(2026,10,25),clock=()=>now,host='engine.blofyplayer.com';
 const get=(url,t=now)=>invoke(url,'GET',host,()=>t);
 const a=get('/engine/live/index.m3u8'),b=get('/engine/live/index.m3u8');
 assert.equal(a.status,200);assert.equal(a.headers['cache-control'],'no-store');
 assert.equal(a.body.toString(),b.body.toString());
 const m=a.body.toString(),seq=Number(m.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)[1]);
 assert.equal(Number(m.match(/#EXT-X-DISCONTINUITY-SEQUENCE:(\d+)/)[1]),seq);
 assert.equal((m.match(/#EXTINF:/g)||[]).length,6);
 assert.equal((m.match(/#EXT-X-DISCONTINUITY\n/g)||[]).length,5);
 assert.doesNotMatch(m,/#EXT-X-ENDLIST/);
 assert.match(get('/engine/live/index.m3u8',now+2000).body.toString(),new RegExp('#EXT-X-MEDIA-SEQUENCE:'+(seq+1)+'\\n'));
 const media=get('/engine/live/seg-'+seq+'.ts');
 assert.equal(media.status,200);assert.equal(media.body.length,3572);
 assert.equal(get('/engine/live/seg-'+(seq+6)+'.ts').status,404);
 assert.equal(get('/engine/live/seg-'+seq+'.ts',now+60000).status,404);
 assert.equal(invoke('/engine/live/index.m3u8','GET','connect.blofyplayer.com',clock).handled,false);
 assert.equal(invoke('/engine/live/index.m3u8','POST',host,clock).status,405);
 assert.match(get('/engine/live.m3u').body.toString(),/https:\/\/engine\.blofyplayer\.com\/engine\/live\/index\.m3u8/);
});
