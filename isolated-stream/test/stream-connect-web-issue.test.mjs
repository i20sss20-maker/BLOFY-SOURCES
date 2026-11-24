import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createConnectIssuer} from '../src/stream-connect-issuer.mjs';
import {handleStreamConnect,renderStreamConnect} from '../src/stream-connect-page.mjs';
const now=1800000000000;
const pilotToken='x'.repeat(48);
const authorization='Basic '+Buffer.from('operator:'+pilotToken).toString('base64');
const input={host:'https://provider.example.com',username:'test-user',password:'synthetic-password',authorized:true};
const host='blofy-stream-api-production.up.railway.app';
const validCode='BC-'+'x'.repeat(24);
function run(issuer,body=input,options={}){
 return new Promise(resolve=>{
 const req=Readable.from([JSON.stringify(body)]);
 Object.assign(req,{url:'/connect/api/issue',method:'POST',socket:{remoteAddress:'127.0.0.1'},headers:{authorization,host,origin:'https://'+host,'content-type':'application/json','x-blofy-connect-action':'issue','sec-fetch-site':'same-origin'},...options});
 const res={writeHead(status,headers){this.status=status;this.headers=headers},end(raw){resolve({status:this.status,headers:this.headers,body:JSON.parse(raw)})}};
 assert.equal(issuer.handle(req,res),true);
 });
}
test('web pairing gate, origin, authorized-use confirmation and result allowlist',async()=>{
 let called=0,seen;
 const bridge={configured:true,connectIssue:async data=>{called++;seen=data;return {status:201,body:{ok:true,code:validCode,oneTime:true,providerVerified:false,expiresAt:now+900000,secret:'private'}}}};
 const off=createConnectIssuer({bridge,clock:()=>now});
 assert.equal((await run(off)).status,503);assert.equal(called,0);
 const on=createConnectIssuer({bridge,enabled:true,pilotToken,clock:()=>now});
 assert.equal((await run(on,input,{headers:{origin:'https://evil.example.com'}})).status,401);
 assert.equal((await run(on,input,{headers:{authorization,origin:'https://evil.example.com'}})).status,403);
 assert.equal((await run(on,{...input,authorized:false})).status,400);
 assert.equal(called,0);
 const success=await run(on,{...input,adminToken:'not forwarded'});
 assert.equal(success.status,201);assert.deepEqual(seen,{host:input.host,username:input.username,password:input.password});
 assert.deepEqual(success.body,{ok:true,code:validCode,expiresAt:now+900000,oneTime:true,providerVerified:false});
 assert.match(success.headers['cache-control'],/no-store/);
});
test('web pairing rate and request size limits',async()=>{
 const bridge={configured:true,connectIssue:async()=>({status:201,body:{ok:true,code:validCode,oneTime:true,providerVerified:false,expiresAt:now+900000}})};
 const on=createConnectIssuer({bridge,enabled:true,pilotToken,clock:()=>now});
 assert.equal((await run(on,{...input,password:'x'.repeat(5000)})).status,413);
 for(let i=0;i<4;i++)assert.equal((await run(on)).status,201);
 assert.equal((await run(on)).status,429);
});
test('enabled UI script parses, disabled UI has no form or script',()=>{
 const disabled=renderStreamConnect('nonce');assert.doesNotMatch(disabled,/<form|<script/);
 const enabled=renderStreamConnect('nonce',{enabled:true});
 assert.match(enabled,/<form id="connect-form"/);assert.match(enabled,/id="authorized"/);
 const script=enabled.match(/<script nonce="nonce">([\s\S]+)<\/script>/);
 assert.ok(script);assert.doesNotThrow(()=>new Function(script[1]));
 assert.match(script[1],/\/connect\/api\/issue/);
 const res={writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=body}};
 assert.equal(handleStreamConnect({url:'/connect',method:'GET'},res,{enabled:true}),true);
 assert.match(res.headers['content-security-policy'],/connect-src 'self'/);
 assert.match(res.headers['content-security-policy'],/form-action 'none'/);
});

test('pilot rejects absent or incorrect operator credentials and leaves public page disabled',async()=>{
 const on=createConnectIssuer({enabled:true,pilotToken,bridge:{configured:true,connectIssue:async()=>{throw Error('must not call')}},clock:()=>now});
 for(const header of ['', 'Basic '+Buffer.from('operator:wrong').toString('base64')])assert.equal((await run(on,input,{headers:{authorization:header}})).status,401);
 const res={writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=body}};
 assert.equal(handleStreamConnect({url:'/connect/pilot',method:'GET'},res),false);
 assert.equal(handleStreamConnect({url:'/connect/pilot',method:'GET'},res,{enabled:true,pilot:true}),true);
 assert.match(res.body,/اختبار المالك الخاص/);
});

test('public beta only permits unauthenticated issuance with explicit compatible app consent',async()=>{
 let calls=0;
 const bridge={configured:true,connectIssue:async()=>{calls++;return {status:201,body:{ok:true,code:validCode,oneTime:true,providerVerified:false,expiresAt:now+900000}}}};
 const headers={host,origin:'https://'+host,'content-type':'application/json','x-blofy-connect-action':'issue','sec-fetch-site':'same-origin'};
 const off=createConnectIssuer({bridge,enabled:true,pilotToken,clock:()=>now});
 assert.equal((await run(off,{...input,compatibleApp:true},{headers})).status,401);
 const on=createConnectIssuer({bridge,enabled:true,publicEnabled:true,pilotToken,clock:()=>now});
 assert.equal((await run(on,input,{headers})).status,400);
 assert.equal((await run(on,{...input,compatibleApp:true},{headers:{...headers,origin:'https://invalid.example.com'}})).status,403);
 assert.equal((await run(on,{...input,compatibleApp:true},{headers})).status,201);
 assert.equal(calls,1);
 const html=renderStreamConnect('nonce',{enabled:true,publicBeta:true});
 assert.match(html,/الربط متاح/);assert.match(html,/compatible-app/);assert.match(html,/طريقة الربط والتوافق/);assert.match(html,/56\.0\.5/);assert.match(html,/التنزيل العام للنسخة المتوافقة غير متاح حاليًا/);assert.doesNotMatch(html,/github\.com|14942640054/);
 assert.doesNotMatch(html,/الخدمة قيد التجهيز/);
 assert.match(renderStreamConnect('nonce'),/الخدمة قيد التجهيز/);
});

test('official blofysat hostname issues only with matching trusted origin',async()=>{
 const host='connect.blofysat.com';let calls=0;
 const issuer=createConnectIssuer({enabled:true,publicEnabled:true,bridge:{configured:true,connectIssue:async()=>{calls++;return {status:201,body:{ok:true,code:validCode,oneTime:true,providerVerified:false,expiresAt:now+900000}}}},clock:()=>now});
 const headers={host,origin:'https://'+host,'content-type':'application/json','x-blofy-connect-action':'issue','sec-fetch-site':'same-origin'};
 const data={...input,compatibleApp:true};
 assert.equal((await run(issuer,data,{headers})).status,201);
 assert.equal((await run(issuer,data,{headers:{...headers,origin:'https://connect.blofyplayer.com'}})).status,403);
 assert.equal((await run(issuer,data,{headers:{...headers,host:'untrusted.example.com'}})).status,403);
 assert.equal(calls,1);
});
