import { fetchJson } from './common.mjs';
import { resolveAuthorizedXtreamTarget } from './authorized-xtream.mjs';

export async function resolveStream(item) {
  if (!item?.stream) throw new Error('stream_missing');
  const resolver = item.stream.resolver;
  if (resolver === 'direct') return { url: String(item.stream.url), extension: item.stream.extension || extensionFromUrl(item.stream.url) };
  if (resolver === 'authorized-xtream') return resolveAuthorizedXtreamTarget(item.stream);
  if (resolver === 'internet-archive') {
    const id = encodeURIComponent(item.stream.identifier);
    const data = await fetchJson(`https://archive.org/metadata/${id}`, 25000);
    const files = (data?.files || []).filter(f=>f?.name&&!f?.private).map(f=>({...f,nameLower:String(f.name).toLowerCase(),formatLower:String(f.format||'').toLowerCase(),sizeNumber:Number(f.size||0)})).filter(f=>/\.(mp4|m4v)$/i.test(f.name)||/h\.264|mpeg4|mpeg-4/.test(f.formatLower)).filter(f=>!/thumb|sample|spectrogram/.test(f.nameLower)).sort((a,b)=>{const x=String(a.source||'').toLowerCase()==='original'?0:1,y=String(b.source||'').toLowerCase()==='original'?0:1;return x-y||b.sizeNumber-a.sizeNumber});
    const file=files[0]; if(!file)throw new Error('archive_playable_file_not_found');
    const name=String(file.name).split('/').map(encodeURIComponent).join('/'); return {url:`https://archive.org/download/${id}/${name}`,extension:'mp4'};
  }
  if (resolver === 'peertube') {
    const origin=String(item.stream.origin).replace(/\/+$/,''); const detail=await fetchJson(`${origin}/api/v1/videos/${encodeURIComponent(item.stream.uuid)}`,20000);
    const playlist=detail?.streamingPlaylists?.find(p=>p.playlistUrl)?.playlistUrl; if(playlist)return{url:playlist,extension:'m3u8'};
    const file=[...(detail?.files||[])].sort((a,b)=>Number(b.resolution?.id||0)-Number(a.resolution?.id||0))[0]; if(file?.fileUrl)return{url:file.fileUrl,extension:extensionFromUrl(file.fileUrl)};
    throw new Error('peertube_playable_file_not_found');
  }
  if (resolver === 'nasa') {
    const data=await fetchJson(`https://images-api.nasa.gov/asset/${encodeURIComponent(item.stream.nasaId)}`,20000); const links=(data?.collection?.items||[]).map(x=>x?.href).filter(Boolean);
    const preferred=links.find(u=>/~orig\.(mp4|mov)$/i.test(u))||links.find(u=>/\.(mp4|m4v|mov)$/i.test(u))||links.find(u=>/\.(m3u8)$/i.test(u)); if(!preferred)throw new Error('nasa_playable_file_not_found');
    return{url:preferred,extension:extensionFromUrl(preferred)};
  }
  throw new Error('stream_resolver_unknown');
}
function extensionFromUrl(url){try{const ext=new URL(url).pathname.split('.').pop()?.toLowerCase();return/^[a-z0-9]{2,6}$/.test(ext||'')?ext:'mp4'}catch{return'mp4'}}
