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

/* BLOFY STREAM premium control-room layer; no remote fonts or third-party scripts. */
:root{--bg:#070a16;--aside:#0b1020;--panel:#12192c;--panel2:#182239;--border:#303a59;--font:#f4f3ff;--muted:#b4bbd5;--purple:#bd9cfb;--green:#6be5bb;--red:#ffa0aa;--amber:#ffda88}
html{scroll-behavior:smooth}body{
 background:radial-gradient(ellipse 70% 55% at 85% -15%,#31244d 0%,transparent 65%),
 radial-gradient(ellipse 50% 45% at 8% 95%,#143349 0%,transparent 68%),var(--bg);
 background-attachment:fixed;letter-spacing:.03px}
.layout{grid-template-columns:258px minmax(0,1fr)}
aside{background:linear-gradient(160deg,#10172b,#0a1020 70%);border-left-color:#323457;padding:26px 17px;box-shadow:-10px 0 46px #0507154d;z-index:5}
.logo{margin:0 4px 33px}.logo-icon{width:54px;height:54px;transform:none;border-radius:19px;background:linear-gradient(140deg,#e0bbff 0%,#9665e1 48%,#4e60a9 100%);color:#100d22;box-shadow:0 8px 32px #8a63c15c, inset 0 1px #ffffff70}
.logo strong{font-size:20px;letter-spacing:.7px}.logo strong b{color:#c3a5ff}.logo small{font-size:11px;letter-spacing:.3px}
.navtitle{color:#9ca8c7;text-transform:uppercase}
nav{gap:7px}.navlink{border-radius:13px;padding:12px 13px;transition:background .15s,border-color .15s,transform .15s;color:#bcc3df}
.navlink.active{background:linear-gradient(110deg,#674a9b77,#39335b66);color:#fff;border-color:#9c75df77;box-shadow:inset -3px 0 #c7a6ff,0 5px 20px #1b13302d}
.navlink:hover{background:#252f4b;transform:translateX(-2px)}
.navfoot{color:#a0a9c3;border-top-color:#313955}
.top{position:sticky;top:0;z-index:4;min-height:81px;height:auto;background:#0b1022e8;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-color:#303856;padding:16px 32px}
.top h1{font-size:21px;font-weight:800}.top p{color:#aab3d2}
.top .tools{justify-content:flex-end}
main{padding:32px clamp(16px,3vw,45px) 68px;max-width:1800px}
.heading{margin-bottom:23px}.heading h2{font-size:clamp(24px,2.2vw,32px);letter-spacing:-.5px}
.heading p{font-size:13px}
.cards{gap:17px;margin-bottom:20px}
.stat{position:relative;overflow:hidden;border:1px solid #55547766;border-bottom:1px solid #55547766;background:linear-gradient(136deg,#20223a 0%,#101b30 100%);border-radius:19px;padding:23px 22px;box-shadow:0 12px 28px #040a192e}
.stat:before{content:"";position:absolute;right:0;top:0;width:5px;height:100%;background:linear-gradient(#d9bcff,#8362c7)}
.stat:nth-child(2):before{background:linear-gradient(#95ffe0,#268f80)}
.stat:nth-child(3):before{background:linear-gradient(#9bdfff,#397ba8)}
.stat:nth-child(4):before{background:linear-gradient(#ffdf9f,#aa8050)}
.stat:after{content:"";position:absolute;width:90px;height:90px;border-radius:100%;background:#b58eff12;left:-30px;top:-38px;filter:blur(5px)}
.stat small{font-size:12px;font-weight:700;color:#b9c0d8}
.stat strong{font-size:clamp(26px,2.5vw,38px);letter-spacing:.2px;margin-top:9px;color:#fff}
.panel{background:linear-gradient(145deg,#172037f7,#101a2eeb);border-color:#404b6988;border-radius:20px;padding:clamp(16px,2vw,25px);box-shadow:0 12px 35px #03091824}
.panel h3{font-size:18px;margin-bottom:12px}.panel .muted{line-height:1.9}
.grid{gap:18px}
.btn{border-radius:12px;min-height:40px;box-shadow:0 3px 13px #08081230;background:linear-gradient(130deg,#a47add,#7349b7);border-color:#bc93ec88;transition:filter .15s,transform .15s,box-shadow .15s}
.btn:hover{filter:brightness(1.14);transform:translateY(-1px);box-shadow:0 7px 22px #7851bd36}
.btn:active{transform:translateY(0)}.btn.secondary{background:#212c46;border-color:#475a7a;color:#e9ecff}.btn.danger{background:#55313f;border-color:#a25970}
.pill{background:#1c2741bb;border-color:#506080;border-radius:999px;color:#d4d9ee}
.pill.good{background:#123f37a8;color:#7ae6b8}.pill.bad{background:#532c39a0;color:#ffa3ae}.pill.warn{background:#54432988;color:#ffdfa1}
input,select{background:#0b1529;border-color:#445777;border-radius:12px;min-height:42px;color:#f0f0fc}
input:focus,select:focus{border-color:#ae8eef;box-shadow:0 0 0 3px #a286f525;outline:0}
table{border-spacing:0;border-collapse:separate}th{position:sticky;top:0;z-index:1;background:#1b2741;color:#dae0f3;font-size:12px;padding:15px 12px;border-bottom-color:#505c7e}
td{padding:14px 12px;border-bottom-color:#3b476052}tbody tr:hover{background:#7f63b91c}
.tablewrap{border:1px solid #354661;border-radius:14px;overflow:auto;max-height:72vh;scrollbar-color:#645784 #162139}
.empty{color:#c1c6df}.log{border-color:#495978;background:#091428;color:#d5f5ec}
.status{border-radius:14px;border-color:#88703f}
.quick-hero{border:1px solid #a07bdb66;border-radius:23px;padding:clamp(22px,3vw,36px);margin-bottom:23px;background:radial-gradient(ellipse at 85% 10%,#a46ad83b,transparent 58%),linear-gradient(120deg,#292343,#11283e);box-shadow:0 14px 42px #0509193d;position:relative;overflow:hidden}
.quick-hero:after{content:"B";position:absolute;left:30px;bottom:-80px;color:#ffffff08;font-weight:900;font-size:240px;line-height:1;pointer-events:none}
.quick-hero>*{position:relative;z-index:1}.quick-eyebrow{font-size:11px;letter-spacing:2px;color:#dbbfff;font-weight:900;margin-bottom:7px}
.quick-hero h3{font-size:clamp(23px,2.5vw,32px);margin:0 0 8px;color:#fff}
.quick-hero p{max-width:680px;line-height:2;color:#c8d3ea}
.quick-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:21px}.quick-actions .btn{min-width:140px;justify-content:center}
.quick-actions .btn.secondary{background:#172e46d9}
.live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#72e9ba;margin-left:7px;box-shadow:0 0 12px #72e9ba88}
.top-status-secondary{font-size:11px;color:#bac6df;direction:ltr;white-space:nowrap}
.density-toggle{white-space:nowrap}
#command-palette{width:min(95vw,560px);max-height:82vh;overflow:auto;background:#111a2e;border:1px solid #7465a2;border-radius:21px;padding:24px;box-shadow:0 25px 95px #000b;color:#f2f0ff}
#command-palette::backdrop{background:#02040bbb;backdrop-filter:blur(7px)}
#command-palette h2{margin:0 0 14px;font-size:20px}
#command-palette .command-list{display:grid;gap:8px;margin-top:15px}
#command-palette .command-item{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:right;border:1px solid #364461;border-radius:11px;background:#1c2941;color:#f3f0ff;padding:12px 14px;min-height:47px}
#command-palette .command-item:hover,#command-palette .command-item:focus-visible{border-color:#ad88ed;background:#3c315b}
#command-palette .command-item[hidden]{display:none!important}
body.compact .panel{padding:12px 16px;border-radius:14px}
body.compact td{padding:7px 10px}body.compact .stat{padding:14px}body.compact .stat strong{font-size:25px}
@media(max-width:1100px){.layout{grid-template-columns:220px minmax(0,1fr)}.navlink{gap:9px}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:740px){
 body{background-attachment:scroll}
 .layout{display:block}aside{position:relative;height:auto;padding:11px 12px;border-left:0;border-bottom:1px solid #363d5d}
 .logo{margin:0 0 12px}.logo-icon{width:40px;height:40px;border-radius:12px}
 nav{display:flex;gap:5px;overflow-x:auto;padding-bottom:6px}.navlink{flex:0 0 auto;width:auto;min-height:42px;padding:9px 12px;white-space:nowrap}
 .navlink:hover{transform:none}
 .top{top:0;padding:12px 14px;align-items:flex-start;gap:8px}.top h1{font-size:18px}
 .top .tools{gap:6px}.top .tools .btn{min-height:35px;font-size:11px;padding:6px 9px}
 .top-status-secondary{display:none}main{padding:17px 12px 52px}
 .quick-hero{padding:23px 17px}.quick-hero:after{left:-15px}
 .quick-actions .btn{flex:1 1 130px;min-width:0}.cards{gap:10px}
 .stat{padding:14px}.stat strong{font-size:25px}
 .heading h2{font-size:23px}
 .panel{border-radius:16px;padding:16px}
 .tablewrap{max-height:64vh}.formgrid{grid-template-columns:1fr}
 .controls .inline>*{max-width:none}
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{transition:none!important;animation:none!important}}

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
<div class="tools"><span id="system-pill" class="pill warn" role="status">جار الاتصال</span><span class="top-status-secondary" id="last-updated">—</span><button class="btn secondary sm density-toggle" id="density-toggle" aria-pressed="false" type="button">عرض مكثف</button><button class="btn secondary sm" id="open-command" type="button" aria-keyshortcuts="Control+K">⌕ الأوامر</button><button class="btn secondary sm" id="refresh">↻ تحديث</button></div></header>
<main><div id="notice" class="status" role="status" hidden></div>
<section class="view active" id="page-home">
<div class="heading"><div><h2>مركز القيادة</h2><p>إدارة البث والمشتركين والمحتوى من لوحة واحدة.</p></div><button class="btn secondary" id="home-refresh" type="button">↻ تحديث الحالة</button></div>
<div class="quick-hero"><div class="quick-eyebrow"><span class="live-dot"></span>BLOFY STREAM · CONTROL ROOM</div>
<h3>كل تفاصيل السيرفر تحت سيطرتك</h3>
<p>تابع مصادر البث وأكواد العملاء وفهرس المكتبة. كل الأرقام متصلة بخدماتك الفعلية، ولا يتم إنشاء اشتراكات أو تغيير مصدر دون أمرك.</p>
<div class="quick-actions" aria-label="اختصارات الإدارة">
<button class="btn" type="button" data-go="codes" data-focus="codes-label">＋ إصدار اشتراك</button>
<button class="btn secondary" type="button" data-go="library" data-focus="library-source">▣ تنظيم المكتبة</button>
<button class="btn secondary" type="button" data-go="restream" data-focus="live-source">◉ مراقبة البث</button>
<button class="btn secondary" type="button" data-go="diagnostics" data-focus="diagnostic-source">⚙ فحص النظام</button>
</div></div>
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
<div class="panel"><h3>المشاركة بين المشتركين</h3><p class="muted">هذه أرقام مستقلة لمسارات المشاركة الجديدة فقط؛ لا تشمل التشغيل العادي من التطبيق.</p><div class="inline"><span class="pill" id="shared-mode">—</span><span class="pill">اتصالات المصدر: <strong id="shared-feeds">—</strong></span><span class="pill">المشاهدون: <strong id="shared-viewers">—</strong></span><span class="pill">مصادر في فترة تهدئة: <strong id="fanout-cooldowns">—</strong></span><span class="pill">فشل سحب مشترك: <strong id="fanout-provider-failures">—</strong></span><span class="pill">مشاهدون بطيئون قُطعت جلساتهم: <strong id="fanout-slow-disconnects">—</strong></span><span class="pill">أخطاء Relay منذ آخر تشغيل: <strong id="relay-errors">—</strong></span></div><p id="relay-error-breakdown" class="muted"></p></div>
<div class="panel" id="security-center">
<div class="controls"><div><h3>🔐 BLOFY SECURITY</h3>
<p class="muted">حماية لوحة المشرف وأذونات المشاهدة المؤقتة، ومراقبة محاولات الدخول والحدود الأمنية دون كشف بيانات المشتركين.</p></div>
<button class="btn secondary" id="security-refresh" type="button">↻ تحديث الأمان</button></div>
<div class="inline"><span class="pill" id="security-status">جار الفحص</span>
<span class="pill">محاولات دخول غير صحيحة: <strong id="security-auth-failures">—</strong></span>
<span class="pill">طلبات دخول محدودة: <strong id="security-auth-throttled">—</strong></span>
<span class="pill">تصاريح بث صادرة: <strong id="security-grants-issued">—</strong></span>
<span class="pill">طلبات بث محدودة: <strong id="security-grants-throttled">—</strong></span>
<span class="pill">تصاريح نشطة: <strong id="security-active-tickets">—</strong></span>
<span class="pill">أخطاء مصدر الوسائط: <strong id="security-provider-errors">—</strong></span>
<span class="pill">طلبات مؤجلة لحماية المصدر: <strong id="security-cooldown-rejections">—</strong></span></div>
<p class="muted" id="security-note">التصاريح مؤقتة، والإحصاءات تبدأ من آخر تشغيل للسيرفر.</p>
</div>
<div class="panel" id="auto-health-panel">
<div class="controls"><div><h3>🛡 BLOFY AUTO HEALTH</h3><p class="muted">مراقبة مسارات إعادة البث التابعة للمشرف فقط. لا يتضمن التشغيل العادي للعملاء.</p></div>
<button class="btn secondary" id="auto-health-refresh" type="button">↻ تحديث الحالة</button></div>
<div class="inline"><span class="pill" id="auto-health-status">جار الفحص</span>
<span class="pill">مسارات: <strong id="auto-health-total">—</strong></span>
<span class="pill">عينة ناجحة: <strong id="auto-health-good">—</strong></span>
<span class="pill">عينة فاشلة: <strong id="auto-health-bad">—</strong></span>
<span class="pill">غير مفحوص/قديم: <strong id="auto-health-unknown">—</strong></span></div>
<p id="auto-health-mode" class="muted">لا نعيد الاتصال بالمصدر تلقائيًا إلا بإعداد اختياري.</p>
<div class="grid"><div><h3>حالة المسارات</h3><div class="tablewrap">
<table><thead><tr><th>القناة</th><th>الفحص</th><th>البديل</th></tr></thead><tbody id="auto-health-paths"></tbody></table>
</div></div><div><h3>آخر أحداث الصحة</h3><div class="tablewrap">
<table><thead><tr><th>الوقت</th><th>المسار</th><th>الحدث</th></tr></thead><tbody id="auto-health-events"></tbody></table>
</div></div></div></div>
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
<button class="btn secondary" id="shared-live-probe" type="button">🧪 فحص المشاركة 26 ثانية</button>
</div>
<div class="inline" style="margin-top:15px">
<select id="live-backup-source" aria-label="المصدر الاحتياطي">
<option value="">بدون مصدر احتياطي</option></select>
<input id="live-backup-search" placeholder="بحث عن قناة احتياطية مطابقة..." maxlength="85">
<button class="btn secondary" type="button" id="live-backup-find">بحث البديل</button>
</div>
<div class="inline" style="margin-top:12px"><select id="live-backup-channel" aria-label="القناة الاحتياطية">
<option value="">بدون قناة احتياطية</option></select></div>
<p class="muted">🛡 فحص المشاركة يفتح اتصالًا واحدًا مصرحًا بالمصدر وقارئين داخليين لمدة 26 ثانية، ولا يغيّر أي كود أو قناة للمشتركين. يفحص نقل TS وليس جودة الصوت أو الصورة بعد فك التشفير.</p>
<pre id="shared-live-probe-result" class="log" style="min-height:55px">اختر قناة من مصدر saleh، وأكد صلاحية إعادة البث، ثم اضغط فحص المشاركة.</pre>
<p class="muted" style="margin-top:10px">المصدر الاحتياطي اختياري. اختر نفس القناة من مصدر تملك صلاحية بثه. يتحول النظام إليه إذا فشلت استجابة المصدر الأساسي. الحد: 3 مسارات متزامنة.</p>
</div>
<div class="panel"><div class="controls"><h3>قنوات يعيد بثها السيرفر الآن</h3><button class="btn secondary sm" id="live-reload" type="button">تحديث</button></div>
<p class="muted">عداد HLS يعرض الجلسات التي يراها محرك إعادة البث المنفصل فقط، وليس جميع مشتركي تطبيق BLOFY. أما اتصال المصدر فيعني اتصال السحب من المزود، وليس عدد العملاء.</p>
<div class="tablewrap"><table><thead><tr><th>القناة</th><th>المسار</th><th>المشاهدون (HLS)</th><th>اتصال المصدر</th><th>الإجراءات</th></tr></thead><tbody id="live-active"></tbody></table></div>
<video id="live-preview" controls playsinline preload="none" style="display:none;width:min(100%,850px);margin:16px 0;border-radius:10px;background:black" aria-label="معاينة القناة"></video>
<pre id="live-result" class="log">اختر قناة من مكتبتك ثم ابدأ إعادة البث.</pre>
</div><div class="panel"><h3>وضع خدمة إعادة البث</h3><p id="stream-note" class="muted">تُقرأ الحالة من MediaMTX؛ لن تظهر قنوات نشطة لم يتم ربطها فعليًا.</p></div>
</section>
<section class="view" id="page-library">
<div class="heading"><div><h2>المكتبة</h2><p>ترتيب الأقسام والقنوات والأفلام والمسلسلات يأتي من لوحة Xtream، بعد مزامنة المصدر.</p></div></div>
<div class="panel"><div class="controls"><div class="inline">
<select id="library-type" aria-label="نوع الوسائط"><option value="live">القنوات</option><option value="movie">الأفلام</option><option value="series">المسلسلات</option></select>
<select id="library-source" aria-label="المصدر"><option value="">جميع المصادر</option></select>
<input id="library-search" placeholder="ابحث باسم القناة أو الفيلم..." maxlength="85">
<button class="btn" id="library-submit">بحث</button>
<button class="btn secondary" id="library-refresh-source" type="button">↻ تحديث محتوى المصدر</button>
<button class="btn" id="library-codes-sync-all" type="button">نقل تحديثات Xtream إلى الأكواد</button>
<button class="btn secondary" id="library-smart-toggle" type="button" aria-pressed="false">عرض تجميعي اختياري: إيقاف</button></div></div>
<p class="muted" id="library-smart-summary">الترتيب الأصلي من Xtream هو المعتمد. بعد ترتيب المحتوى من لوحة Xtream اختر المصدر واضغط «↻ تحديث محتوى المصدر»، ثم حدّث المكتبة في تطبيق العميل.</p>
<p class="muted" id="library-codes-sync-status" role="status" aria-live="polite">الأكواد المرتبطة بالمصدر تستخدم مكتبة BLOFY المشتركة. اختر المصدر واضغط نقل تحديثات Xtream لقراءة القنوات والأفلام والمسلسلات معًا؛ لا تتغير صلاحيات الاشتراكات أو مددها.</p>
<div class="tablewrap"><table><thead><tr><th>الاسم</th><th>المصدر</th><th>القسم</th><th>الحالة</th><th>المعاينة</th></tr></thead><tbody id="library-results"></tbody></table></div>
<div class="actions"><button class="btn secondary sm" id="library-more" hidden>عرض المزيد</button></div></div>
<div class="panel" id="library-ops-panel">
<h3>⚙️ إدارة المزامنة وإصدارات الأكواد</h3>
<p class="muted">المصدر المعتمد هو Xtream. المزامنة التلقائية لا تبدأ إلا بعد تفعيلها على مصدر محدد. لن تتغير الأكواد أو الاشتراكات.</p>
<div class="controls"><div class="inline">
<label>تكرار المزامنة
<select id="library-auto-hours" aria-label="عدد الساعات بين المزامنات">
<option value="12">كل 12 ساعة</option><option value="24" selected>كل 24 ساعة</option>
<option value="48">كل 48 ساعة</option><option value="168">كل أسبوع</option>
</select></label>
<button class="btn" id="library-auto-enable" type="button">تفعيل المزامنة التلقائية</button>
<button class="btn secondary" id="library-auto-disable" type="button">إيقاف المزامنة التلقائية</button>
<button class="btn secondary" id="library-ops-refresh" type="button">فحص حالة المصدر والأكواد</button>
</div></div>
<p class="muted" id="library-auto-status" role="status" aria-live="polite">اختر مصدرًا ثم افحص المزامنة التلقائية.</p>
<p class="muted" id="library-ops-stats" role="status" aria-live="polite">لم تُقرأ إحصائيات المصدر بعد.</p>
<p class="muted" id="library-live-capacity-status" role="status" aria-live="polite">سيعرض هذا التقرير قيود حساب Xtream الأصلي وأسباب انقطاع القنوات، دون قراءة بيانات دخول العملاء.</p>
<div class="actions">
<button class="btn secondary" id="library-snapshot-create" type="button">حفظ نسخة من تخصيصات الناشر</button>
<button class="btn secondary" id="library-snapshots-refresh" type="button">عرض النسخ المحفوظة</button>
</div>
<p class="muted">النسخ هنا محدودة لتخصيصات المكتبة (حتى 2000 قسم و2000 عنصر معدل)، وليست نسخة احتياطية كاملة من PostgreSQL.</p>
<div class="log" id="library-snapshots-status" role="status" aria-live="polite"></div>
</div>
<div class="panel" id="library-review-panel">
<div class="controls"><h3>مراجعة المكتبة كاملة — تحليل ذكي</h3>
<div class="actions"><button class="btn secondary" id="library-review-run" type="button">تحليل المصدر بالكامل</button>
<button class="btn secondary" id="library-review-export" type="button" disabled>تصدير التقرير CSV</button></div></div>
<p class="muted">يفحص مصدرًا ونوع محتوى واحدًا كل مرة حتى 40,000 عنصر، ويعرض التكرارات المحتملة والأسماء المقترحة والأقسام ونقص الصور. تحليل بالقواعد بدون نموذج AI خارجي؛ لا يحذف أو يغيّر شيئًا تلقائيًا. تعتمد التعديلات فرديًا فقط بعد موافقتك.</p>
<div id="library-review-summary" class="muted">اختر مصدرًا محددًا ونوع المحتوى ثم اضغط تحليل المصدر بالكامل.</div>
<div class="tablewrap"><table><thead><tr><th>الاسم الحالي</th><th>اقتراح التنظيف</th><th>السبب</th><th>المراجعة</th></tr></thead>
<tbody id="library-review-suggestions"></tbody></table></div>
<div id="library-review-duplicates" class="muted"></div>
</div>
<div class="panel" id="library-ai-chat-panel">
<h3>✦ BLOFY AI — اكتب طلبك للمكتبة</h3>
<p class="muted">ترتيب الأقسام تديره الآن من لوحة Xtream، وليس Gemini. استخدم AI لفحص الأسماء واقتراح تصنيف العناصر بعد المعاينة. التعديلات لا تُنشر إلا بعد موافقتك.</p>
<label for="library-ai-command">وش تبي يسوي AI؟</label>
<textarea id="library-ai-command" rows="3" maxlength="480" style="width:100%;margin:8px 0;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--panel2);color:var(--font);font:inherit" placeholder="مثلاً: حلل أسماء الأفلام واقترح تصحيح التصنيفات دون تغيير ترتيب Xtream"></textarea>
<div class="actions">
<button class="btn" type="button" id="library-ai-chat-send">ارسل إلى AI</button>
<button class="btn secondary" type="button" id="library-ai-item-next" disabled>تصنيف الدفعة التالية (12 عنصرًا)</button>
<button class="btn secondary" type="button" id="library-ai-chat-apply" disabled>اعتماد ونشر التعديلات المحددة</button>
</div>
<p id="library-ai-chat-status" class="muted" role="status" aria-live="polite">لن يُعدّل شيء حتى توافق على الخطة.</p>
<div id="library-ai-chat-preview" class="muted" style="white-space:pre-wrap"></div>
<div id="library-ai-chat-history" class="log" aria-label="سجل المحادثة" style="white-space:pre-wrap"></div>
<div class="actions" style="margin-top:12px">
<button class="btn secondary" type="button" id="library-ai-history-refresh">سجل نشر AI والتراجع</button>
</div>
<div class="actions"><button class="btn secondary" type="button" id="library-ai-progress-refresh">تقدّم تحليل المكتبة</button></div>
<p id="library-ai-scan-progress" class="muted" role="status" aria-live="polite">لم تُقرأ نسبة التحليل بعد.</p>
<progress id="library-ai-progress-bar" max="100" value="0" style="width:100%" aria-label="نسبة العناصر التي حللها Gemini"></progress>
<p id="library-ai-revision" class="muted" role="status" aria-live="polite">لم يتم فحص إصدار المكتبة بعد.</p>
<div id="library-ai-history" class="log" aria-label="آخر تعديلات الذكاء الاصطناعي"></div>
</div>
<div class="panel" id="library-ai-panel">
<div class="controls"><h3>مساعد AI لتصنيف العناوين — مراجعة فقط</h3>
<label class="inline">مصدر AI
<select id="library-ai-source" aria-label="اختر مصدرًا لتحليل Gemini"><option value="">اختر مصدرًا</option></select></label>
<button class="btn secondary" type="button" id="library-ai-check">فحص Gemini</button>
<button class="btn secondary" type="button" id="library-ai-run">اقترح تصنيف 12 عنوانًا باستخدام Gemini</button></div>
<p class="muted" id="library-ai-status">جار فحص إعدادات الذكاء الاصطناعي...</p>
<p class="muted">ميزة اختيارية ومدفوعة حسب استخدام API. لا ترسل كلمات المرور أو روابط البث أو بيانات العملاء. لا تُطبّق اقتراحات AI تلقائيًا.</p>
<div class="tablewrap"><table><thead><tr>
<th>العنوان الحالي</th><th>اقتراح AI</th><th>التصنيف</th><th>الثقة / التفسير</th></tr></thead>
<tbody id="library-ai-results"></tbody></table></div></div>
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
<p class="muted">الأكواد الجديدة أرقام فقط، تبدأ بـ8 أرقام وتزيد تلقائيًا مع كثرة الإصدار. يمكنك إصدار 20 كودًا في الدفعة. تُحفظ الأكواد الجديدة مشفّرة وتظهر للمدير عند طلب نسخها؛ أما الأكواد القديمة غير المحفوظة فلا يمكن استعادتها.</p>
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
 <p class="muted" style="margin-top:12px">مهم: الأكواد القديمة غير المحفوظة مشفّرة لا يمكن استرجاعها. الأكواد الصادرة بعد هذا التحديث متاحة للنسخ بعد تحديث الصفحة، للمشرف المصرّح فقط.</p></div>
<div class="panel"><div class="controls"><h3>سجل الأكواد</h3>
<div class="actions"><button class="btn secondary sm" id="codes-copy-visible" type="button">نسخ الأكواد القابلة للاسترجاع</button><button class="btn secondary sm" id="reload-codes" type="button">↻ تحديث</button></div></div>
<p class="muted">زر النسخ ثابت لكل كود جديد مشفّر في الخادم، حتى بعد تحديث الصفحة. الأكواد القديمة التي لم تُحفظ مشفّرة لا يمكن استرجاعها. لا تنسخ الأكواد الملغاة.</p>
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
<dialog id="command-palette" aria-label="اختصارات لوحة الإدارة">
<form method="dialog"><div class="controls"><h2>الوصول السريع</h2><button class="btn secondary sm" type="submit">إغلاق ×</button></div></form>
<input id="command-search" type="search" placeholder="اكتب: أكواد، مكتبة، بث، مشترك..." autocomplete="off" aria-label="ابحث في الأقسام">
<div class="command-list" id="command-list"></div>
<p class="muted">Ctrl + K للفتح • Esc للإغلاق</p>
</dialog>
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
    if(id==="accounts")loadAccounts(false);if(id==="codes")loadCodes(false);if(id==="library")void updateLibraryAIStatus();window.scrollTo({top:0,behavior:"instant"});
  }
  document.querySelectorAll("[data-tab]").forEach(function(e){e.addEventListener("click",function(){tab(e.dataset.tab)})});
  document.querySelectorAll("[data-go]").forEach(function(e){e.addEventListener("click",function(){
    tab(e.dataset.go);
    var target=e.dataset.focus;
    if(target)requestAnimationFrame(function(){var field=$(target);if(field)field.focus()});
  })});
  // Keyboard-friendly command palette: navigation only, never mutates data.
  var commandPalette=$("command-palette"),commandSearch=$("command-search");
  Object.keys(tabs).forEach(function(id){
    var item=node("button",tabs[id],"command-item");
    item.type="button";item.dataset.commandLabel=tabs[id];item.dataset.target=id;
    item.addEventListener("click",function(){
      commandPalette.close();commandSearch.value="";filterCommands();tab(id);
    });
    $("command-list").appendChild(item);
  });
  function filterCommands(){
    var query=commandSearch.value.trim().toLowerCase();
    $("command-list").querySelectorAll(".command-item").forEach(function(item){
      item.hidden=!!query&&!item.dataset.commandLabel.toLowerCase().includes(query);
    });
  }
  commandSearch.addEventListener("input",filterCommands);
  function openCommands(){
    if(typeof commandPalette.showModal!=="function")return;
    if(!commandPalette.open)commandPalette.showModal();
    commandSearch.value="";filterCommands();commandSearch.focus();
  }
  $("open-command").addEventListener("click",openCommands);
  document.addEventListener("keydown",function(e){
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){
      e.preventDefault();
      if(commandPalette.open)commandPalette.close();
      else openCommands();
    }
  });
  $("density-toggle").addEventListener("click",function(){
    var compact=document.body.classList.toggle("compact");
    this.setAttribute("aria-pressed",compact?"true":"false");
    this.textContent=compact?"عرض مريح":"عرض مكثف";
  });
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
      var shared=e.sharedRelay||{},fanout=shared.fanout||{};
      value("shared-mode",shared.sharedLiveEnabled?"مفعّل للمشتركين المسموحين":"غير مفعّل");
      value("shared-feeds",shared.sharedLiveEnabled?count(fanout.activeFeeds):"—");
      value("shared-viewers",shared.sharedLiveEnabled?count(fanout.viewers):"—");
      value("fanout-cooldowns",shared.sharedLiveEnabled?count(fanout.cooldownFeeds):"—");
      value("fanout-provider-failures",shared.sharedLiveEnabled?count(fanout.providerFailures):"—");
      value("fanout-slow-disconnects",shared.sharedLiveEnabled?count(fanout.slowViewerDisconnects):"—");
      value("relay-errors",shared.relayFailureTotal===undefined?"غير متاح":
        count(shared.relayFailureTotal));
      $("relay-error-breakdown").textContent=
        "أسباب 502 منذ بدء تشغيل الخادم الحالي (لا يشمل النسخ القديمة): "+
        Object.entries(shared.relayFailureCounts||{}).map(function(entry){
          return entry[0]+": "+count(entry[1])
        }).join(" • ");
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
    // AI works against exactly one source. Populate a nearby selector so
    // the operator does not have to scroll back to the catalog filters.
    select("library-ai-source",sources,"اختر مصدرًا");
    var aiSource=$("library-ai-source");
    if(!aiSource.value&&sources.length===1)aiSource.value=sources[0].id;
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
    if(state.overview&&state.engine){
      var saudiTime=new Intl.DateTimeFormat("en-GB",{
        hour:"2-digit",minute:"2-digit",timeZone:"Asia/Riyadh"
      }).format(new Date());
      value("last-updated","آخر تحديث: "+saudiTime+" KSA");
    }else value("last-updated","حالة بعض الخدمات غير مؤكدة");
  }catch(e){show(e.message,false)}}
  async function doSource(id,cmd,body){try{var d=await action("source/"+id+"/"+cmd,"source-"+cmd,body||{});
    if(cmd==="probe"){show("وصلت نتيجة فحص الوسائط. راجع التشخيص.",true);
      $("diagnostic-output").textContent=JSON.stringify(d,null,2);tab("diagnostics")}
    else show(cmd==="sync"?"بدأت مزامنة فهرس المصدر.":"تم تنفيذ الأمر على المصدر.",true);
    await refresh();return d;
  }catch(e){show("تعذر تنفيذ الأمر: "+e.message,false);return null;}}
  $("refresh").addEventListener("click",refresh);
  $("home-refresh").addEventListener("click",function(){void refresh();void loadLive();void loadFailures()});
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
  var smartLibraryOn=false;
  function smartGroup(item){
    var t=String((item.categoryName||"")+" "+(item.name||"")).toLowerCase();
    if(/sport|sports|ssc|bein|رياض|مباريات|كرة|match/.test(t))return "رياضة";
    if(/news|أخبار|اخبار|إخبار/.test(t))return "أخبار";
    if(/kids|cartoon|أطفال|اطفال|كرتون|animation|anime|أنمي/.test(t))return "أطفال وأنمي";
    if(/movie|film|cinema|فيلم|أفلام|افلام/.test(t))return "أفلام";
    if(/series|season|مسلسل|دراما/.test(t))return "مسلسلات";
    return "عام";
  }
  $("library-smart-toggle").addEventListener("click",function(){
    smartLibraryOn=!smartLibraryOn;
    this.textContent="عرض تجميعي اختياري: "+(smartLibraryOn?"تشغيل":"إيقاف");
    this.setAttribute("aria-pressed",String(smartLibraryOn));
    loadCatalog(false);
  });
  async function loadCatalog(more){
    var type=$("library-type").value,serverId=$("library-source").value,q=$("library-search").value.trim();
    var params={type:type,serverId:serverId,q:q};
    if(!more||!state.libParams||JSON.stringify(params)!==JSON.stringify(state.libParams)){
      state.libOffset=0;state.libParams=params;$("library-results").replaceChildren();
    }
    var query=new URLSearchParams({type:type,serverId:serverId,q:q,offset:String(state.libOffset)});
    try{var d=await api("catalog?"+query.toString());var items=d.items||[];
      if(smartLibraryOn){
        var ranks=["رياضة","أخبار","أطفال وأنمي","أفلام","مسلسلات","عام"];
        items=items.map(function(item,i){return {item:item,index:i,group:smartGroup(item)}})
          .sort(function(a,b){return ranks.indexOf(a.group)-ranks.indexOf(b.group)||a.index-b.index})
          .map(function(row){return row.item});
        $("library-smart-summary").textContent="تنظيم تلقائي للقائمة المعروضة (حتى 40 عنصرًا في الصفحة) • رياضة، أخبار، أطفال، أفلام، مسلسلات • لا يعدّل فئات المصدر ولا يستخدم نموذج AI خارجي.";
      }else $("library-smart-summary").textContent="عرض المصدر بترتيب Xtream بعد آخر مزامنة؛ لم يُطبّق أي ترتيب ذكي على النتائج.";

      if(!more&&items.length===0){var tr=node("tr");var td=cell(tr,"لا يوجد محتوى مطابق");td.colSpan=5;$("library-results").appendChild(tr)}
      items.forEach(function(item){var tr=node("tr");cell(tr,item.name);
        var src=(state.overview&&state.overview.sources||[]).find(function(x){return x.id===item.serverId});
        cell(tr,src?src.name:item.serverId);cell(tr,(smartLibraryOn?"["+smartGroup(item)+"] ":"")+(item.categoryName||"—"));
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
  var libraryReviewReport=null;
  async function loadLibraryReview(){
    var sourceId=$("library-source").value,type=$("library-type").value;
    if(!sourceId){show("حدد المصدر الذي تريد تحليله من قائمة المكتبة أولاً.",false);return}
    var run=$("library-review-run");run.disabled=true;
    $("library-review-summary").textContent="جار تحليل فهرس المصدر دون تعديله...";
    $("library-review-suggestions").replaceChildren();
    $("library-review-duplicates").replaceChildren();
    try{
      var report=await api("library-review?"+new URLSearchParams({sourceId,type}));
      libraryReviewReport=report;
      $("library-review-export").disabled=false;
      var details=[
        "العناصر المحللة: "+count(report.scanned)+" من "+count(report.total),
        "النتيجة: "+(report.complete?"اكتمل الفحص":"فحص جزئي"),
        "مجموعات أسماء متشابهة: "+count(report.duplicateGroupCount),
        "عناصر ضمن مجموعات التكرار: "+count(report.duplicateItems),
        "بدون صورة: "+count(report.missingArtwork),
        "بدون فئة: "+count(report.missingCategory),
        "غير مفعّلة: "+count(report.hidden)
      ];
      if(report.missingYear!==null)details.push("بدون سنة: "+count(report.missingYear));
      var summary=$("library-review-summary");summary.replaceChildren();
      summary.appendChild(node("p",details.join(" • ")));
      summary.appendChild(node("p",String(report.warning||"")));
      summary.appendChild(node("p","توزيع مقترح: "+(report.categoryGroups||[])
        .map(function(g){return g.name+" ("+count(g.count)+")"}).join(" • ")));
      (report.nameSuggestions||[]).forEach(function(item){
        var row=node("tr");
        cell(row,item.currentName);
        cell(row,item.proposedName);
        cell(row,item.reason+" • ثقة "+item.confidence);
        var actions=node("div",undefined,"actions");
        actions.appendChild(button("اعتماد الاسم",async function(){
          if(!confirm("تعديل اسم العرض فقط من: "+item.currentName+
            "\nإلى: "+item.proposedName+"؟ لن يتغير رابط القناة أو رقمها."))return;
          this.disabled=true;
          try{
            await action("library-title","library-title",{
              sourceId:report.sourceId,type:report.type,itemId:item.id,
              currentName:item.currentName,proposedName:item.proposedName
            });
            show("تم اعتماد الاسم بعد موافقتك فقط.",true);
            row.remove();await loadCatalog(false);
          }catch(e){show("لم يُعتمد الاقتراح: "+e.message,false);this.disabled=false}
        }));
        cell(row,actions);
        $("library-review-suggestions").appendChild(row);
      });
      var duplicates=$("library-review-duplicates");
      duplicates.appendChild(node("h3","التكرارات المحتملة — مراجعة فقط، لا حذف"));
      (report.duplicateExamples||[]).forEach(function(group){
        duplicates.appendChild(node("p",group.title+" • "+group.copies+
          " عناصر محتملة ("+group.items.map(function(x){return x.id}).join(", ")+")"));
      });
      if(!(report.duplicateExamples||[]).length)
        duplicates.appendChild(node("p","لم تُرصد أسماء متطابقة ضمن الفحص."));
      show("اكتمل التحليل دون تعديل المكتبة.",true);
    }catch(e){
      libraryReviewReport=null;$("library-review-export").disabled=true;
      $("library-review-summary").textContent="تعذر تحليل الفهرس: "+e.message;
      show("تعذر تحليل المكتبة: "+e.message,false);
    }finally{run.disabled=false}
  }
  $("library-review-run").addEventListener("click",loadLibraryReview);
  $("library-review-export").addEventListener("click",function(){
    var report=libraryReviewReport;if(!report)return;
    var safe=function(v){
      var t=String(v??"").replace(/"/g,'""');
      if(/^[=+@-]/.test(t))t="'"+t;
      return '"'+t+'"';
    };
    var lines=[["type","id","current_name","suggested_name","reason"].map(safe).join(",")];
    (report.nameSuggestions||[]).forEach(function(x){
      lines.push([report.type,x.id,x.currentName,x.proposedName,x.reason].map(safe).join(","));
    });
    var blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
    var url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="blofy-library-review.csv";link.click();
    setTimeout(function(){URL.revokeObjectURL(url)},1000);
  });
  var libraryAIReady=false,libraryAIOffset=0,libraryAISelection="",libraryAIProvider="gemini";
  var libraryAIProposedPlan=null,libraryAIChatBusy=false,libraryAIUserHistory=[];
  async function refreshAiScanProgress(){
    var sourceId=$("library-ai-source").value||$("library-source").value,
      type=$("library-type").value;
    var label=$("library-ai-scan-progress");
    if(!sourceId){label.textContent="اختر مصدر AI لعرض تقدّم التحليل.";return;}
    label.textContent="جاري قراءة تقدّم التحليل...";
    try{
      var result=await api("library-ai/scan-progress?"+
        new URLSearchParams({sourceId,type}));
      $("library-ai-progress-bar").value=Math.min(100,Math.max(0,result.estimatedPercent||0));
      label.textContent="Gemini حلّل "+count(result.analyzedItems||0)+
        " من "+count(result.totalItems||0)+" عنصرًا — "+count(result.estimatedPercent||0)+
        "% تقريبًا، "+count(result.analyzedBatches||0)+" دفعة، "+
        count(result.suggestedMoves||0)+" اقتراحًا عالي الثقة. التحليل لا يعني اعتماد التغييرات أو وصولها للعملاء.";
    }catch(e){
      label.textContent="⚠ تعذر قراءة تقدّم تحليل AI: "+e.message;
    }
  }
  $("library-ai-progress-refresh").addEventListener("click",function(){void refreshAiScanProgress();});

  async function refreshAiPublishJournal(){
    var sourceId=$("library-ai-source").value||$("library-source").value;
    var area=$("library-ai-history");
    area.replaceChildren();
    if(!sourceId){
      $("library-ai-revision").textContent="حدد مصدر AI حتى تشوف إصدارات المكتبة وسجل نشر التعديلات.";
      return;
    }
    $("library-ai-revision").textContent="جاري قراءة سجل التغييرات المعتمدة...";
    try{
      var journal=await api("library-ai/publish-status?"+new URLSearchParams({sourceId}));
      $("library-ai-revision").textContent="إصدار التغييرات المعتمدة من AI: "+
        count(journal.revision||0)+". حفظ الإصدار لا يعني وصوله لأجهزة العملاء؛ يحتاجون جلب المحتوى من جديد.";
      var edits=Array.isArray(journal.changes)?journal.changes:[];
      if(!edits.length){
        var empty=document.createElement("p");
        empty.textContent="ما فيه تعديلات AI مسجلة لهذا المصدر إلى الآن.";
        area.appendChild(empty);
      }
      edits.slice(0,20).forEach(function(x){
        var line=document.createElement("div");
        line.style.margin="8px 0";
        var label=document.createElement("span");
        label.textContent=(x.operation==="classify_items"?"تصنيف عناصر":x.operation||"تعديل")+
          " — "+count(x.moved||0)+" عنصرًا — "+
          (x.reverted?"تم التراجع": "منشور")+" — "+
          (x.createdAt?new Date(x.createdAt).toLocaleString("ar-SA"):"");
        line.appendChild(label);
        if(x.operation==="classify_items"&&!x.reverted){
          var undo=document.createElement("button");
          undo.className="btn secondary";undo.type="button";
          undo.style.marginInlineStart="12px";undo.textContent="تراجع عن هذا النشر";
          undo.addEventListener("click",async function(){
            if(!confirm("تأكيد التراجع عن تصنيف هذه الدفعة فقط؟ سيتم التحقق من عدم تغيير العناصر بعدها. قد يحتاج العملاء تحديث المحتوى."))return;
            this.disabled=true;
            try{
              var r=await action("library-ai/rollback","library-ai-rollback",{
                sourceId,planId:x.planId
              });
              $("library-ai-chat-status").textContent="✅ تم إرجاع "+count(r.restored||0)+
                " عناصر إلى تصنيفاتها السابقة. إصدار التغييرات: "+count(r.revision||0)+
                ". لم يتم إرسال تحديث تلقائي إلى الأجهزة.";
              await refreshAiPublishJournal();
            }catch(e){
              $("library-ai-chat-status").textContent="⚠ لم يتم التراجع: "+e.message+
                ". لن يتم تغيير العناصر التي تغيّرت بعد النشر.";
              this.disabled=false;
            }
          });
          line.appendChild(undo);
        }
        area.appendChild(line);
      });
    }catch(e){
      $("library-ai-revision").textContent="تعذّر قراءة سجل تغييرات AI: "+e.message;
    }
  }
  $("library-ai-history-refresh").addEventListener("click",function(){void refreshAiPublishJournal();});

  var libraryAIItemOffset=0,libraryAIItemNextOffset=null,libraryAILastItemPrompt='';
  function libraryChatLine(who,text){
    var box=$("library-ai-chat-history");
    var line=node("p",(who==="me"?"أنت: ":"BLOFY AI: ")+String(text||"").slice(0,650));
    box.appendChild(line);
    if(box.childNodes.length>24)box.firstChild.remove();
  }
  $("library-ai-chat-send").addEventListener("click",async function(){
    if(libraryAIChatBusy)return;
    var message=$("library-ai-command").value.trim(),
      sourceId=$("library-ai-source").value||$("library-source").value,
      type=$("library-type").value;
    // Conversational "ارسله للسيرفر" confirms ONLY the already-reviewed plan.
    // Approval still requires an explicit browser confirmation dialog.
    if(libraryAIProposedPlan&&/^(?:اعتمد(?: الخطة)?|انشر(?:ها)?(?: الآن)?|ارسل(?:ه|ها)?(?: للسيرفر)?|طبّق(?:ها)?(?: الآن)?)\.?$/u.test(message)){
      libraryChatLine("me",message);
      $("library-ai-chat-apply").click();return;
    }
    libraryAIProposedPlan=null;$("library-ai-chat-apply").disabled=true;
    $("library-ai-chat-preview").replaceChildren();
    if(message!==libraryAILastItemPrompt){libraryAIItemOffset=0;libraryAIItemNextOffset=null;}
    $("library-ai-item-next").disabled=true;
    if(message.length<4||message.length>480){
      $("library-ai-chat-status").textContent="اكتب طلبًا واضحًا من 4 إلى 480 حرفًا.";return;
    }
    if(!sourceId){
      $("library-ai-chat-status").textContent="اختر «مصدر AI» أولاً، ثم اكتب طلبك.";$("library-ai-source").focus();return;
    }
    libraryAIChatBusy=true;this.disabled=true;
    $("library-ai-chat-status").textContent="Gemini يجهّز خطة للمراجعة، ولا يغيّر شيئًا الآن...";
    libraryChatLine("me",message);
    try{
      var result=await action("library-ai/chat","library-ai-chat",{
        sourceId,type,message,history:libraryAIUserHistory.slice(-4),
        offset:libraryAIItemOffset});
      libraryAIUserHistory.push(message);
      if(libraryAIUserHistory.length>4)libraryAIUserHistory.shift();
      libraryChatLine("ai",result.reply||"تم تحليل الطلب.");
      if(result.action==="classify_items")void refreshAiScanProgress();
      if(result.action==="classify_items"){
        libraryAILastItemPrompt=message;
        libraryAIItemNextOffset=Number.isInteger(result.nextOffset)?result.nextOffset:null;
        $("library-ai-item-next").disabled=libraryAIItemNextOffset===null;
      }else{
        libraryAIItemOffset=0;libraryAIItemNextOffset=null;libraryAILastItemPrompt="";
        $("library-ai-item-next").disabled=true;
      }
      if(result.requiresApproval&&result.planId){
        libraryAIProposedPlan={id:result.planId,sourceId,type,summary:result.summary};
        $("library-ai-chat-apply").disabled=false;
        var review=$("library-ai-chat-preview");review.replaceChildren();
        var assignments=Array.isArray(result.itemAssignments)?result.itemAssignments:[];
        if(assignments.length){
          var heading=document.createElement("strong");
          heading.textContent="مراجعة نقل العناصر إلى فئات موجودة، ثقة مرتفعة فقط:";
          review.appendChild(heading);
          assignments.slice(0,12).forEach(function(x){
            var item=document.createElement("p");
            item.textContent=String(x.title||"")+" ← "+String(x.newCategoryName||"")+
              " · "+String(x.reason||"");
            review.appendChild(item);
          });
        }
        var beforeAfter=Array.isArray(result.proposedChanges)?result.proposedChanges:[];
        var categories=Array.isArray(result.categoryPreview)?result.categoryPreview:[];
        var complete=Array.isArray(result.fullCatalogPreview)?result.fullCatalogPreview:[];
        if(assignments.length){
          // Moves are displayed above; do not display any unrelated sorting preview.
        }else if(complete.length){
          var head=document.createElement("strong");
          head.textContent="معاينة ترتيب الأقسام لجميع الأنواع الثلاثة:";
          review.appendChild(head);
          complete.forEach(function(section){
            var mediaName=section.type==="live"?"القنوات":
              section.type==="movie"?"الأفلام":"المسلسلات";
            var heading=document.createElement("p");
            heading.textContent=mediaName+" — "+String(section.coverage?.categories||0)+
              " قسمًا، "+String(section.coverage?.arabicCategories||0)+
              " أقسام عربية، "+String(section.coverage?.datedAtLeast2026||0)+
              " بأسماء تحتوي على سنة 2026 فما فوق.";
            review.appendChild(heading);
            (section.categoriesFirst||[]).slice(0,8).forEach(function(name,index){
              var item=document.createElement("p");
              item.textContent=(index+1)+" — "+String(name||"");
              review.appendChild(item);
            });
          });
          var warning=document.createElement("p");
          warning.textContent="فرز الأقسام الحالية فقط؛ لم يتم نقل كل فيلم أو مسلسل لفئة جديدة، أو التحقق من سنوات الإنتاج للعناوين.";
          review.appendChild(warning);
        }else if(beforeAfter.length){
          var title=document.createElement("strong");title.textContent="الأسماء قبل ← بعد:";
          review.appendChild(title);
          beforeAfter.slice(0,12).forEach(function(x){
            var line=document.createElement("p");
            line.textContent=String(x.before||"")+"  ←  "+String(x.after||"");
            review.appendChild(line);
          });
        }else if(categories.length){
          var head=document.createElement("strong");head.textContent="أول 12 قسمًا بعد الترتيب:";
          review.appendChild(head);
          categories.slice(0,12).forEach(function(x,index){
            var line=document.createElement("p");line.textContent=(index+1)+" — "+String(x.name||"");
            review.appendChild(line);
          });
        }
        $("library-ai-chat-status").textContent="خطة جاهزة للمراجعة: "+result.summary+
          ". لن تنشر إلا بعد الضغط على زر الاعتماد.";
      }else{
        $("library-ai-chat-status").textContent=result.reply||"تمت مراجعة الطلب؛ لا يوجد تغيير معتمد للنشر.";
      }
    }catch(e){
      $("library-ai-chat-status").textContent="تعذر تحليل الطلب: "+e.message;
    }finally{libraryAIChatBusy=false;this.disabled=false;}
  });
  $("library-ai-item-next").addEventListener("click",function(){
    if(libraryAIChatBusy||libraryAIItemNextOffset===null)return;
    libraryAIItemOffset=libraryAIItemNextOffset;
    $("library-ai-command").value=libraryAILastItemPrompt;
    $("library-ai-chat-send").click();
  });
  $("library-ai-chat-apply").addEventListener("click",async function(){
    if(!libraryAIProposedPlan||libraryAIChatBusy)return;
    var plan=libraryAIProposedPlan;
    if(plan.sourceId!==($("library-ai-source").value||$("library-source").value)||
       plan.type!==$("library-type").value){
      this.disabled=true;libraryAIProposedPlan=null;
      $("library-ai-chat-status").textContent="تغير المصدر أو نوع المحتوى. أعد إنشاء الخطة.";return;
    }
    if(!confirm("هل تعتمد تغيير ترتيب الأقسام في مصدر BLOFY المحدد؟\\n"+
      plan.summary+"\\nقد تظهر النتيجة للعملاء بعد تحديث مكتبتهم. لن نعدل اشتراكاتهم أو وسائط التشغيل."))return;
    this.disabled=true;libraryAIChatBusy=true;libraryAIProposedPlan=null;
    $("library-ai-chat-status").textContent="جاري حفظ ترتيب الأقسام في السيرفر...";
    try{
      var r=await action("library-ai/apply","library-ai-apply",{planId:plan.id,approve:true});
      if(r.catalogRevision!=null)void refreshAiPublishJournal();
      libraryChatLine("ai","تم تطبيق الترتيب في السيرفر. تحديث القوائم عند العملاء يحتاج إعادة جلبها من التطبيق؛ لم تُرسل إشعارات دفع للأجهزة.");
      $("library-ai-chat-status").textContent=r.changedOnServer?
        "✅ تم حفظ تغييرات المكتبة على السيرفر. العملاء يحتاجون تحديث المكتبة. عناصر نقلت: "+count(r.movedItems||0)+"، عناوين نظفت: "+count(r.changedTitles||0)+"، فئات مرتبة: "+count(r.updatedCategories||0):
        "تعذر إثبات حفظ التغيير.";
    }catch(e){
      $("library-ai-chat-status").textContent="لم يُنشر التغيير: "+e.message;
    }finally{libraryAIChatBusy=false;}
  });
  $("library-ai-source").addEventListener("change",function(){
    libraryAIItemOffset=0;libraryAIItemNextOffset=null;libraryAILastItemPrompt="";
    $("library-ai-item-next").disabled=true;
    libraryAIProposedPlan=null;libraryAIUserHistory=[];
    $("library-ai-chat-apply").disabled=true;
    $("library-ai-history").replaceChildren();
    $("library-ai-revision").textContent="اختر «سجل نشر AI والتراجع» لعرض إصدار المصدر.";
    $("library-ai-scan-progress").textContent="اختر «تقدّم تحليل المكتبة» لقراءة إحصاءات المصدر.";
    $("library-ai-progress-bar").value=0;
    $("library-ai-chat-preview").replaceChildren();
  });
  $("library-type").addEventListener("change",function(){
    libraryAIItemOffset=0;libraryAIItemNextOffset=null;libraryAILastItemPrompt="";
    $("library-ai-item-next").disabled=true;
    libraryAIProposedPlan=null;$("library-ai-chat-apply").disabled=true;
  });

  async function updateLibraryAIStatus(){
    $("library-ai-status").textContent="جارٍ التحقق من حالة Gemini...";
    try{
      var result=await api("library-ai/status");
      libraryAIReady=result.configured===true;
      libraryAIProvider=result.provider||"غير معروف";
      $("library-ai-run").disabled=false;
      $("library-ai-status").textContent=libraryAIReady?
        "✅ "+(libraryAIProvider==="gemini"?"Gemini":"AI "+libraryAIProvider)+
        " مهيأ في خدمة التفعيل. اضغط اقتراح تصنيف 12 عنوانًا لاختبار أول طلب فعلي. الحالة لا تثبت صلاحية المفتاح.":
        "⚠ الذكاء الاصطناعي غير مهيأ في خدمة التفعيل؛ مزود الخدمة: "+
        libraryAIProvider+". تحقّق من BLOFY_LIBRARY_AI_PROVIDER وBLOFY_LIBRARY_GEMINI_API_KEY في Railway.";
      return result;
    }catch(e){
      libraryAIReady=false;$("library-ai-run").disabled=false;
      $("library-ai-status").textContent="⚠ فشل فحص إعدادات Gemini: "+e.message+
        ". الزر متاح لإظهار حالة المشكلة بدل تعطيله بصمت.";
      return null;
    }
  }
  $("library-ai-source").addEventListener("change",function(){
    libraryAIOffset=0;libraryAISelection="";
    $("library-ai-results").replaceChildren();
    $("library-ai-status").textContent=this.value?
      "المصدر محدد. اضغط «اقترح تصنيف 12 عنوانًا» لطلب اقتراحات Gemini.":
      "اختر مصدرًا محددًا من القائمة القريبة لتفعيل اقتراحات Gemini.";
  });
  $("library-ai-check").addEventListener("click",async function(){
    this.disabled=true;
    $("library-ai-status").textContent="جارٍ إرسال مثال آمن وصغير إلى Gemini للتحقق من المفتاح والنموذج...";
    try{
      var statusResult=await updateLibraryAIStatus();
      if(!statusResult?.configured){
        $("library-ai-status").textContent="⚠ Gemini غير مهيأ في Railway؛ افحص مزود AI والمفتاح في بوابة التفعيل.";
        return;
      }
      if(statusResult.provider!=="gemini"){
        $("library-ai-status").textContent="⚠ المزود النشط ليس Gemini: "+statusResult.provider;
        return;
      }
      var result=await action("library-ai/test","library-ai-test",{});
      $("library-ai-status").textContent=result.ok?
        "✅ اتصال Gemini ناجح بالمفتاح والنموذج الحالي. الاقتراحات التجريبية: "+
          count(result.suggestionsReturned||0)+" (لم يتغير أي محتوى).":
        "⚠ اختبار Gemini لم ينجح: "+(result.code||"unknown");
    }catch(e){
      var messages={
        stream_ai_provider_auth_failed:"المفتاح غير صالح أو لا يملك تصريحًا.",
        stream_ai_provider_quota:"انتهت الحصة أو تم تجاوز حدود Gemini.",
        stream_ai_provider_model_missing:"النموذج المختار غير متاح للمفتاح.",
        stream_ai_provider_bad_request:"Gemini رفض تنسيق الطلب؛ يلزم تصحيح البرمجة.",
        stream_ai_model_not_allowed:"النموذج غير مسموح في إعدادات BLOFY.",
        stream_ai_incomplete:"النموذج لم يكمل الرد.",
        stream_ai_invalid_output:"رد Gemini لا يطابق الصيغة المطلوبة.",
        stream_ai_request_failed:"تعذّر اتصال بوابة التفعيل بـ Gemini أو انتهت المهلة.",
        gemini_connection_test_cooldown:"الفحص محدود: مرة كل دقيقة وخمس مرات بالساعة.",
        unified_bridge_unreachable:"بوابة التفعيل لا تستجيب عبر الربط المحمي.",
        unified_bridge_not_configured:"الربط الداخلي بين الخدمات غير مهيأ."
      };
      $("library-ai-status").textContent="⚠ فشل اختبار Gemini: "+(messages[e.message]||e.message);
    }finally{this.disabled=false;}
  });
  $("library-ai-run").addEventListener("click",async function(){
    if(!libraryAIReady){
      await updateLibraryAIStatus();
      if(!libraryAIReady){show("Gemini غير مهيأ أو خدمة الربط لا تستجيب. راجع الرسالة داخل قسم AI.",false);return}
    }
    var sourceId=$("library-ai-source").value||$("library-source").value,
      type=$("library-type").value;
    if(!sourceId){
      var sources=(state.overview&&state.overview.sources)||[];
      if(sources.length===1){sourceId=sources[0].id;$("library-ai-source").value=sourceId;}
    }
    if(!sourceId){
      $("library-ai-status").textContent="⚠ اختر مصدر Xtream من قائمة «مصدر AI» الموجودة هنا أولًا، لأن «جميع المصادر» لا يصلح لاقتراح 12 عنوانًا.";
      $("library-ai-source").focus();
      return;
    }
    $("library-ai-status").textContent="تم اختيار المصدر: "+
      ($("library-ai-source").selectedOptions[0]?.textContent||sourceId.slice(0,8));
    var selection=sourceId+":"+type;
    if(libraryAISelection!==selection){libraryAIOffset=0;libraryAISelection=selection}
    if(!confirm("سيُرسل إلى "+(libraryAIProvider==="gemini"?"Google Gemini":"مزود الذكاء الاصطناعي")+
        " ما يصل إلى 12 اسم محتوى وفئتها فقط. قد تُحسب تكلفة API. لا توجد تعديلات تلقائية. هل تتابع؟"))return;
    this.disabled=true;$("library-ai-status").textContent="جارٍ طلب توصيات AI للدفعة "+(libraryAIOffset/12+1)+"...";
    try{
      var result=await action("library-ai","library-ai",{sourceId,type,offset:libraryAIOffset});
      $("library-ai-results").replaceChildren();
      (result.suggestions||[]).forEach(function(item){
        var tr=node("tr");
        cell(tr,item.currentName);cell(tr,item.suggestedName);
        cell(tr,item.category);
        cell(tr,item.confidence+" — "+item.reason);
        $("library-ai-results").appendChild(tr);
      });
      $("library-ai-status").textContent=
        "اقتراحات AI للمراجعة فقط — "+count(result.suggestions?.length||0)+
        " اقتراحًا من "+count(result.sourceItems)+" عنوانًا • النموذج: "+result.model+
        " • لا يوجد تعديل تلقائي.";
      libraryAIOffset=result.nextOffset===null?0:result.nextOffset;
      show("اكتمل تحليل دفعة AI؛ راجع النتائج دون تغيير أي محتوى.",true);
    }catch(e){
      $("library-ai-status").textContent="لم تنجح توصيات AI: "+e.message+
        ". تحليل المكتبة المحلي يبقى متاحًا.";
      show("تعذر تحليل AI: "+e.message,false);
    }finally{this.disabled=false}
  });
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
  $("library-refresh-source").addEventListener("click",async function(){
    var source=$("library-source").value;
    if(!source){show("اختر مصدرًا محددًا قبل تحديث المحتوى حتى لا نضغط على كل المصادر.",false);return}
    var typ=$("library-type").value;
    if(!confirm("تحديث فهرس "+(typ==="live"?"القنوات":typ==="movie"?"الأفلام":"المسلسلات")+" للمصدر المحدد؟ سيعمل في الخلفية داخل الخدمة."))return;
    this.disabled=true;
    try{
      var result=await action("source/"+source+"/sync","source-sync",{types:[typ]});
      show("تم إرسال طلب مزامنة Xtream. بعد اكتماله اضغط بحث لتظهر نفس قائمة المصدر وترتيبه.",true);
      await refresh();await loadCatalog(false);
    }catch(e){show("تعذر تحديث المحتوى: "+e.message,false)}
    finally{this.disabled=false}
  });
  $("library-codes-sync-all").addEventListener("click",async function(){
    var sourceId=$("library-source").value;
    var status=$("library-codes-sync-status");
    if(!sourceId){
      status.textContent="⚠ اختر مصدر Xtream محددًا (مثل saleh) أولًا. لن نزامن جميع المصادر بدون تحديد.";
      $("library-source").focus();return;
    }
    var original=(state.overview?.sources||[]).find(function(x){return x.id===sourceId;});
    if(!original){status.textContent="المصدر المحدد غير موجود في قائمة BLOFY.";return;}
    if(!original.enabled||!original.publishCatalog){
      status.textContent="المصدر غير مفعل أو غير منشور. لن نغيّر إعداداته أو اشتراكات العملاء.";
      return;
    }
    if(original.syncing||original.queued){
      status.textContent="المصدر يتزامن بالفعل. ننتظر اكتمال المزامنة الحالية.";return;
    }
    if(!confirm("هل أقرأ الترتيب والمحتوى الحالي من لوحة Xtream لمصدر "+
      original.name+" للقنوات والأفلام والمسلسلات؟ سيظهر للأكواد المرتبطة بعد اكتمال المزامنة وتحديث العملاء للمحتوى، حسب ما ترجعه واجهة المصدر. لا نغيّر الاشتراكات."))return;
    this.disabled=true;
    var button=this,lastSync=Number(original.lastSyncAt)||0;
    status.textContent="جاري إرسال مزامنة الأنواع الثلاثة لمصدر "+original.name+"...";
    try{
      var sent=await action("source/"+sourceId+"/sync","source-sync",{
        types:["live","movie","series"]
      });
      status.textContent=sent.queued?
        "✅ أُضيفت مزامنة المصدر إلى الانتظار. لم تكتمل بعد.":
        "✅ تم قبول الطلب وبدأت المزامنة. متابعة القنوات والأفلام والمسلسلات...";
      var attempt=0,maxAttempts=36;
      async function check(){
        if(++attempt>maxAttempts){
          status.textContent="المزامنة استغرقت أكثر من مدة المتابعة. راجع حالة المصدر من لوحة المصادر؛ لا يمكن تأكيد وصول الترتيب للأكواد بعد.";
          button.disabled=false;return;
        }
        try{
          var response=await api("overview");
          var updated=(response.sources||[]).find(function(x){return x.id===sourceId;});
          if(!updated){
            status.textContent="تعذر العثور على المصدر بعد طلب المزامنة.";
            button.disabled=false;return;
          }
          if(updated.status==="error"&&!updated.syncing&&!updated.queued){
            status.textContent="⚠ فشلت مزامنة Xtream. راجع المصدر وسجلات الخطأ، ولا تعتمد أن الأكواد تحدثت.";
            button.disabled=false;return;
          }
          if(updated.status==="online"&&Number(updated.lastSyncAt)>lastSync){
            status.textContent="✅ اكتملت مزامنة المصدر حسب حالة السيرفر. الأكواد المرتبطة تستخدم نفس الفهرس الآن عند إعادة جلب المحتوى. تأكد من ترتيب عينة على كود تجريبي؛ واجهة 8K قد لا تنقل ترتيب الباقات نفسه.";
            button.disabled=false;
            await refresh();await loadCatalog(false);return;
          }
          status.textContent="جار المزامنة... "+(updated.queued?
            "بانتظار دور المصدر":"حالة المصدر: "+stateLabel(updated))+
            " (فحص "+count(attempt)+" من "+count(maxAttempts)+").";
        }catch(e){
          status.textContent="متابعة المزامنة غير متاحة مؤقتًا: "+e.message+
            ". سأعيد الفحص؛ لا نعتبرها مكتملة.";
        }
        window.setTimeout(check,5000);
      }
      window.setTimeout(check,5000);
    }catch(e){
      status.textContent="⚠ لم يبدأ نقل تحديثات Xtream: "+e.message;
      this.disabled=false;
    }
  });
  function selectedOpsSource(){
    var id=$("library-source").value;
    if(!id){$("library-auto-status").textContent="اختر مصدرًا واحدًا أولًا؛ لن نغيّر إعدادات جميع المصادر دفعة واحدة.";}
    return id;
  }
  async function refreshSourceOps(){
    var sourceId=selectedOpsSource();
    if(!sourceId)return;
    $("library-auto-status").textContent="جاري قراءة إعدادات المزامنة التلقائية...";
    try{
      var results=await Promise.allSettled([
        api("ops/schedule?"+new URLSearchParams({sourceId})),
        api("ops/source-stats?"+new URLSearchParams({sourceId}))
      ]);
      if(sourceId!==$("library-source").value)return;
      if(results[0].status==="fulfilled"){
        var cfg=results[0].value;
        $("library-auto-hours").value=String(cfg.intervalHours||24);
        $("library-auto-status").textContent=cfg.enabled?
          "✅ المزامنة التلقائية مفعلة كل "+count(cfg.intervalHours)+" ساعة. التشغيل القادم: "+
            (cfg.nextRunAt?new Date(cfg.nextRunAt).toLocaleString("ar-SA"):"غير محدد"):
          "المزامنة التلقائية متوقفة لهذا المصدر. اضغط تفعيل لجدولتها؛ لا يبدأ النقل فورًا.";
      }else $("library-auto-status").textContent="⚠ تعذر قراءة جدول المزامنة: "+results[0].reason.message;
      if(results[1].status==="fulfilled"){
        var stats=results[1].value;
        $("library-ops-stats").textContent=
          "حالة المصدر: "+String(stats.status||"غير معروفة")+
          " | آخر مزامنة: "+(stats.lastSyncAt?new Date(stats.lastSyncAt).toLocaleString("ar-SA"):"لا يوجد")+
          " | إصدار المكتبة: "+count(stats.catalogRevision||0)+
          " | أكواد: "+count(stats.codes?.total||0)+
          " (مفعّلة سابقًا: "+count(stats.codes?.redeemed||0)+")"+
          " | حسابات نشطة: "+count(stats.accounts?.active||0)+
          " | مشاهدون حاليون: غير مقاس من هذا التقرير.";
        var upstream=stats.liveSourceCapacity||{},observed=stats.livePlayback||{};
        var warnings=Array.isArray(upstream.warningCodes)?upstream.warningCodes:[];
        var notice=warnings.includes("source_single_upstream_connection")?
          "⚠ مصدر Xtream نفسه يعلن اتصالًا متزامنًا واحدًا؛ إنشاء كودين BLOFY لا يضاعف سعة المصدر. يمكن أن يفصل أحد المشاهدين عند فتح الثاني. راجع حدود وصلاحية البث من صاحب المصدر.":
          warnings.includes("source_no_upstream_connections")?
          "⚠ المصدر الأصلي يعلن عدم إتاحة اتصالات مشاهدة.":
          warnings.includes("source_upstream_limit_unknown")?
          "حد الاتصالات المسموح من Xtream غير معروف بعد؛ لا يمكن ضمان تشغيل كودين في الوقت نفسه.":
          "الحد المعلن من Xtream: "+count(upstream.maxConnections)+" اتصالًا متزامنًا لحساب المصدر كله، وليس لكل كود BLOFY.";
        if(warnings.includes("source_restream_not_authorized"))
          notice+=" لا يظهر إذن إعادة بث على المصدر؛ لن نفعّل مشاركة القنوات دون تصريح.";
        var licensed=stats.licensedLiveFanout||{},shared=stats.sharedMediaHealth||{};
        if(licensed.enabledForSource===true){
          notice+=" ✅ التوزيع المرخّص مهيأ للقناة نفسها: اتصال مصدر واحد ومشاركة بيانات TS لغاية "+
            count(licensed.maxSharedViewersPerChannelDesign||128)+
            " مشاهدًا في التصميم، وليس ضمانًا فعليًا قبل اختبار الضغط.";
          if(shared.ok===true)
            notice+=" | مشتركون متصلون بمنفذ المشاركة الآن (جميع مصادر هذه العملية): "+
              count(shared.activeSharedViewers||0)+
              " | قنوات مشتركة: "+count(shared.activeSharedChannels||0)+
              " | إعادة وصل المصدر: "+count(shared.upstreamReconnects||0);
          else notice+=" | قياسات المشاركة المباشرة غير متاحة.";
        }else if(licensed.upstreamRestreamerPermitted!==true){
          notice+=" مشاركة بث القناة لأكثر من 100 جهاز تحتاج إذنًا صريحًا من مزود Xtream (إعادة بث). التفعيل غير متاح لهذا المصدر حتى تثبت الصلاحية.";
        }else{
          notice+=" المصدر يعلن صلاحية إعادة البث؛ ميزة مشاركة أكثر من 100 مشاهد أُعدت لكنها غير مفعلة حتى يتم التأكد من الإذن المكتوب والتشغيل التجريبي.";
        }
        $("library-live-capacity-status").textContent=notice+
          " | الاتصالات في آخر تقرير Xtream: "+
          (upstream.activeConnections===null||upstream.activeConnections===undefined?
           "غير متاحة":count(upstream.activeConnections))+
          " | بث مباشر انتهى من المصدر: "+count(observed.upstreamEnded||0)+
          " | انقطاعات 5–35 ثانية مرصودة: "+count(observed.shortLiveUpstreamEnds||0)+
          " | إغلاق من العميل/الوسيط: "+count(observed.clientOrProxyClosed||0)+
          ". هذه مؤشرات من عملية السيرفر الحالية، وليست عدد المشاهدين الحقيقي.";
      }else {
        $("library-ops-stats").textContent="⚠ تعذر قراءة إحصائيات الأكواد: "+results[1].reason.message;
        $("library-live-capacity-status").textContent="لا يمكن تحديد حد اتصالات Xtream من هذه القراءة.";
      }
    }catch(e){$("library-auto-status").textContent="خطأ فحص المصدر: "+e.message;}
  }
  async function configureAutoSync(enabled,button){
    var sourceId=selectedOpsSource();
    if(!sourceId)return;
    var hours=Number($("library-auto-hours").value);
    if(![12,24,48,168].includes(hours))return;
    var desc=enabled?"تفعيل المزامنة التلقائية كل "+hours+
      " ساعة لهذا المصدر فقط (القنوات والأفلام والمسلسلات)":
      "إيقاف المزامنة التلقائية لهذا المصدر";
    if(!confirm(desc+"؟ لن تتغير أكواد المشتركين أو مددها."))return;
    button.disabled=true;
    try{
      var cfg=await action("ops/schedule","ops-schedule",{sourceId,enabled,intervalHours:hours});
      $("library-auto-status").textContent=cfg.enabled?
        "✅ تم حفظ الجدول. أول فحص مجدول بعد "+count(hours)+
        " ساعة؛ لم تبدأ مزامنة فورية.":"✅ أوقفت المزامنة التلقائية لهذا المصدر.";
      await refreshSourceOps();
    }catch(e){$("library-auto-status").textContent="⚠ تعذّر حفظ جدول المزامنة: "+e.message;}
    finally{button.disabled=false;}
  }
  $("library-auto-enable").addEventListener("click",function(){void configureAutoSync(true,this);});
  $("library-auto-disable").addEventListener("click",function(){void configureAutoSync(false,this);});
  $("library-ops-refresh").addEventListener("click",function(){void refreshSourceOps();});
  $("library-source").addEventListener("change",function(){
    $("library-auto-status").textContent="اختر «فحص حالة المصدر والأكواد» لقراءة الحالة.";
    $("library-ops-stats").textContent="اختر مصدرًا للتحقق من الأكواد وإصدار المحتوى.";
    $("library-live-capacity-status").textContent="اختر مصدرًا واضغط فحص حالة المصدر والأكواد للتحقق من عدد الاتصالات الأصلي.";
    $("library-snapshots-status").replaceChildren();
  });
  $("library-snapshots-refresh").addEventListener("click",async function(){
    var sourceId=selectedOpsSource();
    if(!sourceId)return;
    var box=$("library-snapshots-status");
    box.replaceChildren();box.textContent="جار فحص نسخ التخصيصات...";
    this.disabled=true;
    try{
      var result=await api("ops/snapshots?"+new URLSearchParams({sourceId}));
      box.replaceChildren();
      var items=Array.isArray(result.snapshots)?result.snapshots:[];
      if(!items.length){box.textContent="لا توجد نسخ من تخصيصات هذا المصدر.";return;}
      items.slice(0,15).forEach(function(x){
        var line=document.createElement("p");
        line.textContent=String(x.label||"نسخة")+" — "+
          (x.createdAt?new Date(x.createdAt).toLocaleString("ar-SA"):"")+
          " | أقسام: "+count(x.categories||0)+" | تعديلات عناصر: "+count(x.items||0);
        box.appendChild(line);
      });
    }catch(e){box.textContent="⚠ تعذر عرض نسخ التخصيصات: "+e.message;}
    finally{this.disabled=false;}
  });
  $("library-snapshot-create").addEventListener("click",async function(){
    var sourceId=selectedOpsSource();
    if(!sourceId)return;
    if(!confirm("هل تريد حفظ نسخة من تخصيصات هذا المصدر؟ ليست نسخة احتياطية كاملة من محتوى Xtream أو قاعدة البيانات."))return;
    this.disabled=true;
    $("library-snapshots-status").textContent="جاري حفظ تخصيصات المصدر...";
    try{
      var stamp=new Date().toISOString().slice(0,16).replace("T"," ");
      var result=await action("ops/snapshot","ops-snapshot",{
        sourceId,label:"BLOFY before sync "+stamp,confirmed:true
      });
      $("library-snapshots-status").textContent="✅ حُفظت تخصيصات "+
        count(result.categories||0)+" قسمًا و"+count(result.items||0)+
        " عنصرًا. لا تشمل النسخة محتوى Xtream كاملًا.";
    }catch(e){$("library-snapshots-status").textContent="⚠ فشل حفظ التخصيصات: "+e.message;}
    finally{this.disabled=false;}
  });
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
  async function copyCode(code){
    var key=String(code.id||"");
    if(!code.copyAvailable&&!recentlyIssuedCodes.has(key)){
      show("هذا الكود قديم وغير قابل للاسترجاع؛ لا تصدر كودًا بديلًا إلا عند الحاجة.",false);return;
    }
    try{
      var actual=recentlyIssuedCodes.get(key);
      if(!actual){
        var revealed=await api("code/"+key+"/reveal");actual=revealed.code;
      }
      await navigator.clipboard.writeText(String(actual));
      show("تم نسخ الكود المحدد.",true);
    }catch(e){show("تعذر نسخ الكود: "+e.message,false)}
  }
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
      var copyBtn=button("نسخ الكود",function(){void copyCode(code)},"secondary sm");
      copyBtn.disabled=code.status==="revoked"||(!code.copyAvailable&&!visibleCode);
      codeCell.appendChild(copyBtn);
      if(!visibleCode)codeCell.appendChild(node("small",
        code.copyAvailable?" محفوظ مشفّر — انسخه عند الحاجة":" الرقم الكامل غير قابل للاسترجاع","muted"));
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
            if(d.code)recentlyIssuedCodes.set(String(code.id),String(d.code));
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
  $("codes-copy-visible").addEventListener("click",async function(){
    var available=state.codes.filter(function(c){
      return c.status!=="revoked"&&(c.copyAvailable||recentlyIssuedCodes.has(String(c.id)));
    });
    if(!available.length){show("لا توجد أكواد كاملة قابلة للاسترجاع في هذه الصفحة.",false);return}
    this.disabled=true;
    try{
      var codes=[];
      for(const code of available){
        var secret=recentlyIssuedCodes.get(String(code.id));
        if(!secret){var reply=await api("code/"+code.id+"/reveal");secret=reply.code;}
        codes.push(String(secret));
      }
      await navigator.clipboard.writeText(codes.join("\n"));
      show("تم نسخ "+codes.length+" كودًا قابلًا للاسترجاع من الصفحة المعروضة.",true);
    }catch(e){show("تعذر نسخ المجموعة: "+e.message,false)}
    finally{this.disabled=false}
  });
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
      target.appendChild(node("p","تظهر الأرقام الكاملة هنا، ويمكن استرجاع الأكواد الجديدة لاحقًا بزر نسخ الكود؛ تُحفظ مشفّرة في قاعدة البيانات.","muted"));
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
  function renderLive(items,mediaPaths){
    var byPath=new Map((mediaPaths||[]).map(function(p){return [p.name,p]}));
    var tbody=$("live-active");tbody.replaceChildren();
    if(!items.length){
      var tr=node("tr");var td=cell(tr,"لا توجد قنوات تبثها هذه الخدمة الآن");td.colSpan=5;
      tbody.appendChild(tr);return;
    }
    items.forEach(function(item){
      var tr=node("tr");cell(tr,item.title||item.channelId);
      cell(tr,item.path+(item.backupConfigured?" · بديل مفعل":""));
      var mt=byPath.get(item.path);
      cell(tr,mt&&mt.hlsViewers!==null&&mt.hlsViewers!==undefined?
        String(mt.hlsViewers):"لم يبدأ HLS");
      var status=item.connections>0?String(item.connections)+" اتصال بالمصدر":
        "جاهز عند الطلب · لا يوجد سحب حالي";
      if(item.failovers)status+=" · تبديلات: "+item.failovers;
      if(item.probePending)status+=" · فحص HLS جار";
      else if(item.lastProbe){
        var reason=String(item.lastProbe.code||"");
        var cause={
          restream_provider_not_found:"القناة غير موجودة لدى المصدر (404)",
          restream_provider_denied:"المصدر رفض الاتصال أو بلغ حد الاتصالات",
          restream_provider_unavailable:"اتصال المصدر غير متاح",
          restream_invalid_media:"المصدر لم يرسل فيديو TS صالحًا",
          restream_hls_unavailable:"محرك HLS لم يقدم مقطعًا",
          restream_smoke_http_error:"فشل طلب HLS من المحرك"
        };
        status+=item.lastProbe.ok?" · HLS يعمل":" · فشل: "+(cause[reason]||reason);
      }
      if(item.lastError&&!item.probePending)
        status+=" · المصدر: "+String(item.lastError).slice(0,70);
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
        var video=$("live-preview");
        if(!video.canPlayType("application/vnd.apple.mpegurl")){
          video.pause();video.removeAttribute("src");video.load();
          video.style.display="none";
          $("live-result").textContent="هذا المتصفح لا يدعم HLS مباشرة. شاشة سوداء هنا لا تعني أن القناة متوقفة. استخدم فحص HLS لتأكيد وصول المقاطع، أو مشغل HLS يدعمها مثل VLC.";
          return;
        }
        video.style.display="block";video.src=item.playlist;video.load();
        $("live-result").textContent="تم فتح معاينة HLS. تأكد من ظهور فيديو فعلي، وليس الصورة الثابتة للقناة.";
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
  var liveProbeRefresh=null;
  async function loadAutoHealth(){
    try{
      var d=await api("auto-health");
      value("auto-health-status",d.ok?(d.checkedAt?"المراقبة تعمل":"جار بدء المراقبة"):"الحالة غير متاحة");
      value("auto-health-total",count(d.totals?.paths));
      value("auto-health-good",count(d.totals?.healthy));
      value("auto-health-bad",count(d.totals?.failed));
      value("auto-health-unknown",count((d.totals?.untested||0)+(d.totals?.stale||0)+(d.totals?.warning||0)));
      value("auto-health-mode",d.recoveryProbeEnabled?
        "مسموح بإعادة فحص مسار واحد عند تكرر فشل عينة HLS، بشرط وجود مصدر احتياطي، وبدون تغيير تشغيل العملاء.":
        "مراقبة دورية للبيانات فقط؛ بدون اتصالات مصدر جديدة أو تعديل اشتراكات العملاء.");
      var l=$("auto-health-paths");l.replaceChildren();
      var statuses={healthy:"نجحت عينة HLS",failed:"فشلت عينة HLS",checking:"الفحص جار",
        stale:"نتيجة قديمة",untested:"لم يُختبر",warning:"تعثر سحب المصدر"};
      (d.paths||[]).forEach(function(item){
        var tr=node("tr"),description=node("div");
        description.appendChild(node("div",item.title||item.path,"name"));
        description.appendChild(node("small",item.path,"meta"));
        cell(tr,description);
        cell(tr,node("span",statuses[item.status]||"غير معروف",
          item.status==="healthy"?"ok":item.status==="failed"?"fail":"warn"));
        cell(tr,item.backupConfigured?"متوفر":"غير محدد");l.appendChild(tr);
      });
      if(!(d.paths||[]).length){var tr=node("tr"),td=cell(tr,"لا توجد مسارات مراقبة حتى الآن.");td.colSpan=3;l.appendChild(tr);}
      var log=$("auto-health-events");log.replaceChildren();
      var kinds={transport_failure:"تعثر النقل",transport_restored:"استعادة عينة HLS",
        controlled_reprobe_requested:"إعادة فحص محدودة",reprobe_unavailable:"فشل إعادة الفحص"};
      (d.events||[]).slice(0,24).forEach(function(ev){
        var tr=node("tr");
        cell(tr,Number.isFinite(ev.at)?new Date(ev.at).toLocaleTimeString("en-GB",{timeZone:"Asia/Riyadh"}):"—");
        cell(tr,ev.path);cell(tr,kinds[ev.kind]||"تحديث الحالة");log.appendChild(tr);
      });
      if(!(d.events||[]).length){var tr=node("tr"),td=cell(tr,"لا توجد أحداث خلال عمر هذه النسخة.");td.colSpan=3;log.appendChild(tr);}
    }catch(e){value("auto-health-status","غير متاح");value("auto-health-mode","تعذر قراءة التقرير: "+e.message)}
  }
  async function loadSecurity(){
    try{
      var d=await api("security");
      value("security-status",d.ok&&d.protection?.operatorBruteForce?"الحماية تعمل":"الحالة غير متاحة");
      value("security-auth-failures",count(d.operator?.failedAuthAttempts));
      value("security-auth-throttled",count(d.operator?.throttledAuthAttempts));
      value("security-grants-issued",count(d.relay?.grantsIssued));
      value("security-grants-throttled",count(d.relay?.issuanceThrottled));
      value("security-active-tickets",count(d.relay?.activeTickets));
      value("security-provider-errors",count(d.media?.providerFailures));
      value("security-cooldown-rejections",count(d.media?.cooldownRejections));
      value("security-note","حماية الدخول والطلبات تعمل. عدد التصاريح الأقصى: "+
        count(d.relay?.maxTickets)+". الإحصاءات في ذاكرة الخدمة منذ آخر تشغيل.");
    }catch(e){value("security-status","غير متاح");
      value("security-note","تعذر قراءة حالة الأمان: "+e.message);}
  }
  $("security-refresh").addEventListener("click",loadSecurity);
  $("auto-health-refresh").addEventListener("click",loadAutoHealth);
  async function loadLive(){
    if(liveProbeRefresh){clearTimeout(liveProbeRefresh);liveProbeRefresh=null;}
    try{
      var results=await Promise.allSettled([api("live"),api("state")]);
      if(results[0].status!=="fulfilled")throw results[0].reason;
      var d=results[0].value;
      var media=results[1].status==="fulfilled"?results[1].value.mediaControl:null;
      renderLive(d.items||[],media&&media.paths||[]);
      if((d.items||[]).some(function(item){return item.probePending;})){
        liveProbeRefresh=setTimeout(loadLive,4000);
      }
    }
    catch(e){$("live-result").textContent="تعذر عرض المسارات: "+e.message}
  }
  $("live-reload").addEventListener("click",loadLive);
  $("shared-live-probe").addEventListener("click",async function(){
    var sourceId=$("live-source").value,channelId=$("live-channel").value;
    if(!sourceId||!channelId){show("اختر مصدرًا وقناة لفحص المشاركة.",false);return}
    if(!$("live-rights").checked){show("يلزم تأكيد صلاحية إعادة بث هذه القناة.",false);return}
    this.disabled=true;
    value("shared-live-probe-result","جار التحقق من سحب المصدر وتوزيعه على قارئين خلال 26 ثانية...");
    try{
      var report=await action("shared-live/probe","shared-live-probe",{
        sourceId:sourceId,channelId:channelId,rightsConfirmed:true
      });
      value("shared-live-probe-result",JSON.stringify(report,null,2));
      show(report.ok?"نجح فحص النقل المشترك. لا يعني ذلك تشغيل المشتركين تلقائيًا.":
        "فشل فحص المشاركة. تم إبقاء تشغيل المشتركين على الوضع السابق.",report.ok);
    }catch(e){
      value("shared-live-probe-result","تعذر الفحص: "+e.message);
      show("فشل الفحص بدون تغيير قنوات المشتركين.",false);
    }finally{this.disabled=false}
  });
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
      $("live-result").textContent=
        "✅ تم تجهيز مسار القناة: "+String(result.title||"")+
        "\nالحالة: جاهز عند الطلب (On-Demand)."+
        "\nتنبيه: لم يبدأ سحب المصدر بعد، ولا يعني إنشاء المسار أن الصورة والصوت يعملان."+
        "\nالخطوة التالية: اضغط فحص HLS في صف القناة، ثم انتظر النتيجة."+
        "\nفحص HLS يختبر وصول مقطع، ولا يغني عن معاينة الصورة والصوت."+
        "\nالمسار: "+String(result.path||"");
      show("تم تجهيز المسار فقط. لا يعتبر البث شغالًا حتى ينجح فحص HLS.",true);
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
  refresh();loadLive();loadFailures();loadAutoHealth();loadSecurity();
  setInterval(function(){if(!document.hidden){refresh();loadLive();loadFailures();loadAutoHealth();loadSecurity()}},60000);
})();
</script>
</body></html>`;
  return html.replace('__NONCE__',nonce);
}
