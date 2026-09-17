import { fetchText, envInt } from './common.mjs';

const ARAB_COUNTRIES = new Map([
  ['SA','السعودية'],['AE','الإمارات'],['QA','قطر'],['EG','مصر'],['IQ','العراق'],['LB','لبنان'],
  ['JO','الأردن'],['KW','الكويت'],['BH','البحرين'],['OM','عُمان'],['YE','اليمن'],['SY','سوريا'],
  ['PS','فلسطين'],['MA','المغرب'],['DZ','الجزائر'],['TN','تونس'],['LY','ليبيا'],['SD','السودان'],
  ['MR','موريتانيا'],['SO','الصومال'],['DJ','جيبوتي'],['KM','جزر القمر']
]);

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

function isPlayableStreamUrl(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { return false; }
  if (!['http:','https:'].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return false;
  if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) return false;
  if (host === 'dailymotion.com' || host.endsWith('.dailymotion.com') || host === 'dai.ly') return false;
  if (host === 'facebook.com' || host.endsWith('.facebook.com')) return false;
  return true;
}

function arabicMeta(attrs, name, fallbackCategory) {
  const country = String(attrs['tvg-country'] || '').toUpperCase();
  const group = String(attrs['group-title'] || fallbackCategory || 'Free TV');
  const language = String(attrs['tvg-language'] || '').toLowerCase();
  const arabCountry = ARAB_COUNTRIES.get(country);
  const arabicText = /[\u0600-\u06ff]/.test(`${name} ${group}`);
  const arabicGroup = /\(ar\)|\barab(?:ic)?\b/i.test(group);
  const isArabic = Boolean(arabCountry || arabicText || arabicGroup || /^ar(?:[-_]|$)/i.test(language) || language.includes('arab'));
  if (!isArabic) return { isArabic: false, language: attrs['tvg-language'] || '', category: group };
  let section = arabCountry || group.replace(/\s*\(AR\)\s*/i, '').trim() || 'عربي';
  if (/news/i.test(group)) section = 'أخبار';
  else if (/documentar/i.test(group)) section = 'وثائقيات';
  return { isArabic: true, language: 'ar', category: `عربي · ${section}` };
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
    if (!attrs || !isPlayableStreamUrl(line)) { if (attrs && line && !line.startsWith('#')) attrs = null; continue; }

    const name = attrs.name || attrs['tvg-name'] || attrs['tvg-id'] || `Free TV ${items.length + 1}`;
    const meta = arabicMeta(attrs, name, attrs['group-title'] || 'Free TV');
    const epgId = attrs['tvg-id'] || '';
    const sourceItemId = epgId || `${name}\0${line}`;

    items.push({
      sourceItemId,
      kind: 'live',
      title: name,
      description: 'Free-TV curated channel. The upstream project requires channels to be free and officially available without a private subscription.',
      icon: attrs['tvg-logo'] || '',
      category: meta.category,
      country: attrs['tvg-country'] || '',
      language: meta.language,
      epgId,
      licenseName: 'Free official stream · source policy verified',
      licenseUrl: 'https://github.com/Free-TV/IPTV',
      attribution: 'Free-TV / original broadcaster',
      stream: { resolver: 'direct', url: line, extension: streamExtension(line) },
      rights: { mode: 'curated-free-stream', redistributable: false, reviewRequired: false, sourcePolicy: 'free-official', arabic: meta.isArabic }
    });

    attrs = null;
    if (items.length >= limit) break;
  }

  items.sort((a,b) => Number(b.language === 'ar') - Number(a.language === 'ar') || a.category.localeCompare(b.category, 'ar') || a.title.localeCompare(b.title, 'ar'));
  return items;
}
