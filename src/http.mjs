import { gzipSync } from 'node:zlib';
import { PORT, PUBLIC_BASE_URL, XTREAM_PUBLIC_BASE_URL } from './config.mjs';
export function baseUrl(req) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  return `${proto}://${req.headers.host || `localhost:${PORT}`}`;
}
export function xtreamBaseUrl(req) { return XTREAM_PUBLIC_BASE_URL || PUBLIC_BASE_URL || baseUrl(req); }
function sendBody(res,status,body,contentType,extra={}){
  const raw=Buffer.isBuffer(body)?body:Buffer.from(String(body));
  const accepts=String(res.req?.headers?.['accept-encoding']||'').toLowerCase();
  const shouldGzip=raw.length>=1400&&accepts.includes('gzip');
  const payload=shouldGzip?gzipSync(raw,{level:5}):raw;
  res.writeHead(status,{'content-type':contentType,'cache-control':'no-store','x-content-type-options':'nosniff','content-length':String(payload.length),...(shouldGzip?{'content-encoding':'gzip','vary':'accept-encoding'}:{}),...extra});
  res.end(payload);
}
export function json(res,status,body,extra={}){sendBody(res,status,JSON.stringify(body),'application/json; charset=utf-8',extra)}
export function text(res,status,body,contentType='text/plain; charset=utf-8',extra={}){sendBody(res,status,body,contentType,extra)}
export async function readJsonBody(req,limit=32_000){let body='';for await(const chunk of req){body+=chunk;if(body.length>limit)throw new Error('body_too_large')}return body?JSON.parse(body):{}}
