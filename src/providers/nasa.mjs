import { fetchJson, envInt } from './common.mjs';

export async function syncNasa() {
  const limit = envInt('NASA_LIMIT', 500, 20, 2000);
  const queries = ['space', 'earth', 'apollo', 'international space station'];
  const items = [];
  const seen = new Set();
  for (const q of queries) {
    if (items.length >= limit) break;
    const params = new URLSearchParams({ q, media_type: 'video', page_size: String(Math.min(100, limit - items.length)) });
    const data = await fetchJson(`https://images-api.nasa.gov/search?${params}`, 25000);
    for (const result of data?.collection?.items || []) {
      const meta = result?.data?.[0] || {};
      const nasaId = String(meta.nasa_id || '');
      if (!nasaId || seen.has(nasaId)) continue;
      seen.add(nasaId);
      items.push({
        sourceItemId: nasaId,
        kind: 'movie',
        title: meta.title || nasaId,
        description: meta.description || meta.description_508 || '',
        icon: result?.links?.find(x => x.render === 'image')?.href || '',
        category: `NASA · ${meta.center || 'Media'}`,
        language: 'en',
        licenseName: 'NASA Media Usage Guidelines',
        licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
        attribution: `NASA${meta.center ? ` · ${meta.center}` : ''}`,
        publishedAt: meta.date_created || '',
        stream: { resolver: 'nasa', nasaId },
        rights: { mode: 'government-guidelines', redistributable: true, attributionRequired: true, thirdPartyCaveat: true }
      });
      if (items.length >= limit) break;
    }
  }
  return items;
}
