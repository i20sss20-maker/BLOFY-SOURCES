import { normalizeArray, stripHtml } from '../catalog.mjs';
const UA = 'BLOFY-SOURCES-XTREAM/1.0 (+https://github.com/i20sss20-maker/BLOFY-SOURCES)';

export async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': UA,
        'accept': '*/*',
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`http_${response.status}_${new URL(url).hostname}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, timeoutMs = 20000) {
  return (await fetchWithTimeout(url, {}, timeoutMs)).json();
}

export async function fetchText(url, timeoutMs = 30000) {
  return (await fetchWithTimeout(url, {}, timeoutMs)).text();
}

export function envInt(name, fallback, min = 1, max = 100000) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
}

export function arrayFirst(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function cleanLicenseUrl(value) {
  const raw = String(arrayFirst(value) || '').trim();
  return raw.replace(/^http:\/\//i, 'https://');
}

export function allowedOpenLicense(name = '', url = '') {
  const text = `${name} ${url}`.toLowerCase();
  if (/by-nc|non.?commercial|by-nd|no.?derivatives/.test(text)) return false;
  return [
    'creativecommons.org/licenses/by/',
    'creativecommons.org/licenses/by-sa/',
    'creativecommons.org/publicdomain/zero/',
    'creativecommons.org/publicdomain/mark/',
    'public domain',
    'publicdomain',
    'cc0',
    'cc by',
    'cc-by',
    'cc by-sa',
    'cc-by-sa',
    'free of known copyright restrictions'
  ].some(token => text.includes(token));
}

export function categoryFromMeta(subject, collection, fallback = 'Open Media') {
  const candidates = [...normalizeArray(subject), ...normalizeArray(collection)]
    .map(value => stripHtml(value))
    .filter(Boolean)
    .filter(value => value.length <= 80);
  return candidates[0] || fallback;
}
