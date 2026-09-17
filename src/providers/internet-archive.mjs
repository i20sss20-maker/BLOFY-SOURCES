import { parseEpisodeTitle, normalizeArray, stripHtml } from '../catalog.mjs';
import { fetchJson, envInt, arrayFirst, cleanLicenseUrl, allowedOpenLicense, categoryFromMeta } from './common.mjs';

function looseEpisodeTitle(title) {
  const text = String(title || '').trim();
  const patterns = [
    /^(.*?)[\s._-]+S(\d{1,2})[\s._-]*E(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)(?:\s*[-–:]\s*)?(?:episode|ep\.?)[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)(?:\s*[-–:]\s*)?season[\s#:_-]*(\d{1,2}).*?(?:episode|ep\.?)?[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (!match) continue;
    if (i === 1) return { seriesTitle: (match[1] || 'Series').trim(), season: 1, episode: Number(match[2]) || 1, episodeTitle: (match[3] || text).trim() };
    return { seriesTitle: (match[1] || 'Series').trim(), season: Math.max(1, Number(match[2]) || 1), episode: Math.max(1, Number(match[3]) || 1), episodeTitle: (match[4] || text).trim() };
  }
  return null;
}

function classifyArchiveItem(doc) {
  const title = String(doc.title || doc.identifier || '').trim();
  const episode = parseEpisodeTitle(title) || looseEpisodeTitle(title);
  if (episode) return { kind: 'series_episode', ...episode };

  const subjects = normalizeArray(doc.subject).join(' ').toLowerCase();
  const collections = normalizeArray(doc.collection).join(' ').toLowerCase();
  const tvLike = /\b(tv|television|episode|series|serial|show)\b/.test(`${subjects} ${collections}`);
  if (tvLike) {
    const generic = title.match(/^(.*?)(?:\s*[-–:]\s*)?(?:episode|ep\.?)?[\s#:_-]*(\d{1,3})\s*$/i);
    if (generic && generic[1]?.trim()) {
      return { kind: 'series_episode', seriesTitle: generic[1].trim(), season: 1, episode: Number(generic[2]) || 1, episodeTitle: title };
    }
  }
  return { kind: 'movie' };
}

function archiveQuery() {
  return 'mediatype:movies AND (licenseurl:http*by* OR licenseurl:http*zero* OR licenseurl:http*publicdomain*)';
}

export async function syncInternetArchive() {
  const limit = envInt('IA_LIMIT', 6000, 50, 10000);
  const rows = Math.min(500, limit);
  const pages = Math.ceil(limit / rows);
  const items = [];
  for (let page = 1; page <= pages && items.length < limit; page++) {
    const params = new URLSearchParams({ q: archiveQuery(), rows: String(rows), page: String(page), output: 'json' });
    for (const field of ['identifier','title','description','creator','subject','collection','licenseurl','language','date','downloads']) params.append('fl[]', field);
    params.append('sort[]', 'downloads desc');
    const data = await fetchJson(`https://archive.org/advancedsearch.php?${params}`, 30000);
    const docs = data?.response?.docs || [];
    if (!docs.length) break;
    for (const doc of docs) {
      const licenseUrl = cleanLicenseUrl(doc.licenseurl);
      if (!allowedOpenLicense('', licenseUrl)) continue;
      const classification = classifyArchiveItem(doc);
      const creator = normalizeArray(doc.creator).join(', ');
      items.push({
        sourceItemId: String(doc.identifier), ...classification, title: String(doc.title || doc.identifier),
        description: stripHtml(arrayFirst(doc.description) || ''), icon: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
        category: categoryFromMeta(doc.subject, doc.collection, classification.kind === 'series_episode' ? 'Series' : 'Public Domain & CC'),
        language: String(arrayFirst(doc.language) || ''),
        licenseName: licenseUrl.includes('/by-sa/') ? 'Creative Commons BY-SA' : licenseUrl.includes('/by/') ? 'Creative Commons BY' : licenseUrl.includes('/zero/') ? 'CC0' : 'Public Domain',
        licenseUrl, attribution: creator ? `Internet Archive · ${creator}` : 'Internet Archive', publishedAt: String(arrayFirst(doc.date) || ''),
        stream: { resolver: 'internet-archive', identifier: String(doc.identifier) }, rights: { mode: 'license-filtered', redistributable: true, commercialCompatible: true }
      });
      if (items.length >= limit) break;
    }
  }
  return items;
}
