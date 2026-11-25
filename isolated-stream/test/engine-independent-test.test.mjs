import test from 'node:test';
import assert from 'node:assert/strict';
import {handleIndependentEngineTest} from '../src/engine-independent-test.mjs';
function invoke(url,method='GET',host='engine.blofyplayer.com'){
 const out={};const res={writeHead(status,headers){Object.assign(out,{status,headers})},end(body){out.body=body}};
 out.handled=handleIndependentEngineTest({url,method,headers:{host}},res);return out;
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
