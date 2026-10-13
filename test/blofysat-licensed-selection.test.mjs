import test from 'node:test';
import assert from 'node:assert/strict';
import { syncAuthorizedXtreamFeed } from '../src/providers/authorized-xtream.mjs';

const rights={partner:'Test licensed distributor',rightsReference:'test-agreement',territories:['SA']};
const profile={arabicLanguage:true,arabicSubtitle:false,localizedArabic:true};
const selectedIds=new Set(['Live:11','Movies:22','Series:33']);
const selection={summary:()=>({imported:true,counts:{live:1,vod:1,series:1}}),contains:(kind,id)=>selectedIds.has(kind+':'+String(id))};

async function withFakeLicensedProvider(run){
  const before={
    url:process.env.BLOFY_PARTNER_XTREAM_DEMO_URL,
    username:process.env.BLOFY_PARTNER_XTREAM_DEMO_USERNAME,
    password:process.env.BLOFY_PARTNER_XTREAM_DEMO_PASSWORD
  };
  const originalFetch=global.fetch,actions=[];
  process.env.BLOFY_PARTNER_XTREAM_DEMO_URL='https://authorized-provider.example';
  process.env.BLOFY_PARTNER_XTREAM_DEMO_USERNAME='demo-user';
  process.env.BLOFY_PARTNER_XTREAM_DEMO_PASSWORD='demo-pass';
  global.fetch=async value=>{
    const url=new URL(String(value));
    assert.equal(url.hostname,'authorized-provider.example');
    const action=url.searchParams.get('action')||'auth';
    actions.push(action+(action==='get_series_info'?':'+url.searchParams.get('series_id'):''));
    const responses={
      auth:{user_info:{auth:1}},
      get_live_categories:[{category_id:'1',category_name:'قنوات'}],
      get_vod_categories:[{category_id:'2',category_name:'أفلام'}],
      get_series_categories:[{category_id:'3',category_name:'مسلسلات'}],
      get_live_streams:[
        {stream_id:99,name:'Not in pack',category_id:'1'},
        {stream_id:11,name:'Pack live',category_id:'1'}
      ],
      get_vod_streams:[
        {stream_id:22,name:'Pack movie',category_id:'2'},
        {stream_id:98,name:'Not in pack',category_id:'2'}
      ],
      get_series:[
        {series_id:97,name:'Not in pack',category_id:'3'},
        {series_id:33,name:'Pack series',category_id:'3'}
      ],
      'get_series_info:33':{episodes:{'1':[{id:440,episode_num:1,container_extension:'mp4'}]}}
    };
    const id=action==='get_series_info'?action+':'+url.searchParams.get('series_id'):action;
    assert.ok(Object.hasOwn(responses,id),'unexpected request: '+id);
    return new Response(JSON.stringify(responses[id]),{status:200,headers:{'content-type':'application/json'}});
  };
  try{return await run(actions)}
  finally{
    global.fetch=originalFetch;
    for(const [suffix,value] of Object.entries(before)){
      const key='BLOFY_PARTNER_XTREAM_DEMO_'+({url:'URL',username:'USERNAME',password:'PASSWORD'}[suffix]);
      if(value==null)delete process.env[key];else process.env[key]=value;
    }
  }
}

test('BLOFYSAT mode restricts licensed upstream live, VOD and series to selected IDs',async()=>{
  await withFakeLicensedProvider(async actions=>{
    const rows=await syncAuthorizedXtreamFeed(
      {secretRef:'DEMO',language:'ar',selectedCatalog:'BLOFYSAT',include:['live','vod','series'],maxSeries:1},
      {rights,profile,selection,maxItems:20,seriesConcurrency:1}
    );
    assert.equal(rows.length,3);
    assert.deepEqual(rows.map(x=>x.kind).sort(),['live','movie','series_episode']);
    assert.ok(rows.some(x=>x.stream.upstreamId==='11'));
    assert.ok(rows.some(x=>x.stream.upstreamId==='22'));
    assert.ok(rows.some(x=>x.stream.upstreamId==='440'));
    assert.deepEqual(actions.filter(x=>x.startsWith('get_series_info')),['get_series_info:33']);
    const raw=JSON.stringify(rows);
    assert.ok(!raw.includes('demo-pass'));
    assert.ok(!raw.includes('demo-user'));
  });
});

test('Unselected authorized feed behavior is preserved',async()=>{
  await withFakeLicensedProvider(async()=>{
    const rows=await syncAuthorizedXtreamFeed(
      {secretRef:'DEMO',language:'ar',include:['live','vod']},
      {rights,profile,selection,maxItems:20}
    );
    assert.equal(rows.length,4);
  });
});

test('Selected feed fails closed when private selection is absent',async()=>{
  await withFakeLicensedProvider(async()=>{
    await assert.rejects(
      ()=>syncAuthorizedXtreamFeed(
        {secretRef:'DEMO',language:'ar',selectedCatalog:'BLOFYSAT'},
        {rights,profile,selection:{summary:()=>({imported:false})}}
      ),
      /blofysat_selection_not_imported/
    );
  });
});

test('Selected feed preserves mandatory licensed-rights validation',async()=>{
  await withFakeLicensedProvider(async()=>{
    await assert.rejects(
      ()=>syncAuthorizedXtreamFeed(
        {secretRef:'DEMO',language:'ar',selectedCatalog:'BLOFYSAT'},
        {rights:{},profile,selection}
      ),
      /partner_xtream_rights_context_invalid/
    );
  });
});
