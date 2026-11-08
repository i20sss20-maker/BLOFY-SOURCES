// BLOFY STREAM operator UI. All counters are real or explicitly unknown.
// Kept separate from controller logic to simplify design iteration.
export function renderOperatorDashboard(nonce){
  const page=String.raw`<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>BLOFY STREAM | لوحة التحكم</title>
<style>
:root{--bg:#071426;--nav:#061123;--surface:#0c1c33;--surface2:#10243e;--stroke:#243a58;--text:#edf3ff;--muted:#93a7c2;--accent:#aa82e7;--accent2:#3eaee4;--green:#3ad2a0;--yellow:#f6c56b;--red:#f37d8f}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif}button,input,a{font:inherit}[hidden]{display:none!important}button{cursor:pointer}button:disabled{cursor:progress;opacity:.55}a{color:inherit;text-decoration:none}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid var(--accent2);outline-offset:3px}
.layout{min-height:100vh;display:grid;grid-template-columns:248px minmax(0,1fr)}aside{background:#07172b;border-left:1px solid var(--stroke);padding:25px 17px;position:sticky;top:0;height:100vh;overflow-y:auto}
.brand{display:flex;gap:13px;align-items:center;margin:0 6px 32px}.logo{width:51px;height:51px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(140deg,#b6a4fc,#6a49b2);color:#12102a;font-size:28px;font-weight:950;transform:rotate(-5deg);flex-shrink:0}.brand strong{font-size:18px;letter-spacing:.5px}.brand strong span{color:#af91f5}.brand small{display:block;color:var(--muted);font-size:11px}
.nav-group{font-size:11px;letter-spacing:1px;color:#718aa8;font-weight:800;margin:21px 13px 8px}.nav-btn{width:100%;display:flex;align-items:center;gap:12px;text-align:right;border:1px solid transparent;border-radius:12px;color:#adbbce;background:none;padding:12px 13px;margin:3px 0}.nav-btn:hover{background:#122944}.nav-btn.active{background:#2a2452;color:#f6eeff;border-color:#6c559b}.nav-ico{font-size:20px;width:24px;text-align:center}.nav-label{flex:1}.nav-badge{font-size:10px;color:var(--yellow)}.aside-foot{margin-top:28px;border-top:1px solid var(--stroke);padding:18px 10px;color:var(--muted);font-size:12px}
.content{min-width:0}.topbar{height:77px;border-bottom:1px solid var(--stroke);display:flex;align-items:center;justify-content:space-between;gap:15px;padding:0 clamp(16px,3vw,38px);background:#07172b}.topbar-left{display:flex;align-items:center;gap:12px;min-width:0}.topbar h1{font-size:18px;margin:0;white-space:nowrap}.topbar p{font-size:12px;color:var(--muted);margin:0}.topbar-right{display:flex;align-items:center;gap:10px}.search{display:flex;align-items:center;gap:8px;background:#0d233c;border:1px solid var(--stroke);border-radius:11px;padding:8px 13px;max-width:290px}.search input{background:transparent;border:0;outline:0;color:var(--text);width:210px;min-width:0}.search input::placeholder{color:#7893b3}
.status-pill{font-size:12px;border:1px solid #53627b;padding:7px 11px;border-radius:100px;white-space:nowrap;color:#c3cfe0}.status-pill.ok{border-color:#29775e;color:var(--green);background:#0d2929}.status-pill.bad{border-color:#8b4050;color:var(--red)}.status-pill.warn{border-color:#765d36;color:var(--yellow)}
main{padding:clamp(16px,3vw,36px);max-width:1600px;margin:auto}.view{display:none}.view.active{display:block}
.welcome{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:23px}.welcome h2{font-size:27px;line-height:1.3;margin:0 0 5px}.welcome p{margin:0;color:var(--muted)}.actions{display:flex;gap:9px;flex-wrap:wrap}.btn{border:1px solid #815ac7;background:#835ecb;color:white;border-radius:9px;padding:10px 16px;font-weight:800;white-space:nowrap}.btn:hover{filter:brightness(1.15)}.btn.secondary{background:#132a44;border-color:#39516f}.btn.ghost{background:transparent;border:1px solid var(--stroke)}.btn.sm{padding:7px 12px;font-size:12px}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:18px}.card{background:linear-gradient(165deg,#0e233c,#0a1a31);border:1px solid var(--stroke);border-radius:13px;min-width:0;overflow:hidden}.stat{padding:19px 19px 15px;border-bottom:5px solid var(--accent2)}.stat.green{border-bottom-color:#37b78e}.stat.purple{border-bottom-color:#9d79dc}.stat.yellow{border-bottom-color:#f0bb58}.stat-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.stat h3{color:var(--muted);font-size:12px;letter-spacing:.3px;margin:0;font-weight:650}.stat .big{font-size:clamp(21px,2.4vw,31px);font-weight:900;margin:10px 0 0;letter-spacing:.1px;overflow-wrap:anywhere}.stat .glyph{width:41px;height:41px;display:grid;place-items:center;background:#172d49;border-radius:10px;color:#87b4ff;font-size:21px}.stat small{color:var(--muted)}
.grid{display:grid;grid-template-columns:1.15fr .85fr;gap:17px;margin-top:17px}.panel{border:1px solid var(--stroke);background:#0c1d35;border-radius:14px;padding:21px;min-width:0}.panel h3{font-size:17px;margin:0 0 6px}.panel>p,.hint{font-size:13px;color:var(--muted);margin:0 0 13px}.krow{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid #213955}.krow:last-child{border-bottom:0}.krow span{color:var(--muted)}.krow strong{text-align:left;word-break:break-word}.ok{color:var(--green)}.bad{color:var(--red)}.warn{color:var(--yellow)}
.callout{background:linear-gradient(130deg,#122d4e,#27204d);border:1px solid #4a4b84;border-radius:14px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.callout h3{font-size:20px;margin:0 0 5px}.callout p{color:#c1bedc;margin:0;max-width:670px;font-size:13px}.round{width:65px;height:65px;border-radius:50%;display:grid;place-items:center;background:#b19bff23;font-size:30px;flex-shrink:0}.split{display:flex;align-items:center;gap:12px}
.logs{white-space:pre-wrap;word-break:break-word;direction:ltr;text-align:left;background:#071526;color:#bddedb;border-radius:9px;border:1px solid #294261;padding:13px 15px;margin:12px 0 0;max-height:280px;overflow:auto;font:12px/1.6 ui-monospace,Consolas,monospace}
.quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.quick{display:block;text-align:right;border-radius:12px;border:1px solid #304766;background:#112740;padding:17px;color:var(--text)}.quick:hover{border-color:var(--accent)}.quick strong{display:block;font-size:15px}.quick span{display:block;color:var(--muted);font-size:12px;margin-top:5px}
.alert{border:1px solid #6b5734;background:#322a1d;color:#f1cf94;border-radius:9px;padding:12px 14px;font-size:13px;margin:15px 0}.empty{padding:26px;text-align:center;background:#10233a;border:1px dashed #3b5270;border-radius:12px;color:var(--muted)}.empty strong{display:block;font-size:17px;color:var(--text);margin-bottom:6px}.mono{direction:ltr;unicode-bidi:isolate;font-family:Consolas,monospace}
footer{font-size:12px;color:#8294ad;text-align:center;padding:28px 5px}
@media(max-width:1200px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.grid{grid-template-columns:1fr}}
@media(max-width:780px){.layout{grid-template-columns:1fr}aside{position:static;height:auto;padding:10px 13px;border-left:0;border-bottom:1px solid var(--stroke)}.brand{margin:3px 2px 10px}.logo{width:38px;height:38px;font-size:21px}.nav-group,.aside-foot{display:none}.nav-wrap{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin}.nav-btn{width:auto;white-space:nowrap;padding:8px 10px;flex-shrink:0}.nav-ico{font-size:16px;width:auto}.nav-badge{display:none}.topbar{height:auto;min-height:60px;padding:10px 15px}.topbar p{display:none}.search{display:none}.welcome{align-items:flex-start;flex-direction:column}.welcome h2{font-size:23px}.quick-grid{grid-template-columns:1fr}.callout{padding:18px}.round{display:none}}
@media(max-width:490px){.cards{grid-template-columns:1fr 1fr;gap:9px}.stat{padding:12px}.stat h3{font-size:11px}.stat .big{font-size:21px}.stat .glyph{display:none}.topbar-right .btn{padding:8px}main{padding:15px}.panel{padding:15px}}
</style></head><body>
<div class="layout">
<aside aria-label="القائمة الرئيسية">
  <div class="brand"><span class="logo" aria-hidden="true">B</span><div><strong>BLOFY <span>STREAM</span></strong><small>لوحة إدارة البث</small></div></div>
  <div class="nav-group">الإدارة</div>
  <nav class="nav-wrap">
    <button class="nav-btn active" data-view="home" type="button"><span class="nav-ico">▦</span><span class="nav-label">الرئيسية</span></button>
    <button class="nav-btn" data-view="sources" type="button"><span class="nav-ico">◫</span><span class="nav-label">المصادر</span></button>
    <button class="nav-btn" data-view="restream" type="button"><span class="nav-ico">◉</span><span class="nav-label">إعادة البث</span></button>
    <button class="nav-btn" data-view="library" type="button"><span class="nav-ico">▣</span><span class="nav-label">المكتبة</span></button>
    <button class="nav-btn" data-view="subscribers" type="button"><span class="nav-ico">♙</span><span class="nav-label">المشتركون</span></button>
    <button class="nav-btn" data-view="diagnostics" type="button"><span class="nav-ico">⚙</span><span class="nav-label">الفحص والصيانة</span></button>
  </nav>
  <div class="aside-foot"><div>● نظام BLOFY STREAM المستقل</div><div>التحكم بالمشتركين لم يُنقل إليه بعد.</div></div>
</aside>
<div class="content">
<header class="topbar"><div class="topbar-left"><div><h1 id="page-title">لوحة التحكم</h1><p>مركز التحكم في السيرفر وإعادة البث</p></div></div><div class="topbar-right">
  <div class="search"><span>⌕</span><input id="section-search" placeholder="بحث في أقسام اللوحة..." aria-label="بحث في القائمة"></div>
  <span id="api-pill" class="status-pill warn" role="status">جار الاتصال</span>
  <button class="btn secondary sm" id="refresh-top" type="button">↻ تحديث</button>
</div></header>
<main>
<section class="view active" data-panel="home">
  <div class="welcome"><div><h2>مرحبًا بك في BLOFY STREAM</h2><p>إدارة واضحة للسيرفر، مع عرض حالة محرك إعادة البث الفعلية.</p></div><button class="btn" data-go="restream" type="button">إدارة إعادة البث ←</button></div>
  <div class="cards">
    <div class="card stat green"><div class="stat-head"><h3>حالة السيرفر</h3><span class="glyph">▤</span></div><div class="big" id="stat-api">جار الفحص</div><small>خدمة BLOFY STREAM API</small></div>
    <div class="card stat purple"><div class="stat-head"><h3>محرك البث</h3><span class="glyph">◉</span></div><div class="big" id="stat-engine">جار الفحص</div><small>MediaMTX على Railway</small></div>
    <div class="card stat"><div class="stat-head"><h3>المسارات النشطة</h3><span class="glyph">▥</span></div><div class="big" id="stat-paths">—</div><small>عند توفر واجهة المحرك</small></div>
    <div class="card stat yellow"><div class="stat-head"><h3>جلسات HLS</h3><span class="glyph">▣</span></div><div class="big" id="stat-sessions">—</div><small>المشاهدة عبر المحرك المستقل</small></div>
  </div>
  <div class="callout"><div class="split"><span class="round" aria-hidden="true">◉</span><div><h3>محرك إعادة البث</h3><p>بدءًا من الوضع الآمن: حالة الخادم، عدد المسارات عند توفرها، وتشغيل اختبار نقل HLS. لا يوجد تحويل تلقائي للمشتركين أو للمصادر الآن.</p></div></div><button class="btn" data-go="diagnostics" type="button">فحص المحرك</button></div>
  <div class="grid"><div class="panel"><h3>حالة النظام</h3><p>نتائج مأخوذة من خدمات BLOFY STREAM، وليست أرقامًا تجريبية.</p>
    <div class="krow"><span>خدمة التحكم</span><strong id="row-api">قيد الفحص</strong></div>
    <div class="krow"><span>اتصال MediaMTX</span><strong id="row-engine">قيد الفحص</strong></div>
    <div class="krow"><span>واجهة المسارات والجلسات</span><strong id="row-control">قيد الفحص</strong></div>
    <div class="krow"><span>ربط التشغيل بالمشتركين</span><strong class="warn">لم يُفعّل</strong></div>
  </div><div class="panel"><h3>الانتقال السريع</h3><p>الأقسام الرئيسية في مكان واحد وبدون قوائم معقدة.</p>
    <div class="quick-grid"><button class="quick" data-go="sources" type="button"><strong>المصادر</strong><span>Xtream / M3U</span></button><button class="quick" data-go="restream" type="button"><strong>إعادة البث</strong><span>المسارات والجلسات</span></button><button class="quick" data-go="diagnostics" type="button"><strong>الصيانة</strong><span>فحص HLS</span></button></div>
  </div></div>
</section>
<section class="view" data-panel="sources"><div class="welcome"><div><h2>إدارة المصادر</h2><p>قسم مخصص لمصادر Xtream وM3U دون إظهار بيانات الدخول.</p></div></div><div class="panel">
<h3>المصادر الحالية</h3><p>إدارة المصادر الفعلية ما زالت في بوابة BLOFY PLAYER؛ لم تُنقل إلى المحرك المعزول.</p>
<div class="empty"><strong>لم تُربط قائمة المصادر بهذه اللوحة</strong><div>لا نعرض عددًا أو صحةً غير مؤكَّدين. الربط الآمن مع قاعدة بيانات المشتركين مرحلة مستقلة.</div></div>
<p style="margin-top:17px"><a class="btn secondary" href="https://blofyplayer.com/admin" target="_blank" rel="noopener noreferrer">فتح الإدارة الحالية ↗</a></p>
</div></section>
<section class="view" data-panel="restream"><div class="welcome"><div><h2>إدارة إعادة البث</h2><p>MediaMTX وخيارات التشخيص الآمنة.</p></div><button class="btn" data-go="diagnostics" type="button">تشغيل الفحص ←</button></div>
<div class="cards"><div class="card stat purple"><div class="stat-head"><h3>اتصال محرك HLS</h3><span class="glyph">◉</span></div><div class="big" id="stream-engine">جار الفحص</div></div><div class="card stat"><div class="stat-head"><h3>المسارات النشطة</h3></div><div class="big" id="stream-paths">—</div></div><div class="card stat green"><div class="stat-head"><h3>جلسات HLS</h3></div><div class="big" id="stream-sessions">—</div></div><div class="card stat yellow"><div class="stat-head"><h3>تشغيل العملاء</h3></div><div class="big warn">غير مفعل</div></div></div>
<div class="panel"><h3>تشغيل إعادة البث التجريبي — تحكم فعلي</h3>
<p>إنشاء أو إزالة مسار بث مستقل داخل MediaMTX من مصدر الاختبار الداخلي الذي يولّد فيديو H.264 وصوت AAC. التشغيل عند الطلب، ولا يستهلك مصدر IPTV.</p>
<div class="krow"><span>قناة الاختبار <span class="mono">blofy-demo</span></span><strong id="demo-state" class="warn">جار الفحص</strong></div>
<div class="krow"><span>مسار المشاهدة</span><strong id="demo-path" class="mono">/blofy-demo/index.m3u8</strong></div>
<div class="actions" style="margin-top:15px">
<button class="btn" id="demo-start" type="button">▶ تفعيل مسار التجربة</button>
<button class="btn secondary" id="demo-restart" type="button">↻ إعادة تهيئة المسار</button>
<button class="btn ghost" id="demo-stop" type="button">■ إيقاف مسار التجربة</button>
<button class="btn secondary" id="demo-probe" type="button">✓ اختبار وصول مقطع HLS</button>
</div>
<div class="alert" id="demo-message" role="status">هذه الأزرار تعمل على مسار تجريبي محدد فقط، ولا تؤثر على مشاهدة المشتركين.</div>
<div class="krow"><span>حالة ربط المصادر الحقيقية</span><strong class="warn">بانتظار التحقق والتصريح</strong></div>
<div class="krow"><span>قائمة مسارات الاختبار النشطة</span><strong id="demo-current-paths">جار الفحص</strong></div>
<div class="krow"><span>الوضع الحالي</span><strong class="warn">اختبار النقل فقط</strong></div><div class="krow"><span>البدائل عند الانقطاع</span><strong class="warn">بانتظار مصادر احتياطية مثبتة</strong></div><div class="krow"><span>التحويل عبر FFmpeg</span><strong class="warn">لم يُفعّل على المحتوى الحقيقي</strong></div>
</div></section>
<section class="view" data-panel="library"><div class="welcome"><div><h2>المكتبة</h2><p>الأفلام والمسلسلات والحلقات.</p></div></div><div class="panel"><div class="empty"><strong>تُدار المكتبة حاليًا في BLOFY PLAYER</strong><div>بمجرد اكتمال الجسر الموثّق يمكن إضافة البحث في العناصر وفحص روابط التشغيل من هذه الصفحة.</div></div></div></section>
<section class="view" data-panel="subscribers"><div class="welcome"><div><h2>المشتركون</h2><p>إدارة الاشتراكات والأجهزة والأذونات.</p></div></div><div class="panel"><div class="empty"><strong>الاشتراكات لم تُنقل إلى خدمة STREAM</strong><div>نبقي التحكم بالمشتركين في الموقع الحالي حتى لا نفقد التفعيل والأجهزة.</div><p><a class="btn secondary" href="https://blofyplayer.com/admin" target="_blank" rel="noopener noreferrer">فتح إدارة المشتركين ↗</a></p></div></div></section>
<section class="view" data-panel="diagnostics"><div class="welcome"><div><h2>الفحص والصيانة</h2><p>فحوص حقيقية مع توضيح مستوى التحقق بدقة.</p></div><button class="btn secondary" id="refresh-diagnostics" type="button">↻ تحديث</button></div>
<div class="grid"><div class="panel"><h3>اختبار نقل HLS</h3><p>اختبار حزمة فيديو اصطناعية داخل المحرك. ليس دليلًا على عمل فيلم أو قناة من المزود.</p>
<div class="krow"><span>حالة آخر اختبار</span><strong id="test-state">لم يفحص</strong></div><div class="krow"><span>فحص صوت وصورة حقيقيين</span><strong class="warn">لم يكتمل</strong></div>
<button id="run-smoke" class="btn" type="button">▶ تشغيل اختبار النقل</button></div>
<div class="panel"><h3>تقرير الفحص</h3><p>تظهر رموز الأخطاء ومدة الاستجابة دون عرض كلمات مرور أو روابط مصادر.</p><div class="logs" id="diagnostic-log" role="status">لا يوجد تقرير بعد.</div></div></div>
</section>
<footer>BLOFY STREAM CONTROL CENTER · لوحة تشغيل مستقلة · لا تُغير بيانات العملاء أو مصادرهم تلقائيًا</footer>
</main></div></div>
<script nonce="__NONCE__">
"use strict";
(function(){
  var $=function(id){return document.getElementById(id)};
  var names={home:"الرئيسية",sources:"المصادر",restream:"إعادة البث",library:"المكتبة",subscribers:"المشتركون",diagnostics:"الفحص والصيانة"};
  var active="home";
  function navigate(id){
    if(!Object.prototype.hasOwnProperty.call(names,id))return;
    active=id;
    document.querySelectorAll("[data-panel]").forEach(function(e){e.classList.toggle("active",e.getAttribute("data-panel")===id)});
    document.querySelectorAll("[data-view]").forEach(function(e){e.classList.toggle("active",e.getAttribute("data-view")===id)});
    $("page-title").textContent=names[id];
    window.scrollTo({top:0,behavior:"instant"});
  }
  document.querySelectorAll("[data-view],[data-go]").forEach(function(e){e.addEventListener("click",function(){navigate(e.getAttribute("data-view")||e.getAttribute("data-go"))})});
  $("section-search").addEventListener("input",function(){
    var q=this.value.trim().toLowerCase();
    document.querySelectorAll("[data-view]").forEach(function(e){e.hidden=!e.textContent.toLowerCase().includes(q)});
  });
  function txt(id,value,klass){var e=$(id);if(!e)return;e.textContent=value;e.classList.remove("ok","bad","warn");if(klass)e.classList.add(klass)}
  function mark(ok,kind){var pill=$("api-pill");pill.textContent=ok?"السيرفر متصل":"تعذر الاتصال";pill.className="status-pill "+(ok?"ok":"bad")}
  var refreshedAt=0;
  async function refresh(){
    try{
      var res=await fetch("/operator/api/state",{cache:"no-store",credentials:"same-origin"});
      if(!res.ok)throw new Error("HTTP "+res.status);
      var d=await res.json();
      var engine=Boolean(d.engine&&d.engine.reachable);
      var mc=d.mediaControl||{};
      var demo=mc.demo;
      txt("demo-state",!mc.controlAvailable?"واجهة المحرك غير متاحة":demo===null||demo===undefined?"غير معروف":demo.exists?(demo.ready?"مفعّل · يبث الآن":"مفعّل · ينتظر المشاهد"):"غير مفعّل",
        demo&&demo.exists?"ok":"warn");
      txt("demo-current-paths",Array.isArray(mc.paths)&&mc.paths.length?mc.paths.map(function(p){return p.name+(p.ready?" ●":" ○")}).join("، "):"لا توجد مسارات نشطة معروضة");
      mark(true);
      txt("stat-api","ONLINE","ok");txt("row-api","متصل","ok");
      txt("stat-engine",engine?"ONLINE":"غير متصل",engine?"ok":"bad");
      txt("stream-engine",engine?"ONLINE":"غير متصل",engine?"ok":"bad");
      txt("row-engine",engine?"متصل (HTTP "+d.engine.httpStatus+")":"لا يستجيب",engine?"ok":"bad");
      txt("row-control",mc.controlAvailable?"متصلة":"غير متاحة",mc.controlAvailable?"ok":"warn");
      var paths=mc.activePaths===null||mc.activePaths===undefined?"—":String(mc.activePaths);
      var sessions=mc.hlsSessions===null||mc.hlsSessions===undefined?"—":String(mc.hlsSessions);
      txt("stat-paths",paths);txt("stream-paths",paths);
      txt("stat-sessions",sessions);txt("stream-sessions",sessions);
      var smoke=d.smoke||{};
      txt("test-state",smoke.checking?"جار الفحص":smoke.mediaVerified?"نجح اختبار النقل":smoke.checked?"فشل اختبار النقل":"لم يفحص",smoke.mediaVerified?"ok":"warn");
      refreshedAt=Date.now();
    }catch(err){mark(false);txt("stat-api","تعذر الاتصال","bad");txt("row-api","غير متصل","bad");$("diagnostic-log").textContent="خطأ في قراءة حالة السيرفر: "+err.message}
  }
  async function test(){
    var btn=$("run-smoke");btn.disabled=true;$("diagnostic-log").textContent="جار تشغيل اختبار نقل HLS الاصطناعي...";
    try{
      var response=await fetch("/operator/api/smoke",{method:"POST",headers:{"x-blofy-operator-action":"smoke","content-type":"application/json"},body:"{}",credentials:"same-origin"});
      var body=await response.json();
      $("diagnostic-log").textContent=JSON.stringify(body,null,2);
      txt("test-state",body.ok?"نجح اختبار النقل":body.code||"فشل الفحص",body.ok?"ok":"bad");
      await refresh();
    }catch(err){$("diagnostic-log").textContent="تعذر الفحص: "+err.message}
    finally{btn.disabled=false}
  }
  $("refresh-top").addEventListener("click",refresh);
  $("refresh-diagnostics").addEventListener("click",refresh);
  $("run-smoke").addEventListener("click",test);
  async function demoAction(action){
    var ids=["demo-start","demo-stop","demo-restart","demo-probe"];
    ids.forEach(function(id){$(id).disabled=true});
    $("demo-message").textContent="جار تنفيذ الطلب داخل المحرك المستقل...";
    try{
      var res=await fetch("/operator/api/demo-"+action,{
        method:"POST",headers:{"x-blofy-operator-action":"demo-"+action,"content-type":"application/json"},
        body:"{}",credentials:"same-origin"
      });
      var data=await res.json();
      var msg=data.ok?(action==="start"?"تم إنشاء مسار التجربة. يبدأ البث عند أول طلب مشاهدة.":
        action==="stop"?"تم إيقاف مسار التجربة.":"تم تنفيذ الطلب بنجاح."):
        "تعذر تنفيذ الطلب: "+(data.code||res.status);
      $("demo-message").textContent=msg;
      if(action==="probe")$("diagnostic-log").textContent=JSON.stringify(data,null,2);
      await refresh();
    }catch(e){$("demo-message").textContent="خطأ اتصال: "+e.message}
    finally{ids.forEach(function(id){$(id).disabled=false})}
  }
  ["start","stop","restart","probe"].forEach(function(action){
    $("demo-"+action).addEventListener("click",function(){demoAction(action)});
  });
  refresh();
  setInterval(function(){if(!document.hidden&&Date.now()-refreshedAt>28000)refresh()},30000);
})();
</script></body></html>`;
  return page.replace('__NONCE__',nonce);
}
