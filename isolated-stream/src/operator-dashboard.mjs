// Isolated operator console. It cannot alter subscriber routes, Xtream
// credentials, source catalogs or production services. No API tokens in HTML.
import {timingSafeEqual,randomBytes} from 'node:crypto';

const json=(res,status,payload)=>{
  const body=Buffer.from(JSON.stringify(payload));
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'x-frame-options':'DENY','referrer-policy':'no-referrer',
    'content-length':body.length});
  res.end(body);
};
function authorized(req,token){
  if(typeof token!=='string'||token.length<32)return false;
  const header=req.headers.authorization;
  if(typeof header!=='string'||!header.startsWith('Basic '))return false;
  try{
    const value=Buffer.from(header.slice(6),'base64').toString('utf8');
    const colon=value.indexOf(':');
    if(colon<0||value.slice(0,colon)!=='operator')return false;
    const actual=Buffer.from(value.slice(colon+1));
    const expected=Buffer.from(token);
    return actual.length===expected.length&&timingSafeEqual(actual,expected);
  }catch{return false;}
}
function document(nonce){
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>BLOFY STREAM | مركز التحكم</title>
<style>
:root{color-scheme:dark;--bg:#0b0913;--card:#171324;--border:#40355b;--muted:#b5a9cd;--accent:#a78bfa;--green:#4adead;--warn:#fbbf75}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0%,#251945,var(--bg) 47%);font-family:system-ui,"Segoe UI",Tahoma,sans-serif;color:#f6f2ff;min-height:100vh}
header{display:flex;gap:16px;align-items:center;justify-content:space-between;padding:26px clamp(16px,4vw,64px);border-bottom:1px solid var(--border)}
.brand{display:flex;align-items:center;gap:15px}.badge{border-radius:17px;background:linear-gradient(145deg,#ae9bff,#6349b6);display:grid;place-items:center;font-size:25px;font-weight:900;color:#130f27;width:56px;height:56px;transform:rotate(-5deg)}
h1{font-size:clamp(22px,3vw,31px);margin:0}p{color:var(--muted);line-height:1.8}header p{margin:2px 0 0;font-size:13px}
.tag{border:1px solid #357a5d;color:var(--green);border-radius:30px;padding:9px 15px;background:#143227;font-size:13px;font-weight:700}
main{max-width:1300px;margin:auto;padding:30px 18px 55px}
.intro{margin-bottom:26px}.intro h2{margin:0 0 3px;font-size:23px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px}
.panel{border-radius:19px;padding:23px;background:linear-gradient(145deg,#1c172a,#130f20);border:1px solid var(--border);box-shadow:0 18px 55px #0003;min-width:0}
.panel h3{margin:0 0 12px;font-size:19px}.panel>p{font-size:14px;margin:0 0 18px}
.kpi{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid #342c44;gap:12px}
.kpi:last-of-type{border:0}.kpi span{color:var(--muted)}strong{overflow-wrap:anywhere;text-align:left}
.good{color:var(--green)}.bad{color:#ffa6ae}.neutral{color:var(--warn)}
button{font-family:inherit;background:#7756d7;color:white;border:1px solid #9476fa;border-radius:12px;padding:13px 18px;font-weight:750;cursor:pointer;margin-top:17px;transition:filter .15s}
button:hover{filter:brightness(1.15)}button:disabled{opacity:.5;cursor:wait}
button.secondary{background:#252039;border-color:#51446c}
.box{margin-top:18px;border-radius:13px;border:1px solid #493a68;background:#110e1c;padding:16px;color:#ddd5ec;line-height:1.75;font-size:13px}
#output{white-space:pre-wrap;word-wrap:break-word;direction:ltr;text-align:left;font-size:12px;color:#bce4d4;max-height:220px;overflow:auto}
footer{padding-top:20px;font-size:13px;color:var(--muted);text-align:center}
@media(max-width:750px){header{padding:20px 16px;align-items:flex-start}.tag{font-size:11px}.grid{grid-template-columns:1fr}.panel{padding:18px}}
</style>
</head><body>
<header><div class="brand"><div class="badge">B</div><div><h1>BLOFY STREAM</h1><p>مركز التحكم · بيئة مستقلة</p></div></div><div class="tag">لوحة تشغيل تجريبية آمنة</div></header>
<main><div class="intro"><h2>التحكم بالسيرفر وإعادة البث</h2><p>تظهر هذه اللوحة الحالة الحقيقية للمحرك وتتيح اختبار إعادة البث التجريبي دون تغيير مسارات المشتركين.</p></div>
<div class="grid">
<section class="panel"><h3>🖥️ حالة السيرفر</h3><p>مراقبة BLOFY STREAM API ومحرك MediaMTX الداخلي.</p>
<div class="kpi"><span>خدمة التحكم</span><strong id="api" class="neutral">جار الفحص...</strong></div>
<div class="kpi"><span>محرك الوسائط</span><strong id="engine" class="neutral">جار الفحص...</strong></div>
<div class="kpi"><span>المسار للمشتركين</span><strong class="neutral">غير مربوط حتى الآن</strong></div>
<button id="refresh" class="secondary">تحديث حالة السيرفر</button></section>
<section class="panel"><h3>📡 محرك إعادة البث</h3><p>اختبار HLS الداخلي من دون طلب قنوات مزوّد أو تشغيل مستخدمين حقيقيين.</p>
<div class="kpi"><span>فحص النقل التجريبي</span><strong id="media" class="neutral">لم يفحص بعد</strong></div>
<div class="kpi"><span>تحقق من فيديو وصوت حقيقي</span><strong class="neutral">لم يكتمل</strong></div>
<div class="kpi"><span>التحويل للمشتركين</span><strong class="neutral">متوقف حفاظاً على الإنتاج</strong></div>
<button id="smoke">تشغيل اختبار إعادة البث</button></section>
</div>
<div class="panel" style="margin-top:17px"><h3>📋 تفاصيل الفحص</h3><p>النتيجة تعتمد على اتصال المحرك والاختبار الفعلي، ولا تعني توفر كل محتوى المصادر.</p><div class="box" id="output">افتح اللوحة وسيظهر أحدث تقرير هنا.</div>
<div class="box">مرحلة تالية: إضافة إدارة القنوات والتشغيل والإيقاف وإعادة المحاولة والفشل التلقائي بعد ربط المصادر المخولة والتحقق من صلاحيات البث. هذه الأزرار غير مفعلة الآن.</div></div>
<footer>لوحة محمية بالمصادقة · لا تُعرض بيانات المزودين أو مفاتيحهم · لا تغيير في خدمات BLOFY PLAYER</footer></main>
<script nonce="${nonce}">
"use strict";
const el=id=>document.getElementById(id);
const text=(id,value,status)=>{const e=el(id);e.textContent=value;e.className=status||'neutral'};
async function refresh(){
  el('refresh').disabled=true;
  try{
    const response=await fetch('/operator/api/state',{cache:'no-store'});
    if(!response.ok)throw new Error('status_'+response.status);
    const data=await response.json();
    text('api','ONLINE','good');
    text('engine',data.engine.reachable?'متصل (HTTP '+data.engine.httpStatus+')':'غير متصل',data.engine.reachable?'good':'bad');
    text('media',data.smoke.checking?'فحص جارٍ':!data.smoke.checked?'لم يفحص بعد':data.smoke.mediaVerified?'نجح اختبار النقل':'فشل اختبار النقل',data.smoke.mediaVerified?'good':'neutral');
    el('output').textContent=JSON.stringify(data,null,2);
  }catch(e){text('api','تعذر الاتصال','bad');el('output').textContent='تعذر تحديث الحالة: '+e.message}
  finally{el('refresh').disabled=false}
}
el('refresh').addEventListener('click',refresh);
el('smoke').addEventListener('click',async()=>{
  el('smoke').disabled=true;el('output').textContent='جار إجراء اختبار HLS التجريبي...';
  try{
    const response=await fetch('/operator/api/smoke',{method:'POST',headers:{'x-blofy-operator-action':'smoke','content-type':'application/json'},body:'{}'});
    const data=await response.json();el('output').textContent=JSON.stringify(data,null,2);
    text('media',data.ok?'نجح اختبار النقل':('لم ينجح: '+(data.code||response.status)),data.ok?'good':'bad');
  }catch(e){el('output').textContent='فشل الطلب: '+e.message}finally{el('smoke').disabled=false}
});
refresh();
setInterval(refresh,30000);
</script>
</body></html>`;
}
export function createOperatorDashboard({adminToken='',engineOrigin,fetchImpl=fetch,
  getSmokeState=()=>({}),runSmoke=async()=>({status:503,body:{ok:false,code:'not_ready'}})}={}){
  async function engineStatus(){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),1800);
    try{
      const response=await fetchImpl(engineOrigin+'/',{method:'GET',redirect:'manual',signal:controller.signal});
      try{await response.body?.cancel?.();}catch{}
      return {reachable:response.status>=200&&response.status<500,httpStatus:response.status};
    }catch{return {reachable:false,httpStatus:null};}
    finally{clearTimeout(timeout);}
  }
  const enabled=typeof adminToken==='string'&&adminToken.length>=32;
  const handle=(req,res)=>{
    const pathname=new URL(req.url||'/', 'http://localhost').pathname;
    if(!(pathname==='/operator'||pathname==='/operator/'||pathname.startsWith('/operator/api/')))return false;
    if(!enabled){json(res,404,{ok:false,code:'operator_console_not_configured'});return true;}
    if(!authorized(req,adminToken)){
      res.writeHead(401,{'www-authenticate':'Basic realm="BLOFY STREAM Operator", charset="UTF-8"',
        'cache-control':'no-store','x-frame-options':'DENY'});
      res.end('Authorization required');return true;
    }
    if(req.method==='GET'&&(pathname==='/operator'||pathname==='/operator/')){
      const nonce=randomBytes(16).toString('base64');
      const body=Buffer.from(document(nonce));
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'x-frame-options':'DENY','x-content-type-options':'nosniff',
        'referrer-policy':'no-referrer','content-length':body.length});
      res.end(body);return true;
    }
    if(req.method==='GET'&&pathname==='/operator/api/state'){
      void engineStatus().then(engine=>json(res,200,{
        ok:true,service:'BLOFY-STREAM',role:'isolated-control',
        customerTrafficEnabled:false,realSourceVerified:false,
        engine,smoke:getSmokeState()
      })).catch(()=>json(res,503,{ok:false,code:'engine_status_unavailable'}));
      return true;
    }
    if(req.method==='POST'&&pathname==='/operator/api/smoke'){
      // A custom same-origin header prevents cross-site form POSTs with cached Basic credentials.
      if(req.headers['x-blofy-operator-action']!=='smoke')
        json(res,403,{ok:false,code:'operator_action_header_required'});
      else void runSmoke().then(({status,body})=>json(res,status,body))
        .catch(()=>json(res,503,{ok:false,code:'smoke_unavailable'}));
      return true;
    }
    json(res,404,{ok:false,code:'route_not_found'});return true;
  };
  return {enabled,handle};
}
