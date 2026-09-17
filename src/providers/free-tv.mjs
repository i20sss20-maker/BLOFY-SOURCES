import { fetchText, envInt } from './common.mjs';

function parseAttributes(line) {
  const attrs = {};
  const comma = line.indexOf(',');
  const head = comma >= 0 ? line.slice(0, comma) : line;
  for (const match of head.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[match[1]] = match[2];
  attrs.name = comma >= 0 ? line.slice(comma + 1).trim() : '';
  return attrs;
}

function streamExtension(url) {
  const value = String(url || '').toLowerCase();
  if (value.includes('.m3u8')) return 'm3u8';
  if (value.includes('.mpd')) return 'mpd';
  return 'ts';
}

export async function syncFreeTv() {
  if (String(process.env.ENABLE_FREE_TV || 'true').toLowerCase() !== 'true') return [];
  const limit = envInt('FREE_TV_LIMIT', 4000, 25, 20000);
  const text = await fetchText('https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', 45000);
  const lines = text.split(/\r?\n/);
  const items = [];
  let attrs = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF:')) { attrs = parseAttributes(line); continue; }
    if (!attrs || !/^https?:\/\//i.test(line)) continue;

    const name = attrs.name || attrs['tvg-name'] || attrs['tvg-id'] || `Free TV ${items.length + 1}`;
    const category = attrs['group-title'] || 'Free TV';
    const epgId = attrs['tvg-id'] || '';
    const sourceItemId = epgId || `${name}\0${line}`;

    items.push({
      sourceItemId,
      kind: 'live',
      title: name,
      description: 'Free-TV curated channel. The upstream project requires channels to be free and officially available without a private subscription.',
      icon: attrs['tvg-logo'] || '',
      category,
      country: attrs['tvg-country'] || '',
      language: attrs['tvg-language'] || '',
      epgId,
      licenseName: 'Free official stream · source policy verified',
      licenseUrl: 'https://github.com/Free-TV/IPTV',
      attribution: 'Free-TV / original broadcaster',
      stream: { resolver: 'direct', url: line, extension: streamExtension(line) },
      rights: { mode: 'curated-free-stream', redistributable: false, reviewRequired: false, sourcePolicy: 'free-official' }
    });

    attrs = null;
    if (items.length >= limit) break;
  }

  return items;
}
