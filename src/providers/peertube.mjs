import { stripHtml } from '../catalog.mjs';
import { fetchJson, envInt } from './common.mjs';

const PEERTUBE_ALLOWED_LICENSE_IDS = new Set([1, 2, 7, 8]);
const DEFAULT_SEEDS = [
  'https://framatube.org','https://video.tedomum.net','https://videos.domainepublic.net',
  'https://peertube.uno','https://tube-sciences-technologies.apps.education.fr','https://indymotion.fr'
];

function peertubeSeeds() {
  const configured = String(process.env.PEERTUBE_INSTANCES || '').trim();
  const values = configured ? configured.split(',') : DEFAULT_SEEDS;
  return [...new Set(values.map(value => value.trim().replace(/\/+$/, '')).filter(value => /^https:\/\//i.test(value)))];
}

function isArabicVideo(video, forced = false) {
  if (forced) return true;
  const lang = String(video.language?.id || video.language || '').toLowerCase();
  if (/^ar(?:[-_]|$)/.test(lang) || lang === 'ara' || lang === 'arabic') return true;
  return /[\u0600-\u06ff]/.test(`${video.name || ''} ${video.description || ''}`);
}

function mapVideo(video, seed, { forceArabic = false } = {}) {
  const licenseId = Number(video.licence?.id ?? video.licence);
  if (!PEERTUBE_ALLOWED_LICENSE_IDS.has(licenseId) || video.nsfw === true) return null;
  const uuid = String(video.uuid || '').trim(); if (!uuid) return null;
  const originUrl = String(video.url || `${seed}/videos/watch/${uuid}`);
  let origin; try { origin = new URL(originUrl).origin; } catch { origin = seed; }
  const channel = video.channel?.displayName || video.channel?.name || video.account?.displayName || '';
  const licenceLabel = video.licence?.label || video.licence?.name || ({1:'CC BY',2:'CC BY-SA',7:'Public Domain',8:'No known copyright restrictions'}[licenseId] || 'Open licence');
  const arabic = isArabicVideo(video, forceArabic);
  const rawCategory = String(video.category?.label || (video.isLive ? 'PeerTube Live' : 'PeerTube'));
  return {
    sourceItemId: uuid, kind: video.isLive ? 'live' : 'movie', title: String(video.name || uuid),
    description: stripHtml(video.description || ''), icon: video.thumbnailPath ? `${origin}${video.thumbnailPath}` : '',
    category: arabic ? `عربي · ${rawCategory}` : rawCategory, language: arabic ? 'ar' : String(video.language?.id || video.language || ''),
    licenseName: String(licenceLabel), licenseUrl: '', attribution: channel ? `${channel} · PeerTube` : 'PeerTube',
    publishedAt: video.publishedAt || video.createdAt || '', stream: { resolver: 'peertube', origin, uuid },
    rights: { mode: 'license-filtered', redistributable: true, commercialCompatible: ![4,5,6].includes(licenseId), arabic }
  };
}

async function collectSeed(seed, limit, { arabicOnly = false } = {}) {
  const out = [];
  let start = 0;
  while (out.length < limit && start < Math.max(limit * 4, 300)) {
    const count = Math.min(100, Math.max(1, limit - out.length));
    const params = new URLSearchParams({ count: String(count), start: String(start), sort: '-views' });
    if (arabicOnly) params.set('languageOneOf', 'ar');
    let data;
    try { data = await fetchJson(`${seed}/api/v1/videos?${params}`, 20000); }
    catch (error) { console.warn(`PeerTube seed skipped ${seed}: ${String(error?.message || error)}`); break; }
    const rows = data?.data || []; if (!rows.length) break;
    for (const video of rows) {
      const item = mapVideo(video, seed, { forceArabic: arabicOnly });
      if (item) out.push(item);
      if (out.length >= limit) break;
    }
    start += rows.length;
    if (rows.length < count) break;
  }
  return out;
}

export async function syncPeerTube() {
  const totalLimit = envInt('PEERTUBE_LIMIT', 3000, 50, 10000);
  const arabicLimit = envInt('PEERTUBE_ARABIC_LIMIT', 800, 25, 5000);
  const seeds = peertubeSeeds();
  const byId = new Map();
  const arabicPerSeed = Math.max(25, Math.ceil(arabicLimit / Math.max(1, seeds.length)));
  for (const seed of seeds) for (const item of await collectSeed(seed, arabicPerSeed, { arabicOnly: true })) byId.set(item.sourceItemId, item);
  const perSeed = Math.max(100, Math.ceil(totalLimit / Math.max(1, seeds.length)));
  for (const seed of seeds) {
    for (const item of await collectSeed(seed, perSeed)) if (!byId.has(item.sourceItemId)) byId.set(item.sourceItemId, item);
    if (byId.size >= totalLimit + arabicLimit) break;
  }
  return [...byId.values()].sort((a,b) => Number(b.language === 'ar') - Number(a.language === 'ar') || a.title.localeCompare(b.title, 'ar'));
}
