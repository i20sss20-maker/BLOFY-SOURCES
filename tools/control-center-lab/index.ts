import { timingSafeEqual } from "node:crypto";

// BLOFY CONTROL CENTER — read-only, isolated monitoring pilot.
// No production credentials, customer records, playback writes or arbitrary URL probes.
const TARGETS = Object.freeze([
  { id: "device-preview", name: "مختبر عرض الأجهزة", kind: "HTTP health", url: "https://blofy-migration-device-preview-test.up.railway.app/health" },
  { id: "live-lab", name: "مختبر محرك البث", kind: "HTTP reachability", url: "https://blofy-migration-live-lab-test.up.railway.app/" }
]);
const PLAN = Object.freeze([
  { name: "تشخيص ومراقبة الخدمات", state: "pilot", description: "فحص HTTP ومدة الاستجابة وسجل محدود في الذاكرة للمعاينة" },
  { name: "فحص الصوت والفيديو", state: "planned", description: "اختبارات ترميزات عينات بث مصرح بها وحفظ أسباب الفشل" },
  { name: "التحويل الاحتياطي وتوزيع الأحمال", state: "planned", description: "اختبار احتياطي دون تحويل اتصالات المشتركين الحاليين" },
  { name: "مزامنة المكتبة الدائمة", state: "planned", description: "طابور ملفات مصرح بها مع استكمال وتحقق من سلامة الحفظ" },
  { name: "الأكواد والموزعون", state: "planned", description: "إدارة الأرصدة والصلاحيات مع سجل تدقيق" },
  { name: "لوحة AI والنسخ الاحتياطي", state: "planned", description: "تحليل وقرارات قابلة للمراجعة قبل تنفيذ الإجراءات" }
]);
const MAX_HISTORY = 36;
const MIN_REFRESH_MS = 15000;
let previous = null;
let snapshotPromise = null;
let lastChecked = 0;
let history = [];
let scanSequence = 0;

const baseHeaders = {
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
};
function safeEqual(a, b) {
  const x = Buffer.from(String(a), "utf8");
  const y = Buffer.from(String(b), "utf8");
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}
function authorized(req) {
  const key = Bun.env.CONTROL_CENTER_PASSWORD || "";
  if (!key) return false;
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const value = atob(header.slice(6));
    const pos = value.indexOf(":");
    return pos > 0 && safeEqual(value.slice(0,pos), "admin") && safeEqual(value.slice(pos+1), key);
  } catch { return false; }
}
function json(body, status=200) {
  return new Response(JSON.stringify(body), {status,headers:{"content-type":"application/json; charset=utf-8",...baseHeaders}});
}
function textResponse(body, status, headers={}) {
  return new Response(body,{status,headers:{"content-type":"text/plain; charset=utf-8",...baseHeaders,...headers}});
}
async function probe(target) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(target.url,{
      method:"GET",
      signal:controller.signal,
      redirect:"manual",
      headers:{"accept":"application/json,text/plain;q=0.7,*/*;q=0.3","user-agent":"BLOFY-Control-Center-Lab/1.0"}
    });
    const httpStatus = response.status;
    try { await response.body?.cancel(); } catch {}
    const state = httpStatus>=200 && httpStatus<300 ? "healthy" : httpStatus<500 ? "reachable" : "error";
    return {
      id:target.id,name:target.name,kind:target.kind,
      state,httpStatus,latencyMs:Math.round(performance.now()-started),
      detail:state==="healthy" ? "استجابة HTTP ناجحة" : state==="reachable" ? "الخدمة ترد لكن المسار لا يثبت جاهزية التشغيل" : "خطأ من الخدمة"
    };
  } catch (error) {
    const timeoutHit=controller.signal.aborted;
    return {
      id:target.id,name:target.name,kind:target.kind,
      state:"offline",httpStatus:null,latencyMs:Math.round(performance.now()-started),
      detail:timeoutHit ? "انتهت مهلة الفحص" : "تعذّر الاتصال عبر الشبكة"
    };
  } finally { clearTimeout(timeout); }
}
async function snapshot(force=false) {
  if (snapshotPromise) return snapshotPromise;
  if (previous && Date.now()-lastChecked<MIN_REFRESH_MS) return previous;
  snapshotPromise=(async()=>{
    const checks=await Promise.all(TARGETS.map(probe));
    const result={
      product:"BLOFY CONTROL CENTER",
      environment:"isolated-test",
      monitoring:"read-only",
      isFullPlaybackTest:false,
      checkedAt:new Date().toISOString(),
      sequence:++scanSequence,
      checks,
      summary:{
        healthy:checks.filter(x=>x.state==="healthy").length,
        reachable:checks.filter(x=>x.state==="reachable").length,
        failed:checks.filter(x=>x.state==="error"||x.state==="offline").length,
        total:checks.length
      },
      legend:{
        healthy:"نجح طلب HTTP؛ لا يثبت جودة البث",
        reachable:"الخدمة ترد برمز غير 2xx؛ لا يثبت سلامة المسار",
        offline:"لم نتمكن من الوصول للخدمة"
      }
    };
    previous=result;lastChecked=Date.now();
    history.push({checkedAt:result.checkedAt,summary:result.summary,checks:checks.map(x=>({id:x.id,state:x.state,latencyMs:x.latencyMs}))});
    history=history.slice(-MAX_HISTORY);
    return result;
  })();
  try { return await snapshotPromise; } finally { snapshotPromise=null; }
}
const PAGE=[
'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>BLOFY CONTROL CENTER | LAB</title>',
'<style>',
':root{color-scheme:dark;font-family:system-ui,Tahoma,Arial,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#eef3fa;line-height:1.6}main{max-width:1120px;margin:auto;padding:28px 18px 60px}',
'header{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid #263247}',
'h1{font-size:clamp(25px,4vw,38px);margin:0;font-weight:800;letter-spacing:.01em}h2{font-size:20px;margin:0 0 14px}p{margin:6px 0;color:#aabbd1}',
'.tag{display:inline-flex;background:#174b52;color:#bafaf1;border:1px solid #247d86;border-radius:30px;font-size:12px;padding:4px 12px}',
'.small{font-size:12px;color:#9aacc3}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.card{background:#141f31;border:1px solid #27364c;border-radius:16px;padding:18px}',
'.metric{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums}.label{font-size:13px;color:#a6b8ce}.group{margin-top:32px}',
'.service-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
'.pill{font-size:12px;padding:3px 10px;border-radius:99px;background:#364152;color:#eff3fa}.pill.healthy{background:#145445;color:#b1f4d7}.pill.reachable{background:#63451b;color:#ffdf9f}.pill.offline,.pill.error{background:#5a2530;color:#ffb7c5}',
'button{background:#20a7a9;color:#062027;border:0;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer}button.secondary{background:#283950;color:#dce9f9}button:disabled{opacity:.5;cursor:default}.buttons{display:flex;gap:8px;flex-wrap:wrap}',
'.phase{display:flex;gap:12px;padding:16px 0;border-bottom:1px solid #25354a}.phase:last-child{border-bottom:0}.step{display:grid;place-items:center;width:32px;height:32px;flex-shrink:0;border-radius:10px;background:#20374c;color:#b9e9e5;font-weight:800}',
'footer{margin-top:30px;padding-top:18px;border-top:1px solid #27364c;color:#93a8c0;font-size:13px}.warning{padding:12px 16px;border-radius:12px;border:1px solid #655033;background:#2d261d;color:#ffe2a6;margin-top:20px}',
'@media(max-width:650px){.grid{grid-template-columns:repeat(2,1fr)}.service-list{grid-template-columns:1fr}main{padding:20px 12px 42px}.card{padding:15px}}',
'</style></head><body><main>',
'<header><div><span class="tag">TEST / READ ONLY</span><h1>BLOFY CONTROL CENTER</h1><p>مركز المراقبة التجريبي — لا يتحكم في أكواد أو قنوات العملاء</p></div>',
'<div class="buttons"><button id="refresh">فحص الآن</button><button class="secondary" id="copy">نسخ التقرير</button></div></header>',
'<section class="grid" aria-label="نتائج الفحص">',
'<div class="card"><div class="label">الخدمات المفحوصة</div><div class="metric" id="total">—</div></div>',
'<div class="card"><div class="label">استجابة ناجحة</div><div class="metric" id="healthy">—</div></div>',
'<div class="card"><div class="label">مسار قابل للوصول</div><div class="metric" id="reachable">—</div></div>',
'<div class="card"><div class="label">فشل اتصال أو خادم</div><div class="metric" id="failed">—</div></div></section>',
'<div class="warning">هذه قياسات HTTP لخدمات المختبر فقط. نجاح الاتصال لا يعني نجاح بث القنوات أو جودة الصوت والصورة. النتائج تتجدد عند الطلب وسجلها مؤقت.</div>',
'<section class="group"><div class="row"><h2>فحص خدمات المختبر</h2><span class="small" id="checked">لم يبدأ الفحص</span></div><div class="service-list" id="checks" aria-live="polite"></div></section>',
'<section class="group"><h2>مراحل البناء</h2><div class="card" id="plan"></div></section>',
'<footer>المشروع معزول عن الإنتاج. لا توجد هنا بيانات مشتركين، ولا مفاتيح مصادر، ولا عمليات تعديل أو نقل وسائط.</footer>',
'</main><script>',
'let current=null;',
'function make(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e;}',
'function checksView(rows){const root=document.getElementById("checks");root.replaceChildren();for(const r of rows){const card=make("div","card");const header=make("div","row");header.append(make("strong","",r.name),make("span","pill "+r.state,r.state==="healthy"?"استجابة ناجحة":r.state==="reachable"?"استجابة محدودة":"تعذر الفحص"));card.append(header,make("p","small",r.kind),make("p","",r.detail),make("div","small","HTTP: "+(r.httpStatus===null?"—":r.httpStatus)+" | "+r.latencyMs+" ms"));root.append(card);}}',
'function planView(rows){const root=document.getElementById("plan");root.replaceChildren();rows.forEach((r,i)=>{const row=make("div","phase");row.append(make("span","step",i+1));const info=make("div");info.append(make("strong","",r.name+" — "+(r.state==="pilot"?"تجريبي":"مخطط")),make("p","small",r.description));row.append(info);root.append(row);});}',
'async function refresh(force){const btn=document.getElementById("refresh");btn.disabled=true;btn.textContent="جار الفحص...";try{const res=await fetch("/api/status"+(force?"?force=1":""),{cache:"no-store"});if(!res.ok)throw Error("HTTP "+res.status);const data=await res.json();current=data;for(const key of ["total","healthy","reachable","failed"])document.getElementById(key).textContent=data.summary[key];document.getElementById("checked").textContent="آخر فحص: "+new Date(data.checkedAt).toLocaleString("ar-SA");checksView(data.checks);}catch(err){document.getElementById("checked").textContent="فشل جلب نتيجة الفحص";}finally{btn.disabled=false;btn.textContent="فحص الآن";}}',
'document.getElementById("refresh").addEventListener("click",()=>refresh(true));',
'document.getElementById("copy").addEventListener("click",async()=>{if(!current)return;try{await navigator.clipboard.writeText(JSON.stringify(current,null,2));const b=document.getElementById("copy");b.textContent="تم النسخ";setTimeout(()=>b.textContent="نسخ التقرير",1800);}catch{alert("تعذر النسخ تلقائيا");}});',
'fetch("/api/roadmap").then(r=>r.json()).then(d=>planView(d.phases)).catch(()=>{});refresh(false);setInterval(()=>refresh(false),45000);',
'</script></body></html>'
].join("");
Bun.serve({
  port:Number(Bun.env.PORT || 3000),
  async fetch(req){
    const pathname=new URL(req.url).pathname;
    if(pathname==="/health")return json({ok:true,service:"blofy-control-center-lab",mode:"test",security:"protected"});
    if(!Bun.env.CONTROL_CENTER_PASSWORD)return textResponse("Admin login not configured",503);
    if(!authorized(req))return textResponse("Authentication required",401,{"www-authenticate":"Basic realm=\"BLOFY Control Center Lab\", charset=\"UTF-8\""});
    if(req.method!=="GET")return textResponse("Method Not Allowed",405,{"allow":"GET"});
    if(pathname==="/")return new Response(PAGE,{status:200,headers:{"content-type":"text/html; charset=utf-8",...baseHeaders}});
    if(pathname==="/api/roadmap")return json({project:"BLOFY CONTROL CENTER",phase:"pilot",phases:PLAN});
    if(pathname==="/api/status")return json(await snapshot(new URL(req.url).searchParams.get("force")==="1"));
    if(pathname==="/api/history")return json({note:"In-memory history only; resets on restart",samples:history});
    return textResponse("Not Found",404);
  }
});
