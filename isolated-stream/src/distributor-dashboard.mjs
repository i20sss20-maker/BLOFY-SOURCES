// BLOFY STREAM restricted reseller portal. Authentication is a dedicated
// HttpOnly scoped cookie; browser never receives the backend bridge key.
import crypto from 'node:crypto';
const COOKIE='blofy_dist';
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const paths=new Set(['login','me','logout','list','issue','reveal','library','organize','clients','customer','renew','relogin','analytics','activity','export']);
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
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0f1420">
<title>لوحة توزيع</title>
<style>
:root{--bg:#0f1420;--card:#171e2c;--stroke:#343e51;--white:#f2f5fb;--muted:#a8b4c6;--purple:#c2cbdc;--mint:#68dab0;--red:#ff9aa6}
*{box-sizing:border-box}body{margin:0;min-height:100vh;color:var(--white);font:15px/1.7 system-ui,Segoe UI,Tahoma,sans-serif;background:#0f1420}
main{max-width:1120px;margin:auto;padding:28px 19px 60px}
header{display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px;border-bottom:1px solid var(--stroke);padding-bottom:16px}
.page-title{margin:0;font-size:24px;font-weight:750;letter-spacing:0}
.card{border-radius:18px;border:1px solid var(--stroke);background:var(--card);padding:clamp(16px,2vw,24px);margin-bottom:14px;box-shadow:0 10px 35px #02061233}
h1,h2{margin:0 0 12px;line-height:1.3}h1{font-size:27px}h2{font-size:19px}.muted{color:var(--muted)}
.row{display:flex;align-items:center;gap:11px;justify-content:space-between;flex-wrap:wrap}
.btn{border:1px solid #7084a8;background:#40577b;border-radius:10px;padding:10px 17px;color:white;font:inherit;font-weight:700;cursor:pointer}
.btn.secondary{background:#263246;border-color:#465572}.btn:hover{filter:brightness(1.12)}.btn:disabled{opacity:.5;cursor:wait}
input,select{font:inherit;border:1px solid #465879;color:white;background:#101a2e;border-radius:10px;padding:10px 13px;min-width:0;width:100%}
label{display:block;font-weight:600;color:#dae2f7;font-size:13px;margin-bottom:5px}
.formgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}
.field{min-width:0}.field.full{grid-column:1/-1}
.notice{border:1px solid #a16a68;border-radius:11px;background:#39262d;padding:12px 14px;color:#ffd7d3;margin:13px 0}
.notice.ok{border-color:#42745f;background:#17372f;color:#a8f4d3}.notice[hidden],[hidden]{display:none!important}
.badge{border:1px solid #485d7b;border-radius:30px;padding:5px 12px;color:#e5dcff}
.stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.stat{padding:14px;border:1px solid #3c4a66;background:#141e34;border-radius:14px}.stat small{display:block;color:var(--muted)}.stat strong{font-size:25px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.chip{border:1px solid #536384;color:#e6dfff;background:#24324c;border-radius:10px;padding:8px 17px;cursor:pointer}
.chip.active{border-color:#8c9fbc;background:#354862;color:white}
.secret{border:1px solid #47766c;background:#173327;padding:18px;border-radius:13px;overflow-wrap:anywhere;margin-top:12px}
.secret strong{display:block;direction:ltr;text-align:right;font:700 19px/1.5 Consolas,monospace}
.secret .fieldline{display:flex;flex-wrap:wrap;justify-content:space-between;gap:11px;align-items:center;padding:9px 0;border-bottom:1px solid #ffffff19}
.tablewrap{overflow:auto;border-radius:13px;border:1px solid #354966}table{width:100%;border-collapse:collapse}th,td{text-align:right;padding:13px 11px;border-bottom:1px solid #354966;white-space:nowrap}th{color:#c8d3f0;background:#202d46}td{color:#edf1fd}
.mini{font-size:12px;padding:5px 10px}.searchbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.searchbar input{flex:2 1 220px}.searchbar select{flex:1 1 165px;width:auto}
.issue-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.issue-actions .btn{white-space:nowrap}.stat strong{font-variant-numeric:tabular-nums}
#expiry-alert{margin:0 0 14px;border:1px solid #816b3d;background:#322c1b;color:#ffe6a3;border-radius:12px;padding:11px 14px}
#expiry-alert button{margin-inline-start:12px}
dialog{width:min(95vw,480px);max-height:90vh;overflow-y:auto;color:var(--white);background:var(--card);border:1px solid var(--stroke);border-radius:17px;padding:22px}
dialog::backdrop{background:#030612b8}
dialog .formgrid{grid-template-columns:1fr}.dialog-buttons{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}
@media(max-width:900px){.stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
.mini{font-size:12px;padding:5px 10px}
.compact-kpis{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
.compact-kpis span{padding:9px 12px;border-radius:10px;border:1px solid var(--stroke);background:var(--card);color:var(--muted)}
.compact-kpis strong{color:var(--white);margin-inline-start:6px;font-variant-numeric:tabular-nums}
.minor-alert{border:1px solid #85612a;background:#312515;color:#f4ca70;border-radius:11px;padding:9px 14px;margin-bottom:14px}
.details-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:15px 0}
.details-grid>div{padding:10px;border:1px solid var(--stroke);border-radius:10px;overflow-wrap:anywhere}
.details-grid small{display:block;color:var(--muted)}
body[data-theme="light"]{--bg:#f3f6fa;--card:#fff;--stroke:#d4dce8;--white:#18243b;--muted:#5c6c83;background:var(--bg)}
body[data-theme="light"] .card,body[data-theme="light"] .stat,body[data-theme="light"] .compact-kpis span{background:var(--card)}
body[data-theme="light"] input,body[data-theme="light"] select{background:#f7f9fc;color:#18243b;border-color:#c0ccdb}
body[data-theme="light"] th{background:#eaf0f7;color:#20314e}
body[data-theme="light"] td{color:#283a55}
body[data-theme="light"] .chip{background:#eff3fa;color:#2e4063}
body[data-theme="light"] .chip.active{background:#d7e3f2;color:#172b50}
body[data-theme="light"] dialog{background:#fff}
body[data-theme="light"] .secret{background:#e1f7eb}
.num{direction:ltr;unicode-bidi:isolate;display:inline-block}
@media(max-width:720px){.formgrid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}main{padding:16px 11px 40px}header{gap:6px}}
</style></head><body><main>
<header><h1 class="page-title">لوحة توزيع</h1>
<div class="issue-actions"><button class="btn secondary mini" id="theme-toggle" type="button" aria-label="تغيير المظهر">المظهر</button>
<button class="btn secondary mini" id="logout" type="button" hidden>خروج</button></div></header>
<p class="notice" id="notice" role="status" hidden></p>
<section class="card" id="login-panel"><h2>تسجيل الدخول</h2>

<form id="login-form" class="formgrid">
<div class="field"><label for="username">اسم المستخدم</label><input id="username" autocomplete="username" required maxlength="32"></div>
<div class="field"><label for="password">كلمة المرور</label><input id="password" type="password" autocomplete="current-password" required></div>
<div class="field"><label>&nbsp;</label><button class="btn" type="submit">تسجيل الدخول</button></div>
</form></section>
<section id="workspace" hidden>
<div class="card"><span id="who" hidden></span><span id="enabled" hidden></span>
<div class="stats">
<div class="stat"><small>الرصيد</small><strong id="credits">—</strong></div>
<div class="stat"><small>الإصدارات</small><strong id="used">—</strong></div>
<div class="stat"><small>النشطة</small><strong id="stat-active">—</strong></div>
<div class="stat"><small>قريبة الانتهاء</small><strong id="stat-expiring">—</strong></div>
<div class="stat"><small>المنتهية</small><strong id="stat-expired">—</strong></div>
</div></div>
<div class="compact-kpis" aria-label="ملخص التوزيع">
<span>اليوم <strong id="stat-today">—</strong></span>
<span>الشهر <strong id="stat-month">—</strong></span>
<span>التجارب <strong id="stat-trials">—</strong></span>
<span>التجديدات <strong id="stat-renewals">—</strong></span>
<span>التحويلات <strong id="stat-converted">—</strong></span>
<span>الحد اليومي <strong id="stat-quota">—</strong></span></div>
<div id="balance-alert" class="minor-alert" hidden>الرصيد منخفض</div>
<div id="expiry-alert" hidden><span id="expiry-alert-text"></span>
<button type="button" id="expiry-alert-open" class="btn secondary mini">عرض</button></div>
<div class="card"><h2>استخراج اشتراك</h2>

<div class="chips"><button class="chip active" data-kind="app" type="button">كود</button>
<button class="chip" data-kind="xtream" type="button">Xtream</button></div>
<form id="issue-form"><div class="formgrid">
<div class="field"><label for="customer-name">اسم العميل</label><input id="customer-name" maxlength="80" autocomplete="off"></div>
<div class="field"><label for="customer-phone">جوال العميل</label><input id="customer-phone" type="tel" maxlength="19" autocomplete="off" placeholder="05xxxxxxxx"></div>
<div class="field"><label for="days">المدة</label><select id="days">
<option value="1">تجريبي · مجاني</option><option value="30" selected>شهر · 1</option><option value="90">3 أشهر · 3</option><option value="180">6 أشهر · 6</option><option value="365">سنة · 12</option></select></div>

</div><div class="row" style="margin-top:17px">

<button class="btn" id="issue-button" type="submit">استخراج كود</button></div></form>
<div id="issued-result" class="secret" hidden></div></div>
<div class="card"><div class="row"><h2>الاشتراكات</h2><div class="issue-actions">
<button class="btn secondary mini" id="export-csv" type="button">Excel</button>
<button class="btn secondary mini" id="refresh" type="button">تحديث</button></div></div>
<div class="searchbar"><input id="issue-search" type="search" maxlength="80" placeholder="بحث بالكود أو العميل أو الجوال" aria-label="بحث الاشتراكات">
<select id="issue-status" aria-label="حالة الاشتراك"><option value="all">جميع الحالات</option>
<option value="active">نشطة</option><option value="expiring">قريبة الانتهاء</option>
<option value="expired">منتهية</option><option value="unused">لم تُفعّل</option>
<option value="disabled">موقوفة</option></select></div>
<div class="tablewrap"><table><thead><tr><th>النوع</th><th>العميل</th><th>الانتهاء</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
<tbody id="items"></tbody></table></div>
<div class="row" style="margin-top:13px"><span id="issues-count" class="muted">—</span>
<button type="button" id="issues-more" class="btn secondary mini" hidden>المزيد</button></div></div>
<div class="card"><div class="row"><h2>حركة الرصيد</h2><button class="btn secondary mini" id="activity-refresh" type="button">تحديث</button></div>
<div class="tablewrap"><table><thead><tr><th>العملية</th><th>التغيير</th><th>الرصيد بعد العملية</th><th>التاريخ</th></tr></thead>
<tbody id="activity-rows"></tbody></table></div>
<div class="row" style="margin-top:12px"><span id="activity-count" class="muted">—</span>
<button id="activity-more" class="btn secondary mini" type="button" hidden>المزيد</button></div></div>
<div class="card"><div class="row"><h2>العملاء</h2><button id="clients-refresh" type="button" class="btn secondary mini">تحديث</button></div>
<div class="searchbar"><input type="search" id="clients-search" maxlength="80" placeholder="بحث بالاسم أو الجوال" aria-label="بحث العملاء"></div>
<div class="tablewrap"><table><thead><tr><th>الاسم</th><th>الجوال</th><th>اشتراكات</th><th>إجراء</th></tr></thead>
<tbody id="clients-rows"></tbody></table></div></div>
<dialog id="manage-dialog" aria-labelledby="manage-title"><h2 id="manage-title">إدارة الاشتراك</h2>
<div id="manage-info" class="details-grid"></div>
<div class="dialog-buttons" style="justify-content:flex-start;flex-wrap:wrap">
<button class="btn secondary mini" id="manage-copy" type="button">نسخ</button>
<button class="btn secondary mini" id="manage-renew" type="button">تجديد</button>
<button class="btn secondary mini" id="manage-relogin" type="button">إعادة دخول</button>
<button class="btn secondary mini" id="manage-customer" type="button">العميل</button>
<button class="btn secondary mini" data-close-dialog="manage-dialog" type="button">إغلاق</button></div></dialog>
<dialog id="renew-dialog" aria-labelledby="renew-title"><h2 id="renew-title">تجديد الاشتراك</h2>
<form id="renew-form"><div class="formgrid"><div class="field"><label for="renew-days">المدة</label>
<select id="renew-days"><option value="30">شهر · 1</option><option value="90">3 أشهر · 3</option>
<option value="180">6 أشهر · 6</option><option value="365">سنة · 12</option></select></div></div>
<div class="dialog-buttons"><button type="button" data-close-dialog="renew-dialog" class="btn secondary">إلغاء</button>
<button id="renew-confirm" class="btn" type="submit">تجديد</button></div></form></dialog>
<dialog id="customer-dialog" aria-labelledby="customer-title"><h2 id="customer-title">بيانات العميل</h2>
<form id="customer-form"><div class="formgrid"><div class="field"><label for="edit-customer-name">الاسم</label>
<input id="edit-customer-name" maxlength="80"></div><div class="field"><label for="edit-customer-phone">الجوال</label>
<input id="edit-customer-phone" maxlength="19" type="tel"></div></div>
<div class="dialog-buttons"><button type="button" data-close-dialog="customer-dialog" class="btn secondary">إلغاء</button>
<button id="customer-confirm" class="btn" type="submit">حفظ</button></div></form></dialog>
<div class="card" id="library-panel"><div class="row"><h2>المكتبة</h2></div>
<div class="formgrid"><div class="field"><label for="library-type">نوع المحتوى</label><select id="library-type">
<option value="live">القنوات</option><option value="movie" selected>الأفلام</option><option value="series">المسلسلات</option></select></div>
<div class="field"><label for="library-search">بحث</label><input id="library-search" type="search" maxlength="85" placeholder="ابحث عن عنوان..."></div>
<div class="field"><label>&nbsp;</label><button id="library-go" class="btn secondary" type="button">عرض المحتوى</button></div></div>
<div class="tablewrap" style="margin-top:15px"><table><thead><tr><th>العنوان</th><th>التصنيف</th><th>مجموعتي</th><th>ترتيب</th><th>العرض</th><th>تحكم</th></tr></thead><tbody id="library-rows"></tbody></table></div>
<div class="row" style="margin-top:12px"><span id="library-count" class="muted">—</span><button id="library-more" class="btn secondary" type="button" hidden>المزيد</button></div></div>
</section></main>
<script nonce="__NONCE__">
"use strict";
(function(){
 const $=id=>document.getElementById(id),kindButtons=[...document.querySelectorAll('[data-kind]')];
 let currentKind='app',inflightRequest=null,libraryNext=null,libraryOffset=0;
 let issueRows=[],listOffset=0,listNext=null,listEpoch=0,activeIssue=null;
 const retryActions=new Map();let searchTimer=null,activityOffset=0,activityNext=null,activityRows=[];
 const COST={1:0,30:1,90:3,180:6,365:12};
 const currentCost=()=>COST[Number($('days').value)]??1;
 function updateCost(){
  $('customer-phone').required=currentCost()===0;
 }
 $('days').addEventListener('change',updateCost);updateCost();
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
  const head=document.createElement('h2');head.textContent="تم الاستخراج";box.appendChild(head);
  if(d.code)line(box,"الكود",d.code);
  if(d.credentials){
    line(box,"الهوست",d.credentials.serverUrl);
    line(box,"اسم المستخدم",d.credentials.username);
    line(box,"كلمة المرور",d.credentials.password);
    if(d.credentials.m3uUrl)line(box,"رابط M3U",d.credentials.m3uUrl);
  }
  const all=[d.code&&'الكود: '+d.code,
   d.credentials&&'الهوست: '+d.credentials.serverUrl,
   d.credentials&&'اسم المستخدم: '+d.credentials.username,
   d.credentials&&'كلمة المرور: '+d.credentials.password,
   d.credentials?.m3uUrl&&'M3U: '+d.credentials.m3uUrl].filter(Boolean).join('\n');
  if(all){const copyAll=document.createElement('button');copyAll.className='btn secondary mini';
    copyAll.type='button';copyAll.textContent='نسخ الكل';
    copyAll.addEventListener('click',()=>copy(all));box.appendChild(copyAll)}
  box.scrollIntoView({behavior:'smooth',block:'center'});
 }

 function actionId(kind,id,detail=''){
  const key=kind+':'+id+':'+detail;
  if(!retryActions.has(key))retryActions.set(key,crypto.randomUUID());
  return {key,id:retryActions.get(key)};
 }
 function outcomeStatus(row){
  const names={active:'ساري',expiring:'ينتهي قريبًا',expired:'منتهي',
    unused:'لم يُفعّل',disabled:'موقوف',pending:'قيد المعالجة',
    review:'تحتاج مراجعة',failed:'فشل'};
  return names[row.subscriptionStatus]||names[row.status]||'—';
 }
 function dateOnly(timestamp){
  return timestamp?new Date(timestamp).toLocaleDateString('ar-SA',{
   timeZone:'Asia/Riyadh',day:'2-digit',month:'2-digit',year:'numeric'
  }):'—';
 }
 function tableCell(tr,value){
  const td=document.createElement('td');td.textContent=String(value??'—');
  tr.appendChild(td);return td;
 }
 function rowButton(host,title,callback){
  const btn=document.createElement('button');btn.className='btn secondary mini';
  btn.type='button';btn.textContent=title;
  btn.addEventListener('click',async()=>{
   btn.disabled=true;try{await callback()}catch(e){msg(e.message,false)}
   finally{btn.disabled=false}
  });host.appendChild(btn);return btn;
 }

 function openRenew(item){
  if(item.status!=='done'||['unused','disabled'].includes(item.subscriptionStatus))
   return msg('التجديد غير متاح لهذا الاشتراك',false);
  activeIssue=item;
  if($('manage-dialog').open)$('manage-dialog').close();
  $('renew-days').value='30';
  text('renew-title',item.days===1?'تحويل إلى اشتراك مدفوع':'تجديد الاشتراك');
  $('renew-dialog').showModal();
 }
 function openCustomer(item){
  activeIssue=item;
  if($('manage-dialog').open)$('manage-dialog').close();
  $('edit-customer-name').value=item.customerName||'';
  $('edit-customer-phone').value=item.customerPhone||'';
  $('customer-dialog').showModal();
 }
 async function reloginFor(item){
  if(!item.canRelogin)return msg('إعادة الدخول غير متاحة',false);
  if(!confirm('السماح بالدخول بنفس الكود إلى جهاز واحد خلال 10 دقائق؟ سيتوقف الجهاز السابق بعد دخول الجديد.'))return;
  const id=actionId('relogin',item.id);
  const result=await request('relogin',{issueId:item.id,requestId:id.id});
  retryActions.delete(id.key);
  msg('تم السماح بإعادة الدخول حتى '+dateOnly(result.allowedUntil),true);
  if($('manage-dialog').open)$('manage-dialog').close();
  await refreshViews();
 }
 function showManage(item){
  activeIssue=item;const box=$('manage-info');box.replaceChildren();
  const fields=[
    ['النوع',item.type==='app'?'كود':'Xtream'],
    ['العميل',item.customerName||'—'],
    ['الجوال',item.customerPhone||'—'],
    ['الحالة',outcomeStatus(item)],
    ['الصلاحية',dateOnly(item.expiresAt)],
    ['تاريخ الإصدار',dateOnly(item.createdAt)],
    ['المدة الأساسية',item.days===1?'تجريبي':item.days+' يوم'],
    ['الخصم',Number(item.chargedCredits||0)+' شهر'],
    ['إعادة الدخول',item.reloginCount||0],
    ['الجهاز',item.type==='app'?(item.canRelogin?'مرتبط':'—'):'—']
  ];
  for(const [label,value] of fields){
   const tile=document.createElement('div'),small=document.createElement('small');
   small.textContent=label;tile.appendChild(small);
   const detail=document.createElement('strong');
   detail.textContent=String(value);
   tile.appendChild(detail);box.appendChild(tile);
  }
  const canEdit=item.status==='done';
  $('manage-copy').hidden=!canEdit;
  $('manage-renew').hidden=!canEdit||['unused','disabled'].includes(item.subscriptionStatus);
  $('manage-relogin').hidden=!item.canRelogin;
  $('manage-customer').hidden=false;
  text('manage-renew',item.days===1?'تحويل إلى مدفوع':'تجديد');
  $('manage-dialog').showModal();
 }
 $('manage-copy').addEventListener('click',async()=>{
  if(!activeIssue)return;
  const btn=$('manage-copy');btn.disabled=true;
  try{const result=await request('reveal',{issueId:activeIssue.id});
   if($('manage-dialog').open)$('manage-dialog').close();
   showIssue(result);
  }catch(e){msg('تعذر نسخ الاشتراك: '+e.message,false)}
  finally{btn.disabled=false}
 });
 $('manage-renew').addEventListener('click',()=>activeIssue&&openRenew(activeIssue));
 $('manage-relogin').addEventListener('click',async()=>{
  if(!activeIssue)return;
  const btn=$('manage-relogin');btn.disabled=true;
  try{await reloginFor(activeIssue)}catch(e){msg('تعذر إعادة الدخول: '+e.message,false)}
  finally{btn.disabled=false}
 });
 $('manage-customer').addEventListener('click',()=>activeIssue&&openCustomer(activeIssue));
 function renderIssueRows(){
  const target=$('items');target.replaceChildren();
  if(!issueRows.length){const tr=document.createElement('tr');
    const td=tableCell(tr,'لا توجد اشتراكات');td.colSpan=5;target.appendChild(tr);}
  for(const item of issueRows){
   const row=document.createElement('tr');
   tableCell(row,item.type==='app'?'كود':'Xtream');
   const customer=tableCell(row,item.customerName||'—');
   if(item.customerPhone)customer.appendChild(document.createTextNode(' · '+item.customerPhone));
   tableCell(row,dateOnly(item.expiresAt));
   tableCell(row,outcomeStatus(item));
   const actions=tableCell(row,'');
   rowButton(actions,'إدارة',()=>showManage(item));
   target.appendChild(row);
  }
  text('issues-count','المعروض: '+issueRows.length);
  $('issues-more').hidden=listNext==null;
 }
 async function loadItems(more=false){
  const epoch=more?listEpoch:++listEpoch;
  const offset=more?listNext:0;
  if(more&&offset==null)return;
  const d=await request('list',{q:$('issue-search').value.trim(),
   status:$('issue-status').value,offset});
  if(epoch!==listEpoch)return;
  issueRows=more?issueRows.concat(d.items||[]):(d.items||[]);
  listNext=d.nextOffset;
  renderIssueRows();
  if(d.stats){
   text('stat-active',d.stats.active);
   text('stat-expiring',d.stats.expiring);
   text('stat-expired',d.stats.expired);
   const count=Number(d.stats.expiring||0);
   $('expiry-alert').hidden=count===0;
   text('expiry-alert-text',count+' اشتراك ينتهي خلال 7 أيام');
  }
 }
 async function loadClients(){
  const data=await request('clients',{q:$('clients-search').value.trim()});
  const target=$('clients-rows');target.replaceChildren();
  if(!data.items?.length){const tr=document.createElement('tr');
    const td=tableCell(tr,'لا يوجد عملاء مسجلون');td.colSpan=4;target.appendChild(tr);return;}
  for(const client of data.items){
   const tr=document.createElement('tr');
   tableCell(tr,client.name||'—');tableCell(tr,client.phone||'—');
   tableCell(tr,client.subscriptions);
   const td=document.createElement('td');
   rowButton(td,'اشتراكاته',async()=>{
    $('issue-search').value=client.phone||client.name;
    $('issue-status').value='all';
    await loadItems(false);
    $('issue-search').scrollIntoView({behavior:'smooth',block:'center'});
   });tr.appendChild(td);target.appendChild(tr);
  }
 }
 $('issues-more').addEventListener('click',()=>loadItems(true).catch(e=>msg(e.message,false)));
 $('issue-search').addEventListener('input',()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>loadItems(false).catch(e=>msg(e.message,false)),260);
 });
 $('issue-status').addEventListener('change',()=>loadItems(false).catch(e=>msg(e.message,false)));
 $('expiry-alert-open').addEventListener('click',()=>{
  $('issue-search').value='';$('issue-status').value='expiring';
  loadItems(false).catch(e=>msg(e.message,false));
  $('issue-status').scrollIntoView({behavior:'smooth',block:'center'});
 });
 $('clients-refresh').addEventListener('click',()=>loadClients().catch(e=>msg(e.message,false)));
 $('clients-search').addEventListener('input',()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>loadClients().catch(e=>msg(e.message,false)),260);
 });
 document.querySelectorAll('[data-close-dialog]').forEach(btn=>
  btn.addEventListener('click',()=>$(
    btn.getAttribute('data-close-dialog')).close()));
 $('renew-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!activeIssue)return;
  const issue=activeIssue,days=Number($('renew-days').value);
  const btn=$('renew-confirm');btn.disabled=true;
  const op=actionId('renew',issue.id,String(days));
  try{
   const result=await request('renew',{issueId:issue.id,days,requestId:op.id});
   retryActions.delete(op.key);$('renew-dialog').close();
   msg('تم التجديد إلى '+dateOnly(result.expiresAt),true);
   await refreshViews();
  }catch(err){msg('تعذر التجديد: '+err.message,false)}
  finally{btn.disabled=false}
 });
 $('customer-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!activeIssue)return;
  const btn=$('customer-confirm');btn.disabled=true;
  try{
   await request('customer',{issueId:activeIssue.id,
    name:$('edit-customer-name').value,phone:$('edit-customer-phone').value});
   $('customer-dialog').close();msg('تم حفظ بيانات العميل',true);
   await refreshViews();
  }catch(err){msg('تعذر الحفظ: '+err.message,false)}
  finally{btn.disabled=false}
 });
 async function refresh(){
  try{await profile()}
  catch(e){
   setLogged(false);
   if(!['distributor_unauthorized','distributor_session_expired'].includes(e.message))
    msg("تعذر تسجيل الدخول: "+e.message,false);
   return;
  }
  // An optional list failure must never log out an authenticated reseller.
  const results=await Promise.allSettled([loadItems(false),loadClients()]);
  const failed=results.find(r=>r.status==='rejected');
  if(failed)msg("تعذر تحديث بعض البيانات: "+failed.reason.message,false);
 }
 async function refreshViews(){
  const results=await Promise.allSettled([profile(),loadItems(false),loadClients()]);
  const failed=results.find(r=>r.status==='rejected');
  if(failed)msg("تم حفظ العملية، لكن تعذر تحديث العرض: "+failed.reason.message,false);
 }
 kindButtons.forEach(btn=>btn.addEventListener('click',()=>{
  currentKind=btn.dataset.kind;
  kindButtons.forEach(x=>x.classList.toggle("active",x===btn));
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
  e.preventDefault();const btn=$('issue-button');const cost=currentCost();

  btn.disabled=true;const requestId=inflightRequest||crypto.randomUUID();inflightRequest=requestId;
  try{
   const d=await request('issue',{kind:currentKind,
    durationDays:Number($('days').value),
    customerName:$('customer-name').value,customerPhone:$('customer-phone').value,
    trialPhone:cost===0?$('customer-phone').value:'',requestId});
   inflightRequest=null;showIssue(d);msg(cost===0?"تم إصدار تجربة مجانية":"تم الخصم: "+cost+" من رصيد الأشهر",true);
   await refreshViews();
  }catch(err){
   msg('تعذر الإصدار: '+err.message,false);
   if(err.message!=='distributor_issuance_needs_review'&&
      err.message!=='distributor_request_already_processing')inflightRequest=null;
  }finally{btn.disabled=false}
 });

 async function loadLibrary(more=false){
  const type=$('library-type').value,q=$('library-search').value.trim();
  if(!more)libraryOffset=0;
  const d=await request('library',{type,q,offset:libraryOffset});
  const body=$('library-rows');if(!more)body.replaceChildren();
  const items=(d.items||[]).slice().sort((a,b)=>{
    const na=Number(a.sortOrder)>0?Number(a.sortOrder):Number.MAX_SAFE_INTEGER;
    const nb=Number(b.sortOrder)>0?Number(b.sortOrder):Number.MAX_SAFE_INTEGER;
    return na-nb||String(a.group||'').localeCompare(String(b.group||''),'ar')||
      String(a.name||'').localeCompare(String(b.name||''),'ar');
  });
  for(const item of items){
   const tr=document.createElement('tr');
   for(const val of [item.title||item.name,item.categoryName,item.group||'—',
     item.sortOrder||0,item.hidden?'مخفي':'ظاهر']){
    const td=document.createElement('td');td.textContent=String(val??'—');tr.appendChild(td);
   }
   const cell=document.createElement('td'),btn=document.createElement('button');
   btn.type='button';btn.className='btn secondary mini';btn.textContent='تنظيم';
   btn.addEventListener('click',async()=>{
    const group=prompt('المجموعة الخاصة بهذا العنصر',item.group||'');if(group===null)return;
    const title=prompt('اسم العرض (فارغ = الأصلي)',item.title||'');if(title===null)return;
    const order=prompt('ترتيب العنصر: رقم 0 إلى 9999',String(item.sortOrder||0));
    if(order===null)return;
    const n=Number(order);if(!Number.isSafeInteger(n)||n<0||n>9999){
     msg('الترتيب غير صحيح',false);return;
    }
    const hidden=confirm('هل تريد إخفاء العنصر من قائمتك الخاصة؟ (إلغاء = ظاهر)');
    btn.disabled=true;
    try{
     await request('organize',{type:item.type,itemId:item.id,
      group:group.slice(0,60),title:title.slice(0,120),sortOrder:n,hidden});
     msg('تم تنظيم العنصر في مكتبتك الخاصة',true);
     await loadLibrary(false);
    }catch(e){msg('تعذر تنظيم المكتبة: '+e.message,false)}
    finally{btn.disabled=false}
   });
   cell.appendChild(btn);tr.appendChild(cell);body.appendChild(tr);
  }
  libraryNext=d.nextOffset;libraryOffset=libraryNext??libraryOffset;
  $('library-more').hidden=libraryNext==null;
  text('library-count','المعروض: '+body.children.length);
  if(!body.children.length){const tr=document.createElement('tr'),td=document.createElement('td');
   td.colSpan=6;td.textContent='لا توجد عناصر مطابقة';tr.appendChild(td);body.appendChild(tr)}
 }
 $('library-go').addEventListener('click',()=>loadLibrary().catch(e=>msg(e.message,false)));
 $('library-more').addEventListener('click',()=>loadLibrary(true).catch(e=>msg(e.message,false)));
 $('library-type').addEventListener('change',()=>loadLibrary().catch(e=>msg(e.message,false)));
 $('library-search').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();loadLibrary().catch(x=>msg(x.message,false))}
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
      kind:data.kind,label:'BLOFY STREAM',durationDays:data.durationDays,
      trialPhone:data.trialPhone,
      customerName:data.customerName,customerPhone:data.customerPhone,requestId:data.requestId}:
     action==='reveal'?{issueId:data.issueId}:
     action==='list'?{q:data.q,offset:data.offset,status:data.status}:
     action==='clients'?{q:data.q}:
     action==='customer'?{issueId:data.issueId,name:data.name,phone:data.phone}:
     action==='renew'?{issueId:data.issueId,days:data.days,requestId:data.requestId}:
     action==='relogin'?{issueId:data.issueId,requestId:data.requestId}:
     action==='library'?{type:data.type,q:data.q,offset:data.offset}:
     action==='organize'?{type:data.type,itemId:data.itemId,group:data.group,
       title:data.title,sortOrder:data.sortOrder,hidden:data.hidden}:{};
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
