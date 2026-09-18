import { fetchJson, envBool, envInt } from './common.mjs';

const SECRET_REF_RE=/^[A-Z0-9][A-Z0-9_]{1,63}$/;

function normalizeList(value){
  if(Array.isArray(value))return value.map(x=>String(x||'').trim()).filter(Boolean);
  if(value==null)return[];
  return String(value).split(/[;,|]/).map(x=>x.trim()).filter(Boolean);
}

function safeMediaUrl(value,{allowHttp=false}={}){
  try{
    const u=new URL(String(value||'').trim());
    if(u.protocol==='https:'||(allowHttp&&u.protocol==='http:'))return u.toString();
  }catch{}
  return '';
}

function normalizeBaseUrl(value,{allowHttp=false}={}){
  try{
    const u=new URL(String(value||'').trim());
    if(u.protocol!=='https:'&&!(allowHttp&&u.protocol==='http:'))return '';
    u.username='';
    u.password='';
    u.search='';
    u.hash='';
    u.pathname=u.pathname.replace(/\/(?:player_api|panel_api|get|xmltv)\.php\/?$/i,'').replace(/\/+$/,'');
    return u.toString().replace(/\/+$/,'');
  }catch{return ''}
}

function sanitizeExtension(value,fallback='mp4'){
  const ext=String(value||'').trim().replace(/^\./,'').toLowerCase();
  return /^[a-z0-9]{2,8}$/.test(ext)?ext:fallback;
}

function secretEnv(ref,suffix){return `BLOFY_PARTNER_XTREAM_${ref}_${suffix}`}

export function normalizeAuthorizedXtreamSecretRef(value){
  const ref=String(value||'').trim().toUpperCase().replace(/[^A-Z0-9_]/g,'_');
  if(!SECRET_REF_RE.test(ref))throw new Error('partner_xtream_secret_ref_invalid');
  return ref;
}

export function authorizedXtreamCredentials(secretRef,{allowHttp=false}={}){
  const ref=normalizeAuthorizedXtreamSecretRef(secretRef);
  const baseUrl=normalizeBaseUrl(process.env[secretEnv(ref,'URL')],{allowHttp});
  const username=String(process.env[secretEnv(ref,'USERNAME')]||'').trim();
  const password=String(process.env[secretEnv(ref,'PASSWORD')]||'');
  if(!baseUrl)throw new Error('partner_xtream_url_missing_or_invalid');
  if(!username||!password)throw new Error('partner_xtream_credentials_missing');
  return{secretRef:ref,baseUrl,username,password};
}

function playbackType(value){
  const raw=String(value||'').trim().toLowerCase();
  if(raw==='live'||raw==='movie'||raw==='series')return raw;
  throw new Error('partner_xtream_media_type_invalid');
}

export function resolveAuthorizedXtreamTarget(stream,{allowHttp=envBool('AUTHORIZED_PARTNER_ALLOW_HTTP',false)}={}){
  if(stream?.resolver!=='authorized-xtream')throw new Error('partner_xtream_resolver_invalid');
  const credentials=authorizedXtreamCredentials(stream.secretRef,{allowHttp});
  const mediaType=playbackType(stream.mediaType);
  const upstreamId=String(stream.upstreamId||'').trim();
  if(!upstreamId||upstreamId.length>128)throw new Error('partner_xtream_upstream_id_invalid');
  const extension=sanitizeExtension(stream.extension,mediaType==='live'?'ts':'mp4');
  return{
    url:`${credentials.baseUrl}/${mediaType}/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${encodeURIComponent(upstreamId)}.${extension}`,
    extension
  };
}

function apiUrl(credentials,action='',params={}){
  const url=new URL(`${credentials.baseUrl}/player_api.php`);
  url.searchParams.set('username',credentials.username);
  url.searchParams.set('password',credentials.password);
  if(action)url.searchParams.set('action',action);
  for(const [key,value] of Object.entries(params))if(value!=null&&String(value)!=='')url.searchParams.set(key,String(value));
  return url.toString();
}

async function xtreamJson(credentials,action='',params={},timeoutMs=30000){
  return fetchJson(apiUrl(credentials,action,params),timeoutMs);
}

function isAuthenticated(payload){
  const auth=payload?.user_info?.auth;
  return auth===1||auth===true||String(auth)==='1';
}

function categoryMap(rows){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const id=String(row?.category_id??'').trim(),name=String(row?.category_name||row?.name||'').trim();
    if(id&&name)map.set(id,name);
  }
  return map;
}

function localizedCategory(name,fallback,profile){
  const raw=String(name||fallback||'محتوى شريك').trim()||fallback||'محتوى شريك';
  if(raw.startsWith('عربي ·')||raw.startsWith('أجنبي مترجم ·'))return raw;
  return `${profile?.arabicLanguage?'عربي · ':'أجنبي مترجم · '}${raw}`;
}

function publishedAt(value){
  const n=Number(value);
  if(Number.isFinite(n)&&n>0){
    const ms=n>10_000_000_000?n:n*1000;
    const d=new Date(ms);
    if(Number.isFinite(d.getTime()))return d.toISOString();
  }
  return '';
}

function allowedKinds(feed={}){
  const raw=normalizeList(feed.include||feed.kinds||'live,vod,series').map(x=>x.toLowerCase());
  const out=new Set();
  for(const kind of raw){
    if(['live','tv','channels'].includes(kind))out.add('live');
    else if(['vod','movie','movies','films'].includes(kind))out.add('vod');
    else if(['series','shows','tvshows','episodes'].includes(kind))out.add('series');
  }
  return out.size?out:new Set(['live','vod','series']);
}

function baseRights(rights,profile,mode='authorized-partner-xtream'){
  return{
    mode,
    redistributable:true,
    commercialCompatible:true,
    partner:rights.partner,
    rightsReference:rights.rightsReference,
    territories:Array.isArray(rights.territories)?rights.territories:[],
    arabic:true,
    arabicAudio:Boolean(profile?.arabicLanguage),
    arabicSubtitle:Boolean(profile?.arabicSubtitle),
    expiresAt:rights.expiresAt||null
  };
}

function commonItem({kind,title,description='',icon='',category,feed,rights,profile,allowHttp,published='',sourceItemId,stream,seriesTitle='',season=1,episode=1,epgId=''}){
  return{
    sourceItemId,
    kind,
    title,
    description:String(description||'').trim(),
    icon:safeMediaUrl(icon,{allowHttp}),
    category,
    language:profile?.arabicLanguage?'ar':String(feed.language||'').trim().toLowerCase(),
    country:String(feed.country||'').trim().slice(0,8),
    epgId:String(epgId||'').trim(),
    publishedAt:publishedAt(published),
    seriesTitle,
    season,
    episode,
    licenseName:`Authorized partner · ${rights.partner}`,
    licenseUrl:String(rights.rightsUrl||''),
    attribution:rights.partner,
    subtitles:[],
    stream,
    rights:baseRights(rights,profile)
  };
}

async function mapLimit(rows,limit,worker){
  const out=new Array(rows.length);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),rows.length||1)},async()=>{
    while(cursor<rows.length){
      const index=cursor++;
      out[index]=await worker(rows[index],index);
    }
  }));
  return out;
}

function feedSecretRef(feed={}){
  return normalizeAuthorizedXtreamSecretRef(feed.secretRef||feed.secret_ref||feed.id||feed.name);
}

function requireRightsContext(rights,profile){
  if(!rights?.partner||!rights?.rightsReference||!Array.isArray(rights?.territories)||!rights.territories.length)throw new Error('partner_xtream_rights_context_invalid');
  if(!profile?.localizedArabic)throw new Error('partner_xtream_arabic_localization_missing');
}

export async function syncAuthorizedXtreamFeed(feed={},{
  rights,
  profile,
  allowHttp=false,
  maxItems=50000,
  seriesLimit=envInt('AUTHORIZED_XTREAM_SERIES_LIMIT',500,1,5000),
  seriesConcurrency=envInt('AUTHORIZED_XTREAM_SERIES_CONCURRENCY',4,1,8)
}={}){
  requireRightsContext(rights,profile);
  const itemLimit=Math.max(0,Math.min(100000,Number(maxItems)||0));
  if(!itemLimit)return[];

  const secretRef=feedSecretRef(feed);
  const credentials=authorizedXtreamCredentials(secretRef,{allowHttp});
  const root=await xtreamJson(credentials);
  if(!isAuthenticated(root))throw new Error('partner_xtream_auth_failed');

  const kinds=allowedKinds(feed);
  const rows=[];

  let liveCategories=new Map(),vodCategories=new Map(),seriesCategories=new Map();
  const categoryJobs=[];
  if(kinds.has('live'))categoryJobs.push(xtreamJson(credentials,'get_live_categories').then(x=>{liveCategories=categoryMap(x)}));
  if(kinds.has('vod'))categoryJobs.push(xtreamJson(credentials,'get_vod_categories').then(x=>{vodCategories=categoryMap(x)}));
  if(kinds.has('series'))categoryJobs.push(xtreamJson(credentials,'get_series_categories').then(x=>{seriesCategories=categoryMap(x)}));
  await Promise.all(categoryJobs);

  if(kinds.has('live')&&rows.length<itemLimit){
    const list=await xtreamJson(credentials,'get_live_streams');
    const liveExt=sanitizeExtension(feed.liveOutput||feed.live_output||feed.liveExtension||feed.live_extension||'ts','ts');
    for(const raw of Array.isArray(list)?list:[]){
      if(rows.length>=itemLimit)break;
      const id=String(raw?.stream_id??raw?.id??'').trim(),title=String(raw?.name||raw?.title||'').trim();
      if(!id||!title)continue;
      const category=localizedCategory(liveCategories.get(String(raw?.category_id??''))||feed.liveCategory,'قنوات شريك',profile);
      rows.push(commonItem({
        kind:'live',title,description:raw?.description||'',icon:raw?.stream_icon||raw?.icon||'',category,feed,rights,profile,allowHttp,
        published:raw?.added,sourceItemId:`xtream:${secretRef}:live:${id}`,epgId:raw?.epg_channel_id||raw?.tvg_id||'',
        stream:{resolver:'authorized-xtream',secretRef,mediaType:'live',upstreamId:id,extension:liveExt}
      }));
    }
  }

  if(kinds.has('vod')&&rows.length<itemLimit){
    const list=await xtreamJson(credentials,'get_vod_streams');
    for(const raw of Array.isArray(list)?list:[]){
      if(rows.length>=itemLimit)break;
      const id=String(raw?.stream_id??raw?.id??'').trim(),title=String(raw?.name||raw?.title||'').trim();
      if(!id||!title)continue;
      const category=localizedCategory(vodCategories.get(String(raw?.category_id??''))||feed.vodCategory,'أفلام شريك',profile);
      const extension=sanitizeExtension(raw?.container_extension||feed.vodExtension||feed.vod_extension||'mp4','mp4');
      rows.push(commonItem({
        kind:'movie',title,description:raw?.plot||raw?.description||'',icon:raw?.stream_icon||raw?.cover||'',category,feed,rights,profile,allowHttp,
        published:raw?.added,sourceItemId:`xtream:${secretRef}:movie:${id}`,
        stream:{resolver:'authorized-xtream',secretRef,mediaType:'movie',upstreamId:id,extension}
      }));
    }
  }

  if(kinds.has('series')&&rows.length<itemLimit){
    const list=await xtreamJson(credentials,'get_series');
    const maxSeries=Math.max(1,Math.min(5000,Number(feed.maxSeries||feed.max_series)||seriesLimit));
    const selected=(Array.isArray(list)?list:[]).slice(0,maxSeries);
    const episodeGroups=await mapLimit(selected,seriesConcurrency,async raw=>{
      const seriesId=String(raw?.series_id??raw?.id??'').trim(),seriesTitle=String(raw?.name||raw?.title||'').trim();
      if(!seriesId||!seriesTitle)return[];
      let info;
      try{info=await xtreamJson(credentials,'get_series_info',{series_id:seriesId},45000)}
      catch(error){console.warn(`authorized Xtream series skipped ${seriesId}: ${String(error?.message||error)}`);return[]}
      const category=localizedCategory(seriesCategories.get(String(raw?.category_id??''))||feed.seriesCategory,'مسلسلات شريك',profile);
      const groups=info?.episodes&&typeof info.episodes==='object'?info.episodes:{};
      const out=[];
      for(const [seasonKey,episodes] of Object.entries(groups)){
        const list=Array.isArray(episodes)?episodes:[];
        for(let index=0;index<list.length;index++){
          const ep=list[index],id=String(ep?.id??ep?.stream_id??'').trim();
          if(!id)continue;
          const season=Math.max(1,Number(ep?.season)||Number(seasonKey)||1);
          const episode=Math.max(1,Number(ep?.episode_num)||Number(ep?.episode)||index+1);
          const title=String(ep?.title||ep?.name||`${seriesTitle} S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`).trim();
          const extension=sanitizeExtension(ep?.container_extension||feed.seriesExtension||feed.series_extension||'mp4','mp4');
          out.push(commonItem({
            kind:'series_episode',title,description:ep?.info?.plot||ep?.info?.description||info?.info?.plot||'',icon:ep?.info?.movie_image||raw?.cover||info?.info?.cover||'',
            category,feed,rights,profile,allowHttp,published:ep?.added,sourceItemId:`xtream:${secretRef}:series:${seriesId}:${id}`,
            seriesTitle,season,episode,
            stream:{resolver:'authorized-xtream',secretRef,mediaType:'series',upstreamId:id,extension}
          }));
        }
      }
      return out;
    });
    for(const group of episodeGroups){
      for(const item of group||[]){
        if(rows.length>=itemLimit)break;
        rows.push(item);
      }
      if(rows.length>=itemLimit)break;
    }
  }

  return rows.slice(0,itemLimit);
}
