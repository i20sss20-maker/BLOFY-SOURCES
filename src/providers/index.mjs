import { envBool } from './common.mjs';
import { syncInternetArchive } from './internet-archive.mjs';
import { syncWikimediaCommons } from './wikimedia.mjs';
import { syncPeerTube } from './peertube.mjs';
import { syncNasa } from './nasa.mjs';
import { syncIptvOrg } from './iptv-org.mjs';
import { syncFreeTv } from './free-tv.mjs';
import { syncOpenArabicFilms } from './open-arabic-films.mjs';
import { syncAuthorizedPartnerManifests } from './authorized-partners.mjs';

export const providerDefinitions = [
  { id:'authorized-partners', name:'Authorized partner manifests', kind:'Live + VOD + series', sync:syncAuthorizedPartnerManifests, enabled:()=>envBool('ENABLE_AUTHORIZED_PARTNERS', false), rights:'Disabled by default. Requires explicit rights confirmation plus a manifest carrying partner, Saudi/MENA territory and rights reference.' },
  { id:'internet-archive', name:'Internet Archive · Open licences', kind:'VOD + series detection', sync:syncInternetArchive, enabled:()=>true, rights:'Only CC0 / CC BY / CC BY-SA / public-domain-style licence URLs are accepted.' },
  { id:'wikimedia', name:'Wikimedia Commons · Video', kind:'VOD', sync:syncWikimediaCommons, enabled:()=>true, rights:'Machine-readable licence metadata is checked; NC/ND are excluded.' },
  { id:'peertube', name:'PeerTube · Open licences', kind:'VOD + live', sync:syncPeerTube, enabled:()=>true, rights:'Only licence IDs CC BY, CC BY-SA, Public Domain, and no-known-restrictions are accepted.' },
  { id:'open-arabic-films', name:'Open films · Arabic localized', kind:'VOD', sync:syncOpenArabicFilms, enabled:()=>envBool('ENABLE_OPEN_ARABIC_FILMS', true), rights:'Curated reusable films only; foreign titles require a verified Arabic subtitle track and machine-readable open licence.' },
  { id:'nasa', name:'NASA Image and Video Library', kind:'VOD', sync:syncNasa, enabled:()=>envBool('ENABLE_NASA', !envBool('ARABIC_FIRST', true)), rights:'NASA media usage guidelines apply; disabled by default while Arabic-first mode is active.' },
  { id:'free-tv', name:'Free-TV · Curated free official channels', kind:'Live', sync:syncFreeTv, enabled:()=>String(process.env.ENABLE_FREE_TV||'true').toLowerCase()==='true', rights:'Curated project policy requires channels to be free and officially available without a private subscription.' },
  { id:'iptv-org', name:'IPTV-org public stream directory', kind:'Live', sync:syncIptvOrg, enabled:()=>String(process.env.ENABLE_IPTV_ORG||'').toLowerCase()==='true', rights:'Disabled by default. Public reachability is not a redistribution licence; review channels before enabling.' }
];
