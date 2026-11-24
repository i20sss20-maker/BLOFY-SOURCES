import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const web='https://connect.blofysat.com';
const v2=process.env.CONNECT_SMOKE_V2==='true';
const app='https://blofyplayer.com';
const fetchSafe=(url,options={})=>fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
const check=async(response,status,label)=>{
 assert.equal(response.status,status,label+' HTTP status');
 assert.match(response.headers.get('cache-control')||'',/no-store/i,label+' cache policy');
};
const page=await fetchSafe(web+'/');
await check(page,200,'public page');
const html=await page.text();
assert.ok(html.includes('id="connect-form"'),'public pairing form must be enabled');
assert.ok(html.includes('الربط متاح'),'public beta label');
for(const scheme of (v2?['https','http']:['https'])){
const payload={host:scheme+'://provider.example.com:8443',username:'connect-synthetic-'+crypto.randomBytes(6).toString('hex'),password:crypto.randomBytes(18).toString('hex'),authorized:true,compatibleApp:true,...(v2?{numericCode:true,allowHttp:scheme==='http'}:{})};
const issue=await fetchSafe(web+'/connect/api/issue',{method:'POST',headers:{'content-type':'application/json','origin':web,'sec-fetch-site':'same-origin','x-blofy-connect-action':'issue'},body:JSON.stringify(payload)});
await check(issue,201,'synthetic issuance');
const issued=await issue.json();
assert.ok(issued.ok===true&&issued.oneTime===true&&issued.providerVerified===false,'issuance contract');
assert.ok((v2?/^[0-9]{12}$/:/^BC-[A-Za-z0-9_-]{24}$/).test(issued.code),'pairing format');
const redeem=()=>fetchSafe(app+'/api/v1/stream/connect/redeem',{method:'POST',headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({code:issued.code})});
const received=await redeem();
await check(received,200,'app redemption');
const decoded=await received.json();
assert.ok(decoded.ok===true&&decoded.type==='external_xtream'&&decoded.providerVerified===false,'redemption contract');
assert.ok(decoded.credentials?.host===payload.host&&decoded.credentials?.username===payload.username&&decoded.credentials?.password===payload.password,'synthetic credential round trip');
const replay=await redeem();
await check(replay,404,'replay denial');
assert.ok((await replay.json()).code==='connect_code_expired_or_used','single use enforcement');
}
console.log('CONNECT live smoke passed: official domain, '+(v2?'HTTP and HTTPS numeric':'legacy HTTPS')+' issuance, app redemption and replay denial. No provider contact or playback attempted.');
