import { syncInternetArchive } from './internet-archive.mjs';
import { syncWikimediaCommons } from './wikimedia.mjs';
import { syncPeerTube } from './peertube.mjs';
import { syncNasa } from './nasa.mjs';
import { syncIptvOrg } from './iptv-org.mjs';

export const providerDefinitions = [
  { id:'internet-archive', name:'Internet Archive · Open licences', kind:'VOD + series detection', sync:syncInternetArchive, enabled:()=>true, rights:'Only CC0 / CC BY / CC BY-SA / public-domain-style licence URLs are accepted.' },
  { id:'wikimedia', name:'Wikimedia Commons · Video', kind:'VOD', sync:syncWikimediaCommons, enabled:()=>true, rights:'Machine-readable licence metadata is checked; NC/ND are excluded.' },
  { id:'peertube', name:'PeerTube · Open licences', kind:'VOD + live', sync:syncPeerTube, enabled:()=>true, rights:'Only licence IDs CC BY, CC BY-SA, Public Domain, and no-known-restrictions are accepted.' },
  { id:'nasa', name:'NASA Image and Video Library', kind:'VOD', sync:syncNasa, enabled:()=>true, rights:'NASA media usage guidelines apply; third-party marked assets remain excluded by policy review.' },
  { id:'iptv-org', name:'IPTV-org public stream directory', kind:'Live', sync:syncIptvOrg, enabled:()=>String(process.env.ENABLE_IPTV_ORG||'').toLowerCase()==='true', rights:'Disabled by default. Public reachability is not a redistribution licence; review channels before enabling.' }
];
