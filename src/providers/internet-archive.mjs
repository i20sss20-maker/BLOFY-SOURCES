import { parseEpisodeTitle, normalizeArray, stripHtml } from '../catalog.mjs';
import { fetchJson, envInt, arrayFirst, cleanLicenseUrl, allowedOpenLicense, categoryFromMeta } from './common.mjs';

const OPEN_LICENSE_QUERY = '(licenseurl:http*by* OR licenseurl:http*zero* OR licenseurl:http*publicdomain*)';
const ARCHIVE_FIELDS = ['identifier','title','description','creator','subject','collection','licenseurl','language','date','downloads'];

function looseEpisodeTitle(title) {
  const text = String(title || '').trim();
  const patterns = [
    /^(.*?)[\s._-]+S(\d{1,2})[\s._-]*E(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)(?:\s*[-–:]\s*)?(?:episode|ep\.?)[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)(?:\s*[-–:]\s*)?season[\s#:_-]*(\d{1,2}).*?(?:episode|ep\.?)?[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)[\s._-]+(?:part|pt\.?)[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (!match) continue;
    if (i === 1 || i === 3) return { seriesTitle: (match[1] || 'Series').trim(), season: 1, episode: Number(match[2]) || 1, episodeTitle: (match[3] || text).trim() };
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
  const tvLike = /\b(tv|television|episode|series|serial|show|program|programme)\b/.test(`${subjects} ${collections}`);
  if (tvLike) {
    const patterns = [
      /^(.*?)(?:\s*[-–:]\s*)?(?:episode|ep\.?)?[\s#:_-]*(\d{1,3})\s*$/i,
      /^(.*?)[\s._-]+(?:part|pt\.?)[\s#:_-]*(\d{1,3})\s*$/i,
      /^(.*?)[\s._-]+(\d{1,3})(?:\s*[-–:]\s*.*)?$/i
    ];
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match?.[1]?.trim()) return { kind: 'series_episode', seriesTitle: match[1].trim(), season: 1, episode: Number(match[2]) || 1, episodeTitle: title };
    }
  }
  return { kind: 'movie' };
}

function genericQuery() {
  return `mediatype:movies AND ${OPEN_LICENSE_QUERY}`;
}

function seriesQueries() {
  return [
    `mediatype:movies AND (subject:television OR subject:"classic tv" OR subject:"tv series" OR subject:episode OR subject:serial) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (title:episode OR title:season OR title:" ep " OR title:" part ") AND ${OPEN_LICENSE_QUERY}`
  ];
}

async function archiveDocs(query, limit) {
  const rows = Math.min(500, limit);
  const pages = Math.ceil(limit / rows);
  const docs = [];
  for (let page = 1; page <= pages && docs.length < limit; page++) {
    const params = new URLSearchParams({ q: query, rows: String(rows), page: String(page), output: 'json' });
    for (const field of ARCHIVE_FIELDS) params.append('fl[]', field);
    params.append('sort[]', 'downloads desc');
    const data = await fetchJson(`https://archive.org/advancedsearch.php?${params}`, 30000);
    const pageDocs = data?.response?.docs || [];
    if (!pageDocs.length) break;
    docs.push(...pageDocs.slice(0, limit - docs.length));
    if (pageDocs.length < rows) break;
  }
  return docs;
}

function toCatalogItem(doc) {
  const licenseUrl = cleanLicenseUrl(doc.licenseurl);
  if (!allowedOpenLicense('', licenseUrl)) return null;
  const classification = classifyArchiveItem(doc);
  const creator = normalizeArray(doc.creator).join(', ');
  return {
    sourceItemId: String(doc.identifier), ...classification, title: String(doc.title || doc.identifier),
    description: stripHtml(arrayFirst(doc.description) || ''), icon: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
    category: categoryFromMeta(doc.subject, doc.collection, classification.kind === 'series_episode' ? 'Series' : 'Public Domain & CC'),
    language: String(arrayFirst(doc.language) || ''),
    licenseName: licenseUrl.includes('/by-sa/') ? 'Creative Commons BY-SA' : licenseUrl.includes('/by/') ? 'Creative Commons BY' : licenseUrl.includes('/zero/') ? 'CC0' : 'Public Domain',
    licenseUrl, attribution: creator ? `Internet Archive · ${creator}` : 'Internet Archive', publishedAt: String(arrayFirst(doc.date) || ''),
    stream: { resolver: 'internet-archive', identifier: String(doc.identifier) }, rights: { mode: 'license-filtered', redistributable: true, commercialCompatible: true }
  };
}

export async function syncInternetArchive() {
  const generalLimit = envInt('IA_LIMIT', 6000, 50, 10000);
  const seriesLimit = envInt('IA_SERIES_LIMIT', 2500, 100, 10000);
  const byId = new Map();

  const generalDocs = await archiveDocs(genericQuery(), generalLimit);
  for (const doc of generalDocs) {
    const item = toCatalogItem(doc);
    if (item) byId.set(item.sourceItemId, item);
  }

  for (const query of seriesQueries()) {
    const docs = await archiveDocs(query, seriesLimit);
    for (const doc of docs) {
      const item = toCatalogItem(doc);
      if (!item || item.kind !== 'series_episode') continue;
      byId.set(item.sourceItemId, item);
    }
  }

  return [...byId.values()];
}
