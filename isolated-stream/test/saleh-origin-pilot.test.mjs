import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveRestreamSupervisor} from '../src/live-restream-supervisor.mjs';
import {validateSalehOriginSource} from '../src/saleh-origin-policy.mjs';

const saleh='d9b0fcf1-0b7e-4209-b281-2b5cf1cef09a';
const other='550e8400-e29b-41d4-a716-446655440000';
const inventory={status:200,body:{ok:true,sources:[
 {id:saleh,name:'saleh',enabled:true,publishCatalog:true},
 {id:other,name:'other',enabled:true,publishCatalog:true}
]}};
const request=(sourceId,channelId)=>({sourceId,channelId,rightsConfirmed:true});

test('saleh-only policy requires one enabled unique named source',()=>{
 assert.equal(validateSalehOriginSource(inventory,saleh).ok,true);
 assert.equal(validateSalehOriginSource(inventory,other).code,
  'saleh_origin_other_source_blocked');
 assert.equal(validateSalehOriginSource({...inventory,body:{...inventory.body,
  sources:[inventory.body.sources[0],inventory.body.sources[0]]}},saleh).code,
  'saleh_origin_source_not_unique');
 assert.equal(validateSalehOriginSource({status:503,body:{ok:false}},saleh).code,
  'saleh_origin_source_inventory_unavailable');
});

test('saleh pilot creates one licensed on-demand Origin path and blocks other source/channels',async()=>{
 const actions=[];
 const portal={configured:true,
   overview:async()=>inventory,
   liveChannel:async ({sourceId,channelId})=>{
     actions.push('provider-url-issued');
     return {status:200,body:{ok:true,kind:'live',extension:'ts',
       sourceUrl:'https://licensed.example/live/account/secret/'+channelId+'.ts',
       sourceId,channelId,name:'Authorized test'}}
   }
 };
 const service=createLiveRestreamSupervisor({portal,salehOnlyOrigin:true,
   mediaPassword:'this-is-a-very-long-and-private-password-2026',
   lookup:async()=>[{address:'8.8.8.8',family:4}],
   fetchImpl:async(url,opts)=>{
     actions.push(opts?.method+' '+String(url).replace(/live-[a-f0-9]{12}/g,'live-[private]'));
     return new Response('{}',{status:200,headers:{'content-type':'application/json'}});
   }
 });
 const rejected=await service.start(request(other,'22'));
 assert.equal(rejected.status,409);
 assert.equal(rejected.body.code,'saleh_origin_other_source_blocked');
 assert.equal(actions.length,0);
 const created=await service.start(request(saleh,'23'));
 assert.equal(created.status,201);
 assert.equal(service.list().salehOrigin.enabled,true);
 assert.equal(service.list().salehOrigin.sourceChannelLimit,1);
 const reused=await service.start(request(saleh,'23'));
 assert.equal(reused.body.reused,true);
 const second=await service.start(request(saleh,'24'));
 assert.equal(second.status,409);
 assert.equal(second.body.code,'saleh_origin_source_channel_limit');
 assert.equal(actions.filter(a=>a==='provider-url-issued').length,1,
  'reject competing channel before minting provider URL');
 const withBackup=await service.start({...request(saleh,'24'),
  backupSourceId:other,backupChannelId:'40'});
 assert.equal(withBackup.status,409);
 assert.equal(withBackup.body.code,'saleh_origin_backup_requires_separate_capacity');
 await service.stop(created.body.path);
 const after=await service.start(request(saleh,'24'));
 assert.equal(after.status,201);
 await service.stop(after.body.path);
});

test('saleh pilot does not make unsafe guesses when source inventory is unreachable',async()=>{
 const service=createLiveRestreamSupervisor({salehOnlyOrigin:true,
  portal:{configured:true,overview:async()=>({status:503,body:{ok:false}})},
  mediaPassword:'this-is-a-very-long-and-private-password-2026'});
 const result=await service.start(request(saleh,'25'));
 assert.equal(result.status,503);
 assert.equal(result.body.code,'saleh_origin_source_inventory_unavailable');
 assert.equal(service.list().items.length,0);
 assert.equal(service.list().salehOrigin.customerCutoverEnabled,false);
});

test('source quota configuration is strictly bounded',()=>{
 assert.throws(()=>createLiveRestreamSupervisor({salehUpstreamChannelLimit:0}),
  /saleh_origin_channel_limit_invalid/);
 assert.throws(()=>createLiveRestreamSupervisor({salehUpstreamChannelLimit:65}),
  /saleh_origin_channel_limit_invalid/);
});
