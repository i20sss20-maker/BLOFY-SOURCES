import { stripHtml } from '../catalog.mjs';
import { fetchJson, envInt, envBool, allowedOpenLicense } from './common.mjs';

function wikimediaLicense(meta = {}) {
  const name = stripHtml(meta.LicenseShortName?.value || '');
  const url = stripHtml(meta.LicenseUrl?.value || '');
  return { name, url, allowed: allowedOpenLicense(name, url) };
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

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wikiJson(url){
  let lastError;
  for(let attempt=1;attempt<=4;attempt++){
    try{return await fetchJson(url,30000)}
    catch(error){
      lastError=error;
      const message=String(error?.message||error);
      if(!message.includes('429'))throw error;
      await sleep(attempt*1800);
    }
  }
  throw lastError;
}
async function searchVideos(query, limit, { arabic = false, category = 'Wikimedia Commons' } = {}) {
  const batch = 50;
  let offset = 0;
  const items = [];
  while (items.length < limit) {
    const params = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: query,
      gsrnamespace: '6', gsrlimit: String(batch), gsroffset: String(offset), prop: 'imageinfo',
      iiprop: 'url|mime|mediatype|extmetadata',
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|AttributionRequired', origin: '*'
    });
    const data = await wikiJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    const pages = data?.query?.pages || [];
    if (!pages.length) break;
    for (const page of pages) {
      const info = page.imageinfo?.[0]; if (!info?.url) continue;
      const license = wikimediaLicense(info.extmetadata || {}); if (!license.allowed) continue;
      const title = String(page.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]{2,5}$/i, '');
      const ext = String(info.url).split('?')[0].split('.').pop()?.toLowerCase() || ''; if (!['webm','ogv','ogg','mp4'].includes(ext)) continue;
      const artist = stripHtml(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || 'Wikimedia Commons');
      items.push({
        sourceItemId: String(page.pageid || page.title), kind: 'movie', title,
        description: stripHtml(info.extmetadata?.ImageDescription?.value || ''), icon: '',
        category: arabic ? `عربي · ${category}` : category,
        language: arabic ? 'ar' : '', licenseName: license.name, licenseUrl: license.url, attribution: artist,
        stream: { resolver: 'direct', url: info.url, extension: ext },
        rights: { mode: 'license-filtered', redistributable: true, commercialCompatible: true, arabic }
      });
      if (items.length >= limit) break;
    }
    if (!data.continue?.gsroffset) break;
    offset = Number(data.continue.gsroffset);
  }
  return items;
}


function generalPrefixes() {
  return [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
}
function arabicPrefixes() {
  return ['ا','ب','ت','ج','ح','د','ر','س','ع','ف','ك','ل','م','ن','و','ي'];
}
async function prefixVideoSets(limit, concurrency) {
  return mapLimit(generalPrefixes(), concurrency, async prefix => {
    try {
      return await searchVideos(`filetype:video prefix:File:${prefix}`, limit, { category: 'Wikimedia Commons · Open Video' });
    } catch (error) {
      console.warn(`Wikimedia prefix shard skipped ${prefix}: ${String(error?.message || error)}`);
      return [];
    }
  });
}
async function arabicPrefixVideoSets(limit, concurrency) {
  return mapLimit(arabicPrefixes(), concurrency, async prefix => {
    try {
      return await searchVideos(`filetype:video prefix:File:${prefix}`, limit, { arabic: true, category: 'ويكيميديا · أسماء عربية' });
    } catch (error) {
      console.warn(`Wikimedia Arabic prefix shard skipped ${prefix}: ${String(error?.message || error)}`);
      return [];
    }
  });
}

export async function syncWikimediaCommons() {
  const limit = envInt('WIKIMEDIA_LIMIT', 8000, 100, 15000);
  const arabicLimit = envInt('WIKIMEDIA_ARABIC_LIMIT', 3000, 100, 5000);
  const shardLimit = envInt('WIKIMEDIA_SHARD_LIMIT', 1000, 100, 2500);
  const arabicShardLimit = envInt('WIKIMEDIA_ARABIC_SHARD_LIMIT', 250, 25, 1000);
  const shardConcurrency = envInt('WIKIMEDIA_SHARD_CONCURRENCY', 4, 1, 6);
  const arabicFirst = envBool('ARABIC_FIRST', true);
  const byId = new Map();

  const arabicQueries = [
    { query: 'filetype:video incategory:"Videos in Arabic"', category: 'ويكيميديا عربي' },
    { query: 'filetype:video incategory:"Al Jazeera videos"', category: 'الجزيرة · Creative Commons' },
    { query: 'filetype:video incategory:"Videos by Al Jazeera of the 2008-2009 Gaza War"', category: 'الجزيرة · غزة · Creative Commons' },
    { query: 'filetype:video incategory:"Videos by Middle East News Agency"', category: 'وكالة أنباء الشرق الأوسط' },
    { query: 'filetype:video incategory:"Voice of America videos in Arabic"', category: 'صوت أمريكا · عربي' },
    { query: 'filetype:video incategory:"Videos from Tasnim News Agency in Arabic"', category: 'تسنيم · عربي' },
    { query: 'filetype:video incategory:"Wikimedia videos in Arabic"', category: 'ويكيميديا · عربي' },
    { query: 'filetype:video incategory:"Wikitongues videos in Arabic"', category: 'Wikitongues · عربي' },
    { query: 'filetype:video incategory:"CDC videos in Arabic"', category: 'CDC · عربي' }
  ];
  const [arabicSets, general, prefixSets, arabicPrefixSets] = await Promise.all([
    Promise.all(arabicQueries.map(async entry => {
      try {
        return await searchVideos(entry.query, arabicLimit, { arabic: true, category: entry.category });
      } catch (error) {
        console.warn(`Wikimedia Arabic query skipped: ${String(error?.message || error)}`);
        return [];
      }
    })),
    arabicFirst ? [] : searchVideos('filetype:video', limit),
    arabicFirst ? [] : prefixVideoSets(shardLimit, shardConcurrency),
    arabicPrefixVideoSets(arabicShardLimit, Math.min(3, shardConcurrency))
  ]);
  for (const rows of arabicSets) for (const item of rows) byId.set(item.sourceItemId, item);
  for (const rows of arabicPrefixSets) for (const item of rows) byId.set(item.sourceItemId, item);
  for (const rows of prefixSets) for (const item of rows) if (!byId.has(item.sourceItemId)) byId.set(item.sourceItemId, item);
  for (const item of general) if (!byId.has(item.sourceItemId)) byId.set(item.sourceItemId, item);

  return [...byId.values()].sort((a,b) => Number(b.language === 'ar') - Number(a.language === 'ar') || a.title.localeCompare(b.title, 'ar'));
}
