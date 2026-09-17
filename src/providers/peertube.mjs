import { stripHtml } from '../catalog.mjs';
import { fetchJson, envInt } from './common.mjs';

const PEERTUBE_ALLOWED_LICENSE_IDS = new Set([1, 2, 7, 8]);
const DEFAULT_SEEDS = [
  'https://video.sadmin.io',
  'https://framatube.org',
  'https://video.tedomum.net',
  'https://videos.domainepublic.net',
  'https://peertube.uno',
  'https://tube-sciences-technologies.apps.education.fr',
  'https://indymotion.fr'
];

function peertubeSeeds() {
  const configured = String(process.env.PEERTUBE_INSTANCES || '').trim();
  const values = configured ? configured.split(',') : DEFAULT_SEEDS;
  return [...new Set(values
    .map(value => value.trim().replace(/\/+$/, ''))
    .filter(value => /^https:\/\//i.test(value)))];
}

export async function syncPeerTube() {
  const totalLimit = envInt('PEERTUBE_LIMIT', 3000, 50, 10000);
  const seeds = peertubeSeeds();
  const perSeed = Math.max(100, Math.ceil(totalLimit / Math.max(1, seeds.length)));
  const items = [];
  const seen = new Set();
  for (const seed of seeds) {
    let start = 0;
    while (items.length < totalLimit && start < perSeed) {
      const count = Math.min(100, perSeed - start, totalLimit - items.length);
      let data;
      try {
        const params = new URLSearchParams({ count: String(count), start: String(start), sort: '-views' });
        data = await fetchJson(`${seed}/api/v1/videos?${params}`, 25000);
      } catch (error) {
        console.warn(`PeerTube seed skipped ${seed}: ${String(error?.message || error)}`);
        break;
      }
      const rows = data?.data || [];
      if (!rows.length) break;
      for (const video of rows) {
        const licenseId = Number(video.licence?.id ?? video.licence);
        if (!PEERTUBE_ALLOWED_LICENSE_IDS.has(licenseId)) continue;
        if (video.nsfw === true) continue;
        const uuid = String(video.uuid || '').trim();
        if (!uuid || seen.has(uuid)) continue;
        const originUrl = String(video.url || `${seed}/videos/watch/${uuid}`);
        let origin;
        try { origin = new URL(originUrl).origin; } catch { origin = seed; }
        const channel = video.channel?.displayName || video.channel?.name || video.account?.displayName || '';
        const licenceLabel = video.licence?.label || video.licence?.name || ({1:'CC BY',2:'CC BY-SA',7:'Public Domain',8:'No known copyright restrictions'}[licenseId] || 'Open licence');
        seen.add(uuid);
        items.push({
          sourceItemId: uuid,
          kind: video.isLive ? 'live' : 'movie',
          title: String(video.name || uuid),
          description: stripHtml(video.description || ''),
          icon: video.thumbnailPath ? `${origin}${video.thumbnailPath}` : '',
          category: String(video.category?.label || (video.isLive ? 'PeerTube Live' : 'PeerTube')),
          language: String(video.language?.id || video.language || ''),
          licenseName: String(licenceLabel),
          licenseUrl: '',
          attribution: channel ? `${channel} · PeerTube` : 'PeerTube',
          publishedAt: video.publishedAt || video.createdAt || '',
          stream: { resolver: 'peertube', origin, uuid },
          rights: { mode: 'license-filtered', redistributable: true, commercialCompatible: ![4,5,6].includes(licenseId) }
        });
        if (items.length >= totalLimit) break;
      }
      start += rows.length;
      if (rows.length < count) break;
    }
  }
  return items;
}
