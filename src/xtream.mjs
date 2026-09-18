import { catalog } from './context.mjs';
import { authenticateXtream } from './xtream-auth.mjs';
import { xtreamBaseUrl, json, text } from './http.mjs';
import { resolveStream } from './providers.mjs';
import { serverInfo,userInfo,categories,liveObject,movieObject,seriesObject,categoryFilter } from './xtream-format.mjs';

async function auth(url){
  const username=url.searchParams.get('username')||'',password=url.searchParams.get('password')||'';
  return authenticateXtream(username,password);
}
function allCategory(id){const x=String(id||'').trim();return !x||x==='0'||x==='all'||x==='*'}

export async function servePlayerApi(req,res,url){
  const a=await auth(url);
  if(!a)return json(res,200,{user_info:{auth:0,status:'Disabled'},server_info:serverInfo(req)});
  const action=url.searchParams.get('action')||'';
  if(!action)return json(res,200,{user_info:userInfo(a),server_info:serverInfo(req)});
  if(action==='get_live_categories')return json(res,200,categories('live'));
  if(action==='get_vod_categories')return json(res,200,categories('movie'));
  if(action==='get_series_categories')return json(res,200,categories('series'));
  if(action==='get_live_streams')return json(res,200,categoryFilter(url,'live',catalog.listKind('live')).map(liveObject));
  if(action==='get_vod_streams')return json(res,200,categoryFilter(url,'movie',catalog.listKind('movie')).map(movieObject));
  if(action==='get_series'){
    let groups=catalog.seriesGroups();
    const id=url.searchParams.get('category_id');
    if(!allCategory(id))groups=groups.filter(x=>String(catalog.categoryId('series',x.category))===String(id));
    return json(res,200,groups.map(seriesObject));
  }
  if(action==='get_vod_info'){
    const x=catalog.get(url.searchParams.get('vod_id'));
    if(!x||x.kind!=='movie')return json(res,200,[]);
    return json(res,200,{
      info:{movie_image:x.icon||'',name:x.title,plot:x.description||'',genre:x.category||'',releasedate:x.publishedAt||'',rating:'',duration:'',director:'',cast:'',backdrop_path:[],youtube_trailer:'',license:x.licenseName||'',license_url:x.licenseUrl||'',attribution:x.attribution||'',source:x.source},
      movie_data:movieObject(x)
    });
  }
  if(action==='get_series_info'){
    const g=catalog.seriesById(url.searchParams.get('series_id'));
    if(!g)return json(res,200,[]);
    const seasons=new Map(),episodes={};
    for(const x of g.episodes){
      if(!seasons.has(x.season))seasons.set(x.season,{air_date:'',episode_count:0,id:x.season,name:`Season ${x.season}`,overview:'',season_number:x.season,cover:g.icon||'',cover_big:g.icon||''});
      seasons.get(x.season).episode_count++;
      (episodes[String(x.season)]||=[]).push({
        id:String(x.id),episode_num:x.episode,title:x.title,container_extension:x.stream?.extension||'mp4',
        info:{movie_image:x.icon||g.icon||'',plot:x.description||'',releasedate:x.publishedAt||'',duration:'',rating:'',license:x.licenseName||g.licenseName||'',attribution:x.attribution||g.attribution||''},
        custom_sid:'',added:'',direct_source:''
      });
    }
    return json(res,200,{
      seasons:[...seasons.values()],
      info:{name:g.title,cover:g.icon||'',plot:g.description||'',genre:g.category||'',releaseDate:'',last_modified:'',rating:'',backdrop_path:[],youtube_trailer:'',license:g.licenseName||'',license_url:g.licenseUrl||'',attribution:g.attribution||''},
      episodes
    });
  }
  if(action==='get_short_epg'||action==='get_simple_data_table')return json(res,200,{epg_listings:[]});
  return json(res,200,[]);
}

function esc(v){return String(v??'').replace(/[\r\n]+/g,' ').replace(/"/g,"'")}
function xmlEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
function m3uLine(req,a,x,output='ts'){
  const type=x.kind==='live'?'live':x.kind==='series_episode'?'series':'movie',
    ext=x.kind==='live'?(output==='m3u8'?'m3u8':'ts'):(x.stream?.extension||'mp4'),
    tvgId=x.kind==='live'?(x.epgId||x.id):x.id;
  return `#EXTINF:-1 tvg-id="${esc(tvgId)}" tvg-name="${esc(x.title)}" tvg-logo="${esc(x.icon||'')}" group-title="${esc(x.category||'Open Media')}",${esc(x.title)}\n${xtreamBaseUrl(req)}/${type}/${encodeURIComponent(a.username)}/${encodeURIComponent(a.password)}/${x.id}.${ext}`;
}
export async function serveM3u(req,res,url){
  const a=await auth(url);
  if(!a)return text(res,401,'#EXTM3U\n# Authentication failed\n','audio/x-mpegurl; charset=utf-8');
  const output=String(url.searchParams.get('output')||'ts').toLowerCase()==='m3u8'?'m3u8':'ts',lines=['#EXTM3U'];
  for(const k of ['live','movie','series_episode'])for(const x of catalog.listKind(k))lines.push(m3uLine(req,a,x,output));
  return text(res,200,`${lines.join('\n')}\n`,'audio/x-mpegurl; charset=utf-8',{'content-disposition':'inline; filename="blofy.m3u"'});
}
export async function serveXmltv(req,res,url){
  const a=await auth(url);
  if(!a)return text(res,401,'<?xml version="1.0" encoding="UTF-8"?><tv></tv>','application/xml; charset=utf-8');
  const channels=catalog.listKind('live').map(x=>{const icon=x.icon?`<icon src="${xmlEsc(x.icon)}"/>`:'';const id=x.epgId||x.id;return `<channel id="${xmlEsc(id)}"><display-name>${xmlEsc(x.title)}</display-name>${icon}</channel>`}).join('');
  return text(res,200,`<?xml version="1.0" encoding="UTF-8"?>\n<tv generator-info-name="BLOFY SOURCES">${channels}</tv>\n`,'application/xml; charset=utf-8');
}

function copyUpstreamHeaders(response){
  const out={};
  for(const name of ['content-type','content-length','content-range','accept-ranges','cache-control','last-modified','etag']){
    const value=response.headers.get(name);if(value)out[name]=value;
  }
  out['x-content-type-options']='nosniff';
  return out;
}

export async function servePlayback(req,res,pathname){
  const m=pathname.match(/^\/(live|movie|series)\/([^/]+)\/([^/]+)\/(\d+)(?:\.([A-Za-z0-9]+))?\/?$/);
  if(!m)return false;
  const [,type,u,p,id]=m;
  const credentials=await authenticateXtream(decodeURIComponent(u),decodeURIComponent(p));
  if(!credentials){text(res,401,'Unauthorized');return true}
  const x=catalog.get(id),valid=x&&((type==='live'&&x.kind==='live')||(type==='movie'&&x.kind==='movie')||(type==='series'&&x.kind==='series_episode'));
  if(!valid){text(res,404,'Not found');return true}
  try{
    const resolved=await resolveStream(x),target=new URL(resolved.url);
    if(!['http:','https:'].includes(target.protocol))throw new Error('unsupported_target_protocol');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    const abort=()=>{if(!controller.signal.aborted)controller.abort()};
    res.on('close',()=>{if(!res.writableEnded)abort()});
    const headers={'user-agent':String(req.headers['user-agent']||'BLOFY-Xtream-Gateway/2.0')};
    if(req.headers.range)headers.range=String(req.headers.range);
    let response;
    try{
      response=await fetch(target,{method:req.method==='HEAD'?'HEAD':'GET',redirect:'follow',signal:controller.signal,headers});
    }finally{clearTimeout(timer)}
    if(!(response.ok||response.status===206)){text(res,502,'Upstream unavailable');return true}
    res.writeHead(response.status,copyUpstreamHeaders(response));
    if(req.method==='HEAD'||!response.body){res.end();return true}
    const reader=response.body.getReader();
    try{
      while(true){
        const {done,value}=await reader.read();
        if(done)break;
        if(!res.write(Buffer.from(value)))await new Promise(resolve=>res.once('drain',resolve));
      }
      res.end();
    }catch(error){
      abort();if(!res.destroyed)res.destroy(error);
    }
  }catch(e){
    if(!res.headersSent)json(res,502,{ok:false,error:String(e?.message||e),source:x.source,itemId:x.id});
    else if(!res.destroyed)res.destroy();
  }
  return true;
}
