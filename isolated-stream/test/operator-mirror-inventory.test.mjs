import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const RUN='movie_item_10',KEY='p'.repeat(46);
test('operator renders honest Xtream catalog-to-S3 inventory with no transfer claim',()=>{
 const html=renderOperatorDashboard('inventory_nonce');
 for(const id of ['library-mirror-inventory-panel','library-mirror-type',
  'library-mirror-refresh','library-mirror-next','library-mirror-results',
  'library-mirror-status','library-mirror-note'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/مطابقة الملف مع S3/);
 assert.match(html,/مفهرسة جزئيًا فقط/);
 assert.match(html,/نقل الملفات: صفر/);
 assert.match(html,/mediaBytesTransferred!==0/);
 assert.match(html,/customerCutover!==false/);
 assert.match(html,/cell.textContent=value/);
 assert.doesNotMatch(html,/file\.size\s*===\s*0\s*\?\s*"stored"/);
});
test('Portal inventory path is fixed and input validation forbids remote URLs',async()=>{
 const calls=[];
 const portal=createUnifiedPortalClient({secret:KEY,fetchImpl:async(url,opts)=>{
  calls.push({url:String(url),opts});
  return Response.json({ok:true,mediaType:'movie',
   sourceName:'saleh',items:[{id:RUN,title:'Film'}],
   dryRun:true,transferQueued:0,providerRequests:0,
   mediaBytesTransferred:0,storedCopiesVerified:false,customerCutover:false});
 }});
 const result=await portal.opsMirrorInventory({mediaType:'movie',cursor:'10',pageSize:50});
 assert.equal(result.status,200);
 assert.equal(calls.length,1);
 const endpoint=new URL(calls[0].url);
 assert.equal(endpoint.pathname,'/internal/blofy-stream/ops/mirror-inventory');
 assert.equal(endpoint.searchParams.get('type'),'movie');
 assert.equal(endpoint.searchParams.get('cursor'),'10');
 assert.equal(endpoint.searchParams.get('limit'),'50');
 assert.equal(calls[0].opts.method,'GET');
 assert.equal(calls[0].opts.headers.authorization,'Bearer '+KEY);
 for(const args of [
  {mediaType:'movie',cursor:'https://attacker.org'},
  {mediaType:'episode',cursor:'-9'},
  {mediaType:'episode',cursor:'abc'},
  {mediaType:'movie',pageSize:1000},
  {mediaType:'other',cursor:''}
 ]){
  assert.equal((await portal.opsMirrorInventory(args)).status,400);
 }
 assert.equal(calls.length,1);
});
test('inventory route is only in authenticated operator readable group',async()=>{
 const src=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.ok(src.includes("'/operator/api/ops/mirror-inventory'"));
 assert.ok(src.includes('portal.opsMirrorInventory('));
 const i=src.indexOf("'/operator/api/ops/mirror-inventory'");
 assert.ok(i>src.indexOf('const readable={'));
 assert.doesNotMatch(src,/router\.get\('[/]public[/]mirror/);
});
