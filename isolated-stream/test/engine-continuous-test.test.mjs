import test from 'node:test';
import assert from 'node:assert/strict';
import {continuousTestSegment,continuousTestLatest,continuousTestManifest,handleContinuousEngineTest} from '../src/engine-continuous-test.mjs';
function inspect(bytes){
 const pts=[],pcr=[],counters=new Map();
 for(let i=0;i<bytes.length;i+=188){
  assert.equal(bytes[i],0x47);
  const pid=((bytes[i+1]&31)<<8)|bytes[i+2],mode=(bytes[i+3]>>4)&3;
  if(mode&1){if(!counters.has(pid))counters.set(pid,[]);counters.get(pid).push(bytes[i+3]&15);}
  let p=i+4;
  if(mode&2){const n=bytes[p];if(n>=7&&(bytes[p+1]&16)){const j=p+2;pcr.push(bytes[j]*2**25+bytes[j+1]*2**17+bytes[j+2]*2**9+bytes[j+3]*2+(bytes[j+4]>>7));}p+=1+n;}
  if((mode&1)&&(bytes[i+1]&64)&&p+14<=i+188&&bytes[p]===0&&bytes[p+1]===0&&bytes[p+2]===1&&(bytes[p+7]&128)){
   const j=p+9;pts.push((bytes[j]&14)*2**29+bytes[j+1]*2**22+(bytes[j+2]&254)*2**14+bytes[j+3]*2**7+(bytes[j+4]>>1));
  }
 }
 return {pts,pcr,counters};
}
test('synthetic segments have continuous PTS, PCR and payload continuity counters across boundaries',()=>{
 const a=inspect(continuousTestSegment(0)),b=inspect(continuousTestSegment(1));
 assert.equal(a.pts.length,20);assert.equal(b.pts.length,20);assert.ok(a.pcr.length>0);
 assert.deepEqual(b.pts,a.pts.map(x=>x+360000));assert.deepEqual(b.pcr,a.pcr.map(x=>x+360000));
 assert.equal(b.pts[0]-a.pts.at(-1),18000);
 for(const [pid,values] of a.counters)assert.equal(b.counters.get(pid)[0],(values.at(-1)+1)&15);
 assert.deepEqual(continuousTestSegment(1),continuousTestSegment(1));
});
test('continuous manifest advances every four seconds without recurring discontinuities',()=>{
 const t=Date.UTC(2026,10,25),m=continuousTestManifest(t).toString(),n=continuousTestLatest(t);
 assert.match(m,/#EXT-X-TARGETDURATION:4/);assert.match(m,new RegExp('seg-'+n+'\\.ts'));
 assert.doesNotMatch(m,/#EXT-X-DISCONTINUITY|#EXT-X-ENDLIST/);
 assert.equal(continuousTestLatest(t+4000),n+1);
 assert.equal((m.match(/#EXTINF:/g)||[]).length,6);
});
test('continuous test endpoint stays on engine domain and serves only recent fixture segments',()=>{
 const t=Date.UTC(2026,10,25),n=continuousTestLatest(t);
 function req(url,method='GET',host='engine.blofyplayer.com'){
  const out={};out.handled=handleContinuousEngineTest({url,method,headers:{host}},{writeHead(status,headers){Object.assign(out,{status,headers})},end(body){out.body=body}},{now:()=>t});return out;
 }
 assert.equal(req('/engine/continuous/index.m3u8').status,200);
 assert.equal(req('/engine/continuous/seg-'+n+'.ts').body.length,5640);
 assert.equal(req('/engine/continuous/seg-'+(n+1)+'.ts').status,404);
 assert.equal(req('/engine/continuous/seg-'+(n-30)+'.ts').status,404);
 assert.equal(req('/engine/continuous/index.m3u8','POST').status,405);
 assert.equal(req('/engine/continuous/index.m3u8','HEAD').body,undefined);
 assert.equal(req('/engine/continuous/index.m3u8','GET','connect.blofyplayer.com').handled,false);
});
