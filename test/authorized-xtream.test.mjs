import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizedXtreamCredentials,
  resolveAuthorizedXtreamTarget,
  syncAuthorizedXtreamFeed
} from '../src/providers/authorized-xtream.mjs';

function withEnv(values,fn){
  const before=new Map();
  for(const [key,value] of Object.entries(values)){
    before.set(key,process.env[key]);
    if(value==null)delete process.env[key];
    else process.env[key]=String(value);
  }
  const restore=()=>{
    for(const [key,value] of before){
      if(value==null)delete process.env[key];
      else process.env[key]=value;
    }
  };
  try{
    const result=fn();
    if(result&&typeof result.then==='function')return result.finally(restore);
    restore();
    return result;
  }catch(error){restore();throw error}
}

test('authorized Xtream credentials stay in runtime env and resolve only at playback',()=>{
  withEnv({
    BLOFY_PARTNER_XTREAM_DEMO_URL:'https://partner.example/base/player_api.php',
    BLOFY_PARTNER_XTREAM_DEMO_USERNAME:'licensed-user',
    BLOFY_PARTNER_XTREAM_DEMO_PASSWORD:'Secret/Pass-123'
  },()=>{
    const credentials=authorizedXtreamCredentials('demo');
    assert.equal(credentials.secretRef,'DEMO');
    assert.equal(credentials.baseUrl,'https://partner.example/base');
    assert.equal(credentials.username,'licensed-user');

    const stream={
      resolver:'authorized-xtream',
      secretRef:'DEMO',
      mediaType:'movie',
      upstreamId:'88',
      extension:'mkv'
    };
    const serialized=JSON.stringify(stream);
    assert.equal(serialized.includes('licensed-user'),false);
    assert.equal(serialized.includes('Secret/Pass-123'),false);

    const target=resolveAuthorizedXtreamTarget(stream);
    assert.equal(target.extension,'mkv');
    assert.equal(
      target.url,
      'https://partner.example/base/movie/licensed-user/Secret%2FPass-123/88.mkv'
    );
  });
});

test('authorized Xtream sync maps live, VOD and series episodes without persisting upstream secrets',async()=>{
  await withEnv({
    BLOFY_PARTNER_XTREAM_DEMO_URL:'https://partner.example',
    BLOFY_PARTNER_XTREAM_DEMO_USERNAME:'licensed-user',
    BLOFY_PARTNER_XTREAM_DEMO_PASSWORD:'LicensedPass-456'
  },async()=>{
    const previousFetch=global.fetch;
    const requests=[];
    global.fetch=async input=>{
      const url=new URL(String(input));
      requests.push(url);
      assert.equal(url.hostname,'partner.example');
      assert.equal(url.searchParams.get('username'),'licensed-user');
      assert.equal(url.searchParams.get('password'),'LicensedPass-456');

      const action=url.searchParams.get('action')||'';
      let payload;
      if(!action)payload={user_info:{auth:1,status:'Active'}};
      else if(action==='get_live_categories')payload=[{category_id:'1',category_name:'السعودية'}];
      else if(action==='get_vod_categories')payload=[{category_id:'2',category_name:'أفلام'}];
      else if(action==='get_series_categories')payload=[{category_id:'3',category_name:'مسلسلات'}];
      else if(action==='get_live_streams')payload=[{
        stream_id:11,name:'قناة تجريبية',category_id:'1',stream_icon:'https://cdn.example/live.png',
        epg_channel_id:'demo.sa',added:'1789740000'
      }];
      else if(action==='get_vod_streams')payload=[{
        stream_id:22,name:'فيلم تجريبي',category_id:'2',stream_icon:'https://cdn.example/movie.png',
        container_extension:'mp4',added:'1789740000'
      }];
      else if(action==='get_series')payload=[{
        series_id:33,name:'مسلسل تجريبي',category_id:'3',cover:'https://cdn.example/series.png'
      }];
      else if(action==='get_series_info'){
        assert.equal(url.searchParams.get('series_id'),'33');
        payload={
          info:{plot:'وصف المسلسل',cover:'https://cdn.example/series.png'},
          episodes:{
            '1':[{
              id:44,episode_num:1,title:'الحلقة الأولى',container_extension:'mp4',
              added:'1789740000',info:{plot:'وصف الحلقة',movie_image:'https://cdn.example/ep.png'}
            }]
          }
        };
      }else throw new Error(`unexpected action ${action}`);

      return new Response(JSON.stringify(payload),{
        status:200,
        headers:{'content-type':'application/json'}
      });
    };

    try{
      const rows=await syncAuthorizedXtreamFeed({
        type:'xtream',
        secretRef:'DEMO',
        language:'ar',
        include:['live','vod','series']
      },{
        rights:{
          partner:'Licensed Demo',
          rightsReference:'agreement-2026-1',
          territories:['SA'],
          rightsUrl:'https://partner.example/rights',
          expiresAt:'2030-01-01T00:00:00Z'
        },
        profile:{arabicLanguage:true,arabicSubtitle:false,localizedArabic:true},
        maxItems:20,
        seriesLimit:10,
        seriesConcurrency:1
      });

      assert.equal(rows.length,3);
      const live=rows.find(x=>x.kind==='live');
      const movie=rows.find(x=>x.kind==='movie');
      const episode=rows.find(x=>x.kind==='series_episode');
      assert.ok(live);
      assert.ok(movie);
      assert.ok(episode);

      assert.equal(live.category,'عربي · السعودية');
      assert.equal(live.epgId,'demo.sa');
      assert.equal(movie.category,'عربي · أفلام');
      assert.equal(episode.seriesTitle,'مسلسل تجريبي');
      assert.equal(episode.season,1);
      assert.equal(episode.episode,1);
      assert.equal(episode.stream.resolver,'authorized-xtream');
      assert.equal(episode.stream.secretRef,'DEMO');
      assert.equal(episode.rights.rightsReference,'agreement-2026-1');

      const serialized=JSON.stringify(rows);
      assert.equal(serialized.includes('licensed-user'),false);
      assert.equal(serialized.includes('LicensedPass-456'),false);
      assert.ok(requests.some(x=>x.searchParams.get('action')==='get_series_info'));

      const target=resolveAuthorizedXtreamTarget(episode.stream);
      assert.equal(target.url,'https://partner.example/series/licensed-user/LicensedPass-456/44.mp4');
    }finally{
      global.fetch=previousFetch;
    }
  });
});

test('authorized Xtream feed still requires Arabic localization before any upstream request',async()=>{
  const previousFetch=global.fetch;
  let called=false;
  global.fetch=async()=>{called=true;throw new Error('must_not_fetch')};
  try{
    await assert.rejects(
      ()=>syncAuthorizedXtreamFeed(
        {type:'xtream',secretRef:'DEMO',language:'en'},
        {
          rights:{partner:'Demo',rightsReference:'deal-1',territories:['SA']},
          profile:{arabicLanguage:false,arabicSubtitle:false,localizedArabic:false},
          maxItems:10
        }
      ),
      /arabic_localization_missing/
    );
    assert.equal(called,false);
  }finally{
    global.fetch=previousFetch;
  }
});
