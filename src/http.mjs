import { PORT, PUBLIC_BASE_URL, XTREAM_PUBLIC_BASE_URL } from './config.mjs';
export function baseUrl(req) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  return `${proto}://${req.headers.host || `localhost:${PORT}`}`;
}
export function xtreamBaseUrl(req) {
  return XTREAM_PUBLIC_BASE_URL || PUBLIC_BASE_URL || baseUrl(req);
}
export function json(res, status, body, extra = {}) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra});
  res.end(JSON.stringify(body));
}
export function text(res, status, body, contentType = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, {'content-type':contentType,'cache-control':'no-store','x-content-type-options':'nosniff',...extra});
  res.end(body);
}
export async function readJsonBody(req, limit = 32_000) {
  let body='';
  for await (const chunk of req) { body += chunk; if (body.length > limit) throw new Error('body_too_large'); }
  return body ? JSON.parse(body) : {};
}
