// Read-only diagnostics, never a provider-side quota assertion or a source probe.
const count=x=>Number.isSafeInteger(x)&&x>=0?x:null;
export function sharedLiveCapacityReport(snapshot){
 const f=snapshot?.fanout;
 if(!f||snapshot.sharedLiveEnabled!==true)return null;
 const fields=['activeFeeds','viewers','upstreamSessionsOpened','viewersAccepted',
  'peakViewersOnOneFeed','viewerLimitRejections','slowViewerDisconnects','maxViewersPerFeed','maxViewerQueueBytes',
  'sourceLimitRejections','capacityRejections','cooldownRejections','sourceHandoffWaits',
  'pendingSourceHandoffs','upstreamReconnects','reconnectRecovered','reconnectExhaustions',
  'sourceOutages','sourceReleaseStalls','sourceBytesReceived','viewerBytesQueued'];
 const counters=Object.fromEntries(fields.map(k=>[k,count(f[k])]));
 const channels=Array.isArray(f.channels)?f.channels.slice(0,64):[];
 const maxViewersOnOneFeed=channels.length?Math.max(...channels.map(c=>count(c?.viewers)??0)):0;
 const staleFeeds=channels.filter(c=>Number.isFinite(c?.lastMediaAgeMs)&&c.lastMediaAgeMs>=15000).length;
 return {...counters,activeDirectMediaClients:count(snapshot.activeDirectMediaClients),
  maxViewersOnOneFeed,staleFeeds,scope:'one_media_process',
  providerSlotVerified:false,decodedVideoVerified:false};
}
