// Use the provider's own Xtream get.php playlist when its category API is absent.
// This does not create extra upstream connections or grant any redistribution rights.
function safeTitle(value) { return String(value||'').trim().slice(0,300); }
function parseAttrs(line) {
  const result={};
  const re=/([a-z0-9-]+)="([^"]*)"/gi;
  for(const match of line.matchAll(re)) result[match[1].toLowerCase()]=match[2];
  return result;
}
export function parseXtreamM3u(text,{baseUrl,username,password,maxItems=50000}={}) {
  const content=String(text||'');
  if(!content.trimStart().startsWith('#EXTM3U'))throw new Error('xtream_m3u_not_a_playlist');
  const origin=new URL(baseUrl).origin;
  const rows=[];
  let entry=null;
  for(const original of content.split(/\r?\n/)) {
    const line=original.trim();
    if(line.startsWith('#EXTINF:')){
      entry={name:safeTitle(line.slice(line.indexOf(',')+1)),attrs:parseAttrs(line)};
      continue;
    }
    if(!line||line.startsWith('#')||!entry)continue;
    const current=entry;entry=null;
    let url;try{url=new URL(line)}catch{continue}
    // Never ingest arbitrary third-party URLs, CDN redirects or private hosts.
    // Credentials remain only on the controlled Xtream host.
    if(url.origin!==origin||url.search||url.hash)continue;
    const parts=url.pathname.split('/').filter(Boolean);
    let kind,user,pass,leaf;
    if(parts.length===4&&['live','movie','series'].includes(parts[0])){
      [kind,user,pass,leaf]=parts;
    }else if(parts.length===3){
      kind='live';[user,pass,leaf]=parts;
    }else continue;
    try{user=decodeURIComponent(user);pass=decodeURIComponent(pass);leaf=decodeURIComponent(leaf)}catch{continue}
    if(user!==username||pass!==password)continue;
    const file=/^([a-z0-9_-]+)\.([a-z0-9]{2,8})$/i.exec(leaf);
    if(!file)continue;
    const id=file[1],extension=file[2].toLowerCase();
    const kindLabel=kind==='live'?'live':kind==='movie'?'movie':'series_episode';
    if(!current.name)continue;
    rows.push({
      kind:kindLabel,id,mediaType:kind,extension,
      name:current.name,icon:current.attrs['tvg-logo']||'',
      category:safeTitle(current.attrs['group-title']||''),
      epgId:current.attrs['tvg-id']||''
    });
    if(rows.length>=maxItems)break;
  }
  return rows;
}
export async function fetchXtreamM3u(credentials,{maxItems=50000,timeoutMs=45000,maxBytes=30*1024*1024}={}) {
  const url=new URL(credentials.baseUrl+'/get.php');
  url.searchParams.set('username',credentials.username);
  url.searchParams.set('password',credentials.password);
  url.searchParams.set('type','m3u_plus');
  url.searchParams.set('output','ts');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    let response;
    try{
      response=await fetch(url,{redirect:'error',signal:controller.signal,headers:{accept:'audio/x-mpegurl,text/plain,*/*'}});
    }catch(e){throw new Error(e?.name==='AbortError'?'xtream_m3u_timeout':'xtream_m3u_connect_failed')}
    if(!response.ok)throw new Error('xtream_m3u_http_'+response.status);
    const type=String(response.headers.get('content-type')||'');
    if(/text\/html/i.test(type))throw new Error('xtream_m3u_html_response');
    const chunks=[];let size=0;
    for await(const block of response.body){
      size+=block.length;
      if(size>maxBytes){controller.abort();throw new Error('xtream_m3u_too_large')}
      chunks.push(block);
    }
    return parseXtreamM3u(Buffer.concat(chunks).toString('utf8'),{
      baseUrl:credentials.baseUrl,username:credentials.username,password:credentials.password,maxItems
    });
  }finally {clearTimeout(timer)}
}
