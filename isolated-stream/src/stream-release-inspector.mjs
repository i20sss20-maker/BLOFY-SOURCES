// Read-only signed-release *metadata* inspector. It cannot publish or update
// an Android APK and must never treat a SHA-256 field as proof the bytes were
// downloaded, signed, installed or decoded on any particular TV device.
const ENDPOINT='https://updates.blofyplayer.com/stream/release.json';
const EXPECTED_PACKAGE='tv.blofy.player.v2.stream';
const EXPECTED_DOWNLOAD='https://updates.blofyplayer.com/d/blofy-stream';
const MAX_BYTES=16_384;
export function createStreamReleaseInspector({
  fetchImpl=fetch,clock=Date.now,timeoutMs=2500,cacheMs=60_000
}={}){
  if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>10000||
    !Number.isInteger(cacheMs)||cacheMs<1000||cacheMs>300000)
    throw Error('release_inspector_invalid_configuration');
  let cache=null,ongoing=null;
  async function inspect(){
    const now=clock();
    if(cache&&now-cache.at<cacheMs)return {...cache.result,cacheHit:true};
    if(ongoing)return ongoing;
    ongoing=(async()=>{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      try{
        const response=await fetchImpl(ENDPOINT,{
          method:'GET',redirect:'manual',cache:'no-store',signal:controller.signal,
          headers:{accept:'application/json'}
        });
        if(response.status!==200)return {
          ok:false,code:'stream_release_manifest_unavailable',
          metadataConsistent:false,apkBytesVerified:false};
        const length=Number(response.headers?.get?.('content-length')||0);
        if(length>MAX_BYTES)return {ok:false,code:'stream_release_metadata_oversized'};
        const raw=await response.text();
        if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)
          return {ok:false,code:'stream_release_metadata_oversized'};
        let data;try{data=JSON.parse(raw)}catch{
          return {ok:false,code:'stream_release_metadata_invalid'};
        }
        const app=data?.release?.app;
        if(!app||typeof app!=='object')
          return {ok:false,code:'stream_release_manifest_missing'};
        const code=app.versionCode,name=app.versionName;
        const good=app.packageName===EXPECTED_PACKAGE &&
          Number.isSafeInteger(code)&&code>0&&code<1000000000 &&
          typeof name==='string'&&/^[a-zA-Z0-9._-]{3,72}$/.test(name) &&
          /^[0-9a-f]{64}$/i.test(app.sha256||'')&&
          Number.isSafeInteger(app.apkSizeBytes)&&
          app.apkSizeBytes>1024&&app.apkSizeBytes<512*1024*1024 &&
          app.downloadUrl===EXPECTED_DOWNLOAD&&
          app.minSupportedVersionCode<=code;
        return {
          ok:true,metadataConsistent:good,
          code:good?'stream_release_metadata_consistent':'stream_release_metadata_mismatch',
          versionCode:Number.isSafeInteger(code)?code:null,
          versionName:typeof name==='string'?name.slice(0,72):null,
          packageName:app.packageName===EXPECTED_PACKAGE?EXPECTED_PACKAGE:null,
          sha256FieldPresent:/^[0-9a-f]{64}$/i.test(app.sha256||''),
          downloadUrlExpected:app.downloadUrl===EXPECTED_DOWNLOAD,
          apkBytesVerified:false,signatureVerified:false,
          deviceUpdateTested:false
        };
      }catch{return {ok:false,code:'stream_release_manifest_unreachable',
        metadataConsistent:false,apkBytesVerified:false}}
      finally{clearTimeout(timer)}
    })().then(result=>{
      cache={at:clock(),result};return result;
    }).finally(()=>{ongoing=null});
    return ongoing;
  }
  return {inspect};
}
