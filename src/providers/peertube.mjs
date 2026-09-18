import { stripHtml } from '../catalog.mjs';
import { fetchJson, envInt } from './common.mjs';

const PEERTUBE_ALLOWED_LICENSE_IDS = new Set([1, 2, 7, 8]);
const DEFAULT_SEEDS = [
  'https://framatube.org',
  'https://video.tedomum.net',
  'https://videos.domainepublic.net',
  'https://tube-sciences-technologies.apps.education.fr',
  'https://indymotion.fr',
  'https://peertube.wtf',
  'https://video.4d2.org',
  'https://peertube.1312.media',
  'https://fedi.video',
  'https://tube.p2p.legal',
  'https://video.lqdn.fr',
  'https://friprogramvarusyndikatet.tv',
  'https://meyon.com.ye',
  'https://makertube.net',
  'https://tube-arts-lettres-sciences-humaines.apps.education.fr',
  'https://tube-numerique-educatif.apps.education.fr',
  'https://tube-action-educative.apps.education.fr',
  'https://video.antopie.org',
  'https://peertube.iriseden.eu',
  'https://peertube.ch',
  'https://peertube.stream',
  'https://peertube.tv',
  'https://peertube.lyceeconnecte.fr',
  'https://play.cotv.org.br',
  'https://video.hardlimit.com'
];

function peertubeSeeds() {
  const configured = String(process.env.PEERTUBE_INSTANCES || '').trim();
  const values = configured ? configured.split(',') : DEFAULT_SEEDS;
  return [...new Set(values.map(value => value.trim().replace(/\/+$/, '')).filter(value => /^https:\/\//i.test(value)))];
}
function isArabicVideo(video, forced = false) {
  if (forced) return true;
  const lang = String(video.language?.id || video.language || '').toLowerCase();
  if (/^ar(?:[-_]|$)/.test(lang) || lang === 'ara' || lang === 'arabic') return true;
  return /[\u0600-\u06ff]/.test(`${video.name || ''} ${video.description || ''}`);
}
function mapVideo(video, seed, { forceArabic = false } = {}) {
  const licenseId = Number(video.licence?.id ?? video.licence);
  if (!PEERTUBE_ALLOWED_LICENSE_IDS.has(licenseId) || video.nsfw === true) return null;
  const uuid = String(video.uuid || '').trim(); if (!uuid) return null;
  const originUrl = String(video.url || `${seed}/videos/watch/${uuid}`);
  let origin; try { origin = new URL(originUrl).origin; } catch { origin = seed; }
  const channel = video.channel?.displayName || video.channel?.name || video.account?.displayName || '';
  const licenceLabel = video.licence?.label || video.licence?.name || ({1:'CC BY',2:'CC BY-SA',7:'Public Domain',8:'No known copyright restrictions'}[licenseId] || 'Open licence');
  const arabic = isArabicVideo(video, forceArabic);
  const rawCategory = String(video.category?.label || (video.isLive ? 'PeerTube Live' : 'PeerTube'));
  return {sourceItemId:uuid,kind:video.isLive?'live':'movie',title:String(video.name||uuid),description:stripHtml(video.description||''),icon:video.thumbnailPath?`${origin}${video.thumbnailPath}`:'',category:arabic?`عربي · ${rawCategory}`:rawCategory,language:arabic?'ar':String(video.language?.id||video.language||''),licenseName:String(licenceLabel),licenseUrl:'',attribution:channel?`${channel} · PeerTube`:'PeerTube',publishedAt:video.publishedAt||video.createdAt||'',stream:{resolver:'peertube',origin,uuid},rights:{mode:'license-filtered',redistributable:true,commercialCompatible:![4,5,6].includes(licenseId),arabic}};
}
async function collectSeed(seed, limit, { arabicOnly = false } = {}) {
  const out=[];let start=0;
  while(out.length<limit&&start<Math.max(limit*4,300)){
    const count=Math.min(100,Math.max(1,limit-out.length));
    const params=new URLSearchParams({count:String(count),start:String(start),sort:'-views'});if(arabicOnly)params.set('languageOneOf','ar');
    let data;try{data=await fetchJson(`${seed}/api/v1/videos?${params}`,16000)}catch(error){console.warn(`PeerTube seed skipped ${seed}: ${String(error?.message||error)}`);break}
    const rows=data?.data||[];if(!rows.length)break;
    for(const video of rows){const item=mapVideo(video,seed,{forceArabic:arabicOnly});if(item)out.push(item);if(out.length>=limit)break}
    start+=rows.length;if(rows.length<count)break;
  }
  return out;
}
async function mapLimit(values,limit,fn){
  const out=new Array(values.length),queue=values.map((value,index)=>({value,index}));
  await Promise.all(Array.from({length:Math.min(limit,queue.length)},async()=>{while(queue.length){const job=queue.shift();out[job.index]=await fn(job.value)}}));
  return out;
}
export async function syncPeerTube() {
  const totalLimit=envInt('PEERTUBE_LIMIT',60000,100,80000),arabicLimit=envInt('PEERTUBE_ARABIC_LIMIT',20000,50,30000),seeds=peertubeSeeds(),byId=new Map();
  const seedConcurrency=envInt('PEERTUBE_SEED_CONCURRENCY',4,1,8),arabicPerSeed=Math.max(50,Math.ceil(arabicLimit/Math.max(1,seeds.length)));
  const arabicSets=await mapLimit(seeds,seedConcurrency,seed=>collectSeed(seed,arabicPerSeed,{arabicOnly:true}));
  for(const rows of arabicSets)for(const item of rows)byId.set(item.sourceItemId,item);
  const perSeed=Math.max(100,Math.ceil(totalLimit/Math.max(1,seeds.length)));
  const generalSets=await mapLimit(seeds,seedConcurrency,seed=>collectSeed(seed,perSeed));
  for(const rows of generalSets)for(const item of rows)if(!byId.has(item.sourceItemId))byId.set(item.sourceItemId,item);
  return [...byId.values()].slice(0,totalLimit+arabicLimit).sort((a,b)=>Number(b.language==='ar')-Number(a.language==='ar')||a.title.localeCompare(b.title,'ar'));
}
