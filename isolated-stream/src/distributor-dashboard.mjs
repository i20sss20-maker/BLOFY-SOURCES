// BLOFY STREAM restricted reseller portal. Authentication is a dedicated
// HttpOnly scoped cookie; browser never receives the backend bridge key.
import crypto from 'node:crypto';
const COOKIE='blofy_dist';
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const paths=new Set(['login','me','logout','list','issue','reveal']);
const okJson=(res,status,body,headers={})=>{
 const data=Buffer.from(JSON.stringify(body));
 res.writeHead(status,{'content-type':'application/json; charset=utf-8',
   'cache-control':'no-store, private','x-content-type-options':'nosniff',
   'x-frame-options':'DENY','referrer-policy':'no-referrer',
   'content-length':data.length,...headers});res.end(data);
};
async function jsonInput(req){
 if(!String(req.headers['content-type']||'').startsWith('application/json'))
   throw Object.assign(Error('json_required'),{status:415});
 let size=0,chunks=[];
 for await(const chunk of req){
   size+=chunk.length;if(size>4096)throw Object.assign(Error('body_too_large'),{status:413});
   chunks.push(chunk);
 }
 try{
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('invalid');
  return data;
 }catch{throw Object.assign(Error('invalid_json'),{status:400})}
}
function cookieToken(req){
 const raw=String(req.headers.cookie||'');
 const found=raw.match(/(?:^|;\s*)blofy_dist=([^;\s]+)/);
 return found&&TOKEN.test(found[1])?found[1]:'';
}
const cookie=(value,age)=>COOKIE+'='+value+
 '; Path=/distributor; Max-Age='+age+
 '; HttpOnly; Secure; SameSite=Strict';
function renderPage(nonce){
 const template=String.raw`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0c1426">
<title>BLOFY STREAM · لوحة التوزيع</title>
<style>
:root{--bg:#080d1c;--card:#151f35;--stroke:#35425f;--white:#f3f3ff;--muted:#a6b4ce;--purple:#b995ff;--mint:#64e7b6;--red:#ff9aa6}
*{box-sizing:border-box}body{margin:0;min-height:100vh;color:var(--white);font:15px/1.7 system-ui,Segoe UI,Tahoma,sans-serif;background:radial-gradient(ellipse at 15% 0%,#362351 0%,transparent 38%),linear-gradient(160deg,#10162a,#090d1b)}
main{max-width:1120px;margin:auto;padding:28px 19px 60px}
header{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-bottom:26px}
.brand{display:flex;align-items:center;gap:13px}.mark{width:52px;height:52px;border-radius:15px;background:linear-gradient(130deg,#e2c3ff,#6753b9);display:grid;place-items:center;color:#16132c;font-size:25px;font-weight:900}
.brand strong{display:block;font-size:19px}.brand small{color:var(--purple)}
.card{border-radius:19px;border:1px solid var(--stroke);background:linear-gradient(150deg,#1b2540,#111a2d);padding:clamp(16px,2.2vw,26px);margin-bottom:18px;box-shadow:0 10px 35px #02061233}
h1,h2{margin:0 0 12px;line-height:1.3}h1{font-size:27px}h2{font-size:19px}.muted{color:var(--muted)}
.row{display:flex;align-items:center;gap:11px;justify-content:space-between;flex-wrap:wrap}
.btn{border:1px solid #a48ad3;background:linear-gradient(130deg,#a17dd7,#7152bd);border-radius:11px;padding:10px 17px;color:white;font:inherit;font-weight:700;cursor:pointer}
.btn.secondary{background:#273450;border-color:#516284}.btn:hover{filter:brightness(1.12)}.btn:disabled{opacity:.5;cursor:wait}
input,select{font:inherit;border:1px solid #465879;color:white;background:#101a2e;border-radius:10px;padding:10px 13px;min-width:0;width:100%}
label{display:block;font-weight:600;color:#dae2f7;font-size:13px;margin-bottom:5px}
.formgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
.field{min-width:0}.field.full{grid-column:1/-1}
.notice{border:1px solid #a16a68;border-radius:11px;background:#39262d;padding:12px 14px;color:#ffd7d3;margin:13px 0}
.notice.ok{border-color:#42745f;background:#17372f;color:#a8f4d3}.notice[hidden],[hidden]{display:none!important}
.badge{border:1px solid #485d7b;border-radius:30px;padding:5px 12px;color:#e5dcff}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.stat{padding:14px;border:1px solid #3c4a66;background:#141e34;border-radius:14px}.stat small{display:block;color:var(--muted)}.stat strong{font-size:25px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.chip{border:1px solid #536384;color:#e6dfff;background:#24324c;border-radius:10px;padding:8px 17px;cursor:pointer}
.chip.active{border-color:#a88ce7;background:#463668;color:white}
.secret{border:1px solid #47766c;background:#15392f;padding:18px;border-radius:13px;overflow-wrap:anywhere;margin-top:12px}
.secret strong{display:block;direction:ltr;text-align:right;font:700 19px/1.5 Consolas,monospace}
.secret .fieldline{display:flex;flex-wrap:wrap;justify-content:space-between;gap:11px;align-items:center;padding:9px 0;border-bottom:1px solid #ffffff19}
.tablewrap{overflow:auto;border-radius:13px;border:1px solid #354966}table{width:100%;border-collapse:collapse}th,td{text-align:right;padding:13px 11px;border-bottom:1px solid #354966;white-space:nowrap}th{color:#c8d3f0;background:#202d46}td{color:#edf1fd}
.mini{font-size:12px;padding:5px 10px}.num{direction:ltr;unicode-bidi:isolate;display:inline-block}
@media(max-width:720px){.formgrid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}main{padding:16px 11px 40px}header{gap:6px}}
</style></head><body><main>
<header><div class="brand"><span class="mark">B</span><div><strong>BLOFY STREAM</strong><small>لوحة التوزيع المحدودة · أكواد وXtream فقط</small></div></div>
<button class="btn secondary" id="logout" type="button" hidden>خروج</button></header>
<p class="notice" id="notice" role="status" hidden></p>
<section class="card" id="login-panel"><h1>دخول الموزّع</h1>
<p class="muted">هذه اللوحة لإصدار الاشتراكات فقط. إدارة المصادر والبث والعملاء والمكتبة غير متاحة للموزعين.</p>
<form id="login-form" class="formgrid">
<div class="field"><label for="username">اسم المستخدم</label><input id="username" autocomplete="username" required maxlength="32"></div>
<div class="field"><label for="password">كلمة المرور</label><input id="password" type="password" autocomplete="current-password" required></div>
<div class="field"><label>&nbsp;</label><button class="btn" type="submit">تسجيل الدخول</button></div>
</form></section>
<section id="workspace" hidden>
<div class="card"><div class="row"><div><h1>توزيع BLOFY STREAM</h1>
<p class="muted" id="who">—</p></div><span class="badge">صلاحيات إصدار فقط</span></div>
<div class="stats"><div class="stat"><small>رصيد الأكواد/الحسابات</small><strong id="credits">—</strong></div>
<div class="stat"><small>الإصدارات المسجلة</small><strong id="used">—</strong></div>
<div class="stat"><small>حالة اللوحة</small><strong id="enabled">—</strong></div></div></div>
<div class="card"><h2>استخراج اشتراك جديد</h2>
<p class="muted">كل عملية تستهلك رصيدًا واحدًا. تستطيع اختيار كود تطبيق أو حساب Xtream. لا يمكنك الوصول إلى أي قسم إداري آخر.</p>
<div class="chips"><button class="chip active" data-kind="app" type="button">كود BLOFY STREAM</button>
<button class="chip" data-kind="xtream" type="button">حساب Xtream</button></div>
<form id="issue-form"><div class="formgrid">
<div class="field"><label for="label">اسم الاشتراك</label><input id="label" maxlength="80" value="BLOFY STREAM" required></div>
<div class="field"><label for="days">المدة</label><select id="days">
<option value="30">شهر (30 يومًا)</option><option value="90">3 أشهر</option><option value="180">6 أشهر</option><option value="365">سنة</option><option value="730">سنتان</option></select></div>
<div class="field"><label for="connections">الاتصالات</label><select id="connections">
<option value="1">اتصال واحد</option><option value="2">اتصالان</option><option value="3">3 اتصالات</option></select></div>
</div><div class="row" style="margin-top:17px">
<p class="muted" id="kind-help">كود يُدخل في تطبيق BLOFY STREAM. يبدأ عند التفعيل الأول.</p>
<button class="btn" id="issue-button" type="submit">استخراج كود</button></div></form>
<div id="issued-result" class="secret" hidden></div></div>
<div class="card"><div class="row"><h2>سجل إصداراتك</h2><button class="btn secondary" id="refresh" type="button">تحديث</button></div>
<div class="tablewrap"><table><thead><tr><th>النوع</th><th>الوصف</th><th>المدة</th><th>الوقت</th><th>الحالة</th><th>التحكم</th></tr></thead>
<tbody id="items"></tbody></table></div></div>
</section></main>
<script nonce="__NONCE__">
"use strict";
(function(){
 const $=id=>document.getElementById(id),kindButtons=[...document.querySelectorAll('[data-kind]')];
 let currentKind='app',inflightRequest=null;
 function text(id,v){$(id).textContent=String(v??"—")}
 function msg(value,ok){let e=$("notice");e.hidden=false;e.textContent=value;e.className="notice "+(ok?"ok":"");}
 async function request(method,data){
  let response=await fetch('/distributor/api/'+method,{method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json','x-blofy-distributor-action':method},
    body:JSON.stringify(data||{})});
  let result;try{result=await response.json()}catch{throw Error('استجابة الخادم غير صالحة')}
  if(!response.ok||result.ok===false)throw Error(result.code||result.error||'HTTP '+response.status);
  return result;
 }
 function setLogged(yes){$("workspace").hidden=!yes;$("login-panel").hidden=yes;$("logout").hidden=!yes}
 async function profile(){
  const d=await request('me');
  setLogged(true);text("credits",d.item.credits);text("used",d.item.used);
  text("who",d.item.name+" · "+d.item.username);text("enabled",d.item.enabled?"نشطة":"موقوفة");
 }
 function copy(value){navigator.clipboard.writeText(String(value)).then(()=>msg("تم النسخ",true))
   .catch(()=>msg("لم يتم النسخ؛ اختر النص وانسخه يدويًا",false));}
 function line(parent,name,val){
  const box=document.createElement('div');box.className="fieldline";
  const side=document.createElement('div');side.appendChild(document.createTextNode(name+" · "));
  const strong=document.createElement('strong');strong.textContent=String(val||'—');side.appendChild(strong);
  const btn=document.createElement('button');btn.type="button";btn.className="btn secondary mini";
  btn.textContent="نسخ";btn.addEventListener("click",()=>copy(val));
  box.append(side,btn);parent.appendChild(box);
 }
 function showIssue(d){
  const box=$("issued-result");box.replaceChildren();box.hidden=false;
  const head=document.createElement('h2');head.textContent="تم الاستخراج بنجاح";box.appendChild(head);
  if(d.code)line(box,"كود BLOFY STREAM",d.code);
  if(d.credentials){
    line(box,"الهوست",d.credentials.serverUrl);
    line(box,"اسم المستخدم",d.credentials.username);
    line(box,"كلمة المرور",d.credentials.password);
    if(d.credentials.m3uUrl)line(box,"رابط M3U",d.credentials.m3uUrl);
  }
  box.scrollIntoView({behavior:'smooth',block:'center'});
 }
 async function loadItems(){
  const d=await request('list');const body=$("items");body.replaceChildren();
  if(!(d.items||[]).length){const tr=document.createElement('tr'),td=document.createElement('td');
    td.colSpan=6;td.textContent="لم يتم إصدار أي اشتراكات بعد";tr.appendChild(td);body.appendChild(tr);return}
  for(const it of d.items){
   const tr=document.createElement('tr');
   const fields=[it.type==='app'?'كود التطبيق':'Xtream',it.label,it.days+' يوم',
     new Date(it.createdAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}),
     it.status==='done'?'تم':it.status==='review'?'يحتاج مراجعة':it.status==='pending'?'جارٍ':'لم يتم'];
   for(const v of fields){const td=document.createElement('td');td.textContent=v;tr.appendChild(td)}
   const td=document.createElement('td');
   if(it.status==='done'){
    const btn=document.createElement('button');btn.type="button";btn.className="btn secondary mini";
    btn.textContent="عرض/نسخ";btn.addEventListener('click',async()=>{
      btn.disabled=true;try{showIssue(await request('reveal',{issueId:it.id}))}
      catch(e){msg("تعذر عرض الإصدار: "+e.message,false)}finally{btn.disabled=false}
    });td.appendChild(btn);
   }else td.textContent="—";
   tr.appendChild(td);body.appendChild(tr);
  }
 }
 async function refresh(){try{await profile();await loadItems()}catch(e){
   setLogged(false);if(e.message!=='distributor_unauthorized'&&e.message!=='distributor_session_expired')
     msg("تعذر تحميل لوحة التوزيع: "+e.message,false);
 }}
 kindButtons.forEach(btn=>btn.addEventListener('click',()=>{
  currentKind=btn.dataset.kind;
  kindButtons.forEach(x=>x.classList.toggle("active",x===btn));
  text('kind-help',currentKind==='app'?"كود يُدخل في BLOFY STREAM؛ يبدأ عند أول تفعيل.":
    "حساب Xtream باسم مستخدم وكلمة مرور وهوست ثابت؛ المدة تبدأ من تاريخ الإصدار.");
  text('issue-button',currentKind==='app'?"استخراج كود":"استخراج Xtream");
 }));
 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;
  try{await request('login',{username:$('username').value,password:$('password').value});
    $('password').value='';msg('تم تسجيل الدخول',true);await refresh();}
  catch(e){msg('فشل تسجيل الدخول: '+e.message,false)}
  finally{btn.disabled=false}
 });
 $('issue-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('issue-button');if(!confirm("استخراج اشتراك جديد مقابل رصيد واحد؟"))return;
  btn.disabled=true;const requestId=inflightRequest||crypto.randomUUID();inflightRequest=requestId;
  try{
   const d=await request('issue',{kind:currentKind,label:$('label').value,
    durationDays:Number($('days').value),maxConnections:Number($('connections').value),requestId});
   inflightRequest=null;showIssue(d);msg("تم استخراج الاشتراك وخصم رصيد واحد",true);
   await profile();await loadItems();
  }catch(err){
   msg('تعذر الإصدار: '+err.message+
     '. إذا ظهر «يحتاج مراجعة» فلا تكرر الإصدار بنفسك، راجع مدير اللوحة.',false);
   if(err.message!=='distributor_issuance_needs_review'&&
      err.message!=='distributor_request_already_processing')inflightRequest=null;
  }finally{btn.disabled=false}
 });
 $('refresh').addEventListener('click',refresh);
 $('logout').addEventListener('click',async()=>{
   try{await request('logout')}catch{}
   inflightRequest=null;setLogged(false);$('issued-result').hidden=true;
   msg('تم تسجيل الخروج',true);
 });
 refresh();
})();
</script></body></html>`;
 return template.replaceAll('__NONCE__',nonce);
}
export function createDistributorDashboard({bridge,log=console}={}){
 const failures=new Map();const globalFailures=[];
 function rateLimited(req){
  const now=Date.now(),key=String(req.socket?.remoteAddress||'unknown').slice(0,64);
  let bucket=failures.get(key);
  if(!bucket||now-bucket.t>60000)bucket={t:now,count:0};
  bucket.count++;failures.delete(key);failures.set(key,bucket);
  if(failures.size>256)failures.delete(failures.keys().next().value);
  while(globalFailures.length&&globalFailures[0]<now-60000)globalFailures.shift();
  globalFailures.push(now);
  return bucket.count>10||globalFailures.length>150;
 }
 function handle(req,res){
  const path=new URL(req.url||'/', 'http://localhost').pathname;
  if(!(path==='/distributor'||path==='/distributor/'||path.startsWith('/distributor/api/')))
    return false;
  if(req.method==='GET'&&(path==='/distributor'||path==='/distributor/')){
   const nonce=crypto.randomBytes(16).toString('base64');
   const page=Buffer.from(renderPage(nonce));
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':page.length,
     'cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY',
     'referrer-policy':'no-referrer','content-security-policy':
       "default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; "+
       "connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"});
   res.end(page);return true;
  }
  const action=path.slice('/distributor/api/'.length);
  if(req.method!=='POST'||!paths.has(action)){
    okJson(res,404,{ok:false,code:'distributor_route_not_found'});return true;
  }
  const actual=String(req.headers.origin||'');
  const expected='https://'+String(req.headers.host||'');
  if(actual!==expected||req.headers['x-blofy-distributor-action']!==action){
    okJson(res,403,{ok:false,code:'distributor_csrf_denied'});return true;
  }
  if(action==='login'&&rateLimited(req)){
    okJson(res,429,{ok:false,code:'distributor_login_rate_limited'});return true;
  }
  void jsonInput(req).then(async data=>{
   const sessionToken=cookieToken(req);
   if(action==='login'){
    const result=await bridge.distributorRequest('login',{
      username:String(data.username||'').slice(0,100),
      password:String(data.password||'').slice(0,200)});
    if(result.status!==200)return okJson(res,result.status,result.body);
    const token=result.body?.token;
    if(!TOKEN.test(String(token||'')))return okJson(res,502,{ok:false,code:'distributor_bad_session'});
    const {token:_ignored,...safe}=result.body;
    return okJson(res,200,safe,{'set-cookie':cookie(token,12*60*60)});
   }
   if(action==='logout'){
    if(sessionToken)await bridge.distributorRequest('logout',{sessionToken});
    return okJson(res,200,{ok:true},{'set-cookie':cookie('',0)});
   }
   if(!sessionToken)return okJson(res,401,{ok:false,code:'distributor_unauthorized'});
   const allowed=action==='issue'?{
      kind:data.kind,label:data.label,durationDays:data.durationDays,
      maxConnections:data.maxConnections,requestId:data.requestId}:
     action==='reveal'?{issueId:data.issueId}:{};
   const result=await bridge.distributorRequest(action,{sessionToken,...allowed});
   okJson(res,result.status,result.body);
  }).catch(error=>{
   // Never emit passwords, session IDs or upstream bodies in logs.
   okJson(res,[400,413,415].includes(error?.status)?error.status:503,{
     ok:false,code:[400,413,415].includes(error?.status)?
       error.message:'distributor_service_unavailable'
   });
  });
  return true;
 }
 return {handle};
}
