import { parseEpisodeTitle, normalizeArray, stripHtml } from '../catalog.mjs';
import { fetchJson, envInt, envBool, arrayFirst, cleanLicenseUrl, allowedOpenLicense, categoryFromMeta } from './common.mjs';

const OPEN_LICENSE_QUERY = '(licenseurl:http*by* OR licenseurl:http*zero* OR licenseurl:http*publicdomain*)';
const ARCHIVE_FIELDS = ['identifier','title','description','creator','subject','collection','licenseurl','language','date','downloads'];
const FEDFLIX_QUERY = 'mediatype:movies AND collection:FedFlix';
const PRELINGER_QUERY = `mediatype:movies AND collection:prelinger AND ${OPEN_LICENSE_QUERY}`;


const ENTERTAINMENT_NEGATIVE = /(?:محاضر(?:ة|ات)|خطبة|خطب|درس|دروس|دورة|دورات|شرح|شروحات|مؤتمر|مؤتمرات|مقابلة|مقابلات|بودكاست|ندوة|ندوات|تلاوة|تلاوات|ال?قرآن|أخبار|اخبار|نشرة|نشرات|ورشة|ورش|كورس|كورسات|lecture|sermon|conference|interview|podcast|webinar|tutorial|course|lesson|workshop|speech|newscast|press conference|quran|recitation)/i;
const ENTERTAINMENT_SERIES = /(?:مسلسل|مسلسلات|الحلقة|حلقة|حلقات|الموسم|موسم|دراما|series|serial|episode|season|tv show|television series)/i;
const ENTERTAINMENT_DOCUMENTARY = /(?:وثائقي|وثائقية|وثائقيات|documentary|documentaries)/i;
const ENTERTAINMENT_ANIMATION = /(?:كرتون|رسوم متحركة|أنيميشن|انيميشن|أنمي|انمي|أطفال|اطفال|animation|animated|cartoon|anime)/i;
const ENTERTAINMENT_THEATRE = /(?:مسرحية|مسرحيات|المسرح|مسرح|theatre|theater|stage play)/i;
const ENTERTAINMENT_FILM = /(?:فيلم|أفلام|افلام|سينما|كوميديا|كوميدي|أكشن|اكشن|رعب|مغامرات|رومانسي|movie|movies|film|films|cinema|comedy|action|horror|romance|short film|feature film)/i;

function archiveMetaText(doc) {
  return [
    String(doc?.title || ''),
    ...normalizeArray(doc?.subject),
    ...normalizeArray(doc?.collection)
  ].join(' ');
}

export function archiveEntertainmentProfile(doc) {
  const text = archiveMetaText(doc);
  if (!text.trim()) return { accepted:false, category:'', reason:'missing-metadata' };
  if (ENTERTAINMENT_NEGATIVE.test(text)) return { accepted:false, category:'', reason:'non-entertainment' };

  const classification = classifyArchiveItem(doc);
  if (classification.kind === 'series_episode') {
    return { accepted:true, category:'عربي · مسلسلات عربية مفتوحة', reason:'series' };
  }
  if (ENTERTAINMENT_ANIMATION.test(text)) {
    return { accepted:true, category:'عربي · أطفال وأنيميشن مفتوح', reason:'animation' };
  }
  if (ENTERTAINMENT_DOCUMENTARY.test(text)) {
    return { accepted:true, category:'عربي · وثائقيات عربية مفتوحة', reason:'documentary' };
  }
  if (ENTERTAINMENT_THEATRE.test(text)) {
    return { accepted:true, category:'عربي · مسرحيات عربية مفتوحة', reason:'theatre' };
  }
  if (ENTERTAINMENT_SERIES.test(text)) {
    return { accepted:true, category:'عربي · مسلسلات عربية مفتوحة', reason:'series' };
  }
  if (ENTERTAINMENT_FILM.test(text)) {
    return { accepted:true, category:'عربي · أفلام عربية مفتوحة', reason:'film' };
  }
  return { accepted:false, category:'', reason:'not-entertainment' };
}

function openShardQueries() {
  const currentYear = new Date().getUTCFullYear();
  const ranges = [
    ['2000-01-01','2009-12-31'],
    ['2010-01-01','2012-12-31'],
    ['2013-01-01','2015-12-31'],
    ['2016-01-01','2018-12-31'],
    ['2019-01-01','2020-12-31'],
    ['2021-01-01','2021-12-31'],
    ['2022-01-01','2022-12-31'],
    ['2023-01-01','2023-12-31'],
    ['2024-01-01','2024-12-31'],
    ['2025-01-01','2025-12-31'],
    ['2026-01-01',`${currentYear}-12-31`]
  ];
  return ranges
    .filter(([from]) => Number(from.slice(0,4)) <= currentYear)
    .map(([from,to]) => `mediatype:movies AND addeddate:[${from} TO ${to}] AND ${OPEN_LICENSE_QUERY}`);
}

function openCollectionQueries() {
  return [
    `mediatype:movies AND collection:opensource_movies AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND collection:community_video AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND collection:vlogs AND ${OPEN_LICENSE_QUERY}`
  ];
}

function arabicEntertainmentQueries() {
  return [
    `mediatype:movies AND (language:Arabic OR language:ara OR language:ar) AND (title:فيلم OR title:أفلام OR title:مسلسل OR title:الحلقة OR title:حلقة OR title:موسم OR title:مسرحية OR title:وثائقي OR title:كرتون OR title:دراما OR title:كوميديا OR title:أكشن) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (language:Arabic OR language:ara OR language:ar) AND (subject:film OR subject:movie OR subject:cinema OR subject:documentary OR subject:drama OR subject:comedy OR subject:animation OR subject:cartoon OR subject:television OR subject:series OR subject:episode) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND collection:opensource_movies AND (language:Arabic OR language:ara OR language:ar) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (title:فيلم OR title:مسلسل OR title:مسرحية OR title:وثائقي OR title:كرتون) AND (subject:Arabic OR subject:"Arabic language" OR subject:"Arab world") AND ${OPEN_LICENSE_QUERY}`
  ];
}

function arabicExpansionQueries() {
  return [
    `mediatype:movies AND (title:فيلم OR title:وثائقي OR title:مسلسل OR title:برنامج OR title:الحلقة OR title:موسم OR title:مسرحية OR title:محاضرة OR title:مقابلة) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (subject:Arabic OR subject:"Arabic language" OR subject:"Arab world" OR subject:"Middle East") AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND collection:opensource_movies AND (language:Arabic OR language:ara OR language:ar OR title:فيلم OR title:وثائقي OR title:مسلسل OR title:برنامج) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (title:السعودية OR title:مصر OR title:فلسطين OR title:سوريا OR title:العراق OR title:لبنان OR title:اليمن OR title:الأردن) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (title:المغرب OR title:الجزائر OR title:تونس OR title:ليبيا OR title:السودان OR title:موريتانيا) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (title:الإمارات OR title:قطر OR title:الكويت OR title:البحرين OR title:عمان) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (subject:"Saudi Arabia" OR subject:Egypt OR subject:Palestine OR subject:Syria OR subject:Iraq OR subject:Lebanon OR subject:Yemen OR subject:Jordan) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (subject:Morocco OR subject:Algeria OR subject:Tunisia OR subject:Libya OR subject:Sudan OR subject:Qatar OR subject:Kuwait OR subject:"United Arab Emirates") AND ${OPEN_LICENSE_QUERY}`
  ];
}

function looseEpisodeTitle(title) {
  const text = String(title || '').trim();
  const patterns = [
    /^(.*?)[\s._-]+S(\d{1,2})[\s._-]*E(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)(?:\s*[-–:]\s*)?(?:episode|ep\.?)[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)(?:\s*[-–:]\s*)?season[\s#:_-]*(\d{1,2}).*?(?:episode|ep\.?)?[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)[\s._-]+(?:part|pt\.?)[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)(?:\s*[-–:]\s*)?(?:الحلقة|حلقة)[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)(?:\s*[-–:]\s*)?(?:الموسم|موسم)[\s#:_-]*(\d{1,2}).*?(?:الحلقة|حلقة)[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i,
    /^(.*?)[\s._-]+(?:الجزء|جزء)[\s#:_-]*(\d{1,3})(?:\b|[\s._-])(.*)?$/i
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (!match) continue;
    if ([1,3,4,6].includes(i)) return { seriesTitle: (match[1] || 'Series').trim(), season: 1, episode: Number(match[2]) || 1, episodeTitle: (match[3] || text).trim() };
    return { seriesTitle: (match[1] || 'Series').trim(), season: Math.max(1, Number(match[2]) || 1), episode: Math.max(1, Number(match[3]) || 1), episodeTitle: (match[4] || text).trim() };
  }
  return null;
}

function docLanguage(doc) {
  const values = normalizeArray(doc.language).map(x => x.toLowerCase());
  if (values.some(x => /^(ar|ara|arabic|العربية|عربي)$/.test(x))) return 'ar';
  const text = `${doc.title || ''} ${normalizeArray(doc.subject).join(' ')} ${arrayFirst(doc.description) || ''}`;
  return /[\u0600-\u06ff]/.test(text) ? 'ar' : String(arrayFirst(doc.language) || '');
}
function isArabicDoc(doc) { return docLanguage(doc) === 'ar'; }

function classifyArchiveItem(doc) {
  const title = String(doc.title || doc.identifier || '').trim();
  const episode = parseEpisodeTitle(title) || looseEpisodeTitle(title);
  if (episode) return { kind: 'series_episode', ...episode };
  const subjects = normalizeArray(doc.subject).join(' ').toLowerCase();
  const collections = normalizeArray(doc.collection).join(' ').toLowerCase();
  const tvLike = /\b(tv|television|episode|series|serial|show|program|programme)\b/.test(`${subjects} ${collections}`) || /(تلفزيون|مسلسل|مسلسلات|حلقة|حلقات|برنامج|برامج)/.test(`${subjects} ${collections}`);
  if (tvLike) {
    const patterns = [
      /^(.*?)(?:\s*[-–:]\s*)?(?:episode|ep\.?)?[\s#:_-]*(\d{1,3})\s*$/i,
      /^(.*?)[\s._-]+(?:part|pt\.?)[\s#:_-]*(\d{1,3})\s*$/i,
      /^(.*?)[\s._-]+(\d{1,3})(?:\s*[-–:]\s*.*)?$/i,
      /^(.*?)(?:\s*[-–:]\s*)?(?:الحلقة|حلقة)[\s#:_-]*(\d{1,3})\s*$/i,
      /^(.*?)[\s._-]+(?:الجزء|جزء)[\s#:_-]*(\d{1,3})\s*$/i
    ];
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match?.[1]?.trim()) return { kind: 'series_episode', seriesTitle: match[1].trim(), season: 1, episode: Number(match[2]) || 1, episodeTitle: title };
    }
  }
  return { kind: 'movie' };
}

function genericQuery() { return `mediatype:movies AND ${OPEN_LICENSE_QUERY}`; }
function arabicQuery() { return `mediatype:movies AND (language:Arabic OR language:ara OR language:ar) AND ${OPEN_LICENSE_QUERY}`; }
function seriesQueries() {
  return [
    `mediatype:movies AND (subject:television OR subject:"classic tv" OR subject:"tv series" OR subject:episode OR subject:serial) AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (title:episode OR title:season OR title:" ep " OR title:" part ") AND ${OPEN_LICENSE_QUERY}`,
    `mediatype:movies AND (language:Arabic OR language:ara OR language:ar) AND (title:حلقة OR title:الحلقة OR title:موسم OR title:الموسم OR subject:مسلسل OR subject:تلفزيون) AND ${OPEN_LICENSE_QUERY}`
  ];
}

async function mapLimit(values, limit, fn) {
  const out = new Array(values.length);
  const queue = values.map((value, index) => ({ value, index }));
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const job = queue.shift();
      out[job.index] = await fn(job.value, job.index);
    }
  }));
  return out;
}

function searchUrl(query, rows, page) {
  const params = new URLSearchParams({ q: query, rows: String(rows), page: String(page), output: 'json' });
  for (const field of ARCHIVE_FIELDS) params.append('fl[]', field);
  params.append('sort[]', 'downloads desc');
  return `https://archive.org/advancedsearch.php?${params}`;
}

async function archiveDocs(query, limit) {
  const rows = Math.min(500, limit);
  const first = await fetchJson(searchUrl(query, rows, 1), 35000);
  const firstDocs = first?.response?.docs || [];
  if (!firstDocs.length) return [];
  const total = Math.min(limit, Number(first?.response?.numFound || firstDocs.length));
  const pages = Math.max(1, Math.ceil(total / rows));
  const docs = [...firstDocs.slice(0, total)];
  if (pages <= 1 || docs.length >= total) return docs.slice(0, total);
  const concurrency = envInt('IA_PAGE_CONCURRENCY', 3, 1, 6);
  const pageNumbers = Array.from({ length: pages - 1 }, (_, i) => i + 2);
  const rest = await mapLimit(pageNumbers, concurrency, async page => {
    try {
      const data = await fetchJson(searchUrl(query, rows, page), 35000);
      return data?.response?.docs || [];
    } catch (error) {
      console.warn(`Internet Archive page skipped q=${query.slice(0,60)} page=${page}: ${String(error?.message || error)}`);
      return [];
    }
  });
  for (const pageDocs of rest) {
    docs.push(...pageDocs);
    if (docs.length >= total) break;
  }
  return docs.slice(0, total);
}

function toCatalogItem(doc, { forceArabic = false, trustedFedFlix = false, categoryOverride = '' } = {}) {
  const licenseUrl = cleanLicenseUrl(doc.licenseurl);
  if (!trustedFedFlix && !allowedOpenLicense('', licenseUrl)) return null;
  const classification = classifyArchiveItem(doc);
  const creator = normalizeArray(doc.creator).join(', ');
  const language = forceArabic || isArabicDoc(doc) ? 'ar' : docLanguage(doc);
  const rawCategory = trustedFedFlix ? 'FedFlix · US Government' : categoryFromMeta(doc.subject, doc.collection, classification.kind === 'series_episode' ? 'Series' : 'Public Domain & CC');
  const category = categoryOverride || (language === 'ar' ? `عربي · ${rawCategory}` : rawCategory);
  return {
    sourceItemId: String(doc.identifier), ...classification, title: String(doc.title || doc.identifier),
    description: stripHtml(arrayFirst(doc.description) || ''), icon: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
    category, language,
    licenseName: trustedFedFlix ? 'FedFlix · reuse without restrictions' : licenseUrl.includes('/by-sa/') ? 'Creative Commons BY-SA' : licenseUrl.includes('/by/') ? 'Creative Commons BY' : licenseUrl.includes('/zero/') ? 'CC0' : 'Public Domain',
    licenseUrl: trustedFedFlix ? 'https://archive.org/details/FedFlix' : licenseUrl,
    attribution: trustedFedFlix ? (creator ? `FedFlix · ${creator}` : 'FedFlix · Public.Resource.Org / U.S. Government') : (creator ? `Internet Archive · ${creator}` : 'Internet Archive'),
    publishedAt: String(arrayFirst(doc.date) || ''),
    stream: { resolver: 'internet-archive', identifier: String(doc.identifier) },
    rights: trustedFedFlix
      ? { mode: 'trusted-public-domain-collection', redistributable: true, commercialCompatible: true, sourcePolicy: 'FedFlix reuse without restrictions', arabic: language === 'ar' }
      : { mode: 'license-filtered', redistributable: true, commercialCompatible: true, arabic: language === 'ar' }
  };
}

export async function syncInternetArchive() {
  const generalLimit = envInt('IA_LIMIT', 14000, 50, 30000);
  const seriesLimit = envInt('IA_SERIES_LIMIT', 4500, 100, 12000);
  const arabicLimit = envInt('IA_ARABIC_LIMIT', 4500, 100, 12000);
  const fedflixLimit = envInt('IA_FEDFLIX_LIMIT', 6000, 100, 7000);
  const prelingerLimit = envInt('IA_PRELINGER_LIMIT', 5000, 100, 10000);
  const shardLimit = envInt('IA_SHARD_LIMIT', 18000, 1000, 30000);
  const shardConcurrency = envInt('IA_SHARD_CONCURRENCY', 2, 1, 3);
  const arabicExtraLimit = envInt('IA_ARABIC_EXTRA_LIMIT', 15000, 500, 25000);
  const collectionLimit = envInt('IA_OPEN_COLLECTION_LIMIT', 25000, 1000, 40000);
  const arabicFirst = envBool('ARABIC_FIRST', true);
  const entertainmentOnly = arabicFirst && envBool('ARABIC_FIRST_ENTERTAINMENT_ONLY', true);
  const byId = new Map();

  const [generalDocs, arabicDocs, fedflixDocs, prelingerDocs, shardSets, arabicExtraSets, collectionSets] = await Promise.all([
    arabicFirst ? [] : archiveDocs(genericQuery(), generalLimit),
    archiveDocs(arabicQuery(), arabicLimit),
    arabicFirst ? [] : archiveDocs(FEDFLIX_QUERY, fedflixLimit),
    arabicFirst ? [] : archiveDocs(PRELINGER_QUERY, prelingerLimit),
    arabicFirst ? [] : mapLimit(openShardQueries(), shardConcurrency, query => archiveDocs(query, shardLimit)),
    mapLimit(entertainmentOnly ? arabicEntertainmentQueries() : arabicExpansionQueries(), 2, query => archiveDocs(query, arabicExtraLimit)),
    arabicFirst ? [] : mapLimit(openCollectionQueries(), 2, query => archiveDocs(query, collectionLimit))
  ]);

  for (const doc of generalDocs) {
    const item = toCatalogItem(doc);
    if (item) byId.set(item.sourceItemId, item);
  }
  for (const doc of arabicDocs) {
    const profile = entertainmentOnly ? archiveEntertainmentProfile(doc) : null;
    if (entertainmentOnly && !profile.accepted) continue;
    const item = toCatalogItem(doc, { forceArabic: true, categoryOverride: profile?.category || '' });
    if (item) byId.set(item.sourceItemId, item);
  }
  for (const doc of fedflixDocs) {
    const item = toCatalogItem(doc, { trustedFedFlix: true });
    if (item) byId.set(item.sourceItemId, item);
  }
  for (const doc of prelingerDocs) {
    const item = toCatalogItem(doc);
    if (!item) continue;
    if (!String(item.category || '').startsWith('عربي ·')) item.category = `Prelinger · ${item.category}`;
    byId.set(item.sourceItemId, item);
  }

  for (const docs of shardSets) {
    for (const doc of docs) {
      const item = toCatalogItem(doc);
      if (item) byId.set(item.sourceItemId, item);
    }
  }

  for (const docs of arabicExtraSets) {
    for (const doc of docs) {
      if (arabicFirst && !isArabicDoc(doc)) continue;
      const profile = entertainmentOnly ? archiveEntertainmentProfile(doc) : null;
      if (entertainmentOnly && !profile.accepted) continue;
      const item = toCatalogItem(doc, {
        forceArabic: isArabicDoc(doc) || /[\u0600-\u06ff]/.test(String(doc.title || '')),
        categoryOverride: profile?.category || ''
      });
      if (item) byId.set(item.sourceItemId, item);
    }
  }

  for (const docs of collectionSets) {
    for (const doc of docs) {
      const item = toCatalogItem(doc);
      if (item) byId.set(item.sourceItemId, item);
    }
  }

  const allSeriesQueries = seriesQueries();
  const selectedSeriesQueries = arabicFirst ? [allSeriesQueries.at(-1)] : allSeriesQueries;
  const seriesDocs = await mapLimit(selectedSeriesQueries, 3, query => archiveDocs(query, seriesLimit));
  for (const docs of seriesDocs) {
    for (const doc of docs) {
      const profile = entertainmentOnly ? archiveEntertainmentProfile(doc) : null;
      if (entertainmentOnly && !profile.accepted) continue;
      const item = toCatalogItem(doc, { categoryOverride: profile?.category || '' });
      if (!item || item.kind !== 'series_episode') continue;
      byId.set(item.sourceItemId, item);
    }
  }

  return [...byId.values()].sort((a,b) => Number(b.language === 'ar') - Number(a.language === 'ar') || a.title.localeCompare(b.title, 'ar'));
}
