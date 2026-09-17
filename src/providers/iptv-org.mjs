import { fetchText, envInt } from './common.mjs';

function parseM3uAttributes(line) {
  const attrs = {};
  const head = line.split(',', 1)[0];
  for (const match of head.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[match[1]] = match[2];
  const comma = line.indexOf(',');
  attrs.name = comma >= 0 ? line.slice(comma + 1).trim() : '';
  return attrs;
}

export async function syncIptvOrg() {
  if (String(process.env.ENABLE_IPTV_ORG || '').toLowerCase() !== 'true') return [];
  const limit = envInt('IPTV_ORG_LIMIT', 10000, 50, 30000);
  const text = await fetchText('https://iptv-org.github.io/iptv/index.m3u', 45000);
  const lines = text.split(/\r?\n/);
  const items = [];
  let attrs = null;
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (line.startsWith('#EXTINF:')) { attrs = parseM3uAttributes(line); continue; }
    if (!attrs || !/^https?:\/\//i.test(line)) continue;
    const name = attrs.name || attrs['tvg-name'] || attrs['tvg-id'] || `Channel ${items.length + 1}`;
    const epgId = attrs['tvg-id'] || '';
    items.push({sourceItemId:epgId||`${name}\0${line}`,kind:'live',title:name,description:'Publicly reachable stream indexed by IPTV-org. Verify channel rights for your intended use.',icon:attrs['tvg-logo']||'',category:attrs['group-title']||'Live TV',country:attrs['tvg-country']||'',language:attrs['tvg-language']||'',epgId,licenseName:'Rights review required',licenseUrl:'https://github.com/iptv-org/iptv',attribution:'IPTV-org directory / original broadcaster',stream:{resolver:'direct',url:line,extension:line.includes('.m3u8')?'m3u8':'ts'},rights:{mode:'directory-claim',redistributable:false,reviewRequired:true}});
    attrs = null; if (items.length >= limit) break;
  }
  return items;
}
