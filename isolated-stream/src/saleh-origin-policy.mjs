// BLOFY STREAM SALEH origin pilot. Strictly control-plane validation.
// Nothing in this module starts media, touches the source credentials,
// modifies an existing subscription or makes a public endpoint available.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateSalehOriginSource(report,sourceId){
 const expected=String(sourceId||'').trim().toLowerCase();
 if(!UUID.test(expected))return {ok:false,code:'saleh_origin_invalid_source'};
 if(report?.status!==200||report?.body?.ok!==true||
   !Array.isArray(report.body.sources))
   return {ok:false,code:'saleh_origin_source_inventory_unavailable'};
 const candidates=report.body.sources.filter(item=>
   String(item?.name||'').trim().toLowerCase()==='saleh');
 if(candidates.length!==1)
   return {ok:false,code:'saleh_origin_source_not_unique'};
 const source=candidates[0];
 if(source.enabled!==true||source.publishCatalog!==true)
   return {ok:false,code:'saleh_origin_source_disabled'};
 if(String(source.id||'').toLowerCase()!==expected)
   return {ok:false,code:'saleh_origin_other_source_blocked'};
 return {ok:true,sourceId:expected,sourceName:'saleh'};
}

export function salehOriginReadiness({enabled=false,paths=[],sourceId=null,
  upstreamChannelLimit=1}={}){
 const active=Array.isArray(paths)?paths:[];
 const limit=Number.isSafeInteger(upstreamChannelLimit)&&upstreamChannelLimit>=1
   ?Math.min(64,upstreamChannelLimit):1;
 const sourcePaths=active.filter(row=>sourceId?
   row?.sourceId===sourceId:row?.sourceId);
 return {enabled:enabled===true,sourceName:'saleh',
   sourceActivePaths:sourcePaths.length,sourceChannelLimit:limit,
   sourceConnectionCapVerified:false,
   viewerLimitIsNotUpstreamCapacity:true,
   licenseRestricted:true,customerCutoverEnabled:false,
   requiresAuthorizedProviderCapacity:true};
}
