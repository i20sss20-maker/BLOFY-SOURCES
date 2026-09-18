import { createGzip, gzipSync } from 'node:zlib';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { PORT, PUBLIC_BASE_URL, XTREAM_PUBLIC_BASE_URL } from './config.mjs';

function forwardedProto(req){
  const raw=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim().toLowerCase();
  if(raw==='http'||raw==='https')return raw;
  return req.socket?.encrypted?'https':'http';
}
function requestBaseUrl(req){
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  return host?`${forwardedProto(req)}://${host}`:'';
}
export function baseUrl(req) {
  return PUBLIC_BASE_URL || requestBaseUrl(req) || `http://localhost:${PORT}`;
}
export function xtreamBaseUrl(req) {
  // Prefer the real request scheme/host so old players using HTTP receive HTTP links,
  // while HTTPS players keep HTTPS links. Explicit XTREAM_PUBLIC_BASE_URL is fallback only.
  return requestBaseUrl(req) || XTREAM_PUBLIC_BASE_URL || PUBLIC_BASE_URL || `http://localhost:${PORT}`;
}
function sendBody(res,status,body,contentType,extra={}){
  const raw=Buffer.isBuffer(body)?body:Buffer.from(String(body));
  const accepts=String(res.req?.headers?.['accept-encoding']||'').toLowerCase();
  const shouldGzip=raw.length>=1400&&accepts.includes('gzip');
  const payload=shouldGzip?gzipSync(raw,{level:5}):raw;
  res.writeHead(status,{'content-type':contentType,'cache-control':'no-store','x-content-type-options':'nosniff','content-length':String(payload.length),...(shouldGzip?{'content-encoding':'gzip','vary':'accept-encoding'}:{}),...extra});
  res.end(payload);
}
async function streamBody(res,status,chunks,contentType,extra={}){
  const accepts=String(res.req?.headers?.['accept-encoding']||'').toLowerCase();
  const shouldGzip=accepts.includes('gzip');
  res.writeHead(status,{'content-type':contentType,'cache-control':'no-store','x-content-type-options':'nosniff',...(shouldGzip?{'content-encoding':'gzip','vary':'accept-encoding'}:{}),...extra});
  const source=Readable.from(chunks);
  if(shouldGzip)await pipeline(source,createGzip({level:5}),res);
  else await pipeline(source,res);
}
export function json(res,status,body,extra={}){sendBody(res,status,JSON.stringify(body),'application/json; charset=utf-8',extra)}
export function text(res,status,body,contentType='text/plain; charset=utf-8',extra={}){sendBody(res,status,body,contentType,extra)}
export async function jsonArray(res,status,rows,mapRow=x=>x,extra={}){
  async function* chunks(){
    let first=true;yield '[';
    for(const row of rows){const serialized=JSON.stringify(mapRow(row));if(serialized===undefined)continue;yield `${first?'':','}${serialized}`;first=false}
    yield ']';
  }
  return streamBody(res,status,chunks(),'application/json; charset=utf-8',extra);
}
export async function textStream(res,status,chunks,contentType='text/plain; charset=utf-8',extra={}){return streamBody(res,status,chunks,contentType,extra)}
export async function readJsonBody(req,limit=32_000){let body='';for await(const chunk of req){body+=chunk;if(body.length>limit)throw new Error('body_too_large')}return body?JSON.parse(body):{}}
