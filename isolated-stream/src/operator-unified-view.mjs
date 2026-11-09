// Original BLOFY STREAM control center. Authenticated, live production data only.
// No sample sources, fake counters, redirects to legacy pages, or demo buttons.
export function renderOperatorDashboard(nonce){
  const html=String.raw`<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#09172c">
<title>BLOFY STREAM | الإدارة المتكاملة</title>
<style>
:root{color-scheme:dark;--bg:#061428;--aside:#07192f;--panel:#0c203b;--panel2:#102941;--border:#263c5d;--font:#edf4ff;--muted:#91a8c6;--purple:#ad89ed;--green:#48d5a5;--red:#fc8992;--amber:#efc66b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--font);font:14px/1.7 system-ui,Tahoma,'Segoe UI',sans-serif}
button,input,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.48;cursor:wait}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #b99bff;outline-offset:2px}a{color:inherit;text-decoration:none}
.layout{min-height:100vh;display:grid;grid-template-columns:234px minmax(0,1fr)}
aside{background:var(--aside);border-left:1px solid var(--border);padding:24px 15px;position:sticky;top:0;height:100vh}
.logo{display:flex;align-items:center;gap:12px;margin:0 6px 30px}.logo-icon{width:48px;height:48px;border-radius:14px;background:linear-gradient(140deg,#ab93ff,#6351af);color:#11142a;display:grid;place-items:center;font-size:25px;font-weight:900;transform:rotate(-5deg)}
.logo strong{font-size:18px;letter-spacing:.4px}.logo strong b{color:#ab90f4}.logo small{display:block;color:var(--muted);font-size:11px}.navtitle{font-size:10px;color:#8398b4;font-weight:700;letter-spacing:1px;margin:12px 12px}
nav{display:grid;gap:3px}.navlink{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid transparent;border-radius:10px;text-align:right;color:#a8bad0;background:none;font-weight:600;width:100%}.navlink.active{color:#f5efff;background:#302850;border-color:#69578d}.navlink:hover{background:#1d3350}.navlink span:first-child{width:22px;font-size:19px;text-align:center}
nav .navlink .nav-caption{font-size:11px;opacity:.7}.navfoot{margin-top:26px;border-top:1px solid #243957;padding:18px 9px;color:#9bafc7;font-size:12px}
.content{min-width:0}.top{height:80px;background:#081a30;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:18px;padding:10px 30px}
.top h1{font-size:19px;margin:0}.top p{margin:2px 0 0;color:var(--muted);font-size:12px}.tools{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.btn{border-radius:9px;border:1px solid #8161b8;background:#815ac8;color:#fff;padding:9px 15px;font-weight:700}.btn.secondary{background:#132d49;border-color:#405b80}.btn.danger{background:#492832;border-color:#8e4b55}.btn:hover{filter:brightness(1.12)}.btn.sm{font-size:12px;padding:6px 10px}
.pill{display:inline-block;border:1px solid #435371;color:#b5c5dc;border-radius:30px;padding:5px 11px;font-size:12px;white-space:nowrap}.pill.good{color:var(--green);border-color:#2d665a;background:#103129}.pill.bad{color:var(--red);border-color:#7d4554}.pill.warn{color:var(--amber);border-color:#77613e}
main{padding:26px 30px 50px;max-width:1580px;margin:auto}.view{display:none}.view.active{display:block}.heading{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:20px}.heading h2{font-size:25px;margin:0}.heading p{color:var(--muted);margin:2px 0}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}
.stat{background:linear-gradient(150deg,#10243d,#091c34);border:1px solid #2a4160;border-bottom:5px solid #b28af4;border-radius:12px;padding:18px}.stat:nth-child(2){border-bottom-color:#41bca8}.stat:nth-child(3){border-bottom-color:#55b4f1}.stat:nth-child(4){border-bottom-color:#efc264}.stat small{color:var(--muted)}.stat strong{font-size:27px;display:block;margin-top:7px;line-height:1.3}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px}.panel{background:#0c213c;border:1px solid #2c4669;border-radius:13px;padding:20px;min-width:0;margin-bottom:14px}.panel h3{margin:0 0 7px;font-size:17px}.muted{color:var(--muted)}.panel p{margin:0 0 11px}
.row{display:flex;justify-content:space-between;gap:15px;border-bottom:1px solid #253d5b;padding:10px 0}.row:last-child{border:0}.row .muted{color:var(--muted)}.ok{color:var(--green)}.fail{color:var(--red)}.warn{color:var(--amber)}
table{width:100%;border-collapse:collapse;text-align:right}th{font-size:12px;font-weight:600;color:#9fb2cb;border-bottom:1px solid #415775;padding:11px 9px}td{padding:11px 9px;border-bottom:1px solid #233954;vertical-align:middle}tbody tr:hover{background:#132a45}
.tablewrap{overflow-x:auto}.name{font-weight:800}.meta{color:var(--muted);font-size:11px}.num{font-variant-numeric:tabular-nums;direction:ltr;display:inline-block}
.actions{display:flex;gap:6px;flex-wrap:wrap}.actions button{padding:5px 10px}
input,select{border:1px solid #405a7e;background:#0c1b2e;color:#edf4ff;border-radius:10px;padding:10px 12px;min-width:0;width:100%}input::placeholder{color:#7a93b2}input[type="checkbox"]{width:auto;accent-color:#a17be6}
.formgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.field label{display:block;color:#c1cde0;font-size:12px;margin-bottom:5px}.field.full{grid-column:1/-1}.inline{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.inline>input,.inline>select{flex:1;min-width:130px}.status{padding:13px 15px;border:1px solid #685632;background:#25281e;color:#f1d9a5;border-radius:10px;margin:0 0 16px}.status.good{background:#102c28;border-color:#286451;color:#93edcc}.status.bad{background:#35212b;border-color:#793c49;color:#ffb5c0}.status[hidden]{display:none}
.log{margin:12px 0 0;white-space:pre-wrap;word-break:break-word;direction:ltr;text-align:left;background:#08182c;border:1px solid #274464;border-radius:10px;padding:14px;color:#c5e8dd;min-height:80px;max-height:280px;overflow:auto;font:12px/1.5 Consolas,monospace}
.empty{padding:25px;text-align:center;color:var(--muted)}.controls{display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:12px}.controls .inline{flex:1}.controls .inline>*{max-width:260px}
.accountsecret{background:#11372e;border:1px solid #287a62;color:#d6fff0;padding:13px;border-radius:10px;overflow-wrap:anywhere}.accountsecret[hidden]{display:none}
[hidden]{display:none!important}
footer{text-align:center;color:#788da9;padding-top:24px;font-size:11px}
@media(max-width:1100px){.cards{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.formgrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:740px){.layout{display:block}aside{position:static;height:auto;padding:10px 12px;border-left:0;border-bottom:1px solid var(--border)}.logo{margin:0 0 12px}.logo-icon{width:39px;height:39px;font-size:19px}nav{display:flex;overflow:auto;gap:5px}.navlink{flex:0 0 auto;width:auto;padding:7px 10px;white-space:nowrap}.navtitle,.navfoot{display:none}.top{height:auto;min-height:60px;padding:12px 15px}.top p{display:none}main{padding:17px 13px}.heading h2{font-size:22px}.formgrid{grid-template-columns:1fr}.stat{padding:12px}.stat strong{font-size:22px}}
</style>
</head><body><div class="layout"><aside>
<div class="logo"><div class="logo-icon">B</div><div><strong>BLOFY <b>STREAM</b></strong><small>مركز الإدارة المتكامل</small></div></div>
<div class="navtitle">الإدارة</div><nav aria-label="الأقسام">
<button class="navlink active" data-tab="home"><span>▦</span>الرئيسية</button>
<button class="navlink" data-tab="sources"><span>◫</span>المصادر</button>
<button class="navlink" data-tab="restream"><span>◉</span>إعادة البث</button>
<button class="navlink" data-tab="library"><span>▣</span>المكتبة</button>
<button class="navlink" data-tab="accounts"><span>♙</span>المشتركون</button>
<button class="navlink" data-tab="codes"><span>▤</span>أكواد الاشتراك</button>
<button class="navlink" data-tab="diagnostics"><span>⚙</span>الفحص والصيانة</button>
</nav><div class="navfoot">الإدارة من مكان واحد، وبيانات المصادر والمشتركين من النظام الأصلي مباشرة.</div>
</aside><div class="content">
<header class="top"><div><h1 id="title">الرئيسية</h1><p>السيرفر والمكتبة والمشتركون وإعادة البث</p></div>
<div class="tools"><span id="system-pill" class="pill warn" role="status">جار الاتصال</span><button class="btn secondary sm" id="refresh">↻ تحديث</button></div></header>
<main><div id="notice" class="status" role="status" hidden></div>
<section class="view active" id="page-home">
<div class="heading"><div><h2>مرحبًا بك في BLOFY STREAM</h2><p>معلومات حقيقية من قاعدة بيانات المصادر ومحرك البث.</p></div><button class="btn" data-go="sources">إدارة المصادر</button></div>
<div class="cards">
<div class="stat"><small>المصادر</small><strong id="k-sources">—</strong></div>
<div class="stat"><small>القنوات</small><strong id="k-live">—</strong></div>
<div class="stat"><small>الأفلام</small><strong id="k-movie">—</strong></div>
<div class="stat"><small>المسلسلات</small><strong id="k-series">—</strong></div>
</div>
<div class="grid">
<div class="panel"><h3>حالة السيرفر</h3>
<div class="row"><span class="muted">خدمة STREAM</span><strong id="home-api">جار الفحص</strong></div>
<div class="row"><span class="muted">محرك MediaMTX</span><strong id="home-media">جار الفحص</strong></div>
<div class="row"><span class="muted">مسارات HLS النشطة</span><strong id="home-paths">—</strong></div>
<div class="row"><span class="muted">جلسات HLS</span><strong id="home-sessions">—</strong></div></div>
<div class="panel"><h3>حالة المشتركين</h3>
<div class="row"><span class="muted">حسابات Xtream المفعلة</span><strong id="home-accounts">—</strong></div>
<div class="row"><span class="muted">الأجهزة المفعلة</span><strong id="home-devices">—</strong></div>
<div class="row"><span class="muted">المصادر المتصلة</span><strong id="home-online">—</strong></div>
<div class="row"><span class="muted">الارتباط بالنظام الرئيسي</span><strong id="home-bridge">جار الفحص</strong></div></div></div>
</section>
<section class="view" id="page-sources">
<div class="heading"><div><h2>إدارة المصادر</h2><p>إضافة المصادر واختبارها ومزامنتها والتحكم بنشرها من هذه اللوحة.</p></div><button class="btn" id="toggle-source-form">＋ إضافة مصدر</button></div>
<div class="panel" id="source-form-panel" hidden><h3>إضافة مصدر Xtream</h3><p class="muted">بيانات الدخول تُرسل مشفرة أثناء الاتصال وتحفظ في قاعدة الإدارة الرئيسية، ولا تُخزن في STREAM.</p>
<form id="source-form"><div class="formgrid">
<div class="field"><label for="source-name">اسم المصدر</label><input id="source-name" name="name" required maxlength="160"></div>
<div class="field"><label for="source-url">عنوان السيرفر</label><input id="source-url" name="baseUrl" placeholder="https://server.example:8080" required maxlength="600"></div>
<div class="field"><label for="source-user">اسم المستخدم</label><input id="source-user" name="username" required autocomplete="off" maxlength="512"></div>
<div class="field"><label for="source-pass">كلمة المرور</label><input id="source-pass" name="password" type="password" required autocomplete="off" maxlength="1024"></div>
<div class="field full"><label><input type="checkbox" name="rightsConfirmed" required> أؤكد أن لدي الحق في استخدام هذا المصدر وإعادة بث محتواه ضمن صلاحيات اشتراكي.</label></div>
</div><div class="actions"><button class="btn" type="submit">حفظ المصدر</button><button class="btn secondary" id="cancel-source" type="button">إلغاء</button></div></form>
</div>
<div class="panel"><div class="controls"><h3>مصادر السيرفر</h3><button class="btn secondary sm" id="reload-sources">تحديث القائمة</button></div><div class="tablewrap"><table><thead><tr><th>المصدر</th><th>الحالة</th><th>المحتوى</th><th>التحكم</th></tr></thead><tbody id="source-list"></tbody></table></div></div>
</section>
<section class="view" id="page-restream">
<div class="heading"><div><h2>إعادة البث</h2><p>مراقبة محرك MediaMTX وفحص بث المصادر الفعلية.</p></div></div>
<div class="cards"><div class="stat"><small>محرك الوسائط</small><strong id="stream-engine">—</strong></div>
<div class="stat"><small>مسارات جاهزة</small><strong id="stream-paths">—</strong></div>
<div class="stat"><small>جلسات HLS</small><strong id="stream-sessions">—</strong></div>
<div class="stat"><small>مصادر متصلة</small><strong id="stream-online">—</strong></div></div>
<div class="panel"><h3>فحص تشغيل المصدر</h3><p class="muted">اختبار طلبات وسائط حقيقية من مزودك، وليس مجرد اتصال API. نجاح العينة لا يعني نجاح كل المحتوى.</p>
<div class="inline"><select id="stream-source" aria-label="المصدر"></select>
<select id="stream-type" aria-label="نوع المحتوى"><option value="live">القنوات</option><option value="movie">الأفلام</option><option value="series">المسلسلات</option><option value="episode">الحلقات</option></select>
<button class="btn" id="stream-probe">▶ فحص تشغيل المصدر</button></div>
<pre id="stream-report" class="log">اختر مصدرًا لتنفيذ فحص الوسائط.</pre>
</div>
<div class="panel"><h3>إعادة بث قناة حقيقية</h3><p class="muted">اختر قناة من المكتبة، ثم فعّل مسار HLS محميًا للمشرف. يبدأ FFmpeg عند المشاهدة ويتوقف بعد انتهاء الطلب. لا يتم نقل المشتركين تلقائيًا.</p>
<div class="inline">
<select id="live-source" aria-label="المصدر الفعلي"></select>
<input id="live-search" placeholder="بحث عن قناة..." maxlength="85" aria-label="بحث عن القناة">
<button class="btn secondary" id="live-find" type="button">بحث القنوات</button>
</div>
<div class="inline" style="margin-top:12px">
<select id="live-channel" aria-label="القناة المراد تشغيلها"><option value="">حدد قناة من البحث</option></select>
<label><input id="live-rights" type="checkbox"> أملك صلاحية إعادة بث هذه القناة</label>
<button class="btn" id="live-start" type="button">▶ بدء إعادة البث</button>
</div>
<div class="inline" style="margin-top:15px">
<select id="live-backup-source" aria-label="المصدر الاحتياطي">
<option value="">بدون مصدر احتياطي</option></select>
<input id="live-backup-search" placeholder="بحث عن قناة احتياطية مطابقة..." maxlength="85">
<button class="btn secondary" type="button" id="live-backup-find">بحث البديل</button>
</div>
<div class="inline" style="margin-top:12px"><select id="live-backup-channel" aria-label="القناة الاحتياطية">
<option value="">بدون قناة احتياطية</option></select></div>
<p class="muted" style="margin-top:10px">المصدر الاحتياطي اختياري. اختر نفس القناة من مصدر تملك صلاحية بثه. يتحول النظام إليه إذا فشلت استجابة المصدر الأساسي. الحد: 3 مسارات متزامنة.</p>
</div>
<div class="panel"><div class="controls"><h3>قنوات يعيد بثها السيرفر الآن</h3><button class="btn secondary sm" id="live-reload" type="button">تحديث</button></div>
<div class="tablewrap"><table><thead><tr><th>القناة</th><th>المسار</th><th>الاتصالات</th><th>الإجراءات</th></tr></thead><tbody id="live-active"></tbody></table></div>
<video id="live-preview" controls playsinline preload="none" style="display:none;width:min(100%,850px);margin:16px 0;border-radius:10px;background:black" aria-label="معاينة القناة"></video>
<pre id="live-result" class="log">اختر قناة من مكتبتك ثم ابدأ إعادة البث.</pre>
</div><div class="panel"><h3>وضع خدمة إعادة البث</h3><p id="stream-note" class="muted">تُقرأ الحالة من MediaMTX؛ لن تظهر قنوات نشطة لم يتم ربطها فعليًا.</p></div>
</section>
<section class="view" id="page-library">
<div class="heading"><div><h2>المكتبة</h2><p>تصفح القنوات والأفلام والمسلسلات المخزنة في الفهرس الحقيقي.</p></div></div>
<div class="panel"><div class="controls"><div class="inline">
<select id="library-type" aria-label="نوع الوسائط"><option value="live">القنوات</option><option value="movie">الأفلام</option><option value="series">المسلسلات</option></select>
<select id="library-source" aria-label="المصدر"><option value="">جميع المصادر</option></select>
<input id="library-search" placeholder="ابحث باسم القناة أو الفيلم..." maxlength="85">
<button class="btn" id="library-submit">بحث</button></div></div>
<div class="tablewrap"><table><thead><tr><th>الاسم</th><th>المصدر</th><th>القسم</th><th>الحالة</th><th>المعاينة</th></tr></thead><tbody id="library-results"></tbody></table></div>
<div class="actions"><button class="btn secondary sm" id="library-more" hidden>عرض المزيد</button></div></div>
<div class="panel" id="vod-panel" hidden><h3>معاينة فيلم أو حلقة حقيقية</h3>
<p class="muted" id="vod-selected">اختر عنصرًا من المكتبة.</p>
<div class="inline" id="vod-episodes-wrap" hidden>
<select id="vod-episode" aria-label="الحلقة"></select>
</div>
<label class="inline" style="margin:12px 0"><input type="checkbox" id="vod-rights">
أؤكد أن لدي الحق في تشغيل هذا المحتوى ومعاينته.</label>
<div class="actions"><button class="btn" id="vod-play" type="button">▶ تشغيل المعاينة</button>
<button class="btn secondary" id="vod-close" type="button">إغلاق</button></div>
<video id="vod-player" controls playsinline preload="metadata" style="width:min(100%,850px);background:#000;border-radius:11px;margin:14px 0;display:none" aria-label="مشغل الفيلم أو الحلقة"></video>
<pre id="vod-report" class="log">لن نعرض روابط أو كلمات مرور المصادر في المتصفح.</pre>
</div>
</section>
<section class="view" id="page-accounts">
<div class="heading"><div><h2>المشتركون</h2><p>حسابات Xtream الفعلية، والصلاحيات والتواريخ من قاعدة البيانات الرئيسية.</p></div><button class="btn" id="toggle-account-form">＋ حساب جديد</button></div>
<div class="panel" id="account-form-panel" hidden><h3>إنشاء حساب مشترك</h3><form id="account-form"><div class="formgrid">
<div class="field"><label for="account-label">اسم العميل</label><input id="account-label" name="label" maxlength="120" required></div>
<div class="field"><label for="account-source">المصدر</label><select id="account-source" name="sourceId"><option value="">جميع المصادر المنشورة</option></select></div>
<div class="field"><label for="account-max">أقصى اتصالات</label><input id="account-max" name="maxConnections" type="number" min="1" max="20" value="1" required></div>
<div class="field"><label for="account-expire">تاريخ الانتهاء</label><input id="account-expire" name="expiresAt" type="date" required></div>
</div><button class="btn" type="submit">إنشاء الحساب</button></form><div id="account-secret" class="accountsecret" hidden></div></div>
<div class="panel"><div class="controls"><h3>الحسابات المسجلة</h3>
<div class="inline"><input id="account-search" placeholder="بحث باسم العميل أو اليوزر" aria-label="بحث المشتركين" style="max-width:270px">
<select id="account-status-filter" aria-label="الحالة" style="max-width:150px"><option value="">جميع الحالات</option>
<option value="active">ساري</option><option value="expired">منتهي</option><option value="disabled">موقوف</option></select>
<button class="btn secondary sm" id="reload-accounts">↻ تحديث</button></div></div>
<p class="muted">الهوست: <strong class="num">https://blofyplayer.com</strong> · كلمات المرور السابقة محفوظة كبصمات آمنة، ولا يمكن عرضها. إعادة الضبط تولّد كلمة جديدة وتوقف القديمة.</p>
<div class="tablewrap"><table><thead><tr><th>المشترك واليوزر</th><th>المصدر</th><th>الحالة / المدة</th><th>تاريخ التفعيل والانتهاء</th><th>الهوست / M3U</th><th>التحكم</th></tr></thead><tbody id="account-list"></tbody></table></div>
<div class="inline" style="justify-content:space-between;margin-top:13px"><span id="accounts-pagination" class="muted">—</span>
<button class="btn secondary sm" id="accounts-next" type="button" hidden>المزيد من المشتركين</button></div>
<div id="account-detail" class="accountsecret" hidden style="margin-top:15px"></div></div></section>
<section class="view" id="page-codes">
<div class="heading"><div><h2>أكواد الاشتراكات</h2><p>أكواد التطبيق تُفعّل داخل BLOFY STREAM فقط: خانة كود واحدة والهوست داخلي، ولا يستطيع العميل استخراج حساب Xtream من صفحة الويب. المدة تبدأ عند أول تفعيل.</p></div></div>
<div class="cards" style="margin-bottom:15px">
<div class="stat"><small>إجمالي الأكواد</small><strong id="codes-total">—</strong></div>
<div class="stat"><small>بانتظار التفعيل</small><strong id="codes-unused">—</strong></div>
<div class="stat"><small>تم تفعيلها</small><strong id="codes-redeemed">—</strong></div>
<div class="stat"><small>ملغاة</small><strong id="codes-revoked">—</strong></div></div>
<div class="grid"><div class="panel"><h3>المبيعات اليدوية المسجلة</h3>
<div class="row"><span class="muted">عدد الأكواد المباعة</span><strong id="codes-sold-count">—</strong></div>
<div class="row"><span class="muted">إجمالي الإيراد المسجل</span><strong id="codes-sales-sar">—</strong></div>
<p class="muted">هذه إحصاءات تسجيل يدوي من لوحة الإدارة، وليست مبالغ مؤكدة من بوابة دفع.</p></div>
<div class="panel"><h3>إدارة الأجهزة وتجديد الاشتراكات</h3>
<div class="row"><span class="muted">تستحق الانتهاء خلال 7 أيام</span><strong id="codes-expiring">—</strong></div>
<div class="row"><span class="muted">نقل جهاز الاشتراك</span><strong id="codes-transfers">—</strong></div>
<p class="muted">زر «نقل الجهاز» يولّد كود استعادة جديدًا ويبطل جلسة الجهاز القديم، <b>دون بدء مدة جديدة</b>.</p>
</div></div>
<div class="panel"><h3>إصدار أكواد جديدة</h3>
<p class="muted">الأكواد الجديدة أرقام فقط، تبدأ بـ8 أرقام وتزيد تلقائيًا مع كثرة الإصدار. العدد المبدئي كود واحد، وتقدر تزيده تدريجيًا حتى 20 كودًا في الدفعة. تظهر الأكواد كاملة مرة واحدة عند إنشائها فقط.</p>
<form id="codes-form"><div class="formgrid">
<div class="field"><label for="codes-label">الباقة / وصف الاشتراك</label><input id="codes-label" name="label" maxlength="100" value="BLOFY STREAM" required></div>
<div class="field"><label for="codes-channel">نوع الكود</label><select id="codes-channel" name="channel"><option value="app" selected>تطبيق BLOFY STREAM فقط</option><option value="xtream">Xtream خارجي (قديم)</option></select></div>
<div class="field"><label for="codes-duration">المدة بالأيام</label><select id="codes-duration" name="durationDays" required>
<option value="1">يوم</option><option value="7">7 أيام</option><option value="30" selected>30 يومًا</option>
<option value="90">3 أشهر (90 يومًا)</option><option value="180">6 أشهر (180 يومًا)</option>
<option value="365">سنة (365 يومًا)</option><option value="730">سنتان (730 يومًا)</option></select></div>
<div class="field"><label for="codes-quantity">عدد الأكواد</label><input id="codes-quantity" name="quantity" type="number" min="1" max="20" value="1" required></div>
<div class="field"><label for="codes-source">المصدر</label><select id="codes-source" name="sourceId"><option value="">جميع المصادر المنشورة</option></select></div>
<div class="field"><label for="codes-connections">أقصى الاتصالات</label><input id="codes-connections" name="maxConnections" type="number" min="1" max="20" value="1" required></div>
</div><div class="actions" style="margin-top:15px"><button class="btn" type="submit">إصدار الأكواد</button></div></form>
<div id="codes-issued" class="accountsecret" style="margin-top:12px" hidden></div>
 <p class="muted" style="margin-top:12px">مهم: الأكواد السابقة تظهر مخفية في السجل لحماية العملاء، ولا يمكن استعادة رقمها الكامل من التخزين القديم. الأكواد التي تُصدرها الآن يمكن نسخها من نتيجة الإصدار ومن السجل خلال بقاء الصفحة مفتوحة.</p></div>
<div class="panel"><div class="controls"><h3>سجل الأكواد</h3><button class="btn secondary sm" id="reload-codes" type="button">↻ تحديث</button></div>
<div class="tablewrap"><table><thead><tr><th>الوصف / نوع الاشتراك</th><th>الكود / النسخ</th><th>المدة</th><th>الحالة</th><th>المبيعات</th><th>وقت التفعيل</th><th>انتهاء الاشتراك</th><th>التحكم</th></tr></thead>
<tbody id="codes-list"></tbody></table></div>
<div class="inline" style="justify-content:space-between;margin-top:13px"><span id="codes-pagination" class="muted">—</span>
<button class="btn secondary sm" id="codes-next" type="button" hidden>المزيد من الأكواد</button></div>
</div></section>
<section class="view" id="page-diagnostics"><div class="heading"><div><h2>الفحص والصيانة</h2><p>تشخيص المصادر ومحرك البث بدون تعديل محتوى المشتركين.</p></div></div>
<div class="panel"><h3>فحص المصدر</h3><div class="inline"><select id="diagnostic-source"></select>
<select id="diagnostic-type"><option value="live">القنوات</option><option value="movie">الأفلام</option><option value="series">المسلسلات</option><option value="episode">الحلقات</option></select>
<button class="btn" id="diagnostic-test">فحص اتصال المصدر</button>
<button class="btn secondary" id="diagnostic-media">فحص الوسائط</button>
</div><pre id="diagnostic-output" class="log">نتائج فحوص الوسائط ستظهر هنا.</pre></div>
<div class="panel"><div class="controls"><h3>العناصر التي أعاد المزود لها 404</h3>
<button id="diagnostic-failures-reload" class="btn secondary sm" type="button">↻ تحديث الحالات</button></div>
<p class="muted">إحصاءات مسجلة من فحوص التشغيل الحقيقية. عدم وجود سجل لا يعني أن جميع عناصر المكتبة تعمل.</p>
<div class="tablewrap"><table><thead><tr><th>المصدر</th><th>النوع</th><th>الحالة</th><th>العناصر</th><th>تستحق إعادة الفحص</th></tr></thead>
<tbody id="diagnostic-failures"></tbody></table></div></div>
</section><footer>BLOFY STREAM · لوحة واحدة لبيانات السيرفر والمصادر والعملاء · جميع الأرقام من الخدمات الفعلية</footer>
</main></div></div>
<script nonce="__NONCE__">
"use strict";
(function(){
  var $=function(id){return document.getElementById(id)};
  var tabs={home:"الرئيسية",sources:"المصادر",restream:"إعادة البث",library:"المكتبة",accounts:"المشتركون",codes:"أكواد الاشتراك",diagnostics:"الفحص والصيانة"};
  var state={overview:null,engine:null,accounts:[],accountsNext:null,accountsOffset:0,codes:[],codesOffset:0,codesNext:null,libOffset:0,libParams:null,
    vodSelected:null};
  var formatter=new Intl.NumberFormat('en-US');
  function show(text,ok){var n=$("notice");n.hidden=false;n.textContent=text;n.className="status "+(ok?"good":"bad");}
  function count(n){return n===null||n===undefined?"—":formatter.format(n)}
  function value(id,text){$(id).textContent=text}
  function node(tag,text,className){var e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;return e}
  function cell(row,content){var td=node("td");if(typeof content==="string")td.textContent=content;else td.appendChild(content);row.appendChild(td);return td}
  function button(text,handler,cls){var b=node("button",text,"btn sm "+(cls||"secondary"));b.type="button";b.addEventListener("click",handler);return b}
  function select(id,sources,first){var el=$(id),old=el.value;el.replaceChildren();if(first){var z=node("option",first);z.value="";el.appendChild(z)}
    sources.forEach(function(s){var o=node("option",s.name);o.value=s.id;el.appendChild(o)});
    if(Array.from(el.options).some(function(o){return o.value===old}))el.value=old;
  }
  function tab(id){if(!tabs[id])return;document.querySelectorAll(".view").forEach(function(x){x.classList.toggle("active",x.id==="page-"+id)});
    document.querySelectorAll(".navlink").forEach(function(x){x.classList.toggle("active",x.dataset.tab===id)});
    $("title").textContent=tabs[id];if(id==="library"&&!state.libParams)loadCatalog(false);
    if(id==="accounts")loadAccounts(false);if(id==="codes")loadCodes(false);window.scrollTo({top:0,behavior:"instant"});
  }
  document.querySelectorAll("[data-tab]").forEach(function(e){e.addEventListener("click",function(){tab(e.dataset.tab)})});
  document.querySelectorAll("[data-go]").forEach(function(e){e.addEventListener("click",function(){tab(e.dataset.go)})});
  async function api(path){var r=await fetch("/operator/api/"+path,{cache:"no-store",credentials:"same-origin"});var d=await r.json();
    if(!r.ok||d.ok===false)throw Error(d.code||d.error||"HTTP "+r.status);return d}
  async function action(path,header,data){var r=await fetch("/operator/api/"+path,{method:"POST",credentials:"same-origin",
      headers:{"content-type":"application/json","x-blofy-operator-action":header},body:JSON.stringify(data||{})});
    var d=await r.json();if(!r.ok||d.ok===false)throw Error(d.code||d.error||"HTTP "+r.status);return d}
  function stateLabel(s){if(s.status==="online")return "متصل";if(s.status==="offline")return "متوقف";if(s.status==="syncing"||s.syncing)return "جار المزامنة";return s.status||"غير معروف"}
  function renderHome(){
    var d=state.overview,e=state.engine;
    if(d){var t=d.totals||{},s=d.subscribers||{};
      value("k-sources",count(t.servers));value("k-live",count(t.live));value("k-movie",count(t.movie));value("k-series",count(t.series));
      value("home-online",count(t.online));value("stream-online",count(t.online));
      value("home-accounts",count(s.gateway&&s.gateway.active));value("home-devices",count(s.devices&&s.devices.active));
      value("home-bridge","متصل");$("system-pill").textContent="النظام متصل";$("system-pill").className="pill good";
      renderSources();
    }else{$("system-pill").textContent="النظام غير متصل";$("system-pill").className="pill bad";value("home-bridge","غير متصل")}
    if(e){
      var m=e.mediaControl||{},ready=e.engine&&e.engine.reachable;
      value("home-api","ONLINE");value("home-media",ready?"ONLINE":"غير متصل");
      value("home-paths",count(m.activePaths));value("home-sessions",count(m.hlsSessions));
      value("stream-engine",ready?"ONLINE":"غير متصل");value("stream-paths",count(m.activePaths));
      value("stream-sessions",count(m.hlsSessions));
      value("stream-note",m.controlAvailable?"المحرك متصل. المسارات النشطة تخص MediaMTX فقط، ولا تعني تحويل المشتركين إليه.":"واجهة محرك البث غير متاحة. الحالة غير مؤكدة.");
    }
  }
  function renderSources(){
    var sources=(state.overview&&state.overview.sources)||[];
    ["stream-source","diagnostic-source","library-source","account-source","codes-source","live-source","live-backup-source"].forEach(function(id){
      select(id,(id==="account-source"||id==="codes-source")?sources.filter(function(s){return s.enabled&&s.publishCatalog}):sources,
        id==="library-source"?"جميع المصادر":(id==="account-source"||id==="codes-source")?"جميع المصادر المنشورة":id==="live-backup-source"?"بدون مصدر احتياطي":null);
    });
    var tb=$("source-list");tb.replaceChildren();
    if(!sources.length){var r=node("tr");var c=cell(r,"لا توجد مصادر مسجلة");c.colSpan=4;tb.appendChild(r);return}
    sources.forEach(function(s){
      var row=node("tr");var name=node("div");name.appendChild(node("div",s.name,"name"));
      name.appendChild(node("div",s.id.slice(0,8),"meta"));cell(row,name);
      var status=node("div",stateLabel(s),s.status==="online"?"ok":"warn");
      status.appendChild(node("div",s.enabled?"مفعل":"موقوف","meta"));cell(row,status);
      cell(row,count(s.counts.live)+" قناة · "+count(s.counts.movie)+" فيلم · "+count(s.counts.series)+" مسلسل");
      var controls=node("div",undefined,"actions");
      controls.appendChild(button("اختبار",function(){doSource(s.id,"test")}));
      controls.appendChild(button("مزامنة",function(){doSource(s.id,"sync")}));
      controls.appendChild(button("فحص فيديو",function(){doSource(s.id,"probe",{type:"live"})}));
      controls.appendChild(button(s.enabled?"إيقاف":"تفعيل",function(){
        if(!confirm(s.enabled?"إيقاف هذا المصدر قد يؤثر على المشتركين. تأكيد؟":"تفعيل هذا المصدر؟"))return;
        doSource(s.id,s.enabled?"pause":"resume");
      },s.enabled?"danger":"secondary"));
      controls.appendChild(button(s.publishCatalog?"إخفاء":"نشر",function(){
        if(!confirm("تأكيد تغيير نشر هذا المصدر للمشتركين؟"))return;
        doSource(s.id,s.publishCatalog?"unpublish":"publish");
      }));
      cell(row,controls);tb.appendChild(row);
    });
  }
  async function refresh(){try{var results=await Promise.allSettled([api("overview"),api("state")]);
    if(results[0].status==="fulfilled")state.overview=results[0].value;
    else{state.overview=null;show("تعذر جلب المصادر: "+results[0].reason.message,false)}
    if(results[1].status==="fulfilled")state.engine=results[1].value;else state.engine=null;
    renderHome();
  }catch(e){show(e.message,false)}}
  async function doSource(id,cmd,body){try{var d=await action("source/"+id+"/"+cmd,"source-"+cmd,body||{});
    if(cmd==="probe"){show("وصلت نتيجة فحص الوسائط. راجع التشخيص.",true);
      $("diagnostic-output").textContent=JSON.stringify(d,null,2);tab("diagnostics")}
    else show(cmd==="sync"?"بدأت مزامنة فهرس المصدر.":"تم تنفيذ الأمر على المصدر.",true);
    await refresh();return d;
  }catch(e){show("تعذر تنفيذ الأمر: "+e.message,false);return null;}}
  $("refresh").addEventListener("click",refresh);
  $("reload-sources").addEventListener("click",refresh);
  $("toggle-source-form").addEventListener("click",function(){$("source-form-panel").hidden=!$("source-form-panel").hidden});
  $("cancel-source").addEventListener("click",function(){$("source-form-panel").hidden=true});
  $("source-form").addEventListener("submit",async function(e){e.preventDefault();
    var data=Object.fromEntries(new FormData(this));data.rightsConfirmed=data.rightsConfirmed==="on";
    var b=this.querySelector('button[type="submit"]');b.disabled=true;
    try{await action("sources","source-add",data);show("تم حفظ المصدر. استخدم الاختبار والمزامنة لتحديث بياناته.",true);
      this.reset();$("source-form-panel").hidden=true;await refresh();}
    catch(err){show("تعذر إضافة المصدر: "+err.message,false)}
    finally{b.disabled=false}
  });
  async function loadCatalog(more){
    var type=$("library-type").value,serverId=$("library-source").value,q=$("library-search").value.trim();
    var params={type:type,serverId:serverId,q:q};
    if(!more||!state.libParams||JSON.stringify(params)!==JSON.stringify(state.libParams)){
      state.libOffset=0;state.libParams=params;$("library-results").replaceChildren();
    }
    var query=new URLSearchParams({type:type,serverId:serverId,q:q,offset:String(state.libOffset)});
    try{var d=await api("catalog?"+query.toString());var items=d.items||[];
      if(!more&&items.length===0){var tr=node("tr");var td=cell(tr,"لا يوجد محتوى مطابق");td.colSpan=5;$("library-results").appendChild(tr)}
      items.forEach(function(item){var tr=node("tr");cell(tr,item.name);
        var src=(state.overview&&state.overview.sources||[]).find(function(x){return x.id===item.serverId});
        cell(tr,src?src.name:item.serverId);cell(tr,item.categoryName||"—");
        cell(tr,item.enabled?"مفعل":"موقوف");
        var controls=node("div",undefined,"actions");
        if(item.enabled&&(item.type==="movie"||item.type==="series")){
          controls.appendChild(button(item.type==="movie"?"معاينة فيلم":"عرض الحلقات",
            function(){prepareVod(item)}));
        }
        cell(tr,controls);
        $("library-results").appendChild(tr)});
      state.libOffset=d.nextOffset||0;$("library-more").hidden=!d.nextOffset;
    }catch(e){show("تعذر تحميل المكتبة: "+e.message,false)}
  }
  async function prepareVod(item){
    state.vodSelected=item;
    $("vod-panel").hidden=false;$("vod-rights").checked=false;
    var video=$("vod-player");video.pause();video.removeAttribute("src");video.load();
    video.style.display="none";$("vod-report").textContent="حدد العنصر ووافق على صلاحية المعاينة.";
    $("vod-episodes-wrap").hidden=item.type!=="series";
    $("vod-selected").textContent=item.type==="movie"?
      "معاينة الفيلم: "+item.name:"اختيار حلقة من مسلسل: "+item.name;
    $("vod-episode").replaceChildren();
    if(item.type==="series"){
      $("vod-report").textContent="جار قراءة الحلقات المفهرسة...";
      try{
        var params=new URLSearchParams({sourceId:item.serverId,seriesId:item.id});
        var episodes=await api("episodes?"+params.toString());
        (episodes.items||[]).forEach(function(e){
          var option=node("option","حلقة "+e.id+" · "+e.extension);option.value=e.id;
          $("vod-episode").appendChild(option);
        });
        $("vod-report").textContent=episodes.items.length?
          "اختر الحلقة، ثم وافق على الصلاحية واضغط تشغيل.":"لا توجد حلقات مفهرسة لهذا المسلسل بعد.";
      }catch(e){$("vod-report").textContent="تعذر قراءة الحلقات: "+e.message}
    }
    $("vod-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  $("vod-close").addEventListener("click",function(){
    var video=$("vod-player");video.pause();video.removeAttribute("src");video.load();
    video.style.display="none";$("vod-panel").hidden=true;state.vodSelected=null;
  });
  $("vod-play").addEventListener("click",async function(){
    var item=state.vodSelected;
    if(!item){show("اختر فيلمًا أو مسلسلًا من المكتبة.",false);return}
    if(!$("vod-rights").checked){show("تأكيد صلاحية معاينة المحتوى مطلوب.",false);return}
    var type=item.type==="series"?"episode":"movie";
    var itemId=type==="episode"?$("vod-episode").value:item.id;
    if(!itemId){show("حدد الحلقة أولًا.",false);return}
    this.disabled=true;$("vod-report").textContent="جار طلب الرابط المحمي من السيرفر...";
    try{
      var info=await action("vod","vod-create",{type,sourceId:item.serverId,itemId,
        rightsConfirmed:true});
      var video=$("vod-player");video.src=info.playerUrl;
      video.style.display="block";video.load();
      $("vod-report").textContent=info.browserPlayable?
        "تم تجهيز رابط المعاينة المحمي. اضغط تشغيل للفيديو.":
        "تم تجهيز المحتوى، لكن صيغة "+info.extension+" قد لا تعمل داخل المتصفح. يلزم مشغل يدعم هذه الصيغة.";
      show("تم تجهيز معاينة حقيقية من مصدر المحتوى.",true);
    }catch(e){$("vod-report").textContent="تعذر بدء المعاينة: "+e.message;show(e.message,false)}
    finally{this.disabled=false}
  });
  $("library-submit").addEventListener("click",function(){loadCatalog(false)});
  $("library-more").addEventListener("click",function(){loadCatalog(true)});
  $("library-search").addEventListener("keydown",function(e){if(e.key==="Enter")loadCatalog(false)});
  function dateTime(value){
    if(!value)return "—";
    return new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Riyadh",
      year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
  }
  function attachCopy(target,label,data){
    var line=node("div",undefined,"row");var title=node("span",label,"muted");
    var val=node("strong",data||"—","num");val.style.maxWidth="65%";val.style.overflowWrap="anywhere";
    line.appendChild(title);line.appendChild(val);
    if(data){line.appendChild(button("نسخ",async function(){
      try{await navigator.clipboard.writeText(String(data));show("تم النسخ.",true)}
      catch{show("حدد النص وانسخه يدويًا.",false)}
    }));}
    target.appendChild(line);
  }
  function showCredentials(target,creds,label){
    target.hidden=false;target.replaceChildren();
    target.appendChild(node("strong",label||"بيانات الاشتراك — احفظها الآن"));
    var host=creds.serverUrl||"https://blofyplayer.com";
    var m3u=creds.m3uUrl||(
      host+"/get.php?"+new URLSearchParams({username:creds.username||"",
      password:creds.password||"",type:"m3u_plus",output:"ts"}).toString());
    attachCopy(target,"الهوست",host);
    attachCopy(target,"اليوزر",creds.username||"");
    attachCopy(target,"الباسورد (يظهر مرة واحدة)",creds.password||"");
    attachCopy(target,"M3U",creds.password?m3u:"");
  }
  function renderAccounts(){
    var tb=$("account-list");tb.replaceChildren();
    var q=$("account-search").value.trim().toLowerCase();
    var filter=$("account-status-filter").value;
    var selected=state.accounts.filter(function(a){
      return (!filter||a.status===filter)&&
        (!q||[a.label,a.username,a.sourceName,a.sourceId].some(function(v){return String(v||"").toLowerCase().includes(q)}));
    });
    if(!selected.length){var tr=node("tr");var empty=cell(tr,"لا توجد حسابات مطابقة");empty.colSpan=6;tb.appendChild(tr);}
    selected.forEach(function(a){
      var tr=node("tr"),who=node("div");
      who.appendChild(node("div",a.label,"name"));
      who.appendChild(node("div",a.username,"meta num"));cell(tr,who);
      cell(tr,a.sourceName||a.sourceId||"جميع المصادر");
      var status=a.status==="active"?"ساري":a.status==="expired"?"منتهي":"موقوف";
      var line=node("div");line.appendChild(node("strong",status,
        a.status==="active"?"ok":a.status==="expired"?"fail":"warn"));
      line.appendChild(node("div",String(a.maxConnections||1)+" اتصال"+
        (a.durationDays?" · "+a.durationDays+" يوم":" · اشتراك يدوي"),"meta"));
      cell(tr,line);
      var dates=node("div");
      dates.appendChild(node("div","بدأ: "+dateTime(a.activatedAt||a.createdAt),"meta"));
      dates.appendChild(node("div","ينتهي: "+dateTime(a.expiresAt),"meta"));
      if(a.lastUsedAt)dates.appendChild(node("div","آخر استخدام: "+dateTime(a.lastUsedAt),"meta"));
      cell(tr,dates);
      var urls=node("div");
      urls.appendChild(node("div","https://blofyplayer.com","meta num"));
      urls.appendChild(node("div","M3U: يحتاج كلمة المرور","meta"));
      urls.appendChild(button("نسخ الهوست",function(){
        navigator.clipboard.writeText("https://blofyplayer.com")
          .then(function(){show("تم نسخ الهوست.",true)})
          .catch(function(){show("حدد الهوست وانسخه يدويًا.",false)});
      }));
      cell(tr,urls);
      var ctl=node("div",undefined,"actions");
      ctl.appendChild(button(a.enabled?"تعطيل":"تفعيل",async function(){
        if(!confirm("هل تريد تغيير حالة هذا المشترك؟"))return;
        try{await action("account/"+a.id+"/"+(a.enabled?"disable":"enable"),
          "account-"+(a.enabled?"disable":"enable"),{});
          show("تم تحديث المشترك.",true);await loadAccounts(false)}
        catch(e){show("تعذر تحديث المشترك: "+e.message,false)}
      },a.enabled?"danger":"secondary"));
      ctl.appendChild(button("عرض بيانات الدخول",async function(){
        try{
          var d=await api("account/"+a.id+"/credentials");
          if(!d.credentials||!d.credentials.password)throw Error("لا توجد بيانات محفوظة");
          showCredentials($("account-detail"),d.credentials,
            "بيانات "+a.username+" — الهوست واليوزر والباسورد وM3U");
          $("account-detail").scrollIntoView({behavior:"smooth",block:"center"});
        }catch(e){show(a.passwordAvailable?
          "تعذر عرض البيانات: "+e.message:
          "هذا الحساب قديم ولم تُحفظ كلمة مروره. استخدم إعادة تعيين الباسورد إذا رغبت في بيانات جديدة.",false)}
      }));
      ctl.appendChild(button("إعادة تعيين الباسورد",async function(){
        if(!confirm("سيتم إلغاء كلمة المرور القديمة فورًا! هل أنت متأكد؟"))return;
        try{var d=await action("account/"+a.id+"/reset","account-reset",{});
          if(!d.credentials||!d.credentials.password)throw Error("لا توجد بيانات جديدة");
          showCredentials($("account-detail"),d.credentials,
            "بيانات "+a.username+" الجديدة — احفظها وشاركها مع العميل مرة واحدة");
          $("account-detail").scrollIntoView({behavior:"smooth",block:"center"});
          show("تم تعيين كلمة مرور جديدة. لم تعد القديمة تعمل.",true)}
        catch(e){show("تعذر إعادة التعيين: "+e.message,false)}
      }));
      cell(tr,ctl);tb.appendChild(tr);
    });
    $("accounts-pagination").textContent="المعروض "+state.accounts.length+" من "+(state.accountsTotal||state.accounts.length);
    $("accounts-next").hidden=state.accountsNext===null;
  }
  async function loadAccounts(more){
    try{
      var offset=more?state.accountsNext||0:0;
      var d=await api("accounts?offset="+offset);
      state.accounts=more?state.accounts.concat(d.items||[]):d.items||[];
      state.accountsNext=d.nextOffset===undefined?null:d.nextOffset;
      state.accountsTotal=d.total;
      renderAccounts();
    }catch(e){show("تعذر تحميل المشتركين: "+e.message,false)}
  }
  $("reload-accounts").addEventListener("click",function(){loadAccounts(false)});
  $("accounts-next").addEventListener("click",function(){loadAccounts(true)});
  $("account-search").addEventListener("input",renderAccounts);
  $("account-status-filter").addEventListener("change",renderAccounts);
  $("toggle-account-form").addEventListener("click",function(){
    $("account-form-panel").hidden=!$("account-form-panel").hidden;
    $("account-secret").hidden=true;
  });
  $("account-form").addEventListener("submit",async function(e){
    e.preventDefault();var data=Object.fromEntries(new FormData(this));
    var submit=this.querySelector('button[type="submit"]');submit.disabled=true;
    try{
      var result=await action("accounts","account-add",data);
      var credentials=result.credentials||{};
      showCredentials($("account-secret"),credentials,
        "تم إنشاء الحساب. احفظ بيانات الهوست واليوزر والباسورد وM3U الآن.");
      this.reset();show("تم إنشاء حساب حقيقي.",true);await loadAccounts(false);
    }catch(err){show("تعذر إنشاء الحساب: "+err.message,false)}
    finally{submit.disabled=false}
  });
  // Newly issued plaintext is held in memory in this operator tab only.
  // The database persists irreversible code proofs. Never write plaintext to
  // localStorage, sessionStorage, URL parameters or the shared code ledger.
  var recentlyIssuedCodes=new Map();
  async function loadCodes(more){
    try{
      var offset=more?state.codesNext||0:0;
      var d=await api("codes?offset="+offset);
      state.codes=more?state.codes.concat(d.items||[]):d.items||[];
      state.codesNext=d.nextOffset===undefined?null:d.nextOffset;
      var totals=d.totals||{};
      value("codes-total",count(totals.total));value("codes-unused",count(totals.unused));
      value("codes-redeemed",count(totals.redeemed));value("codes-revoked",count(totals.revoked));
      renderCodes();
      void api("sales-summary").then(function(summary){
        value("codes-sold-count",count(summary.sold));
        value("codes-sales-sar",
          (Number(summary.recorded_revenue_halalas||0)/100).toLocaleString("en-US",
            {minimumFractionDigits:2,maximumFractionDigits:2})+" ر.س");
        value("codes-expiring",count(summary.expiring_soon));
        value("codes-transfers",count(summary.transfers));
      }).catch(function(){ /* code ledger remains available if sales summary fails */ });
    }catch(e){show("تعذر تحميل الأكواد: "+e.message,false)}
  }
  function renderCodes(){
    var tb=$("codes-list");tb.replaceChildren();
    if(!state.codes.length){var tr=node("tr");var td=cell(tr,"لم يتم إصدار أكواد بعد");
      td.colSpan=8;tb.appendChild(tr)}
    state.codes.forEach(function(code){
      var tr=node("tr");
      cell(tr,(code.label||"BLOFY")+(code.channel==="app"?" · تطبيق فقط":" · Xtream"));
      var visibleCode=recentlyIssuedCodes.get(String(code.id||""));
      var codeCell=node("div");
      codeCell.appendChild(node("strong",visibleCode||code.codeHint||"مخفي","num"));
      if(visibleCode){
        codeCell.appendChild(button("نسخ الكود",async function(){
          try{await navigator.clipboard.writeText(visibleCode);show("تم نسخ الكود.",true)}
          catch{show("حدد الكود وانسخه يدويًا.",false)}
        },"secondary sm"));
      }else{
        codeCell.appendChild(node("small"," الرقم الكامل غير محفوظ","muted"));
      }
      cell(tr,codeCell);
      cell(tr,String(code.durationDays)+" يوم");
      var label=code.status==="unused"?"بانتظار التفعيل":
        code.status==="redeemed"?"تم التفعيل":"ملغى";
      var status=node("strong",label,code.status==="redeemed"?"ok":
        code.status==="unused"?"warn":"fail");cell(tr,status);
      var sale=code.soldAt?(String((code.salePriceHalalas||0)/100)+" ر.س"):
        "غير مسجل";
      var buyer=node("div");
      buyer.appendChild(node("div",sale,code.soldAt?"ok":"meta"));
      if(code.buyerName)buyer.appendChild(node("div",code.buyerName,"meta"));
      if(code.buyerPhone)buyer.appendChild(node("div",code.buyerPhone,"meta num"));
      cell(tr,buyer);
      cell(tr,dateTime(code.redeemedAt));cell(tr,dateTime(code.expiresAt));
      var controls=node("div",undefined,"actions");
      if(!code.soldAt&&code.status!=="revoked")
        controls.appendChild(button("تسجيل بيع",async function(){
          var price=prompt("السعر بالريال السعودي (تسجيل يدوي، لا يتم تحصيل مبلغ):","70");
          if(price===null)return;
          var normalized=String(price).trim().replace(",",".");
          if(!/^\d+(\.\d{1,2})?$/.test(normalized)){
            show("أدخل مبلغًا صحيحًا بالريال، حتى خانتين عشريتين.",false);return;
          }
          var buyerName=prompt("اسم العميل (اختياري):","");if(buyerName===null)return;
          var buyerPhone=prompt("رقم الجوال اختياري، أرقام فقط (اتركه فارغًا):","");
          if(buyerPhone===null)return;
          try{await action("code/"+code.id+"/sell","code-sell",{
            priceSar:Number(normalized),buyerName,buyerPhone,channel:"manual"
          });show("تم تسجيل البيع اليدوي.",true);
            await loadCodes(false)}catch(e){show("تعذر تسجيل البيع: "+e.message,false)}
        }));
      if(code.status==="redeemed")
        controls.appendChild(button("تمديد",async function(){
          var input=prompt("كم يومًا تضيف إلى الاشتراك؟ (1 إلى 730):","30");
          if(input===null)return;
          var days=Number(input);
          if(!Number.isInteger(days)||days<1||days>730){
            show("اختر مدة من يوم إلى 730 يومًا.",false);return;
          }
          if(!confirm("سيتم تمديد تاريخ انتهاء الاشتراك الحالي، دون بدء اشتراك جديد."))return;
          try{
            var d=await action("code/"+code.id+"/extend","code-extend",{days});
            show("تم التمديد إلى "+dateTime(d.item?.expiresAt),true);
            await loadCodes(false);await loadAccounts(false)
          }catch(e){show("تعذر التمديد: "+e.message,false)}
        }));
      if(code.status==="redeemed"&&code.channel==="app"&&!code.deviceTransferPending)
        controls.appendChild(button("نقل الجهاز",async function(){
          if(!confirm("سيتم إلغاء وصول الجهاز الحالي فورًا، وإنشاء كود جديد للجهاز الآخر. المدة المتبقية لا تتغير. هل تتابع؟"))return;
          try{
            var d=await action("code/"+code.id+"/transfer","code-transfer",{});
            var target=$("codes-issued");target.hidden=false;target.replaceChildren();
            target.appendChild(node("strong","كود استعادة الجهاز الجديد — يظهر مرة واحدة"));
            attachCopy(target,"الكود الجديد",d.code);
            attachCopy(target,"ينتهي الاشتراك في",dateTime(d.expiresAt));
            target.scrollIntoView({behavior:"smooth",block:"center"});
            show("تم إلغاء جلسة الجهاز السابق. أعطِ العميل الكود الجديد.",true);
            await loadCodes(false);
          }catch(e){show("تعذر نقل الجهاز: "+e.message,false)}
        },"danger"));
      if(code.status==="unused")
        controls.appendChild(button("إلغاء",async function(){
          if(!confirm("إلغاء هذا الكود غير المفعّل؟ لن يمكن استخدامه بعدها."))return;
          try{await action("code/"+code.id+"/revoke","code-revoke",{});
            show("تم إلغاء الكود.",true);await loadCodes(false)}
          catch(e){show("تعذر الإلغاء: "+e.message,false)}
        },"danger"));
      if(controls.childNodes.length===0)controls.appendChild(node("span","—","muted"));
      cell(tr,controls);tb.appendChild(tr);
    });
    $("codes-pagination").textContent="المعروض "+state.codes.length+" كود";
    $("codes-next").hidden=state.codesNext===null;
  }
  $("reload-codes").addEventListener("click",function(){loadCodes(false)});
  $("codes-next").addEventListener("click",function(){loadCodes(true)});
  $("codes-form").addEventListener("submit",async function(e){
    e.preventDefault();var data=Object.fromEntries(new FormData(this));
    // Clear stale one-time codes before a new issue, without persisting secrets.
    $("codes-issued").hidden=true;$("codes-issued").replaceChildren();
    var submit=this.querySelector('button[type="submit"]');submit.disabled=true;
    try{
      var d=await action("codes","code-issue",data);
      var issued=Array.isArray(d.items)?d.items:[];
      issued.forEach(function(item){
        if(item&&item.id&&item.code)recentlyIssuedCodes.set(String(item.id),String(item.code));
      });
      var target=$("codes-issued");
      target.hidden=false;target.replaceChildren();
      if(!issued.length||issued.some(function(item){return !item||!item.code;})){
        target.appendChild(node("strong","تمت معالجة الطلب لكن لم تصل الأكواد الكاملة إلى المتصفح."));
        target.appendChild(node("p","راجع سجل الأكواد بالأسفل قبل محاولة إصدار دفعة أخرى، لتجنب إنشاء أكواد مكررة.","muted"));
        target.scrollIntoView({behavior:"smooth",block:"center"});
        await loadCodes(false);return;
      }
      target.appendChild(node("strong","تم إصدار "+issued.length+" كود بنجاح — انسخها قبل مغادرة الصفحة"));
      target.appendChild(node("p","تظهر الأرقام الكاملة الآن فقط. سجل الأكواد أدناه يعرض أرقامًا مخفية حمايةً للاشتراكات.","muted"));
      if(data.channel==="app"){
        target.appendChild(node("div","الأكواد لتطبيق BLOFY STREAM فقط؛ الهوست داخلي.","muted"));
      }else{
        attachCopy(target,"رابط تفعيل Xtream الخارجي","https://blofyplayer.com/stream/activate");
      }
      var fullCodes=issued.map(function(item){return String(item.code);});
      var batchActions=node("div",undefined,"actions");
      batchActions.appendChild(button("نسخ جميع الأكواد",async function(){
        try{
          await navigator.clipboard.writeText(fullCodes.join("\n"));
          show("تم نسخ جميع الأكواد.",true);
        }catch(e){show("تعذر النسخ التلقائي؛ انسخ الأرقام من الأسفل.",false);}
      }));
      batchActions.appendChild(button("حفظ الأكواد TXT",function(){
        var blob=new Blob([fullCodes.join("\n")+"\n"],{type:"text/plain;charset=utf-8"});
        var url=URL.createObjectURL(blob),link=document.createElement("a");
        link.href=url;link.download="blofy-stream-issued-codes.txt";link.click();
        setTimeout(function(){URL.revokeObjectURL(url)},1000);
      }));
      target.appendChild(batchActions);
      issued.forEach(function(item,index){
        attachCopy(target,"كود "+(index+1)+" · "+item.durationDays+" يوم",String(item.code));
      });
      target.scrollIntoView({behavior:"smooth",block:"center"});
      show("تم إصدار "+issued.length+" كود. مدتها لم تبدأ بعد.",true);
      await loadCodes(false);
    }catch(e){show("تعذر إصدار الأكواد: "+e.message,false)}
    finally{submit.disabled=false}
  });
  async function probeFrom(sourceId,type,output){
    if(!sourceId){show("اختر المصدر أولًا.",false);return}
    $(output).textContent="جار فحص الوسائط من المصدر المحدد...";
    try{var d=await action("source/"+sourceId+"/probe","source-probe",{type:type});
      $(output).textContent=JSON.stringify(d,null,2);
      show(d.playable?"نجح فحص عينات الوسائط.":"عينة الوسائط لم تعمل. راجع التقرير.",d.playable);
      await refresh();
    }catch(e){$(output).textContent="تعذر الفحص: "+e.message;show(e.message,false)}
  }
  $("stream-probe").addEventListener("click",function(){probeFrom($("stream-source").value,$("stream-type").value,"stream-report")});
  $("diagnostic-media").addEventListener("click",function(){probeFrom($("diagnostic-source").value,$("diagnostic-type").value,"diagnostic-output")});
  $("diagnostic-test").addEventListener("click",async function(){
    var id=$("diagnostic-source").value;if(!id){show("اختر مصدرًا.",false);return}
    $("diagnostic-output").textContent="جار اختبار اتصال المصدر...";
    try{var d=await action("source/"+id+"/test","source-test",{});
      $("diagnostic-output").textContent=JSON.stringify(d,null,2);show("انتهى اختبار الاتصال.",true);await refresh()}
    catch(e){$("diagnostic-output").textContent="فشل اختبار المصدر: "+e.message;show(e.message,false)}
  });
  async function loadLiveChannels(){
    var sourceId=$("live-source").value,q=$("live-search").value.trim();
    var selectBox=$("live-channel");selectBox.replaceChildren();
    var placeholder=node("option","حدد قناة من النتائج");placeholder.value="";
    selectBox.appendChild(placeholder);
    if(!sourceId){show("اختر مصدرًا أولًا.",false);return}
    try{
      var query=new URLSearchParams({type:"live",serverId:sourceId,q:q,offset:"0"});
      var d=await api("catalog?"+query.toString());
      (d.items||[]).filter(function(x){return x.enabled}).forEach(function(x){
        var option=node("option",x.name);option.value=x.id;selectBox.appendChild(option);
      });
      $("live-result").textContent="عُثر على "+(d.items||[]).length+" قناة في هذه الصفحة. اختر القناة المطلوبة.";
    }catch(e){show("تعذر عرض القنوات: "+e.message,false)}
  }
  $("live-find").addEventListener("click",loadLiveChannels);
  async function loadBackupChannels(){
    var sourceId=$("live-backup-source").value,q=$("live-backup-search").value.trim();
    var el=$("live-backup-channel");el.replaceChildren();
    var empty=node("option","بدون قناة احتياطية");empty.value="";el.appendChild(empty);
    if(!sourceId)return;
    try{
      var query=new URLSearchParams({type:"live",serverId:sourceId,q:q,offset:"0"});
      var d=await api("catalog?"+query.toString());
      (d.items||[]).filter(function(item){return item.enabled}).forEach(function(item){
        var option=node("option",item.name);option.value=item.id;el.appendChild(option);
      });
      $("live-result").textContent="تم تحميل خيارات القنوات الاحتياطية. اختر القناة المطابقة لنفس البث.";
    }catch(e){show("تعذر تحميل القناة الاحتياطية: "+e.message,false)}
  }
  $("live-backup-find").addEventListener("click",loadBackupChannels);
  $("live-backup-search").addEventListener("keydown",function(e){
    if(e.key==="Enter"){e.preventDefault();loadBackupChannels()}
  });

  $("live-search").addEventListener("keydown",function(e){
    if(e.key==="Enter"){e.preventDefault();loadLiveChannels()}
  });
  function renderLive(items){
    var tbody=$("live-active");tbody.replaceChildren();
    if(!items.length){
      var tr=node("tr");var td=cell(tr,"لا توجد قنوات تبثها هذه الخدمة الآن");td.colSpan=4;
      tbody.appendChild(tr);return;
    }
    items.forEach(function(item){
      var tr=node("tr");cell(tr,item.title||item.channelId);
      cell(tr,item.path+(item.backupConfigured?" · بديل مفعل":""));
      var status=String(item.connections||0)+(item.failovers?" · تبديلات: "+item.failovers:"");
      if(item.probePending)status+=" · فحص HLS جار";
      else if(item.lastProbe)status+=item.lastProbe.ok?" · HLS يعمل":" · HLS فشل: "+item.lastProbe.code;
      cell(tr,status);
      var controls=node("div",undefined,"actions");
      controls.appendChild(button("فحص HLS",async function(){
        $("live-result").textContent="جار اختبار مقاطع البث الفعلية...";
        try{var d=await action("live/"+item.path+"/probe","live-probe",{});
          $("live-result").textContent=d.probePending?
            "بدأ فحص HLS للمسار "+item.path+". ستظهر النتيجة تلقائيًا في حالة القناة بعد اكتماله.":
            JSON.stringify(d,null,2);
          show(d.probePending?"بدأ فحص مقطع HLS الحقيقي. النتيجة لم تثبت بعد.":"انتهى الفحص.",d.ok);
        }catch(e){$("live-result").textContent=e.message;show(e.message,false)}
        await loadLive();
      }));
      controls.appendChild(button("معاينة",function(){
        var video=$("live-preview");video.style.display="block";
        video.src=item.playlist;video.load();
        $("live-result").textContent="تم فتح المشغل. إذا لم يدعم المتصفح HLS، استخدم فحص HLS لمعرفة حالة نقل الوسائط.";
      }));
      controls.appendChild(button("إيقاف",async function(){
        if(!confirm("إيقاف إعادة بث هذه القناة؟"))return;
        try{await action("live/"+item.path+"/stop","live-stop",{});
          var video=$("live-preview");video.pause();video.removeAttribute("src");video.load();
          video.style.display="none";show("تم إيقاف إعادة البث لهذه القناة.",true);
          await loadLive();
        }catch(e){show("تعذر إيقاف إعادة البث: "+e.message,false)}
      },"danger"));
      cell(tr,controls);tbody.appendChild(tr);
    });
  }
  async function loadLive(){
    try{var d=await api("live");renderLive(d.items||[])}
    catch(e){$("live-result").textContent="تعذر عرض المسارات: "+e.message}
  }
  $("live-reload").addEventListener("click",loadLive);
  $("live-start").addEventListener("click",async function(){
    var sourceId=$("live-source").value,channelId=$("live-channel").value;
    if(!sourceId||!channelId){show("اختر مصدرًا وقناة أولًا.",false);return}
    if(!$("live-rights").checked){show("تأكيد صلاحية إعادة البث مطلوب.",false);return}
    this.disabled=true;$("live-result").textContent="جار إنشاء مسار على MediaMTX...";
    try{
      var backupSourceId=$("live-backup-source").value;
      var backupChannelId=$("live-backup-channel").value;
      if(Boolean(backupSourceId)!==Boolean(backupChannelId)){
        show("اختر المصدر والقناة الاحتياطية معًا أو اتركهما فارغين.",false);return;
      }
      var result=await action("live/start","live-start",{
        sourceId:sourceId,channelId:channelId,
        backupSourceId:backupSourceId,backupChannelId:backupChannelId,
        rightsConfirmed:true
      });
      $("live-result").textContent=JSON.stringify({
        ok:result.ok,title:result.title,path:result.path,
        playlist:result.playlist,onDemand:result.onDemand
      },null,2);
      show("تم إنشاء مسار القناة على المحرك. اضغط فحص HLS أو معاينة للتحقق من الفيديو.",true);
      await loadLive();
    }catch(e){$("live-result").textContent="تعذر تشغيل القناة: "+e.message;show(e.message,false)}
    finally{this.disabled=false}
  });
  async function loadFailures(){
    var tbody=$("diagnostic-failures");tbody.replaceChildren();
    try{
      var d=await api("media-failures");
      if(!(d.entries||[]).length){
        var empty=node("tr");var td=cell(empty,"لا توجد نتائج فشل 404 مسجلة حتى الآن");
        td.colSpan=5;tbody.appendChild(empty);return;
      }
      (d.entries||[]).forEach(function(e){
        var tr=node("tr");
        var source=(state.overview?.sources||[]).find(function(s){return s.id===e.sourceId});
        cell(tr,source?.name||String(e.sourceId).slice(0,8));
        cell(tr,e.kind);cell(tr,e.state);
        cell(tr,count(e.count));cell(tr,count(e.due));tbody.appendChild(tr);
      });
    }catch(e){
      var row=node("tr");var td=cell(row,"تعذر عرض سجل الأعطال: "+e.message);
      td.colSpan=5;tbody.appendChild(row);
    }
  }
  $("diagnostic-failures-reload").addEventListener("click",loadFailures);
  refresh();loadLive();loadFailures();
  setInterval(function(){if(!document.hidden){refresh();loadLive();loadFailures()}},60000);
})();
</script>
</body></html>`;
  return html.replace('__NONCE__',nonce);
}
