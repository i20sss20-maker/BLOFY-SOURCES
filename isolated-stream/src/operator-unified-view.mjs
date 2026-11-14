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

.code-manager{background:linear-gradient(130deg,#22213e,#0e283d);border-color:#8167b5}
.code-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:14px 0}
.code-tile{padding:12px;background:#0c1b32;border:1px solid #3d5270;border-radius:11px;overflow-wrap:anywhere}
.code-tile small{display:block;color:#aebdd5}.code-tile strong{display:block;margin-top:3px}
.code-detail{padding:14px;border-radius:13px;border:1px solid #635588;background:#0b182f;margin-top:14px}
#codes-dialog{width:min(94vw,860px);max-height:min(92vh,970px);overflow-y:auto;
 background:linear-gradient(145deg,#17243f,#0c142a);color:#f1f4ff;
 border:1px solid #8870bd;border-radius:19px;padding:clamp(14px,2vw,25px);box-shadow:0 28px 95px #000b}
#codes-dialog::backdrop{background:#01050cd6;backdrop-filter:blur(4px)}
#codes-dialog .code-detail{margin:0}
#codes-dialog .code-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
#codes-dialog .actions{margin-top:15px}
#codes-dialog .code-renew-row{margin-top:18px;padding-top:15px;border-top:1px solid #344464}
@media(max-width:740px){#codes-dialog{width:97vw;max-height:95vh;padding:14px;border-radius:14px}
#codes-dialog .code-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.code-renew-row{display:flex;align-items:end;gap:9px;flex-wrap:wrap;margin-top:12px}
.code-renew-row .field{width:180px}.code-renew-row .btn{flex:0 0 auto}
@media(max-width:740px){.code-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.code-renew-row .field{width:100%}}
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


/* BLOFY STREAM — refined unified control-center UI, fully local and CSP-safe */
:root{--bg:#060d1c;--aside:#0b1629;--panel:#0e1c32;--panel2:#14263d;--border:#293d59;--font:#eff7ff;--muted:#a0b2cc;--purple:#8eafff;--green:#59ddb8;--red:#ff98a7;--amber:#ffd394;--edge:#4cc9f0;--radius:18px}
html{scroll-padding-top:92px}
body{font-family:system-ui,"Segoe UI",Tahoma,sans-serif;background:radial-gradient(ellipse 62% 54% at 62% -20%,#233e6f44,transparent 70%),radial-gradient(ellipse 48% 36% at 4% 85%,#13546a24,transparent 72%),var(--bg);font-size:14px}
.layout{grid-template-columns:260px minmax(0,1fr)}
.content{min-width:0}
.app-sidebar{display:flex;flex-direction:column;gap:0;position:sticky;top:0;height:100dvh;overflow:hidden;padding:21px 13px 14px;background:linear-gradient(165deg,#111f34 0%,#0b1528 49%,#081222 100%);border-left:1px solid #2b425d;box-shadow:-12px 0 48px #02071280;z-index:12}
.sidebar-top{display:flex;align-items:center;gap:6px;justify-content:space-between;padding:0 5px 21px;border-bottom:1px solid #263956}
.logo{margin:0;min-width:0;gap:10px}.logo-icon{width:43px;height:43px;flex:0 0 auto;border-radius:14px;background:linear-gradient(145deg,#c9dcff,#779cfa 54%,#6960d9);box-shadow:0 8px 27px #4965c744;color:#08162b;font-size:24px}
.logo-copy{min-width:0;overflow:hidden}.logo strong{font-size:16px;white-space:nowrap;letter-spacing:.45px}.logo strong b{color:#94b8ff}.logo small{font-size:10px;color:#90a8c8;white-space:nowrap}
.sidebar-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:19px 4px 24px;scrollbar-width:thin;scrollbar-color:#385579 transparent}
#primary-nav{display:flex;flex-direction:column;gap:5px;min-height:0}
#primary-nav .navtitle{font-size:10px;letter-spacing:.5px;font-weight:800;margin:16px 10px 5px;color:#728cac;text-transform:none}
#primary-nav .navtitle:first-child{margin-top:0}
#primary-nav .navlink{position:relative;width:100%;display:flex;align-items:center;gap:12px;min-height:48px;padding:10px 12px;border-radius:12px;border:1px solid transparent;color:#b4c6dd;background:transparent;text-align:right;box-shadow:none;transform:none;transition:background .2s,border-color .2s,color .2s,box-shadow .2s}
#primary-nav .navlink .nav-icon{width:23px;height:23px;display:grid;place-items:center;flex:0 0 23px;color:#8ea8c8}
#primary-nav .navlink .nav-icon svg{width:21px;height:21px;display:block}
#primary-nav .navlink .nav-label{font-weight:650;font-size:13px;line-height:1.5;white-space:nowrap}
#primary-nav .navlink:hover{transform:none;color:#fff;background:#1e3451;border-color:#365476}
#primary-nav .navlink:hover .nav-icon{color:#99dafa}
#primary-nav .navlink:focus-visible{outline:2px solid #79d4f8;outline-offset:1px}
#primary-nav .navlink.active{background:linear-gradient(100deg,#1d4c69a8,#2c366780);border-color:#5477a780;box-shadow:inset -3px 0 #67d8f4,0 7px 20px #05162c45;color:#fff}
#primary-nav .navlink.active .nav-icon{color:#79dbf2}
#primary-nav .navlink.active:after{content:"";width:5px;height:5px;background:#6de4cf;border-radius:50%;margin-inline-start:auto;box-shadow:0 0 12px #6de4cfa9}
.sidebar-collapse{width:31px;height:31px;flex:0 0 31px;border:1px solid #37526d;background:#13243b;color:#adc5df;border-radius:9px;display:grid;place-items:center;font-size:17px;cursor:pointer;transition:background .15s}
.sidebar-collapse:hover{background:#254460;color:#fff}
.sidebar-bottom{padding:15px 10px 4px;border-top:1px solid #263956;display:grid;gap:4px}
.sidebar-version{font-size:11px;font-weight:750;color:#aac9e5}.sidebar-version-detail{font-size:10px;direction:ltr;text-align:right;color:#7990ad}
.sidebar-scrim{display:none}
.top{z-index:5;min-height:82px;background:#0a1627e8;border-bottom:1px solid #263a55;box-shadow:0 6px 32px #02071150;padding:15px clamp(20px,2.5vw,38px)}
.top-title-wrap{display:flex;align-items:center;gap:14px;min-width:0}
.top-crumb{font-size:10px;letter-spacing:.85px;font-weight:800;color:#82accb;direction:ltr;text-align:right}
.top-crumb span{color:#bdd0e3}
.top h1{font-size:22px;letter-spacing:-.3px;margin-top:3px}
.top p{font-size:11px}
.top .tools{gap:7px}
.sidebar-open{display:none;width:42px;height:42px;border-radius:12px;background:#172d46;border:1px solid #3a5878;color:#dceaff;font-size:20px}
main{max-width:1720px;padding:30px clamp(19px,3vw,46px) 68px}
.heading h2{color:#f2f8ff;font-weight:850;letter-spacing:-.6px}
.heading p{color:#a5b9d1}
.quick-hero{border-radius:22px;border:1px solid #47658c9c;background:radial-gradient(ellipse at 14% 0%,#4a4cb447,transparent 55%),radial-gradient(ellipse at 97% 110%,#126d7350,transparent 65%),linear-gradient(120deg,#142c46,#10203a);box-shadow:0 18px 42px #020d2073;padding:clamp(22px,3vw,36px)}
.quick-eyebrow{color:#9de1f3}
.quick-hero h3{color:#fff;letter-spacing:-.5px}
.quick-hero p{color:#c2d3e4}
.stat,.panel{border:1px solid #334b67;background:linear-gradient(142deg,#12253d,#101d31);box-shadow:0 12px 36px #020a193d}
.stat{border-radius:18px;transition:border-color .2s,transform .2s;isolation:isolate}
.stat:hover{transform:translateY(-2px);border-color:#577ca3}
.stat:before{background:linear-gradient(#83d8f6,#4a7fd3)}
.stat:nth-child(2):before{background:linear-gradient(#84f7d0,#309b91)}
.stat:nth-child(3):before{background:linear-gradient(#d3c3ff,#7e87f2)}
.stat:nth-child(4):before{background:linear-gradient(#ffe0a7,#dba46e)}
.stat strong{color:#f5fbff;font-weight:830}
.panel{border-radius:var(--radius)}
.panel h3{color:#f2f7ff}
.btn{border-color:#5d89cf;background:linear-gradient(135deg,#446ec0,#6859bf);box-shadow:0 5px 18px #284d9560}
.btn:hover{box-shadow:0 9px 23px #3568ae55}
.btn.secondary{background:#1b324e;border-color:#3c5b7b;color:#e6f2ff}
.btn.secondary:hover{background:#294460}
.btn.danger{background:#522f40;border-color:#a46177}
.pill{background:#1b3049a8;border-color:#3c5878;color:#d1e4f4}
.pill.good{background:#153c38;color:#88ebc8}
input,select{background:#0b1b2f;border:1px solid #3d5774;color:#f3f8ff}
input:focus,select:focus{border-color:#73b7ee;box-shadow:0 0 0 3px #6ca8eb2f}
.tablewrap{border-color:#34516b;background:#0b1b2d50}
th{background:#1a304b;color:#cfdfef}
td{border-bottom-color:#32465c80}
tbody tr:hover{background:#31577740}
.view.active{animation:blofyPageEnter .24s cubic-bezier(.2,.8,.2,1) both}
@keyframes blofyPageEnter{from{opacity:.65;transform:translateY(7px)}to{opacity:1;transform:none}}
body.sidebar-compact .layout{grid-template-columns:82px minmax(0,1fr)}
body.sidebar-compact .app-sidebar{padding-inline:10px}
body.sidebar-compact .sidebar-top{flex-direction:column;align-items:center;padding-inline:0}
body.sidebar-compact .logo{margin:0}
body.sidebar-compact .logo-copy,body.sidebar-compact .sidebar-bottom,body.sidebar-compact #primary-nav .navtitle,body.sidebar-compact #primary-nav .nav-label,body.sidebar-compact #primary-nav .navlink.active:after{display:none}
body.sidebar-compact #primary-nav .navlink{justify-content:center;padding:12px 5px}
body.sidebar-compact .sidebar-collapse{transform:rotate(180deg)}
body.sidebar-compact .sidebar-body{padding-inline:0}
@media(max-width:1150px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.top{gap:10px;flex-wrap:wrap}}
@media(max-width:980px){
 .layout,body.sidebar-compact .layout{display:block}
 .app-sidebar,body.sidebar-compact .app-sidebar{position:fixed;z-index:30;top:0;right:0;left:auto;width:min(86vw,312px);height:100dvh;transform:translateX(105%);transition:transform .25s ease,visibility .25s ease;visibility:hidden;padding:20px 13px;box-shadow:-20px 0 70px #0008}
 body.menu-open .app-sidebar{transform:translateX(0);visibility:visible}
 body.sidebar-compact .logo-copy,body.sidebar-compact .sidebar-bottom,body.sidebar-compact #primary-nav .navtitle,body.sidebar-compact #primary-nav .nav-label{display:block}
 body.sidebar-compact .sidebar-top{flex-direction:row}
 body.sidebar-compact #primary-nav .navlink{justify-content:flex-start;padding:10px 12px}
 .sidebar-collapse{display:none}
 .sidebar-scrim:not([hidden]){display:block;position:fixed;inset:0;z-index:29;background:#010915bd;backdrop-filter:blur(3px);border:0;cursor:pointer}
 .sidebar-open{display:grid;place-items:center;flex:0 0 42px}
 body.menu-open{overflow:hidden}
 .top{position:sticky;top:0;padding:13px 16px;flex-wrap:wrap;gap:9px}
 .top-title-wrap{flex:1}
 .top h1{font-size:19px}
 main{padding:20px 15px 55px}
}
@media(max-width:630px){
 .top{align-items:flex-start}
 .top .tools{width:100%;justify-content:flex-start;gap:6px}
 .top .tools .btn{font-size:11px;min-height:36px}
 .top .tools #density-toggle{display:none}
 .top p{display:none}
 .quick-hero:after{opacity:.5}
 .cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
 .stat{padding:13px}
 .stat strong{font-size:22px}
 .grid{grid-template-columns:1fr}
 .heading h2{font-size:24px}
 .heading{align-items:flex-start;gap:8px}
 .sidebar-open{width:39px;height:39px;flex-basis:39px}
}
@media(max-width:370px){.cards{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.view.active{animation:none}.app-sidebar{transition:none}}


/* Diagnostic command-center: readable priority summaries and explicit safe actions. */
.diag-intro{display:flex;align-items:center;justify-content:space-between;gap:20px;background:radial-gradient(ellipse at 10% 5%,#275b8259,transparent 61%),linear-gradient(135deg,#122944,#121e37);border-color:#426d95}
.diag-intro h3{font-size:clamp(21px,2.2vw,29px);margin:5px 0 8px}
.diag-eyebrow{font-size:10px;font-weight:850;letter-spacing:1px;color:#94e5f5}
.diag-quick,.diag-actions{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.diag-quick .btn{white-space:nowrap}
.diag-actions label,.diag-source-label{font-size:11px;font-weight:700;color:#b7cbe0;display:flex;align-items:center;gap:8px}
.diag-actions select{min-width:145px;max-width:265px}
.diag-priorities{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin:14px 0}
.diag-priority{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:15px;background:#152b45;border:1px solid #3e5c7a;border-radius:14px;min-height:150px}
.diag-priority[data-severity="warning"]{border-right:4px solid #f2bd70}
.diag-priority[data-severity="unknown"]{border-right:4px solid #7899b8}
.diag-priority strong{font-size:14px;color:#f2f8ff}
.diag-priority p{flex:1;margin:0;color:#b4c9df;line-height:1.75;font-size:12px}
.diag-priority .btn{align-self:flex-start}
.diag-filterbar{display:flex;align-items:end;gap:11px;flex-wrap:wrap;margin:15px 0}
.diag-filterbar label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:750;color:#c5d8ec}
.diag-filterbar select{min-width:165px}
.diag-filterbar input{min-width:min(70vw,265px)}
.diag-filterbar .muted{padding:9px 0}
.diag-state{font-size:11px;font-weight:750;border-radius:12px;padding:4px 9px;display:inline-block;white-space:nowrap}
.diag-state.warning{background:#6f4b242f;color:#f9cb81;border:1px solid #8b6a3d}
.diag-state.unknown{background:#243c55;color:#b9d1e6;border:1px solid #506883}
.diag-state.ok{background:#133c34;color:#79e1c1;border:1px solid #2b7762}
.diag-recommendations{display:grid;gap:8px}
.diag-recommendations .row{align-items:center;gap:11px;background:#10243c;border:1px solid #304967;border-radius:12px;padding:13px}
.diag-recommendations .row span.muted{flex:1}
.diag-ai-result,.diag-inline-note{padding:12px 14px;margin:12px 0;border:1px solid #3e5978;border-radius:12px;background:#102540;color:#c7d7e9;line-height:1.85}
.diag-device-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:13px 0}
.diag-device{display:grid;gap:7px;padding:17px;border:1px solid #3e5978;border-radius:13px;background:#11273e}
.diag-device strong{font-size:15px;color:#eaf6ff}.diag-device span{color:#b3c8dc;font-size:12px;line-height:1.8}
@media(max-width:1100px){.diag-intro{flex-direction:column;align-items:stretch}.diag-priorities{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:740px){.diag-priorities,.diag-device-grid{grid-template-columns:1fr}.diag-intro{padding:17px}.diag-actions select{max-width:180px}.diag-recommendations .row{flex-wrap:wrap}.diag-recommendations .row span.muted{flex-basis:100%}}


/* Visible, immediately adjacent AI result — never buried beneath long reports. */
.diag-ai-card{display:flex;flex-direction:column;gap:12px;margin:15px 0 19px;padding:16px 18px;border:1px solid #44649d;border-radius:16px;background:radial-gradient(ellipse at 10% 10%,#293c774f,transparent 65%),linear-gradient(130deg,#142843,#111e39);box-shadow:0 8px 29px #020a1a5b}
.diag-ai-indicator{display:flex;gap:12px;align-items:center}
.diag-ai-indicator strong{display:block;font-size:15px;color:#f3f6ff}
.diag-ai-indicator small{display:block;font-size:11px;color:#afc4dd;margin-top:3px}
.diag-ai-glow{width:39px;height:39px;display:grid;place-items:center;flex-shrink:0;border-radius:12px;background:#414e9c6a;color:#bbd4ff;font-size:22px}
.diag-ai-text{margin:0!important;padding:13px 16px!important;background:#0b1c33ba;border:1px solid #374f73;border-radius:12px;line-height:1.95;font-size:14px;color:#e6f2ff;min-height:49px;overflow-wrap:anywhere}
.diag-ai-card[data-state="success"]{border-color:#329c8a}.diag-ai-card[data-state="success"] .diag-ai-glow{color:#70f1d0;background:#17645788}
.diag-ai-card[data-state="error"]{border-color:#b57959}.diag-ai-card[data-state="error"] .diag-ai-glow{color:#ffca92;background:#68423199}
.diag-ai-card[data-state="loading"] .diag-ai-glow{animation:diagAiPulse 1.4s ease-in-out infinite alternate}
@keyframes diagAiPulse{from{box-shadow:0 0 0 #6b8dfe00}to{box-shadow:0 0 22px #718fff77}}
@media(prefers-reduced-motion:reduce){.diag-ai-glow{animation:none!important}}
</style>
</head><body><div class="layout"><aside id="app-sidebar" class="app-sidebar" aria-label="القائمة الجانبية">
<div class="sidebar-top"><div class="logo"><div class="logo-icon">B</div><div class="logo-copy"><strong>BLOFY <b>STREAM</b></strong><small>مركز الإدارة المتكامل</small></div></div>
<button type="button" id="sidebar-collapse" class="sidebar-collapse" aria-label="طي القائمة الجانبية" aria-pressed="false" title="طي القائمة">⟨</button></div>
<div class="sidebar-body"><nav aria-label="الأقسام" id="primary-nav">
<div class="navtitle">نظرة عامة</div>
<button type="button" class="navlink active" data-tab="home" aria-label="الرئيسية" title="الرئيسية" aria-current="page"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></span><span class="nav-label">الرئيسية</span></button>
<div class="navtitle">الوسائط والتشغيل</div>
<button type="button" class="navlink" data-tab="sources" aria-label="المصادر" title="المصادر"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/></svg></span><span class="nav-label">المصادر</span></button>
<button type="button" class="navlink" data-tab="restream" aria-label="إعادة البث" title="إعادة البث"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12a7 7 0 0 1 7-7m7 7a7 7 0 0 0-7-7M2.5 8a11 11 0 0 1 19 0"/><circle cx="12" cy="14" r="3"/><path d="M12 17v5"/></svg></span><span class="nav-label">إعادة البث</span></button>
<button type="button" class="navlink" data-tab="library" aria-label="المكتبة" title="المكتبة"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg></span><span class="nav-label">المكتبة</span></button>
<div class="navtitle">المشتركون والمبيعات</div>
<button type="button" class="navlink" data-tab="accounts" aria-label="المشتركون" title="المشتركون"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M17 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg></span><span class="nav-label">المشتركون</span></button>
<button type="button" class="navlink" data-tab="codes" aria-label="أكواد الاشتراك" title="أكواد الاشتراك"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h3m-3 4h6m4-4v6"/></svg></span><span class="nav-label">أكواد الاشتراك</span></button>
<button type="button" class="navlink" data-tab="distributors" aria-label="لوحات التوزيع" title="لوحات التوزيع"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/></svg></span><span class="nav-label">لوحات التوزيع</span></button>
<div class="navtitle">مراقبة النظام</div>
<button type="button" class="navlink" data-tab="diagnostics" aria-label="الفحص والصيانة" title="الفحص والصيانة"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V7l8-4z"/><path d="m9 12 2 2 4-4"/></svg></span><span class="nav-label">الفحص والصيانة</span></button>
</nav></div>
<div class="sidebar-bottom"><span class="sidebar-version">واجهة الإدارة الموحدة</span><span class="sidebar-version-detail">BLOFY STREAM • 2026</span></div>
</aside><button type="button" id="sidebar-scrim" class="sidebar-scrim" aria-label="إغلاق القائمة" hidden></button><div class="content">
<header class="top"><div class="top-title-wrap"><button type="button" id="sidebar-open" class="sidebar-open" aria-label="فتح قائمة الأقسام" aria-controls="app-sidebar" aria-expanded="false">☰</button><div><div class="top-crumb">BLOFY STREAM <span> / </span><span id="top-section">الرئيسية</span></div><h1 id="title">الرئيسية</h1><p>السيرفر والمكتبة والمشتركون وإعادة البث</p></div></div>
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
<div class="panel" id="home-checks-panel"><div class="controls">
<h3>فحص الخدمات</h3>
<button class="btn secondary sm" id="home-check-all" type="button">↻ فحص شامل</button></div>
<p class="muted" id="home-checks-time" role="status" aria-live="polite">لم يبدأ الفحص بعد</p>
<div class="cards">
<div class="stat"><small>لوحة الإدارة</small><strong id="check-api">—</strong></div>
<div class="stat"><small>المصدر والمكتبة</small><strong id="check-sources">—</strong></div>
<div class="stat"><small>MediaMTX</small><strong id="check-media">—</strong></div>
<div class="stat"><small>مراقبة إعادة البث</small><strong id="check-health">—</strong></div>
<div class="stat"><small>الحماية</small><strong id="check-security">—</strong></div>
</div><p class="muted">فحص قراءة فقط. لا يعيد تشغيل البث ولا يغير الاشتراكات.</p>
</div>
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
<div class="panel" id="saleh-origin-panel">
<div class="controls"><div><h3>📺 BLOFY Origin — مصدر saleh فقط</h3>
<p class="muted">مسار تشغيل تجريبي مقيّد: قناة مصدر واحدة تُوزَّع على عدة مشاهدين مرخّص لهم. لا يزيد عدد القنوات المتزامنة المسموح بها من المزود، ولا ينقل اشتراكات العملاء تلقائيًا.</p></div>
<span class="pill" id="saleh-origin-mode" role="status">جار قراءة السياسة...</span></div>
<div class="inline">
<span class="pill">مسارات Origin المسجلة: <strong id="saleh-origin-active">—</strong></span>
<span class="pill">الحد الوقائي للقنوات المختلفة: <strong id="saleh-origin-quota">—</strong></span>
<span class="pill">تعميم على الأكواد: <strong id="saleh-origin-customers">غير مفعّل</strong></span>
</div>
<p id="saleh-origin-note" class="diag-inline-note" role="status" aria-live="polite">يظل البث الحالي والاشتراكات كما هي إلى أن ينجح اختبار أصل البث والتوزيع.</p>
</div>
<div class="panel" id="blofy-read-replica-panel">
 <div class="controls"><div><h3>🌐 BLOFY PRIVATE HLS EDGE — خادم توزيع مستقل</h3>
 <p class="muted">خادم HLS خاص على شبكة Railway الداخلية يمرّر قوائم ومقاطع Origin دون إعادة ترميز أو اتصال جديد بمصدر Xtream. لا يتيح مشاهدة قنوات المشتركين دون تفويض.</p></div>
 <span class="pill" id="read-replica-status" role="status">لم يُفحص بعد</span></div>
 <div class="inline">
 <span class="pill">اتصال الشبكة الخاصة: <strong id="read-replica-link">—</strong></span>
 <span class="pill">فحص فيديو فعلي: <strong id="read-replica-video">لم يُختبر</strong></span>
 <span class="pill">نقل المشتركين: <strong id="read-replica-cutover">غير مفعّل</strong></span>
 </div>
 <p class="muted" id="read-replica-note" role="status" aria-live="polite">فحص الاتصال لا يفتح قناة من saleh ولا يثبت أن الصوت أو الصورة يعملان.</p>
<div class="diag-actions">
<button type="button" class="btn secondary" id="read-replica-synthetic-probe">🧪 اختبار Origin ← Replica بعينة تجريبية</button>
</div>
<p id="read-replica-synthetic-result" role="status" aria-live="polite" class="diag-inline-note">الفحص يدوي، ويشغّل عينة MediaMTX تجريبية فقط دون الوصول إلى saleh أو حسابات العملاء.</p>
 </div>
<div class="panel"><h3>المشاركة بين المشتركين</h3><p class="muted">هذه أرقام مستقلة لمسارات المشاركة الجديدة فقط؛ لا تشمل التشغيل العادي من التطبيق.</p><div class="inline"><span class="pill" id="shared-mode">—</span><span class="pill">اتصالات المصدر: <strong id="shared-feeds">—</strong></span><span class="pill">المشاهدون: <strong id="shared-viewers">—</strong></span><span class="pill">مصادر في فترة تهدئة: <strong id="fanout-cooldowns">—</strong></span><span class="pill">مشاهدون جدد استفادوا من تهيئة TS: <strong id="fanout-warm-joins">—</strong></span><span class="pill">ذاكرة التهيئة المؤقتة: <strong id="fanout-replay-buffer">—</strong> KiB</span><span class="pill">طلبات قناة إضافية حُجبت لحماية حد المصدر: <strong id="fanout-source-limit">—</strong></span><span class="pill">فشل سحب مشترك: <strong id="fanout-provider-failures">—</strong></span><span class="pill">مشاهدون بطيئون قُطعت جلساتهم: <strong id="fanout-slow-disconnects">—</strong></span><span class="pill">أخطاء Relay منذ آخر تشغيل: <strong id="relay-errors">—</strong></span></div><p id="relay-error-breakdown" class="muted"></p></div>
<div class="panel" id="smart-ops-panel">
<div class="controls"><div><h3>📡 Smart Ops 2.0 — إدارة الثبات والاتصالات</h3>
<p class="muted">بيانات مباشرة لمسارات المشاركة المفعّلة ومسارات HLS التابعة للمشرف فقط؛ لا تشمل جميع المشتركين أو كل قنوات Xtream. هذا النظام للقراءة ولا يعيد البث أو يغير الاشتراكات.</p></div>
<button class="btn secondary" id="smart-ops-refresh" type="button">↻ تحديث تشخيص الاتصال</button></div>
<div class="inline">
<span class="pill" id="smart-ops-status" role="status" aria-live="polite">جار قراءة المؤشرات...</span>
<span class="pill">مشاهدو المشاركة الحالية: <strong id="smart-ops-viewers">—</strong></span>
<span class="pill">مسارات مشاركة نشطة: <strong id="smart-ops-feeds">—</strong></span>
<span class="pill">تنبيهات نشطة: <strong id="smart-ops-alerts">—</strong></span>
<span class="pill">تنبيهات حرجة: <strong id="smart-ops-critical">—</strong></span>
<span class="pill">رفض انضمام جديد في آخر عينة: <strong id="smart-ops-capacity-delta">—</strong></span>
<span class="pill">ذروة المشاهدين خلال المراقبة: <strong id="smart-ops-peak-viewers">—</strong></span>
<span class="pill">اتجاه المصدر (KiB/s): <strong id="smart-ops-ingress">—</strong></span>
<span class="pill">تنبيهات سجلت أثناء إغلاق اللوحة: <strong id="smart-ops-incidents">—</strong></span>
</div>
<p id="smart-ops-scope" class="muted">لن نستنتج عدد عملاء التطبيق من بيانات مشاركة البث؛ ولا نغير حدود الاشتراك الأصلية.</p>
<div class="grid">
<div><h3>حالة مسارات المشاركة</h3>
<div class="tablewrap"><table><thead><tr><th>قناة مؤقتة</th><th>الحالة</th><th>المشاهدون</th><th>السعة الداخلية</th><th>آخر بيانات</th></tr></thead><tbody id="smart-ops-channels"></tbody></table></div></div>
<div><h3>التنبيهات وأسبابها</h3><div class="tablewrap"><table><thead><tr><th>الدرجة</th><th>القناة/المسار</th><th>التشخيص</th></tr></thead><tbody id="smart-ops-issues"></tbody></table></div></div>
</div>
<div class="tablewrap"><table><thead><tr><th>التاريخ</th><th>التغير</th><th>الدرجة</th><th>السبب</th></tr></thead>
<tbody id="smart-ops-history"></tbody></table></div>
<p class="muted" id="smart-ops-last-check" aria-live="polite">هذه النتائج مؤشرات تشغيل مؤقتة. الصوت والصورة وحدود المصدر الحقيقي لم يتم التحقق منها هنا.</p>
</div>
<div class="panel" id="smart-playback-panel">
 <div class="controls"><div><h3>🧠 BLOFY Smart Playback Health</h3>
 <p class="muted">تشخيص شامل لأخطاء المصدر والنقل والصوت والصورة ومؤشرات الترميز. التحليل من بيانات السيرفر الموجودة، ولا يجري بثًا جديدًا أو يغيّر الأكواد أو يعيد تشغيل القنوات.</p></div>
 <button class="btn secondary" id="playback-health-refresh" type="button">↻ قراءة تشخيص البث</button></div>
 <p id="playback-health-status" class="muted" role="status" aria-live="polite">لم تصل بيانات الفحص بعد.</p>
 <div class="inline">
  <span class="pill">الملاحظات: <strong id="playback-health-issues">—</strong></span>
  <span class="pill">مشاكل صوت/ترميز: <strong id="playback-health-audio">—</strong></span>
  <span class="pill">مشاكل الصورة: <strong id="playback-health-video">—</strong></span>
  <span class="pill">طبقات القياس الناقصة: <strong id="playback-health-missing">—</strong></span>
  <span class="pill">عينات المراقبة: <strong id="playback-health-samples">—</strong></span>
 </div>
 <div class="tablewrap"><table><thead><tr><th>المشكلة المحتملة</th><th>الأهمية</th><th>الأحداث المرصودة</th><th>الخطوة المقترحة</th></tr></thead>
 <tbody id="playback-health-incidents"></tbody></table></div>
 <p class="muted" id="playback-health-coverage">المعلومات غير المكتملة لا تعني أن جميع القنوات تعمل. نتائج المصدر والتشفير لا تثبت فك الصوت والصورة على جهاز العميل.</p>
 <h4>سجل الحالات (مراقبة دورية)</h4>
 <div class="tablewrap"><table><thead><tr><th>الوقت</th><th>الحالة</th><th>الملاحظات</th></tr></thead><tbody id="playback-health-events"></tbody></table></div>
 <div class="controls"><div><h4>🤖 شرح Groq AI (اختياري)</h4>
 <p class="muted">عند الضغط فقط، يُرسل للذكاء الاصطناعي رموز مشاكل مجهولة وعددها، لا بيانات المشتركين ولا روابط المصادر. اقتراح فقط، ولا ينفذ أي إصلاح تلقائي.</p></div>
 <button class="btn secondary" id="playback-health-ai-button" type="button" disabled>تفسير المشاكل بالذكاء الاصطناعي</button></div>
 <p class="muted" id="playback-health-ai-result" role="status" aria-live="polite">لم يتم ربط مفتاح Groq بعد.</p>
 <p class="muted">المرحلة الأخيرة للتحقق من الصوت والصورة تتطلب تجربة تشغيل على Android 9 وWindows. قد يكون السيرفر يستقبل صوتًا مع أن المشغل لا يفك الترميز؛ لا نحكم على ذلك من PMT وحده.</p>
</div>
<div class="panel" id="cross-service-panel">
  <div class="controls"><div><h3>🔎 تشخيص البث بين خدمات BLOFY — Cross-Service</h3>
  <p class="muted">تحليل مؤشرات التشغيل الموجودة أصلًا في بوابة Xtream ونظام المشاركة ومسارات إعادة البث الخاصة بالمشرف. لا يفتح اتصالًا جديدًا بالمصدر ولا يجمع بيانات هوية العملاء.</p></div>
  <button class="btn secondary" id="cross-service-refresh" type="button">↻ تحديث التشخيص</button></div>
  <div class="inline">
    <span class="pill" id="cross-service-status" role="status" aria-live="polite">جار تحليل البيانات المتاحة...</span>
    <span class="pill">نقل مباشر ببوابة Xtream: <strong id="cross-direct">—</strong></span>
    <span class="pill">مشاهدو المشاركة (مسار مختلف): <strong id="cross-relay">—</strong></span>
    <span class="pill">قراء مسارات HLS للمشرف: <strong id="cross-hls">—</strong></span>
    <span class="pill">جلسات MediaMTX HLS: <strong id="cross-mediamtx-hls">—</strong></span>
    <span class="pill">مسارات MediaMTX الجاهزة: <strong id="cross-mediamtx-paths">—</strong></span>
    <span class="pill">ربط MediaMTX: <strong id="cross-mediamtx-status">—</strong></span>
    <span class="pill">طلبات Edge خلال 5 دقائق: <strong id="cross-edge-requests">—</strong></span>
    <span class="pill">أخطاء Edge 5xx خلال 5 دقائق: <strong id="cross-edge-errors">—</strong></span>
    <span class="pill">Edge P95 زمن رد البوابة: <strong id="cross-edge-p95">—</strong></span>
    <span class="pill">حالة قياس Edge: <strong id="cross-edge-status">—</strong></span>
    <span class="pill">بدايات إرسال الوسائط خلال ساعة: <strong id="cross-started">—</strong></span>
    <span class="pill">أخطاء البوابة خلال ساعة: <strong id="cross-failed">—</strong></span>
    <span class="pill">تأخر بدء البث P95: <strong id="cross-p95">—</strong></span>
  </div>
  <p class="muted" id="cross-service-coverage">الأعداد مستقلة ولا تُجمع لاستخراج عدد المشاهدين. تتم قراءة جلسات HLS من محرك MediaMTX الخاص بخدمة STREAM فقط، ولا تشمل محرك إعادة البث المنفصل أو خدمة Edge.</p>
  <div class="tablewrap"><table><thead><tr><th>المصدر التشغيلي</th><th>الفترة</th><th>الأحداث المرصودة</th><th>المراجعة</th></tr></thead>
    <tbody id="cross-service-issues"></tbody></table></div>
  <p class="muted" id="cross-service-check">ملخص سجل البوابة محدود بآخر 400 حدث محفوظ في هذه العملية. لا يثبت تشغيل الصوت والصورة بعد فكهما ولا قدرة مزود المحتوى على عدد مشاهدين محدد.</p>
</div>
<div class="panel" id="restream-path-diagnostics">
  <h3>🎛️ تحليل مسارات إعادة البث الخاصة بالمشرف</h3>
  <p class="muted">يشخص آخر نتيجة نقل وسائط أولية لمسارات المشرف المحفوظة في STREAM فقط. لا يجري فحص فيديو جديدًا ولا يشمل محرك إعادة بث منفصل أو جميع المشتركين.</p>
  <p class="muted" id="restream-health-summary" role="status" aria-live="polite">لم تصل بيانات المسارات بعد.</p>
  <div class="tablewrap"><table><thead><tr><th>المسار</th><th>آخر فحص</th><th>القراء لدى المشرف</th><th>الصوت/ترميزات العينة</th><th>مصدر احتياطي</th><th>تحويلات المصدر منذ التشغيل</th><th>الملاحظة</th></tr></thead>
  <tbody id="restream-health-rows"></tbody></table></div>
  <p class="muted">مراقبة استمرارية MPEG-TS هنا تقيس قفزات عداد الحزم وأخطاء TEI في بيانات دخلت للسيرفر فقط، وتتجاهل التوقف المعلن في الحزم. هذه المؤشرات لا تثبت فقدان الصوت أو الصورة في جهاز العميل، ولا تفتح اتصالًا إضافيًا بالمصدر.</p>
  <p class="muted">تحليل الصوت هنا من جدول MPEG-TS PAT/PMT والحزم المصنفة ضمن عينة محدودة من البث الموجود أصلًا. وجود حزم صوت أو صورة لا يثبت سماع الصوت أو ظهور الصورة على جهاز العميل، وعدم رصدها في العينة ليس إثباتًا نهائيًا للصمت أو السواد. دعم AC3/EAC3/DTS ونحوها يختلف حسب الجهاز؛ لا يتم تغيير الترميز أو فتح بث إضافي تلقائيًا.</p>
  <p class="muted">نجاح أول بايت لا يعني نجاح الصوت والصورة بعد فك الترميز. المسارات هنا أسماء مرقمة فقط دون بيانات المصادر أو الحسابات، وأعداد القراء مكررة من قسم Operator HLS وليست مشاهدين إضافيين.</p>
</div>
<div class="panel" id="shared-relay-audio-diagnostics">
 <h3>🔊 تشخيص الصوت في البث المشترك — Relay</h3>
 <p class="muted">المعلومات من عينة MPEG-TS وصلت بالفعل إلى محرك المشاركة. كل صف قناة مؤقتة مجهولة الهوية، وليس اسم قناة أو حساب أو مصدر. لا يفتح التشخيص بثًا جديدًا.</p>
 <p class="muted" id="shared-relay-audio-summary" role="status" aria-live="polite">لم تصل بيانات البث المشترك بعد.</p>
 <div class="tablewrap"><table><thead><tr><th>قناة مؤقتة</th><th>قراء Relay</th><th>عينة الصوت/الترميز</th><th>اضطراب الصوت TS</th><th>اضطراب الصورة TS</th><th>عمر آخر العينة</th></tr></thead><tbody id="shared-relay-audio-rows"></tbody></table></div>
 <p class="muted">القياس يشمل هذه العملية من STREAM API فقط. وجود حزم صوت لا يثبت سماعها في Android 9 أو Windows، ويعاد ضبط الفحص عند تبديل اتصال المصدر. الأعداد لا تمثل إجمالي المشاهدين.</p>
</div>
<div class="panel" id="source-capacity-panel">
  <div class="controls"><div><h3>📡 حدود مصادر Xtream — بيانات الحساب المحفوظة</h3>
  <p class="muted">هذا التقرير يقرأ آخر معلومات الاتصال التي أعلنها مزود المصدر وعدد الاشتراكات المرتبطة من قاعدة BLOFY. لا ينشئ اتصال بث ولا يُمثل عدد المشاهدين المتصلين الآن.</p></div>
  <button class="btn secondary" id="source-capacity-refresh" type="button">↻ قراءة السعة المحفوظة</button></div>
  <p class="muted" id="source-capacity-status" role="status" aria-live="polite">لم تُقرأ البيانات بعد.</p>
<p class="diag-inline-note" id="source-capacity-insight" role="status" aria-live="polite">سنوضح المصادر التي تعلن اتصالًا واحدًا فور توفر البيانات؛ الاشتراكات ليست اتصالات مصدر.</p>
  <div class="tablewrap"><table><thead><tr><th>المصدر</th><th>الحالة</th><th>حد المصدر المعلن</th>
  <th>اتصالات المزود المعلنة</th><th>اشتراكات مرتبطة وفعالة</th><th>HTTP مباشر الآن</th><th>بث مباشر HTTP الآن</th><th>آخر اختبار</th><th>التقييم</th>
  </tr></thead><tbody id="source-capacity-rows"></tbody></table></div>
  <p class="muted" id="source-capacity-warning">الاشتراكات الفعالة ليست عدد اتصالات البث؛ اتصال المصدر وحق إعادة التوزيع يتطلبان التحقق من المزود. لا يتم زيادة السعة أو إعادة تشغيل العملاء تلقائيًا.</p>
</div>
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
<span class="pill">📺 قنوات مشتركة نشطة: <strong id="security-active-feeds">—</strong></span>
<span class="pill">👥 مشاهدون متصلون: <strong id="security-viewers">—</strong></span>
<span class="pill">اتصالات مصدر بدأت (تراكمي): <strong id="security-source-sessions">—</strong></span>
<span class="pill">محاولات إنقاذ عند البدء: <strong id="security-initial-retries">—</strong></span>
<span class="pill">استعادات ناجحة: <strong id="security-reconnect-recovered">—</strong></span>
<span class="pill">انقطاعات نهائية: <strong id="security-source-outages">—</strong></span>
<span class="pill">بيانات المصدر: <strong id="security-ingress-mb">—</strong></span>
<span class="pill">بيانات المشاهدين المجدولة: <strong id="security-egress-mb">—</strong></span>
<span class="pill">طلبات مؤجلة لحماية المصدر: <strong id="security-cooldown-rejections">—</strong></span></div>
<p class="muted" id="security-note">التصاريح مؤقتة، والإحصاءات تبدأ من آخر تشغيل للسيرفر.</p>
<div class="grid" style="margin-top:12px">
<div><h3>📺 صحة كل قناة مشتركة</h3>
<p class="muted">الأرقام مؤقتة وتتغير بعد إعادة تشغيل السيرفر. لا تُظهر بيانات المصدر أو أكواد العملاء.</p>
<div class="tablewrap"><table><thead><tr>
<th>مرجع</th><th>الحالة</th><th>مشاهدون</th><th>آخر بيانات</th><th>إعادة اتصال</th><th>مسار الصوت</th>
</tr></thead><tbody id="security-channel-health"></tbody></table></div></div>
<div><h3>🩺 آخر أحداث الاتصال</h3>
<div class="tablewrap"><table><thead><tr>
<th>الوقت</th><th>القناة</th><th>الحدث</th>
</tr></thead><tbody id="security-channel-events"></tbody></table></div></div>
</div>
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
<label><input id="live-aac-audio" type="checkbox"> تجربة تحويل الصوت إلى AAC</label>
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
<p class="muted">تجربة AAC للمشرف فقط، ولا تشمل مشتركي التطبيق. تنسخ الفيديو وتحوّل مسار الصوت عند وجوده؛ تستهلك موارد FFmpeg ولا تُنشئ صوتًا مفقودًا من المصدر. مسار تحويل واحد كحد أقصى.</p>
<div class="inline" style="margin-top:9px">
<span class="pill" id="shared-live-readiness-state">لم يُفحص البث المشترك بعد</span>
<span class="pill">اتصالات المصدر: <strong id="shared-live-readiness-upstreams">—</strong></span>
<span class="pill">عينات المشاهدة: <strong id="shared-live-readiness-viewers">—</strong></span>
<button type="button" class="btn secondary sm" id="shared-live-readiness-refresh">تحديث نتيجة الفحص</button>
</div>
<p id="shared-live-readiness-note" class="muted">الاختبار لا ينقل المشتركين، ولا يثبت جودة الصورة والصوت بعد فك التشفير.</p>
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
<div class="panel" id="content-hub-batches">
<h3>⬇ تنزيل أفلام BLOFY على دفعات آمنة</h3>
<p class="muted">ينقل كل طلب جزءًا واحدًا فقط (8 ميجابايت)، ويحفظه في التخزين الخاص مع التحقق من سلامته. يمكن استكمال الأجزاء المحفوظة دون تنزيلها مجددًا. لا يتم تحويل تشغيل المشتركين تلقائيًا.</p>
<div class="actions">
<button class="btn secondary" id="content-hub-refresh" type="button">↻ تحديث حالة النقل</button>
<button class="btn secondary" id="content-hub-preflight" type="button">فحص مصدر الفيلم بدون تحميل</button>
<button class="btn" id="content-hub-start-copy" type="button" aria-describedby="content-hub-notice">▶ بدء / استكمال تنزيل الفيلم</button>
<button class="btn secondary" id="content-hub-pause-copy" type="button" disabled>⏸ إيقاف التنزيل</button>
<button class="btn secondary" id="content-hub-next-batch" type="button" aria-describedby="content-hub-notice">تنزيل جزء واحد (8 MB)</button>
</div>
<p class="muted" role="status" id="content-hub-summary">جار التحقق من التخزين الخاص...</p>
<progress id="content-hub-progress" value="0" max="100" aria-label="نسبة نقل الفيلم" style="width:100%;height:22px;accent-color:#60a5fa"></progress>
<p class="muted" id="content-hub-percent">0% · بانتظار النقل</p>
<div style="margin-top:16px;padding:16px;border:1px solid #254464;border-radius:14px">
<strong>فحص تشغيل الفيلم من التخزين الخاص</strong>
<p class="muted">فحص حقيقي لقراءة ملف الفيلم المحفوظ، والتعرف على مسارات الفيديو والصوت وفك ترميز عينات منهما، بدون الرجوع إلى مصدر القنوات.</p>
<button class="btn secondary" id="content-hub-diagnose" type="button">▶ اختبار الصورة والصوت</button>
<p class="muted" role="status" id="content-hub-canary-status">لم يتم استرجاع نتيجة فحص التشغيل بعد.</p>
<div style="margin-top:14px;padding-top:12px;border-top:1px solid #254464">
<strong>🎞 مشاهدة عينة تجريبية من تخزين BLOFY</strong>
<p class="muted">عينة قصيرة (12 ثانية) بصيغة MP4 مع تحويل صوت AC3 إلى AAC للمتصفح، من الملف المخزن فقط. ليست تشغيلًا مباشرًا للعملاء أو اختبارًا كاملًا لأجهزة Android TV.</p>
<button class="btn secondary" id="content-hub-owner-preview" type="button" disabled>▶ تشغيل العينة الخاصة</button>
<video id="content-hub-preview-player" controls playsinline preload="none"
  style="display:block;width:min(100%,750px);max-height:420px;margin-top:12px;background:#000;border-radius:12px"></video>
<p class="muted" id="content-hub-preview-note">العينة متاحة للمدير فقط بعد التأكد من اكتمال الفيلم.</p>
</div>
</div>
<div id="content-hub-runs" class="muted" aria-live="polite"></div>
<p class="muted" id="content-hub-notice">النقل يبقى مقفلاً إذا لم تتأكد صلاحية تخزين الفيلم وخمول مصدر saleh.</p>
</div>
<div class="panel" id="content-hub-episodes">
<h3>📺 المرحلة التالية: تجهيز نقل حلقات المسلسلات</h3>
<p class="muted">اختر حلقة من الفهرس للمراجعة لاحقًا. هذا الفحص يقرأ بيانات الحلقات من مصدر saleh فقط، ولا يحمّل أي فيديو أو يبدأ نقل المواسم.</p>
<div class="actions">
<button class="btn secondary" id="content-hub-episodes-check" type="button">↻ عرض أول 8 حلقات متاحة</button>
</div>
<p class="muted" role="status" id="content-hub-episodes-status">لم يبدأ فحص الحلقات بعد.</p>
<p class="muted" role="status" id="content-hub-episode-copy-progress">تنزيل الحلقات متوقف. لن يتأثر تشغيل القنوات أو أكواد المشتركين.</p>
<div id="content-hub-episodes-list" class="muted" aria-live="polite"></div>
</div>
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
<p class="muted">الهوست: <strong class="num" id="accounts-host-value">https://bfy.up.railway.app</strong> · كلمات المرور السابقة محفوظة كبصمات آمنة، ولا يمكن عرضها. إعادة الضبط تولّد كلمة جديدة وتوقف القديمة.</p>
<div class="tablewrap"><table><thead><tr><th>المشترك واليوزر</th><th>المصدر</th><th>الحالة / المدة</th><th>تاريخ التفعيل والانتهاء</th><th>الهوست / M3U</th><th>التحكم</th></tr></thead><tbody id="account-list"></tbody></table></div>
<div class="inline" style="justify-content:space-between;margin-top:13px"><span id="accounts-pagination" class="muted">—</span>
<button class="btn secondary sm" id="accounts-next" type="button" hidden>المزيد من المشتركين</button></div>
<div id="account-detail" class="accountsecret" hidden style="margin-top:15px"></div></div></section>
<section class="view" id="page-codes">
<div class="heading"><div><h2>أكواد الاشتراكات</h2><p>أكواد التطبيق تُفعّل داخل BLOFY STREAM فقط: خانة كود واحدة والهوست داخلي، ولا يستطيع العميل استخراج حساب Xtream من صفحة الويب. المدة تبدأ عند أول تفعيل.</p></div>
<span class="pill good">إصدار الكود والتجديد ونقل الجهاز من هنا فقط</span></div>
<p class="muted" id="codes-load-state" role="status" aria-live="polite" hidden></p>
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
<p class="muted">إعادة الدخول: اضغط «إعادة دخول» عند طلب العميل، ثم يدخل نفس الكود خلال 10 دقائق. تستطيع تكرار الموافقة كلما احتاج، ولا تتغير مدة الاشتراك.</p>
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
<div class="panel code-manager" id="codes-manager" tabindex="-1">
<div class="controls"><div><h3>إدارة الكود · تجديد الصلاحية · نقل الجهاز</h3>
<p class="muted">لكل كود يمكنك السماح بإعادة الدخول بنفس الرقم بضغط زر، حتى بعد تغيير نسخة التطبيق أو الجهاز. كل موافقة تفتح فرصة دخول واحدة لمدة 10 دقائق، دون تجديد أو تغيير الكود.</p></div>
<span class="pill" id="codes-filter-count">—</span></div>
<div class="formgrid">
<div class="field"><label for="codes-search">بحث بالكود أو اسم العميل أو جواله</label><input id="codes-search" type="search" autocomplete="off" placeholder="آخر أرقام الكود، الاسم، الرقم..."></div>
<div class="field"><label for="codes-filter">تصفية حسب الحالة</label><select id="codes-filter">
<option value="all">كل الأكواد</option><option value="active">ساري</option><option value="expired">منتهي الصلاحية</option>
<option value="expiring">ينتهي خلال 7 أيام</option><option value="pending">بانتظار الجهاز الجديد</option>
<option value="unused">غير مفعل</option><option value="revoked">ملغى</option></select></div>
<div class="field"><label for="codes-sort">الترتيب</label><select id="codes-sort">
<option value="new">الأحدث</option><option value="expiry">الأقرب للانتهاء</option><option value="old">الأقدم</option></select></div>
</div>
<p class="muted">البحث في الأكواد المحمّلة حاليًا. اضغط «المزيد من الأكواد» لجلب البقية. الأكواد المخفية القديمة يُبحث عنها بالأرقام الظاهرة.</p>
</div>
<dialog id="codes-dialog" aria-labelledby="codes-dialog-title">
<div class="controls"><h3 id="codes-dialog-title">مميزات الكود وإدارة الاشتراك</h3>
<button class="btn secondary sm" id="codes-dialog-close" type="button">إغلاق ×</button></div>
<p id="codes-dialog-status" class="status" role="status" hidden></p>
<div id="codes-selected" class="code-detail" aria-live="polite"></div>
</dialog>
<div class="panel"><div class="controls"><h3>سجل الأكواد</h3>
<div class="actions"><button class="btn secondary sm" id="codes-copy-visible" type="button">نسخ الأكواد القابلة للاسترجاع</button><button class="btn secondary sm" id="reload-codes" type="button">↻ تحديث</button></div></div>
<p class="muted">زر النسخ ثابت لكل كود جديد مشفّر في الخادم، حتى بعد تحديث الصفحة. الأكواد القديمة التي لم تُحفظ مشفّرة لا يمكن استرجاعها. لا تنسخ الأكواد الملغاة.</p>
<div class="tablewrap"><table><thead><tr><th>الوصف / نوع الاشتراك</th><th>الكود / النسخ</th><th>المدة</th><th>الحالة</th><th>المبيعات</th><th>وقت التفعيل</th><th>انتهاء الاشتراك</th><th>التحكم</th></tr></thead>
<tbody id="codes-list"></tbody></table></div>
<div class="inline" style="justify-content:space-between;margin-top:13px"><span id="codes-pagination" class="muted">—</span>
<button class="btn secondary sm" id="codes-next" type="button" hidden>المزيد من الأكواد</button></div>
</div></section>
<section class="view" id="page-distributors">
<div class="heading"><div><h2>لوحات التوزيع</h2>
<p>أنشئ لوحة توزيع لاستخراج كود أو Xtream من مصدر saleh فقط (وليس XTREAM 2). للموزع تنظيم قوائم مكتبته الشخصية فقط، دون تعديل مكتبة المشتركين أو إدارة المصادر والبث.</p></div>
<a class="btn secondary" href="/distributor" target="_blank" rel="noopener noreferrer">فتح لوحة التوزيع ↗</a></div>
<div class="cards" style="grid-template-columns:repeat(3,minmax(0,1fr))">
<div class="stat"><small>إجمالي لوحات التوزيع</small><strong id="dist-total">—</strong></div>
<div class="stat"><small>اللوحات النشطة</small><strong id="dist-active">—</strong></div>
<div class="stat"><small>رصيد الأشهر المتبقي للموزعين</small><strong id="dist-credits">—</strong></div></div>
<div class="panel"><h3>إصدار لوحة توزيع جديدة</h3>
<p class="muted">سيتم إنشاء اسم مستخدم وكلمة مرور خاصة بالموزع؛ كلمة المرور تظهر لك عند الإنشاء فقط. الرصيد بوحدة الشهر: شهر يخصم 1، سنة تخصم 12، والتجربة اليومية مجانية (مرة لكل جوال، بحد يومي).</p>
<form id="dist-create-form"><div class="formgrid">
<div class="field"><label for="dist-name">اسم الموزع</label><input id="dist-name" name="name" minlength="2" maxlength="80" required placeholder="اسم المحل / الموزع"></div>
<div class="field"><label for="dist-username">اسم الدخول الإنجليزي</label><input id="dist-username" name="username" minlength="4" maxlength="32" pattern="[a-z][a-z0-9_.-]{3,31}" required placeholder="distributor01" dir="ltr"></div>
<div class="field"><label for="dist-initial">رصيد الأشهر الأولي</label><input id="dist-initial" name="credits" type="number" min="0" max="10000" value="0" required></div>
</div><div class="actions" style="margin-top:15px"><button class="btn" type="submit">＋ إنشاء لوحة توزيع</button></div></form>
<div id="dist-secret" class="accountsecret" hidden style="margin-top:13px"></div></div>
<div class="panel"><div class="controls"><h3>إدارة الموزعين</h3>
<button class="btn secondary sm" id="dist-refresh" type="button">↻ تحديث الموزعين</button></div>
<p class="muted">تستطيع إضافة رصيد أشهر (مثل 12 شهرًا لسنة)، إيقاف اللوحة أو تغيير كلمة المرور. الإيقاف يلغي جلسات الدخول فورًا. لا تخرج كلمة المرور إلا لصاحب اللوحة.</p>
<div class="tablewrap"><table><thead><tr><th>الموزع</th><th>اسم المستخدم</th><th>رصيد الأشهر</th><th>الإصدارات</th><th>الحالة</th><th>التحكم</th></tr></thead>
<tbody id="dist-list"></tbody></table></div></div>
</section>
<section class="view" id="page-diagnostics"><div class="heading"><div><h2>الفحص والصيانة</h2><p>تشخيص المصادر ومحرك البث بدون تعديل محتوى المشتركين.</p></div></div>
<div class="diag-intro panel" id="diagnostic-guided-center">
 <div><span class="diag-eyebrow">BLOFY STREAM · تشخيص ذكي</span>
 <h3>مركز فحص التشغيل والمصادر</h3>
 <p class="muted">ابدأ بالبيانات المخزنة، ثم افحص عينة واحدة عند الحاجة وبأمرك. نجاح الخادم لا يثبت صوتًا وصورة على جهاز المشاهد.</p></div>
 <div class="diag-quick">
 <button type="button" class="btn secondary" id="diagnostic-go-capacity">📡 حدود المصدر</button>
 <button type="button" class="btn secondary" id="diagnostic-go-audio">🔊 تشخيص الصوت</button>
 <button type="button" class="btn secondary" id="diagnostic-go-failures">⚠️ سجل 404</button>
 </div></div>
<div class="panel" id="deep-audit-panel">
<div class="controls"><div><h3>فحص النظام بالكامل</h3><p class="muted">اختيار المصدر يُظهر حد اتصالاته بدل تعميم النتيجة على جميع المصادر.</p></div>
<div class="diag-actions"><label class="diag-source-label" for="deep-audit-source">المصدر <select id="deep-audit-source" aria-label="المصدر المراد فحصه"><option value="">كل المصادر</option></select></label>
<button id="deep-audit-run" class="btn" type="button">↻ بدء الفحص</button>
<button id="deep-audit-ai" class="btn secondary" type="button" disabled aria-controls="deep-audit-ai-result">🤖 تفسير Groq AI</button>
<button id="deep-audit-export" class="btn secondary" type="button">تصدير تقرير الدعم</button></div></div>
<p class="muted">فحص قراءة فقط، يعتمد على السجلات وحالات الخدمات، ولا يشغّل فيديو أو يغيّر اشتراكات العملاء.</p>
<div id="deep-audit-ai-card" class="diag-ai-card" role="region" aria-label="نتيجة Groq AI">
<div class="diag-ai-indicator"><span class="diag-ai-glow" aria-hidden="true">✦</span><div><strong>Groq AI • تحليل الفحص</strong><small id="deep-audit-ai-status">اتصال Groq لم يُتحقق منه في هذه الصفحة بعد.</small></div></div>
<p id="deep-audit-ai-result" class="diag-ai-text" role="status" aria-live="polite" aria-atomic="true">شغّل الفحص، ثم اضغط «تفسير Groq AI». سيظهر التفسير هنا مباشرة، ولن يختفي أسفل الجداول.</p>
</div>
<div class="cards">
<div class="stat"><small>سليم حسب المؤشرات</small><strong id="deep-audit-ok">—</strong></div>
<div class="stat"><small>يحتاج مراجعة</small><strong id="deep-audit-warning">—</strong></div>
<div class="stat"><small>لم يتم التحقق</small><strong id="deep-audit-unknown">—</strong></div>
</div>
<p class="muted" id="deep-audit-status" role="status" aria-live="polite">لم يبدأ الفحص بعد.</p>
<div id="deep-audit-priorities" class="diag-priorities" aria-live="polite"><p class="muted">ستظهر هنا المشاكل الأهم بعد الفحص مع اختصارات الوصول للإجراء المناسب.</p></div>
<div class="diag-filterbar"><label for="deep-audit-filter">عرض الحالة
<select id="deep-audit-filter"><option value="all">جميع النتائج</option><option value="warning">تحتاج مراجعة</option><option value="unknown">غير مؤكدة</option><option value="ok">سليمة حسب المؤشرات</option></select></label>
<label for="deep-audit-search">بحث في التقرير <input id="deep-audit-search" type="search" maxlength="90" placeholder="مثال: الصوت، القنوات، التحديثات"></label>
<span id="deep-audit-visible" class="muted" role="status">—</span></div>
<div class="tablewrap"><table><thead><tr><th>القسم</th><th>الحالة</th><th>النتيجة</th><th>التفاصيل</th></tr></thead>
<tbody id="deep-audit-items"></tbody></table></div>
<h4>الخطوات المقترحة</h4><div id="deep-audit-recommendations" class="diag-recommendations" aria-live="polite"></div>
</div>
<div class="panel"><h3>فحص المصدر</h3><div class="inline"><select id="diagnostic-source"></select>
<select id="diagnostic-type"><option value="live">القنوات</option><option value="movie">الأفلام</option><option value="series">المسلسلات</option><option value="episode">الحلقات</option></select>
<button class="btn" id="diagnostic-test">فحص اتصال المصدر</button>
<button class="btn secondary" id="diagnostic-media">فحص الوسائط</button>
</div><pre id="diagnostic-output" class="log">نتائج فحوص الوسائط ستظهر هنا.</pre></div>
<div class="panel" id="stream-release-inspector-panel">
<div class="controls"><h3>تحديث تطبيق BLOFY STREAM</h3>
<button id="stream-release-check" type="button" class="btn secondary sm">فحص معلومات الإصدار</button></div>
<p id="stream-release-info" class="muted" role="status" aria-live="polite">لم يتم فحص بيانات الإصدار بعد.</p>
<p class="muted">يعرض معلومات ملف التحديث فقط. لا يؤكد توقيع APK أو تثبيته أو عمله على التلفزيون؛ يلزم فحص الملف والجهاز قبل النشر.</p>
</div>
<div class="panel" id="series-episode-diagnostic-panel">
<div class="controls"><h3>فحص خريطة حلقات مسلسل</h3>
<button class="btn secondary sm" id="diagnostic-episode-map-run" type="button">قراءة الحلقات</button></div>
<p class="muted">يعرض الحلقات المربوطة بالمصدر المحدد دون تشغيل أو حذف. الحد 120 حلقة.</p>
<div class="inline"><label for="diagnostic-series-id">معرف المسلسل</label>
<input id="diagnostic-series-id" maxlength="100" placeholder="معرف المسلسل من المصدر" dir="ltr">
</div>
<p id="diagnostic-episode-map-status" class="muted" role="status">لم يبدأ الفحص</p>
<div class="tablewrap"><table><thead><tr><th>الرقم</th><th>معرف الحلقة</th><th>امتداد التشغيل</th></tr></thead>
<tbody id="diagnostic-episode-map-results"></tbody></table></div>
</div>
<div class="panel" id="media-failures-panel"><div class="controls"><div><h3>⚠️ سجل العناصر التي أعاد المزود لها 404</h3>
<p class="muted">سجل تاريخي من الفحوص الفعلية؛ لا يعني أن العناصر ما زالت معطلة الآن.</p></div>
<div class="diag-actions"><label for="diagnostic-failures-source">المصدر
<select id="diagnostic-failures-source" aria-label="تصفية أخطاء 404 حسب المصدر"><option value="">كل المصادر</option></select></label>
<button id="diagnostic-failures-reload" class="btn secondary sm" type="button">↻ تحديث السجل</button>
<button id="diagnostic-failures-recheck" class="btn secondary sm" type="button" disabled>🧪 فحص 404 المحدود</button></div></div>
<p id="diagnostic-failures-summary" class="diag-inline-note" role="status">لم تُقرأ بيانات الأخطاء بعد.</p>
<p class="muted" id="diagnostic-failures-recheck-result" role="status" aria-live="polite">اختر مصدرًا محددًا للمراجعة. فحص 404 يحتاج موافقتك لأنه قد يستهلك اتصالًا لدى المزود؛ لا يُشغَّل تلقائيًا.</p>
<div class="tablewrap"><table><thead><tr><th>المصدر</th><th>النوع</th><th>الحالة</th><th>العناصر</th><th>تستحق إعادة الفحص</th></tr></thead>
<tbody id="diagnostic-failures"></tbody></table></div>
<h4 style="margin:20px 0 8px">تفاصيل العناصر المسجلة</h4>
<p class="muted">أسماء عناصر المصدر نفسها حين تكون موجودة في الفهرس، دون عرض روابط الفيديو أو أي كلمة مرور.</p>
<p id="diagnostic-failures-items-status" class="diag-inline-note" role="status" aria-live="polite">جار انتظار فحص السجل.</p>
<div class="tablewrap"><table><thead><tr><th>المصدر</th><th>الاسم أو معرف العنصر</th><th>النوع</th><th>الحالة</th><th>آخر تحقق</th><th>موعد المراجعة</th></tr></thead>
<tbody id="diagnostic-failures-items"></tbody></table></div>
<p class="muted">لا نحذف العناصر ولا نفترض أنها عادت للعمل؛ فحص عينة وسائط مصرح بها يتم يدويًا من «فحص المصدر» بالأعلى، ويختلف عن إعادة التحقق من كل عنصر 404 على حدة.</p>
</div>
<div class="panel" id="device-audio-validation">
<h3>🎧 خطة التأكد من الصوت والصورة على الأجهزة</h3>
<p class="muted">الفحص الآلي يحدد وصول المسارات والترميز فقط. التحقق النهائي يتطلب تشغيل قناة مسموح بها على الجهازين وسماع الصوت ومشاهدة الصورة.</p>
<div class="diag-device-grid"><div class="diag-device"><strong>Android 9 / Android TV</strong><span>شغّل قناة فيها صوت معروف ثم أخرى متأثرة. لاحظ نوع المشكلة ووقت اختفاء الصوت. اختبر ترجمات الحلقة.</span></div>
<div class="diag-device"><strong>Windows</strong><span>شغّل القناتين نفسهما وقارن محرك التشغيل وترميز الصوت وزمن فتح القناة وحالة الترجمة.</span></div></div>
<div class="diag-quick"><button type="button" id="diagnostic-open-audio" class="btn secondary">عرض مسارات الصوت المرصودة</button>
<button type="button" id="diagnostic-open-playback" class="btn secondary">عرض مراقبة تشغيل الوسائط</button></div>
<p class="muted">نتائج تجربة الجهاز ليست مقيسة آليًا من الموقع، ولا يحوّل النظام الصوت أو يغيّر اشتراكات العملاء بمجرد عرض التشخيص.</p>
</div>
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
  var tabs={home:"الرئيسية",sources:"المصادر",restream:"إعادة البث",library:"المكتبة",accounts:"المشتركون",codes:"أكواد الاشتراك",distributors:"لوحات التوزيع",diagnostics:"الفحص والصيانة"};
  var state={overview:null,engine:null,accounts:[],accountsNext:null,accountsOffset:0,accountsEpoch:0,accountsLoading:false,distributors:[],codes:[],codesOffset:0,codesNext:null,codesEpoch:0,codesLoading:false,libOffset:0,libParams:null,libEpoch:0,libLoading:false,
    health:null,security:null,refreshVersion:0,healthTime:null,
    live:{overview:false,engine:false,health:false,security:false},
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
    document.querySelectorAll(".navlink").forEach(function(x){var selected=x.dataset.tab===id;x.classList.toggle("active",selected);if(selected)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current")});
    $("title").textContent=tabs[id];$("top-section").textContent=tabs[id];
    if(location.hash!=="#"+id&&window.history&&history.replaceState)history.replaceState(null,"","#"+id);
    closeSidebar();
    if(id==="library"&&!state.libParams)loadCatalog(false);
    if(id==="accounts")loadAccounts(false);if(id==="codes")loadCodes(false);
    if(id==="distributors")void loadDistributors();if(id==="library")void updateLibraryAIStatus();window.scrollTo({top:0,behavior:"instant"});
  }
  document.querySelectorAll("[data-tab]").forEach(function(e){e.addEventListener("click",function(){tab(e.dataset.tab)})});
  document.querySelectorAll("[data-go]").forEach(function(e){e.addEventListener("click",function(){
    tab(e.dataset.go);
    var target=e.dataset.focus;
    if(target)requestAnimationFrame(function(){var field=$(target);if(field)field.focus()});
  })});
  // Mobile drawer and desktop mini-sidebar affect presentation only.
  var sidebar=$("app-sidebar"),scrim=$("sidebar-scrim"),menuToggle=$("sidebar-open"),collapseToggle=$("sidebar-collapse");
  function closeSidebar(){document.body.classList.remove("menu-open");scrim.hidden=true;menuToggle.setAttribute("aria-expanded","false")}
  function openSidebar(){document.body.classList.add("menu-open");scrim.hidden=false;menuToggle.setAttribute("aria-expanded","true");var selected=sidebar.querySelector(".navlink.active");if(selected)selected.focus({preventScroll:true})}
  menuToggle.addEventListener("click",function(){if(document.body.classList.contains("menu-open"))closeSidebar();else openSidebar()});
  scrim.addEventListener("click",function(){closeSidebar();menuToggle.focus()});
  collapseToggle.addEventListener("click",function(){var compact=document.body.classList.toggle("sidebar-compact");this.setAttribute("aria-pressed",String(compact));this.setAttribute("aria-label",compact?"توسيع القائمة الجانبية":"طي القائمة الجانبية");this.title=compact?"توسيع القائمة":"طي القائمة"});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&document.body.classList.contains("menu-open")){closeSidebar();menuToggle.focus()}});
  window.addEventListener("resize",function(){if(window.innerWidth>980)closeSidebar()});
  $("primary-nav").addEventListener("keydown",function(e){if(e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;var links=Array.from(this.querySelectorAll(".navlink"));var index=links.indexOf(document.activeElement);if(index<0)return;e.preventDefault();links[(index+(e.key==="ArrowDown"?1:-1)+links.length)%links.length].focus()});
  window.addEventListener("hashchange",function(){var requested=location.hash.slice(1);if(tabs[requested])tab(requested)});
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
  var hubState=null,hubLoading=false;
  var hubBytes=function(n){
    var val=Number(n||0);
    if(!Number.isFinite(val)||val<0)return "—";
    return val>=1073741824?(val/1073741824).toFixed(2)+" GB":
      val>=1048576?(val/1048576).toFixed(1)+" MB":
      val.toLocaleString("en-US")+" B";
  };
  // Display independent server-enforced safety gates instead of a dead
  // disabled button. A click while blocked never requests video bytes.
  var hubBlockerLabels={
    batch_not_enabled:"تفعيل النقل الجزئي في الخادم",
    storage_upload_disabled:"تفعيل الحفظ في التخزين الخاص",
    storage_rights_unconfirmed:"تأكيد صلاحية حفظ الفيلم",
    source_quiet_window_unconfirmed:"تحديد فترة خمول المصدر",
    source_idle_unconfirmed:"التأكد أن المصدر غير مستخدم الآن",
    batch_run_id_missing:"تحديد رقم عملية النقل",
    movie_size_unconfirmed:"تأكيد حجم الفيلم",
    approved_movie_not_selected:"تحديد الفيلم المراد نقله",
    source_bridge_not_configured:"تجهيز الاتصال الداخلي بالمصدر",
    invalid_batch_limit:"تصحيح إعداد عدد الأجزاء"
  };
  function hubBlockerMessage(data){
    var missing=data&&data.batchReadiness&&data.batchReadiness.blockedBy;
    if(!Array.isArray(missing)||!missing.length)
      return "التنزيل غير مفعّل في إعدادات Content Hub. استخدم فحص مصدر الفيلم لمعرفة حالته.";
    return "التحميل متوقف للأسباب التالية: "+missing.map(function(code){
      return hubBlockerLabels[code]||"إعداد غير مكتمل";
    }).join("، ")+" . لم يتم تنزيل أي جزء من المصدر.";
  }
  async function loadContentHub(){
    if(hubLoading)return;hubLoading=true;
    try{
      var data=await api("content-hub/status");
      hubState=data;
      var episodeGate=data.episodeCopyReadiness||{};
      var episodeRuns=Array.isArray(data.episodeRuns)?data.episodeRuns:[];
      var episodeRun=episodeRuns.find(function(x){
        return x.format==="private_episode_chunks";
      })||null;
      var episodeComplete=episodeRun?.state==="verified"&&
        Number(episodeRun.expectedBytes||0)>0&&
        Number(episodeRun.bytesCopied||0)===Number(episodeRun.expectedBytes||0);
      var episodePercent=episodeRun?Math.min(100,Math.max(0,
        Number(episodeRun.bytesCopied||0)/
        Math.max(1,Number(episodeRun.expectedBytes||1))*100)):0;
      var episodeCopyMessage=episodeComplete?
        "✅ الحلقة مكتملة وتم التحقق من SHA-256 · "+
        hubBytes(episodeRun.expectedBytes):
        episodeRun?"الحلقة: "+episodePercent.toFixed(2)+"% · "+
          hubBytes(episodeRun.bytesCopied)+" من "+
          hubBytes(episodeRun.expectedBytes)+
          (data.episodeCopyBusy?" · جارٍ حفظ الجزء الحالي":
            " · الأجزاء محفوظة ويمكن الاستكمال"):
        "لم يبدأ نقل أي حلقة؛ ما زلنا في مرحلة الفحص.";
      if(episodeGate.ready!==true&&!episodeComplete)
        episodeCopyMessage+=" · النقل غير مفعّل: "+
          (episodeGate.blockedBy||[]).join("، ");
      $("content-hub-episode-copy-progress").textContent=episodeCopyMessage;
      $("content-hub-episodes-list").querySelectorAll("button[data-episode-copy]")
        .forEach(function(button){
          var approved=Number(button.dataset.episodeCopy)===
            Number(episodeGate.approvedGatewayId||0);
          button.disabled=!approved||episodeGate.ready!==true||
            data.episodeCopyBusy===true||episodeComplete;
          button.textContent=episodeComplete&&approved?
            "✅ الحلقة مكتملة":data.episodeCopyBusy&&approved?
            "جارٍ حفظ الجزء...":"⬇ نقل الجزء التالي (8 MB)";
        });
      var job=data.continuousCopy||{};
      var running=data.pilotRunning===true||job.active===true;
      var chunked=Array.isArray(data.runs)?
        data.runs.find(function(item){return item.format==="private_chunks"}):null;
      // Durable "verified" is authoritative; a new container's in-memory
      // continuous-copy status may read "idle" after the movie is complete.
      var movieComplete=chunked?.state==="verified"&&
        Number(chunked?.expectedBytes||0)>0&&
        Number(chunked?.bytesCopied||0)===Number(chunked?.expectedBytes||0);
      $("content-hub-start-copy").disabled=movieComplete||running||
        data.chunkedBatchEnabled!==true;
      $("content-hub-start-copy").textContent=movieComplete?
        "✅ الفيلم محفوظ بالكامل":job.state==="paused"||job.state==="failed"?
        "▶ استكمال تنزيل الفيلم":"▶ بدء / استكمال تنزيل الفيلم";
      $("content-hub-pause-copy").disabled=movieComplete||!running;
      $("content-hub-next-batch").disabled=movieComplete||running;
      $("content-hub-next-batch").textContent=movieComplete?
        "✅ كل الأجزاء محفوظة":data.chunkedBatchEnabled===true?
        "تنزيل جزء واحد (8 MB)":"ℹ لماذا لا يبدأ النقل؟";
      var summary=data.accounting||{};
      var progress=chunked?Math.min(100,Math.max(0,
        Number(chunked.bytesCopied||0)/Math.max(1,Number(chunked.expectedBytes||1))*100)):0;
      $("content-hub-progress").value=progress;
      $("content-hub-percent").textContent=progress.toFixed(2)+"% · "+
        hubBytes(chunked?.bytesCopied||0)+" من "+hubBytes(chunked?.expectedBytes||0)+
        " · الحالة: "+(movieComplete?"اكتمل وتحققنا من سلامته":
          job.active?"جارٍ النقل":job.state==="failed"?"توقف بسبب خطأ":
          job.state==="paused"?"متوقف ويمكن استكماله":
          job.state==="completed"?"اكتمل":chunked?"محفوظ جزئيًا":"لم يبدأ");
      $("content-hub-summary").textContent=
        "أفلام مكتملة: "+count(summary.verifiedCount||0)+
        " · حجم الملفات المؤكدة: "+hubBytes(summary.verifiedBytes)+
        " · أجزاء محفوظة: "+hubBytes(summary.stagedChunkBytes||0)+
        " · النقل الآن: "+(running?"جارٍ":"متوقف");
      var canary=data.lastCanary||{};
      $("content-hub-diagnose").disabled=data.canaryRunning===true||
        Number(summary.verifiedCount||0)<1;
      $("content-hub-owner-preview").disabled=!movieComplete||
        data.ownerPreviewEnabled!==true;
      $("content-hub-preview-note").textContent=!movieComplete?
        "لا تتوفر معاينة قبل اكتمال الفيلم والتحقق منه.":
        data.ownerPreviewEnabled===true?
        "المعاينة خاصة ومحدودة بـ12 ثانية؛ اضغط تشغيل لتجربة المتصفح دون تحويل الأكواد.":
        "معاينة المتصفح مقفلة من إعدادات الخادم؛ فحوصات الصورة والصوت الآلية متاحة.";
      var desc=data.canaryRunning?"جارٍ فحص الصورة والصوت من التخزين الخاص...":
        canary.ok===true&&
        ["canary_audio_video_decoded","canary_audio_video_and_seeks_verified"].includes(canary.code)?
        "✅ تم فك ترميز الصورة والصوت: "+String(canary.videoCodec||"—")+
        " "+String(canary.width||"")+"×"+String(canary.height||"")+
        " | صوت: "+String(canary.audioCodec||"—")+
        " | إطارات صورة: "+String(canary.videoFramesDecoded||0)+
        " | عينات صوت: "+String(canary.audioFramesDecoded||0)+
        (canary.seekVerified===true?
         " | ✅ التقديم والترجيع: "+String(canary.seeksVerified||0)+" مواضع ناجحة":
         " | فحص التقديم والترجيع غير مكتمل")+
        " | الملف الكامل تم التحقق من سلامته.":
        canary.checkedAt?"تعذر إكمال فحص التشغيل ("+
          String(canary.code||"غير معروف")+
          "). لا يتم تغيير تشغيل المشتركين.":
          "لم يتم اختبار التشغيل في هذه الجلسة. الفيلم المكتمل فقط قابل للفحص.";
      $("content-hub-canary-status").textContent=desc;
      var box=$("content-hub-runs");box.replaceChildren();
      var runs=Array.isArray(data.runs)?data.runs:[];
      if(!runs.length)box.textContent="ما فيه عمليات نسخ حقيقية محفوظة حتى الآن.";
      runs.slice(0,10).forEach(function(run){
        var row=document.createElement("p");row.className="muted";
        var pct=Math.min(100,Math.max(0,Number(run.percent||0)));
        row.textContent=String(run.runId||"نسخ تجريبي")+
          " — "+pct+"% ("+hubBytes(run.bytesCopied)+
          " من "+hubBytes(run.expectedBytes)+") · "+
          (run.state==="verified"?"مكتمل ومتحقق منه":
           run.state==="staged"?"محفوظ وقابل للاستكمال":
           run.state==="failed"?"فشل":"جارٍ");
        box.append(row);
      });
      $("content-hub-notice").textContent=movieComplete?
        "✅ اكتمل نقل الفيلم والتحقق من الملف. لا تضغط بدء أو استكمال مرة ثانية. التالي: اختبار تشغيله على أجهزة BLOFY PLAYER قبل تحويل تشغيل المشتركين.":
        running?"الفيلم يُنقل تلقائيًا على دفعات 8 MB. يظهر التقدم أعلاه كل عدة ثوانٍ.":
        job.state==="failed"?"توقف النقل بسبب: "+String(job.code||"خطأ غير معروف")+
        " · يمكنك استكمال النقل من آخر جزء محفوظ بعد حل المشكلة.":data.chunkedBatchEnabled?
        "النقل جاهز. اضغط بدء تنزيل الفيلم مرة واحدة، أو حمّل جزءًا تجريبيًا.":
        hubBlockerMessage(data);
    }catch(e){
      hubState=null;
      $("content-hub-start-copy").disabled=true;
      $("content-hub-pause-copy").disabled=true;
      $("content-hub-next-batch").disabled=false;
      $("content-hub-next-batch").textContent="ℹ لماذا لا يبدأ النقل؟";
      $("content-hub-notice").textContent=
        "التحقق من جاهزية الخادم غير متاح، لم يبدأ أي تنزيل.";
      $("content-hub-summary").textContent=
        "تعذر الاتصال بالتخزين الخاص: "+String(e.message||"غير متاح").slice(0,70);
    }finally{hubLoading=false}
  }
  $("content-hub-refresh").addEventListener("click",loadContentHub);
  $("content-hub-preflight").addEventListener("click",async function(){
    this.disabled=true;
    try{
      var x=await api("content-hub/preflight");
      $("content-hub-notice").textContent=
        "المصدر: "+String(x.sourceName||"غير معروف")+
        " · الفيلم #"+String(x.gatewayId||"غير محدد")+
        " · نسخة محفوظة مصرح بها: "+(x.storageRightsDeclared?"نعم":"غير مؤكدة")+
        " · خمول المصدر: "+(x.sourceIdleDeclared?"معلن":"غير مؤكد")+
        " · توافق الفيلم المحدد: "+(x.approvedMovieMatches?"نعم":"لا")+
        " · لم تُنزل أي بايتات فيديو بهذا الفحص.";
    }catch(e){show("فحص الفيلم غير متاح: "+e.message,false)}
    finally{this.disabled=false}
  });
  $("content-hub-episodes-check").addEventListener("click",async function(){
    this.disabled=true;
    $("content-hub-episodes-status").textContent=
      "جارٍ قراءة فهرس الحلقات فقط، بدون الوصول إلى ملفات الفيديو...";
    var out=$("content-hub-episodes-list");out.replaceChildren();
    try{
      var response=await api("content-hub/episodes/candidates");
      var candidates=Array.isArray(response.candidates)?response.candidates:[];
      $("content-hub-episodes-status").textContent=candidates.length?
        "ظهرت "+count(candidates.length)+" حلقات مؤهلة للفحص. لم يبدأ نقل أي حلقة. اختر حلقة لاحقًا بعد تأكيد صلاحية التخزين.":
        "لا توجد حلقات مفهرسة مؤهلة حاليًا. قد تحتاج مزامنة تفاصيل المسلسلات أولًا؛ لا يعني هذا أن المصدر خالٍ من المسلسلات.";
      candidates.forEach(function(item){
        var card=document.createElement("p");
        card.className="muted";
        var id=Number(item.gatewayId);
        if(!Number.isSafeInteger(id)||id<1)return;
        card.textContent=String(item.title||"حلقة بدون عنوان").slice(0,220)+
          " · رقم الحلقة في الفهرس: "+id+
          " · الصيغة: "+String(item.extension||"—").slice(0,8);
        var probe=document.createElement("button");
        probe.className="btn secondary";probe.type="button";
        probe.textContent="فحص حجم هذه الحلقة (4 KB فقط)";
        probe.dataset.episodeProbe=String(id);
        probe.style.marginInlineStart="10px";
        card.append(" ",probe);
        var proof=document.createElement("span");
        proof.className="muted";
        proof.dataset.episodeSizeResult=String(id);
        card.append(" ",proof);
        var chunkButton=document.createElement("button");
        chunkButton.type="button";chunkButton.className="btn secondary";
        chunkButton.dataset.episodeCopy=String(id);
        chunkButton.style.marginInlineStart="10px";
        chunkButton.textContent="⬇ نقل الجزء التالي (8 MB)";
        var ready=hubState?.episodeCopyReadiness||{};
        var selected=Number(ready.approvedGatewayId)===id;
        var verified=hubState?.episodeRuns?.some(function(x){
          return x.format==="private_episode_chunks"&&x.state==="verified";
        });
        chunkButton.disabled=!selected||ready.ready!==true||
          hubState?.episodeCopyBusy===true||Boolean(verified);
        card.append(" ",chunkButton);
        out.append(card);
      });
    }catch(e){
      $("content-hub-episodes-status").textContent=
        "تعذر فحص الحلقات من المصدر الخاص. لم تُنزّل أي ملفات. "+
          String(e.message||"").slice(0,90);
    }finally{this.disabled=false}
  });
  $("content-hub-episodes-list").addEventListener("click",async function(event){
    var button=event.target?.closest?.("button[data-episode-probe]");
    if(!button||button.disabled)return;
    var id=Number(button.dataset.episodeProbe);
    if(!Number.isSafeInteger(id)||id<1)return;
    if(!confirm("فحص حجم الحلقة رقم "+id+
      " بطلب 4 كيلوبايت فقط من المصدر؟ لا يتم حفظ الفيلم أو نقل الحلقة."))return;
    button.disabled=true;
    var info=this.querySelector('span[data-episode-size-result="'+id+'"]');
    if(info)info.textContent=" · جارٍ فحص حجم المصدر...";
    try{
      var result=await action("content-hub/episodes/probe",
        "content-hub-episode-probe",{gatewayId:id,confirmed:true});
      if(info)info.textContent=" ✅ الحجم المتوقع: "+
        hubBytes(result.expectedBytes)+" · "+result.expectedBytes+
        " بايت · "+(result.validatorPresent?"المصدر يوفّر معرف نسخة":"لا يوجد معرف ثابت للنسخة")+
        " · تم قراءة 4 KB فقط. لم يبدأ النسخ.";
      show("نجح فحص حجم الحلقة "+id+" دون بدء التحميل.",true);
    }catch(e){
      if(info)info.textContent=" تعذّر فحص حجم الحلقة: "+
        String(e.message||"خطأ").slice(0,75)+
        ". لم يتم حفظ أي بيانات.";
    }finally{button.disabled=false}
  });
  $("content-hub-episodes-list").addEventListener("click",async function(event){
    var button=event.target?.closest?.("button[data-episode-copy]");
    if(!button||button.disabled)return;
    var id=Number(button.dataset.episodeCopy);
    var ready=hubState?.episodeCopyReadiness||{};
    if(!Number.isSafeInteger(id)||id<1||ready.ready!==true||
      Number(ready.approvedGatewayId)!==id){
      show("الحلقة غير معتمدة للتنزيل أو إعدادات النقل غير مكتملة.",false);return;
    }
    if(!confirm("تأكيد تنزيل جزء واحد فقط (8 MB) من الحلقة رقم "+id+
       " إلى التخزين الخاص؟ يؤكد هذا أن لديك حقوق تخزين المحتوى وأن المصدر غير مستخدم حاليًا."))return;
    button.disabled=true;
    try{
      await action("content-hub/episodes/next",
        "content-hub-episode-next",{gatewayId:id,confirmed:true});
      show("بدأ تنزيل جزء واحد من الحلقة. تظهر نتيجة الحفظ في حالة النقل.",true);
    }catch(e){
      show("تعذر تنزيل جزء الحلقة: "+String(e.message||"غير متاح"),false);
    }finally{await loadContentHub()}
  });
  $("content-hub-owner-preview").addEventListener("click",async function(){
    if(this.disabled)return;
    var player=$("content-hub-preview-player");
    // The browser requests a fixed same-origin owner-only route. It never
    // receives Railway internal URLs, bearer tokens or upstream credentials.
    player.pause();
    player.removeAttribute("src");
    player.load();
    player.src="/operator/api/content-hub/preview";
    player.load();
    $("content-hub-preview-note").textContent=
      "تحميل عينة 12 ثانية من التخزين الخاص. يختلف دعم AC3 في التطبيق عن AAC في المتصفح.";
    try{await player.play()}catch{
      $("content-hub-preview-note").textContent=
        "اضغط تشغيل داخل المشغل. إن تعذّر، راجع حالة المعاينة أو الاتصال الخاص.";
    }
  });
  $("content-hub-preview-player").addEventListener("error",function(){
    $("content-hub-preview-note").textContent=
      "تعذر تشغيل العينة في المتصفح. لا يعني هذا أن الفيلم الأصلي تالف.";
  });
  $("content-hub-diagnose").addEventListener("click",async function(){
    if(this.disabled)return;
    if(!confirm("اختبار الفيديو والصوت من عينة محدودة من الفيلم المخزن؟ لن تتغير قنوات المشتركين أو مصدر التشغيل."))return;
    this.disabled=true;
    try{
      await action("content-hub/playback/diagnose",
        "content-hub-playback-diagnose",{confirmed:true});
      $("content-hub-canary-status").textContent=
        "تم قبول طلب الفحص. ستظهر نتائج الصورة والصوت عند اكتمال التحليل.";
      show("بدأ فحص تشغيل النسخة المخزنة، دون الاتصال بالمصدر الأصلي.",true);
    }catch(e){show("تعذر فحص تشغيل الفيلم: "+e.message,false)}
    finally{await loadContentHub();}
  });
  $("content-hub-start-copy").addEventListener("click",async function(){
    if(hubState?.runs?.some(function(r){return r.format==="private_chunks"&&
      r.state==="verified"&&Number(r.expectedBytes||0)===Number(r.bytesCopied||0)})){
      show("الفيلم مكتمل ومتحقق منه. لا تحتاج إعادة تنزيله.",true);return;
    }
    if(!hubState||hubState.chunkedBatchEnabled!==true){
      show(hubBlockerMessage(hubState),false);return;
    }
    if(!confirm("تأكيد نقل الفيلم المحدد إلى تخزين BLOFY على دفعات 8 MB؟ تأكد من عدم وجود مشتركين على المصدر وأن لديك حق تخزين الفيلم."))return;
    this.disabled=true;
    try{
      await action("content-hub/batch/start","content-hub-copy-start",{confirmed:true});
      show("بدأ نقل الفيلم تلقائيًا على دفعات. تقدر توقفه من زر الإيقاف.",true);
    }catch(e){show("تعذر بدء التنزيل: "+e.message,false)}
    finally{await loadContentHub()}
  });
  $("content-hub-pause-copy").addEventListener("click",async function(){
    if(!confirm("إيقاف نقل الفيلم؟ الأجزاء المحفوظة ستبقى ويمكن استكمالها."))return;
    this.disabled=true;
    try{
      await action("content-hub/batch/pause","content-hub-copy-pause",{confirmed:true});
      show("طلب الإيقاف وصل. الأجزاء السابقة محفوظة.",true);
    }catch(e){show("تعذر الإيقاف: "+e.message,false)}
    finally{await loadContentHub()}
  });
  $("content-hub-next-batch").addEventListener("click",async function(){
    if(hubState?.runs?.some(function(r){return r.format==="private_chunks"&&
      r.state==="verified"&&Number(r.expectedBytes||0)===Number(r.bytesCopied||0)})){
      show("كل أجزاء الفيلم محفوظة وتم التحقق منها بالفعل.",true);return;
    }
    if(!hubState){
      $("content-hub-notice").textContent="الاتصال بمركز المحتوى غير متاح حاليًا. لا يمكن بدء التحميل قبل فحصه.";
      show("مركز التخزين الخاص غير متصل؛ اضغط تحديث حالة النقل وأعد الفحص.",false);
      return;
    }
    if(hubState.pilotRunning===true){
      show("فيه دفعة قيد النقل الآن. تابع تقدمها من تحديث حالة النقل.",false);
      return;
    }
    if(hubState.chunkedBatchEnabled!==true){
      var why=hubBlockerMessage(hubState);
      $("content-hub-notice").textContent=why;
      show(why,false);
      return;
    }
    if(!confirm("تأكيد نقل دفعة واحدة بحجم 8 MB من فيلم saleh المحدد؟ يجب ألا يستخدم المشتركون مصدر الفيلم الآن، وأن تكون حقوق التخزين معتمدة."))return;
    this.disabled=true;
    try{
      await action("content-hub/batch/next",
        "content-hub-batch-next",{confirmed:true});
      show("تم قبول طلب دفعة واحدة، وليس تأكيد اكتمال نقلها. اضغط تحديث حالة النقل.",true);
    }catch(e){show("تعذّر بدء الدفعة: "+e.message,false)}
    finally{this.disabled=false;await loadContentHub();}
  });
  loadContentHub();
  setInterval(function(){
    var page=$("page-library");
    if(!document.hidden&&page?.classList.contains("active"))loadContentHub();
  },8000);
  function stateLabel(s){if(s.status==="online")return "متصل";if(s.status==="offline")return "متوقف";if(s.status==="syncing"||s.syncing)return "جار المزامنة";return s.status||"غير معروف"}
  function renderHome(){
    var d=state.overview,e=state.engine;
    if(d){var t=d.totals||{},s=d.subscribers||{};
      value("k-sources",count(t.servers));value("k-live",count(t.live));value("k-movie",count(t.movie));value("k-series",count(t.series));
      value("home-online",count(t.online));value("stream-online",count(t.online));
      value("home-accounts",count(s.gateway&&s.gateway.active));value("home-devices",count(s.devices&&s.devices.active));
      value("home-bridge",state.live.overview?"متصل":"آخر بيانات معروفة");
      $("system-pill").textContent=state.live.overview?"النظام متصل":"الاتصال بالمصادر غير مؤكد";
      $("system-pill").className="pill "+(state.live.overview?"good":"bad");
      renderSources();
    }else{$("system-pill").textContent="النظام غير متصل";$("system-pill").className="pill bad";value("home-bridge","غير متصل")}
    if(e){
      var m=e.mediaControl||{},ready=e.engine&&e.engine.reachable;
      var shared=e.sharedRelay||{},fanout=shared.fanout||{};
      value("shared-mode",shared.sharedLiveEnabled?"مفعّل للمشتركين المسموحين":"غير مفعّل");
      value("shared-feeds",shared.sharedLiveEnabled?count(fanout.activeFeeds):"—");
      value("shared-viewers",shared.sharedLiveEnabled?count(fanout.viewers):"—");
      value("fanout-cooldowns",shared.sharedLiveEnabled?count(fanout.cooldownFeeds):"—");
      value("fanout-warm-joins",shared.sharedLiveEnabled?count(fanout.lateJoinReplays):"—");
      value("fanout-replay-buffer",shared.sharedLiveEnabled?count(Math.ceil((fanout.bufferedBootstrapBytes||0)/1024)):"—");
      value("fanout-source-limit",shared.sharedLiveEnabled?count(fanout.sourceLimitRejections):"—");
      value("fanout-provider-failures",shared.sharedLiveEnabled?count(fanout.providerFailures):"—");
      value("fanout-slow-disconnects",shared.sharedLiveEnabled?count(fanout.slowViewerDisconnects):"—");
      value("relay-errors",shared.relayFailureTotal===undefined?"غير متاح":
        count(shared.relayFailureTotal));
      $("relay-error-breakdown").textContent=
        "أسباب 502 منذ بدء تشغيل الخادم الحالي (لا يشمل النسخ القديمة): "+
        Object.entries(shared.relayFailureCounts||{}).map(function(entry){
          return entry[0]+": "+count(entry[1])
        }).join(" • ");
      value("home-api",state.live.engine?"ONLINE":"غير مؤكد");
      value("home-media",state.live.engine?(ready?"ONLINE":"غير متصل"):"غير مؤكد");
      value("home-paths",count(m.activePaths));value("home-sessions",count(m.hlsSessions));
      value("stream-engine",state.live.engine?(ready?"ONLINE":"غير متصل"):"غير مؤكد");
      value("stream-paths",count(m.activePaths));
      value("stream-sessions",count(m.hlsSessions));
      var replica=e.readReplica||{};
      var edgeText=replica.reachable===true?"متصل على الشبكة الخاصة":
        replica.reachable===false?"غير متصل":"غير معروف";
      value("read-replica-status",edgeText);
      value("read-replica-link",replica.httpStatus===null||replica.httpStatus===undefined?
        "لم تستجب الخدمة":"HTTP "+replica.httpStatus);
      var proof=e.readReplicaSynthetic||{};
      var didPass=proof.ok===true&&proof.transportVerified===true;
      value("read-replica-video",didPass?
        "✓ نجحت العينة التجريبية ("+count(proof.bytesVerified)+" بايت)":
        proof.code?"لم ينجح فحص العينة":"لم يُختبر");
      value("read-replica-cutover",replica.customersRouted?"مفعّل":"غير مفعّل");
      value("read-replica-note",didPass?
        "نجح وصول MPEG-TS عبر Edge من Origin على شبكة خاصة. هذه عينة اصطناعية فقط؛ لم يُختبر saleh ولم تُنقل أكواد أو مشتركين.":
        replica.reachable===true?
        "الخادم متصل بالشبكة الخاصة، لكن اختبار انتقال الفيديو لم ينجح بعد. لا يؤثر ذلك على البث القديم.":
        "تعذر التأكد من الاتصال بخادم HLS الخاص. هذا لا يعني تعطل القنوات القديمة.");
      value("stream-note",m.controlAvailable?"المحرك متصل. المسارات النشطة تخص MediaMTX فقط، ولا تعني تحويل المشتركين إليه.":"واجهة محرك البث غير متاحة. الحالة غير مؤكدة.");
    }
  }
  function renderSources(){
    var sources=(state.overview&&state.overview.sources)||[];
    ["stream-source","diagnostic-source","deep-audit-source","diagnostic-failures-source","library-source","account-source","codes-source","live-source","live-backup-source"].forEach(function(id){
      select(id,(id==="account-source"||id==="codes-source")?sources.filter(function(s){return s.enabled&&s.publishCatalog}):sources,
        id==="deep-audit-source"?"المصدر الافتراضي للفحص":id==="library-source"||id==="diagnostic-failures-source"?"كل المصادر":(id==="account-source"||id==="codes-source")?"جميع المصادر المنشورة":id==="live-backup-source"?"بدون مصدر احتياطي":null);
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




 async function checkStreamRelease(){
  var b=$("stream-release-check");b.disabled=true;
  value("stream-release-info","جارٍ قراءة معلومات الإصدار المنشور...");
  try{
    var release=await api("stream-release");
    if(!release.ok||release.metadataConsistent!==true){
      value("stream-release-info","⚠ بيانات التحديث غير مؤكدة أو لا تتطابق مع تطبيق STREAM؛ لا تحدّث الأجهزة قبل المراجعة.");
      return;
    }
    value("stream-release-info","الإصدار "+String(release.versionName||"—")+
      " · رقم البناء "+String(release.versionCode||"—")+
      " · الحزمة "+String(release.packageName||"—")+
      " · صيغة البيانات سليمة، لكن توقيع وبصمة ملفات APK الفعلية وتوافق الجهاز لم يتم التحقق منها.");
  }catch{
    value("stream-release-info","تعذر الاتصال بخدمة التحديثات. لا يعني هذا حذف الإصدار.");
  }finally{b.disabled=false}
 }
 $("stream-release-check").addEventListener("click",checkStreamRelease);
 async function loadEpisodeMap(){
  var sourceId=$("diagnostic-source").value,seriesId=$("diagnostic-series-id").value.trim();
  if(!sourceId){show("اختر مصدرًا أولًا",false);return}
  if(!/^[A-Za-z0-9._-]{1,100}$/.test(seriesId)){
    show("أدخل معرف مسلسل صحيحًا من المصدر",false);return;
  }
  var button=$("diagnostic-episode-map-run"),table=$("diagnostic-episode-map-results");
  button.disabled=true;value("diagnostic-episode-map-status","جارٍ جلب الحلقات...");
  try{
    var result=await api("episodes?"+new URLSearchParams({sourceId:sourceId,seriesId:seriesId}));
    var items=Array.isArray(result.items)?result.items:[];
    table.replaceChildren();
    items.slice(0,120).forEach(function(item,index){
      var tr=node("tr");cell(tr,String(index+1));
      cell(tr,String(item.id||"—").slice(0,110));
      cell(tr,String(item.extension||"—").slice(0,12));
      table.appendChild(tr);
    });
    value("diagnostic-episode-map-status",items.length+
      " حلقة مربوطة. هذا فحص للفهرس فقط ولا يثبت تشغيل كل حلقة."+
      (items.length>=120?" قد توجد حلقات إضافية لم تظهر ضمن الحد.":""));
  }catch(e){
    value("diagnostic-episode-map-status","تعذر قراءة الخريطة: "+e.message);
  }finally{button.disabled=false}
 }
 $("diagnostic-episode-map-run").addEventListener("click",loadEpisodeMap);
  var deepAuditNames={
    bridge:"بوابة الاتصال",sources:"مصادر Xtream",catalog_live:"فهرس القنوات",
    catalog_movie:"فهرس الأفلام",catalog_series:"فهرس المسلسلات",
    media404:"أخطاء 404 الموثقة",codes:"أكواد الاشتراكات",libraryAI:"تنظيم المكتبة الذكي",
    subscribers:"المشتركون",engine:"محرك الوسائط",mediamtx:"MediaMTX",
    restream:"مراقبة إعادة البث",fanout:"مشاركة البث",playback:"أداء التشغيل",
    sourceCapacity:"حد اتصالات المصدر الحقيقي",
    quality_live:"جودة تشغيل القنوات",quality_movie:"جودة تشغيل الأفلام",
    quality_series:"جودة تشغيل المسلسلات",quality_startup:"سرعة بدء التشغيل",
    episodes:"تشغيل الحلقات",audio:"الصوت",subtitles:"الترجمة",
    appUpdates:"تحديثات التطبيقات",backup:"اختبار استعادة النسخ الاحتياطية"
  };
  var deepAuditCodes={
    data_unavailable:"تعذر قراءة حالة الخدمة",
    primary_bridge_unavailable:"الاتصال بالنظام الرئيسي غير مؤكد",
    primary_bridge_responded:"وصلت استجابة من الخدمة الرئيسية",
    no_enabled_sources:"لا توجد مصادر مفعلة",
    sources_not_all_online:"بعض المصادر لا تبلغ عن حالة اتصال سليمة",
    reported_sources_online:"المصادر المفعّلة تبلغ عن حالة اتصال سليمة",
    indexed_items_present:"الفهرس يحتوي على عناصر؛ التشغيل غير مفحوص",
    no_indexed_items:"لا توجد عناصر مفهرسة",
    verified_provider_404_recorded:"توجد استجابات 404 موثقة من المصدر",
    no_verified_404_recorded:"لا توجد حالات 404 موثقة في السجل الحالي",
    sales_ledger_available:"وصلت بيانات الاشتراكات",
    assistance_configured:"نظام اقتراحات التنظيم متاح",
    assistance_not_configured:"خدمة AI الاختيارية غير مهيأة",
    subscription_counts_available:"وصلت إحصائيات المشتركين",
    subscriber_stats_unavailable:"لم تصل إحصائيات المشتركين",
    media_listener_replied:"محرك الوسائط يستجيب، لكن تشغيل الفيديو غير مؤكد",
    media_listener_unreachable:"محرك الوسائط لا يستجيب",
    mediamtx_control_online:"واجهة تحكم MediaMTX تستجيب",
    mediamtx_control_offline:"واجهة تحكم MediaMTX غير متاحة",
    monitor_unavailable:"تعذر قراءة نظام المراقبة",
    operator_paths_failed:"توجد مسارات تشغيل متعثرة",
    operator_paths_not_all_verified:"بعض مسارات التشغيل لم تُختبر",
    no_operator_paths:"لا توجد مسارات تشغيل تحت المراقبة",
    fanout_runtime_available:"بيانات المشاركة متاحة",
    fanout_runtime_not_verified:"إحصائيات المشاركة غير مؤكدة",
    metrics_not_available:"مقاييس التشغيل غير متاحة",
    recent_playback_failures:"توجد أخطاء تشغيل حديثة",
    relay_start_events_recorded:"سُجّلت طلبات بدء تشغيل؛ لا تثبت مشاهدة الصورة",
    no_playback_samples:"لم تُسجّل عينات تشغيل كافية",
    media_quality_unavailable:"لم تصل مقاييس تشغيل هذه الخدمة",
    media_relay_failures:"توجد حالات فشل أو انقطاع مسجلة خلال الساعة",
    media_relay_starts:"سُجل بدء نقل فيديو؛ لا يثبت وصول الصورة للجهاز",
    insufficient_startup_samples:"عدد عينات البداية لا يكفي للحكم",
    slow_playback_start:"زمن بدء التشغيل مرتفع في بعض العينات",
    startup_telemetry_available:"تم تسجيل أزمنة بداية التشغيل",
    source_not_selected:"لم يتحدد مصدر صالح للفحص",
    episode_playback_not_sampled:"لم تُختبر ملفات الحلقات على جهاز حقيقي",
    audio_track_not_decoded:"لم تُفك ملفات الصوت على جهاز حقيقي",
    pmt_audio_missing:"مسار TS المشاهد لم يعلن عن صوت داخل جدول PMT",
    audio_track_metadata_detected:"تم رصد ترميز صوت معلن، لكن الصوت على الجهاز لم يُختبر",
    subtitle_render_not_tested:"لم تُختبر الترجمة على جهاز حقيقي",
    release_channel_not_examined:"لم يُفحص توافق آخر إصدار للتطبيقات",
    release_manifest_consistent_apk_unverified:"معلومات الإصدار متطابقة، لكن ملف APK وتوقيعه غير مفحوصين",
    release_manifest_mismatch:"بيانات تحديث STREAM لا تتوافق مع الحزمة المعتمدة",
    release_manifest_not_verified:"ملف معلومات الإصدار غير متاح أو لم يُتحقق منه",
    source_capacity_unavailable:"لم تتوفر حدود الاتصالات من المزود",
    source_restream_or_capacity_denied:"المصدر لا يسمح بإعادة البث أو يعلن صفر اتصالات",
    source_upstream_at_limit:"المصدر وصل إلى الحد المعلن للاتصالات",
    source_single_connection_only:"المصدر يسمح باتصال واحد فقط؛ اختلاف القنوات يحتاج تخطيط",
    source_capacity_reported_not_load_tested:"تم الإبلاغ عن حد الاتصالات، لكن تحمّل المشاهدين لم يُختبر",
    source_upstream_capacity_unknown:"حد اتصالات المصدر غير معروف",
    restore_test_not_observed:"لا يوجد دليل على اختبار استعادة نسخة احتياطية"
  };
  function auditMetrics(value){
    if(!value||typeof value!=="object")return "—";
    var labels={
      total:"الإجمالي",enabled:"مفعلة",online:"متصلة",items:"عناصر",missing:"مفقود",
      due:"تستحق فحصًا",recovered:"تعافت",started:"بدأ",failed:"فشل",
      interrupted:"انقطع",slowStarts:"بدء بطيء",p95StartMs:"P95 بالمللي ثانية",
      hlsSessions:"جلسات HLS",readyPaths:"مسارات جاهزة",
      viewers:"مشاهدون",sourceOutages:"انقطاعات المصدر",sourceBytesReceived:"بايتات",
      errorPercent:"نسبة الأخطاء",p95StartMs:"زمن بدء التشغيل P95",
      observed:"مسارات مرصودة",declaredAudio:"بمسار صوت",missingAudio:"بلا مسار صوت معلن",
      versionCode:"رقم البناء",maxConnections:"الحد من المزود",
      activeConnections:"اتصالات المصدر النشطة",sharedUpstreamForCodes:"الأكواد تشترك بالمصدر",
      active:"نشطة",paths:"مسارات",count:"عدد",checked:"مفحوص"
    };
    var values=Object.entries(value).filter(function(pair){
      return labels[pair[0]]!==undefined&&
        (typeof pair[1]==="number"||typeof pair[1]==="boolean");
    }).slice(0,5).map(function(pair){
      return labels[pair[0]]+": "+String(pair[1]);
    });
    return values.join(" · ")||"—";
  }
  var latestAudit=null;
  function deepAuditTarget(entry){
    if(entry.id==="sourceCapacity")return ["restream","source-capacity-panel"];
    if(entry.id==="media404")return ["diagnostics","media-failures-panel"];
    if(entry.id==="audio")return ["restream","shared-relay-audio-diagnostics"];
    if(entry.id==="quality_live"||entry.id==="quality_movie"||entry.id==="quality_series"||entry.id==="playback")
      return ["restream","smart-playback-panel"];
    if(entry.id==="catalog_live"||entry.id==="catalog_movie"||entry.id==="catalog_series")
      return ["library",null];
    if(entry.id==="appUpdates"||entry.id==="subtitles"||entry.id==="episodes"||entry.id==="backup")
      return ["diagnostics","device-audio-validation"];
    return ["diagnostics","deep-audit-panel"];
  }
  function openAuditTarget(entry){
    var target=deepAuditTarget(entry);
    tab(target[0]);
    requestAnimationFrame(function(){
      if(target[1]&&$(target[1]))$(target[1]).scrollIntoView({behavior:"smooth",block:"start"});
    });
  }
  function renderAuditRows(){
    var tbody=$("deep-audit-items");tbody.replaceChildren();
    var all=Array.isArray(latestAudit?.checks)?latestAudit.checks:[];
    var wanted=$("deep-audit-filter").value,query=$("deep-audit-search").value.trim().toLowerCase();
    var priority={warning:0,unknown:1,ok:2};
    var rows=all.slice().sort(function(a,b){return (priority[a.status]??3)-(priority[b.status]??3)})
      .filter(function(entry){
        if(wanted!=="all"&&entry.status!==wanted)return false;
        var text=(deepAuditNames[entry.id]||"")+" "+(deepAuditCodes[entry.code]||"")+" "+auditMetrics(entry.metrics);
        return !query||text.toLowerCase().includes(query);
      });
    rows.forEach(function(entry){
      var row=node("tr");
      cell(row,deepAuditNames[entry.id]||"مؤشر إضافي");
      var label=entry.status==="ok"?"سليم حسب المؤشرات":entry.status==="warning"?"يحتاج مراجعة":"غير مؤكّد";
      cell(row,node("span",label,"diag-state "+(entry.status==="ok"?"ok":entry.status==="warning"?"warning":"unknown")));
      cell(row,deepAuditCodes[entry.code]||"النتيجة غير معروفة");
      cell(row,auditMetrics(entry.metrics));
      tbody.appendChild(row);
    });
    if(!rows.length){var tr=node("tr");var td=cell(tr,"لا توجد نتائج مطابقة للفلتر.");td.colSpan=4;tbody.appendChild(tr)}
    value("deep-audit-visible","المعروض "+count(rows.length)+" من "+count(all.length));
  }
  function renderAuditPriorities(report){
    var target=$("deep-audit-priorities");target.replaceChildren();
    var focus=["sourceCapacity","media404","audio","quality_live","quality_movie","quality_series"];
    var checks=report.checks||[];
    var rows=focus.map(function(id){return checks.find(function(c){return c.id===id})}).filter(Boolean);
    rows=rows.sort(function(a,b){return Number(b.status==="warning")-Number(a.status==="warning")}).slice(0,3);
    rows.forEach(function(entry){
      var card=node("div",undefined,"diag-priority");
      card.dataset.severity=entry.status==="warning"?"warning":"unknown";
      card.appendChild(node("strong",deepAuditNames[entry.id]||"مؤشر التشخيص"));
      var info=deepAuditCodes[entry.code]||"لا توجد عينة كافية للحكم.";
      if(entry.id==="sourceCapacity"&&entry.metrics?.maxConnections===1)
        info+=" · الحد المعلن اتصال واحد لحساب المصدر، وليس لكل كود.";
      if(entry.id==="media404")
        info+=" · العناصر المفقودة المسجلة: "+count(entry.metrics?.missing);
      if(entry.id==="audio")
        info+=" · المسارات المرصودة: "+count(entry.metrics?.observed)+"؛ غياب العينات لا يعني عدم وجود صوت.";
      card.appendChild(node("p",info));
      card.appendChild(button("فتح التفاصيل ←",function(){openAuditTarget(entry)},"secondary"));
      target.appendChild(card);
    });
  }
  async function loadDeepAudit(){
    var runButton=$("deep-audit-run"),tbody=$("deep-audit-items");
    if(runButton.disabled)return;
    runButton.disabled=true;$("deep-audit-ai").disabled=true;
    $("deep-audit-ai-card").dataset.state="loading";
    value("deep-audit-ai-status","جارٍ قراءة المؤشرات...");
    value("deep-audit-status","جارٍ جمع مؤشرات النظام. لا يبدأ تشغيل وسائط...");
    try{
      var sid=$("deep-audit-source").value||"";
      var result=await api("full-audit"+(sid?"?sourceId="+encodeURIComponent(sid):""));
      if(!result.ok||!Array.isArray(result.checks))throw Error("نتيجة الفحص غير متاحة");
      latestAudit=result;
      value("deep-audit-ok",count(result.summary?.ok));
      value("deep-audit-warning",count(result.summary?.warning));
      value("deep-audit-unknown",count(result.summary?.unknown));
      renderAuditRows();renderAuditPriorities(result);
      var recommended=$("deep-audit-recommendations");recommended.replaceChildren();
      (result.recommendations||[]).slice(0,12).forEach(function(entry){
        var element=node("div",undefined,"row");
        element.appendChild(node("strong",deepAuditNames[entry.checkId]||"توصية"));
        element.appendChild(node("span",entry.recommendation,"muted"));
        var check=(result.checks||[]).find(function(x){return x.id===entry.checkId});
        var open=button("فتح التفاصيل",function(){openAuditTarget(check||{id:entry.checkId})},"secondary");
        element.appendChild(open);recommended.appendChild(element);
      });
      if(!recommended.children.length)
        recommended.appendChild(node("p","لا توجد توصيات جديدة من المؤشرات الحالية.","muted"));
      var now=new Date(result.checkedAt||Date.now()).toLocaleString("ar-SA-u-nu-latn",
        {timeZone:"Asia/Riyadh"});
      value("deep-audit-status","آخر فحص: "+now+" · "+result.checks.length+
        " مؤشر"+(result.cacheHit?" · نتيجة محفوظة حديثًا":"")+
        " · "+(result.source?.name?"المصدر: "+result.source.name:"مصدر افتراضي حسب خدمة الفحص")+
        " · لا يشمل فك ترميز فيديو أو صوت على الأجهزة.");
      $("deep-audit-ai-card").dataset.state="ready";
      value("deep-audit-ai-result","الفحص جاهز. اضغط «تفسير Groq AI» ليظهر الشرح هنا فورًا. لا يتم الاتصال بـ Groq إلا عند الطلب.");
      try{
        var aiState=await api("playback-health");
        var configured=aiState?.ai?.configured===true;
        $("deep-audit-ai").disabled=!configured;
        value("deep-audit-ai-status",configured?"✓ مفتاح Groq مضبوط • جاهز للتفسير اليدوي":"مفتاح Groq غير مهيأ في STREAM API");
        if(!configured)value("deep-audit-ai-result","التحليل المحلي متاح؛ أضف مفتاح BLOFY_STREAM_GROQ_API_KEY في Railway لتفعيل تفسير Groq.");
      }catch{
        // Allow manual attempt when status endpoint is transiently unavailable.
        $("deep-audit-ai").disabled=false;
        value("deep-audit-ai-status","لم تتوفر حالة الاتصال • يمكن تجربة Groq يدويًا");
      }
    }catch(e){
      $("deep-audit-ai-card").dataset.state="error";
      value("deep-audit-ai-status","فشل الفحص المحلي");
      value("deep-audit-status","تعذر إكمال الفحص: "+e.message);
      tbody.replaceChildren();
    }finally{runButton.disabled=false}
  }
  $("deep-audit-filter").addEventListener("change",renderAuditRows);
  $("deep-audit-search").addEventListener("input",renderAuditRows);
  $("deep-audit-source").addEventListener("change",function(){
    latestAudit=null;$("deep-audit-ai").disabled=true;
    value("deep-audit-status","تغيّر المصدر؛ اضغط بدء الفحص للحصول على نتيجة جديدة.");
  });
  $("deep-audit-ai").addEventListener("click",async function(){
    if(!latestAudit){value("deep-audit-ai-result","شغّل الفحص أولًا.");return}
    if(this.disabled)return;
    var btn=this,card=$("deep-audit-ai-card"),status=$("deep-audit-ai-status");
    btn.disabled=true;btn.textContent="⏳ جارٍ تحليل Groq...";
    card.dataset.state="loading";card.setAttribute("aria-busy","true");
    status.textContent="طلب Groq قيد التنفيذ • لا تغييرات على المحتوى أو العملاء";
    value("deep-audit-ai-result","جارٍ تحليل مؤشرات الفحص باستخدام Groq AI. النتيجة ستظهر هنا.");
    try{
      var response=await action("full-audit/ai","full-audit-ai-explain",{
        sourceId:$("deep-audit-source").value||""
      });
      if(!response.ok||typeof response.explanationAr!=="string")throw Error("playback_ai_invalid_response");
      card.dataset.state="success";
      status.textContent=(response.provider==="Groq"?"✓ تم الاتصال بـ Groq بنجاح":"✓ شرح الفحص جاهز")+
        " • لا توجد إجراءات تلقائية";
      var key=String(response.priorityCode||"");
      var match=key.match(/^audit_(.+)_(warning|unknown)$/);
      var label=match?(deepAuditNames[match[1]]||"مؤشر إضافي"):"حسب المؤشرات المتاحة";
      value("deep-audit-ai-result","✦ "+response.explanationAr+
        " • الأولوية: "+label+" • التوصية تحتاج مراجعة المشرف واختبار الأجهزة.");
    }catch(e){
      var code=String(e.message||"");
      var message={
        playback_ai_cooldown:"تم استخدام Groq قبل أقل من دقيقة. جرّبه بعد مرور 60 ثانية؛ الطلب السابق لا يعني فشل الاتصال.",
        playback_ai_busy:"هناك طلب Groq قيد التنفيذ. انتظر اكتماله بدل فتح اتصال جديد.",
        playback_ai_boot_limit:"وصلت إلى الحد الوقائي للتحليلات في تشغيل السيرفر الحالي.",
        playback_ai_not_configured:"مفتاح Groq غير مفعّل على STREAM API.",
        playback_ai_provider_unavailable:"تعذر الوصول إلى Groq أو انتهت مهلة الاتصال. لا يشير ذلك إلى عطل في البث.",
        playback_ai_invalid_response:"اتصل النظام بـ Groq لكن صيغة الرد غير صالحة؛ احتفظنا بالتقرير المحلي.",
        platform_audit_unavailable:"تعذر الحصول على معلومات الفحص الحالية.",
        unified_bridge_unavailable:"تعذّر الاتصال ببوابة البيانات."
      }[code]||"تعذر عرض تفسير Groq حاليًا ("+code.slice(0,65)+").";
      card.dataset.state="error";
      status.textContent="⚠ لم يكتمل طلب التفسير • الفحص المحلي متاح";
      value("deep-audit-ai-result",message);
    }finally{
      card.removeAttribute("aria-busy");
      btn.disabled=false;btn.textContent="🤖 تفسير Groq AI";
    }
  });
  $("diagnostic-go-capacity").addEventListener("click",function(){openAuditTarget({id:"sourceCapacity"})});
  $("diagnostic-go-audio").addEventListener("click",function(){openAuditTarget({id:"audio"})});
  $("diagnostic-open-audio").addEventListener("click",function(){openAuditTarget({id:"audio"})});
  $("diagnostic-open-playback").addEventListener("click",function(){openAuditTarget({id:"playback"})});
  $("diagnostic-go-failures").addEventListener("click",function(){
    $("media-failures-panel").scrollIntoView({behavior:"smooth",block:"start"});
  });
  $("deep-audit-run").addEventListener("click",loadDeepAudit);
  $("deep-audit-export").addEventListener("click",async function(){
    var button=this;button.disabled=true;
    try{
      var report=await api("support-bundle");
      if(!report.ok||report.schema!=="blofy-stream-support-v1")
        throw Error("التقرير غير متاح");
      // The backend already strips source IDs, URLs, credentials and PII.
      var bytes=JSON.stringify(report,null,2);
      var blob=new Blob([bytes],{type:"application/json;charset=utf-8"});
      var url=URL.createObjectURL(blob);
      var link=document.createElement("a");
      link.href=url;
      link.download="blofy-stream-support-"+new Date()
        .toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"})+".json";
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(function(){URL.revokeObjectURL(url)},2000);
      show("تم تنزيل تقرير التشخيص بدون معرفات أو بيانات العملاء.",true);
    }catch(err){show("تعذر تصدير التقرير: "+err.message,false)}
    finally{button.disabled=false}
  });
  function renderChecks(){
    value("check-api",state.live.engine?"متصل":"غير مؤكد");
    value("check-sources",state.live.overview?"متصل":"غير مؤكد");
    value("check-media",state.live.engine?
      (state.engine?.engine?.reachable?"متصل":"غير متصل"):"غير مؤكد");
    value("check-health",state.live.health?
      (state.health?.ok?"يعمل":"غير مؤكد"):"غير مؤكد");
    value("check-security",state.live.security?
      (state.security?.protection?.operatorBruteForce===true?"مفعلة":"غير مؤكدة"):"غير مؤكد");
    if(state.healthTime){
      var formatted=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",
        second:"2-digit",timeZone:"Asia/Riyadh"}).format(new Date(state.healthTime));
      value("home-checks-time","آخر فحص "+formatted+" KSA");
    }
  }
  async function refresh(){
    var current=++state.refreshVersion;
    var results=await Promise.allSettled([
      api("overview"),api("state"),api("auto-health"),api("security")
    ]);
    if(current!==state.refreshVersion)return;
    var keys=["overview","engine","health","security"];
    results.forEach(function(result,i){
      var key=keys[i];
      state.live[key]=result.status==="fulfilled"&&result.value?.ok!==false;
      if(state.live[key])state[key]=result.value;
    });
    state.healthTime=Date.now();
    renderHome();renderChecks();
    var good=keys.filter(function(key){return state.live[key]});
    if(good.length===4){
      var time=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",
        timeZone:"Asia/Riyadh"}).format(new Date());
      value("last-updated","آخر تحديث: "+time+" KSA");
    }else{
      value("last-updated","تحديث جزئي "+good.length+"/4 · بعض البيانات غير مؤكدة");
      var failed=keys.filter(function(key){return !state.live[key]});
      show("تعذر تحديث: "+failed.map(function(key){
        return {overview:"المصادر",engine:"محرك البث",health:"مراقبة HLS",
          security:"الحماية"}[key]
      }).join("، ")+". لم تُحذف آخر البيانات المعروفة.",false);
    }
  }
  $("home-check-all").addEventListener("click",async function(){
    var button=this;button.disabled=true;
    try{await refresh()}finally{button.disabled=false}
  });
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
    var fresh=!more||!state.libParams||
      JSON.stringify(params)!==JSON.stringify(state.libParams);
    if(more&&state.libLoading)return;
    var requestEpoch=fresh?++state.libEpoch:state.libEpoch;
    var offset=fresh?0:state.libOffset;
    var oldParams=state.libParams,oldOffset=state.libOffset;
    var oldMoreHidden=$("library-more").hidden;
    state.libLoading=true;$("library-more").disabled=true;
    if(fresh){state.libOffset=0;state.libParams=params;$("library-more").hidden=true}
    var query=new URLSearchParams({type:type,serverId:serverId,q:q,offset:String(offset)});
    try{var d=await api("catalog?"+query.toString());
      if(requestEpoch!==state.libEpoch)return;
      var items=d.items||[];
      if(!Array.isArray(items))throw Error("library_items_invalid");
      if(smartLibraryOn){
        var ranks=["رياضة","أخبار","أطفال وأنمي","أفلام","مسلسلات","عام"];
        items=items.map(function(item,i){return {item:item,index:i,group:smartGroup(item)}})
          .sort(function(a,b){return ranks.indexOf(a.group)-ranks.indexOf(b.group)||a.index-b.index})
          .map(function(row){return row.item});
        $("library-smart-summary").textContent="تنظيم تلقائي للقائمة المعروضة (حتى 40 عنصرًا في الصفحة) • رياضة، أخبار، أطفال، أفلام، مسلسلات • لا يعدّل فئات المصدر ولا يستخدم نموذج AI خارجي.";
      }else $("library-smart-summary").textContent="عرض المصدر بترتيب Xtream بعد آخر مزامنة؛ لم يُطبّق أي ترتيب ذكي على النتائج.";

      if(fresh)$("library-results").replaceChildren();
      if(fresh&&items.length===0){var tr=node("tr");var td=cell(tr,"لا يوجد محتوى مطابق");td.colSpan=5;$("library-results").appendChild(tr)}
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
    }catch(e){
      if(requestEpoch===state.libEpoch){
        if(fresh){state.libParams=oldParams;state.libOffset=oldOffset;
          $("library-more").hidden=oldMoreHidden}
        show("تعذر تحميل المكتبة: "+e.message,false);
      }
    }finally{
      if(requestEpoch===state.libEpoch){
        state.libLoading=false;$("library-more").disabled=false;
      }
    }
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
    var host=creds.serverUrl||state.accountHost||"https://bfy.up.railway.app";
    var m3u=creds.m3uUrl||(
      host&&creds.password?host+"/get.php?"+new URLSearchParams({
        username:creds.username||"",password:creds.password||"",
        type:"m3u_plus",output:"ts"}).toString():"");
    attachCopy(target,"الهوست",host||"غير متاح");
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
      urls.appendChild(node("div",state.accountHost||"https://bfy.up.railway.app","meta num"));
      urls.appendChild(node("div","M3U: يحتاج كلمة المرور","meta"));
      var hostCopy=button("نسخ الهوست",function(){
        navigator.clipboard.writeText(state.accountHost||"https://bfy.up.railway.app")
          .then(function(){show("تم نسخ الهوست.",true)})
          .catch(function(){show("حدد الهوست وانسخه يدويًا.",false)});
      });
      urls.appendChild(hostCopy);
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
      ctl.appendChild(button("فحص Xtream",async function(){
        try{
          var d=await api("account/"+a.id+"/compatibility");
          var reasons={
            xtream_login_compatible:"تم قبول الحساب وعنوان الخادم الجديد متطابق.",
            account_auth_denied:"الخادم رفض اسم المستخدم أو كلمة المرور.",
            server_info_origin_mismatch:"عنوان السيرفر الذي يعلن عنه Xtream لا يطابق الهوست الجديد.",
            account_password_not_recoverable:"هذا حساب قديم لا يمكن فحصه بدون إعادة إصدار بيانات الدخول.",
            account_disabled:"الحساب موقوف.",
            account_expired:"الحساب منتهي.",
            edge_unreachable_or_timeout:"تعذر الوصول للهوست الجديد أو انتهت مهلة الاتصال.",
            edge_not_configured:"هوست Xtream الجديد غير مضبوط على الخدمة.",
            xtream_catalog_empty:"تسجيل الدخول ناجح لكن تصنيفات القنوات والأفلام والمسلسلات فارغة.",
            xtream_flow_failure:"تسجيل الدخول الأساسي ناجح، لكن أحد اختبارات توافق التطبيقات فشل."
          };
          var names={postLogin:"تسجيل الدخول POST",panelLogin:"Panel API",
            live:"تصنيفات القنوات",movie:"تصنيفات الأفلام",series:"تصنيفات المسلسلات"};
          var status=(reasons[d.code]||("نتيجة الفحص: "+String(d.code||"غير معروفة")));
          if(d.failedStep)status+=" — المشكلة في "+(names[d.failedStep]||d.failedStep)+
            " ("+String(d.reason||"غير معروف")+")";
          show((d.ok?"✅ ":"⚠ ")+status,!!d.ok);
          var detail=$("account-detail");
          detail.replaceChildren();
          detail.appendChild(node("strong","فحص حساب "+a.username,"name"));
          detail.appendChild(node("div",status,"meta"));
          if(d.auth===1){
            detail.appendChild(node("div","المصادقة: ناجحة · عنوان الهوست: "+
              (d.advertisedHostMatches?"متطابق":"غير متطابق"),"meta"));
          }
          if(d.checks){
            ["postLogin","panelLogin","live","movie","series"].forEach(function(key){
              var check=d.checks[key];
              if(!check)return;
              var txt=(names[key]||key)+": "+(check.ok?"ناجح":"فشل")+
                (Number.isInteger(check.count)?" — "+count(check.count)+" تصنيفًا":"")+
                (!check.ok&&check.code?" ("+check.code+")":"");
              detail.appendChild(node("div",txt,"meta"));
            });
          }
          detail.hidden=false;
          detail.scrollIntoView({behavior:"smooth",block:"center"});
        }catch(e){show("تعذر فحص Xtream: "+e.message,false)}
      },"secondary"));
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
    if(more&&(state.accountsLoading||state.accountsNext===null))return;
    var current=more?state.accountsEpoch:++state.accountsEpoch;
    var offset=more?state.accountsNext:0;
    state.accountsLoading=true;$("accounts-next").disabled=true;
    try{
      var d=await api("accounts?offset="+offset);
      if(current!==state.accountsEpoch)return;
      var items=Array.isArray(d.items)?d.items:[];
      if(more){
        var seen=new Set(state.accounts.map(function(x){return String(x.id)}));
        state.accounts=state.accounts.concat(items.filter(function(x){
          if(!x||seen.has(String(x.id)))return false;
          seen.add(String(x.id));return true;
        }));
      }else state.accounts=items;
      state.accountsNext=d.nextOffset===undefined?null:d.nextOffset;
      state.accountsTotal=d.total;
      // Never invent an Xtream host; display only the URL returned by backend.
      if(typeof d.serverUrl==="string"&&/^https?:\/\//i.test(d.serverUrl))
        state.accountHost=d.serverUrl;
      value("accounts-host-value",state.accountHost||"https://bfy.up.railway.app");
      renderAccounts();
    }catch(e){
      if(current===state.accountsEpoch)show("تعذر تحميل المشتركين: "+e.message,false);
    }finally{
      if(current===state.accountsEpoch){
        state.accountsLoading=false;$("accounts-next").disabled=false;
      }
    }
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
  var selectedCodeId="";
  var selectedCodeSnapshot=null;
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
    if(more&&(state.codesLoading||state.codesNext===null))return;
    var current=more?state.codesEpoch:++state.codesEpoch;
    var indicator=$("codes-load-state");
    if(indicator){indicator.hidden=false;indicator.textContent="جارٍ جلب أكواد الاشتراكات…"}
    state.codesLoading=true;$("codes-next").disabled=true;
    try{
      var offset=more?state.codesNext:0;
      var d=await api("codes?offset="+offset);
      if(current!==state.codesEpoch)return;
      var items=Array.isArray(d.items)?d.items:[];
      if(more){
        var seen=new Set(state.codes.map(function(x){return String(x.id)}));
        state.codes=state.codes.concat(items.filter(function(x){
          if(!x||seen.has(String(x.id)))return false;
          seen.add(String(x.id));return true;
        }));
      }else state.codes=items;
      state.codesNext=d.nextOffset===undefined?null:d.nextOffset;
      var totals=d.totals||{};
      value("codes-total",count(totals.total));value("codes-unused",count(totals.unused));
      value("codes-redeemed",count(totals.redeemed));value("codes-revoked",count(totals.revoked));
      renderCodes();
      if(indicator){
        indicator.textContent="تم تحميل "+count(state.codes.length)+" كودًا."+
          (state.codesNext===null?"":" اضغط المزيد لعرض بقية الأكواد.");
        indicator.hidden=false;
      }
      void api("sales-summary").then(function(summary){
        if(current!==state.codesEpoch)return;
        value("codes-sold-count",count(summary.sold));
        value("codes-sales-sar",
          (Number(summary.recorded_revenue_halalas||0)/100).toLocaleString("en-US",
            {minimumFractionDigits:2,maximumFractionDigits:2})+" ر.س");
        value("codes-expiring",count(summary.expiring_soon));
        value("codes-transfers",count(summary.transfers));
      }).catch(function(){});
    }catch(e){
      if(current!==state.codesEpoch)return;
      if(indicator){
        indicator.hidden=false;
        indicator.textContent="تعذر جلب أحدث الأكواد؛ هذا لا يعني حذف الأكواد. السجل السابق محفوظ على الشاشة، حاول التحديث.";
      }
      show("تعذر تحميل الأكواد: "+e.message,false);
    }finally{
      if(current===state.codesEpoch){
        state.codesLoading=false;$("codes-next").disabled=false;
      }
    }
  }

  async function loadDistributors(){
    try{
      var response=await api("distributors");
      state.distributors=Array.isArray(response.items)?response.items:[];
      value("dist-total",count(state.distributors.length));
      value("dist-active",count(state.distributors.filter(function(x){return x.enabled}).length));
      value("dist-credits",count(state.distributors.reduce(function(n,x){return n+Number(x.credits||0)},0)));
      renderDistributors();
    }catch(e){show("تعذر تحميل الموزعين: "+e.message,false)}
  }
  function showDistributorCredentials(reply){
    var t=$("dist-secret");t.hidden=false;t.replaceChildren();
    t.appendChild(node("strong","بيانات الدخول للوحة التوزيع — انسخها وشاركها مع الموزع فقط"));
    attachCopy(t,"الرابط",location.origin+"/distributor");
    attachCopy(t,"اسم المستخدم",reply.item.username);
    attachCopy(t,"كلمة المرور",reply.password);
    t.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function renderDistributors(){
    var tb=$("dist-list");tb.replaceChildren();
    if(!state.distributors.length){
      var tr=node("tr"),td=cell(tr,"لم تُنشأ لوحات توزيع بعد");
      td.colSpan=6;tb.appendChild(tr);return;
    }
    state.distributors.forEach(function(d){
      var row=node("tr");
      cell(row,d.name);cell(row,d.username);cell(row,count(d.credits));
      cell(row,count(d.used));cell(row,d.enabled?"نشطة":"موقوفة");
      var actions=node("div",undefined,"actions");
      actions.appendChild(button("إضافة رصيد",async function(){
        var input=prompt("كم شهر رصيد تضيف للموزع؟ (1 إلى 1000):","10");
        if(input===null)return;
        var credits=Number(input);
        if(!Number.isSafeInteger(credits)||credits<1||credits>1000){
          show("أدخل رصيدًا صحيحًا بين 1 و1000.",false);return;
        }
        if(!confirm("إضافة "+credits+" شهر رصيد إلى لوحة "+d.name+"؟"))return;
        try{
          await action("distributors/"+d.id+"/credits","distributor-credits",{credits});
          show("تمت إضافة الرصيد.",true);await loadDistributors();
        }catch(e){show("تعذر إضافة الرصيد: "+e.message,false)}
      }));
      actions.appendChild(button(d.enabled?"إيقاف":"تفعيل",async function(){
        if(!confirm("تأكيد "+(d.enabled?"إيقاف":"تفعيل")+" لوحة "+d.name+"؟"))return;
        try{
          await action("distributors/"+d.id+"/status","distributor-status",{enabled:!d.enabled});
          show("تم تحديث حالة اللوحة.",true);await loadDistributors();
        }catch(e){show("تعذر تغيير الحالة: "+e.message,false)}
      },d.enabled?"danger":"secondary"));
      actions.appendChild(button("حد الإصدار",async function(){
        var input=prompt("الحد الأقصى لإصدارات الموزّع خلال 24 ساعة (1–10000):",
          String(d.dailyLimit||100));
        if(input===null)return;
        var limit=Number(input);
        if(!Number.isSafeInteger(limit)||limit<1||limit>10000){
          show("أدخل عددًا صحيحًا من 1 إلى 10000.",false);return;
        }
        if(!confirm("تحديد الحد اليومي لـ "+d.name+" على "+limit+" إصدار؟"))return;
        try{
          await action("distributors/"+d.id+"/limits","distributor-limits",
            {dailyLimit:limit});
          show("تم تغيير حد الإصدار اليومي.",true);await loadDistributors();
        }catch(e){show("تعذر تحديث الحد: "+e.message,false)}
      },"secondary"));
      actions.appendChild(button("كلمة مرور جديدة",async function(){
        if(!confirm("سيتم إلغاء جميع جلسات هذه اللوحة وتغيير كلمة مرور الموزع. متابعة؟"))return;
        try{
          var result=await action("distributors/"+d.id+"/reset","distributor-reset",{});
          showDistributorCredentials(result);
          show("تم تغيير كلمة المرور. انسخ البيانات الجديدة وأبلغ الموزع.",true);
        }catch(e){show("تعذر تغيير كلمة المرور: "+e.message,false)}
      }));
      cell(row,actions);tb.appendChild(row);
    });
  }
  $("dist-refresh").addEventListener("click",loadDistributors);
  $("dist-create-form").addEventListener("submit",async function(e){
    e.preventDefault();
    var btn=this.querySelector("button[type=submit]");btn.disabled=true;
    var data=Object.fromEntries(new FormData(this));
    data.credits=Number(data.credits);
    try{
      var created=await action("distributors","distributor-create",data);
      showDistributorCredentials(created);
      this.reset();show("تم إنشاء لوحة توزيع محدودة الصلاحيات.",true);
      await loadDistributors();
    }catch(e){show("تعذر إنشاء اللوحة: "+e.message,false)}
    finally{btn.disabled=false}
  });
  function codePhase(code){
    if(code.status==="revoked")return "revoked";
    if(code.status==="unused")return "unused";
    if(code.deviceTransferPending)return "pending";
    return Number(code.expiresAt||0)<=Date.now()?"expired":"active";
  }
  function visibleCodes(){
    var q=$("codes-search").value.trim().toLowerCase(),f=$("codes-filter").value;
    var result=state.codes.filter(function(c){
      var expiry=Number(c.expiresAt||0),phase=codePhase(c);
      if(!(f==="all"||f===phase||f==="expiring"&&c.status==="redeemed"&&
        expiry>Date.now()&&expiry<=Date.now()+7*86400000))return false;
      if(!q)return true;
      return [c.label,c.codeHint,c.buyerName,c.buyerPhone,c.id,
        recentlyIssuedCodes.get(String(c.id))].some(function(x){
        return String(x||"").toLowerCase().includes(q);
      });
    });
    var sort=$("codes-sort").value;
    result.sort(function(a,b){
      if(sort==="expiry")return (Number(a.expiresAt)||Infinity)-(Number(b.expiresAt)||Infinity);
      var difference=(Number(b.createdAt)||0)-(Number(a.createdAt)||0);
      return sort==="old"?-difference:difference;
    });
    return result;
  }
  function detailValue(grid,label,text){
    var item=node("div",undefined,"code-tile");
    item.appendChild(node("small",label));item.appendChild(node("strong",text));
    grid.appendChild(item);
  }
  function manageCode(id,focusRenew){
    selectedCodeId=String(id);
    var record=state.codes.find(function(x){return String(x.id)===selectedCodeId});
    if(record)selectedCodeSnapshot=record;
    $("codes-dialog-status").hidden=true;
    renderCodeDetail();
    var dlg=$("codes-dialog");
    if(typeof dlg.showModal==="function"&&!dlg.open)dlg.showModal();
    else if(!dlg.open)dlg.setAttribute("open","");
    if(focusRenew)setTimeout(function(){
      var input=$("selected-code-days");if(input)input.focus();
    },0);
  }
  $("codes-dialog-close").addEventListener("click",function(){
    var dlg=$("codes-dialog");if(typeof dlg.close==="function")dlg.close();
    else dlg.removeAttribute("open");
  });
  function codeDialogMessage(message,ok){
    var n=$("codes-dialog-status");n.hidden=false;n.textContent=message;
    n.className="status "+(ok?"good":"bad");
  }


  // Operator-only consent for the EXISTING code; no new code or new duration.
  async function authorizeSameCodeRelogin(c,btn){
    if(c.status!=="redeemed"||c.channel!=="app"||c.deviceTransferPending||
       Number(c.expiresAt||0)<=Date.now()){
      show("إعادة الدخول متاحة لكود تطبيق مفعّل وساري ومرتبط بجهاز. جدّد الصلاحية إذا انتهت.",false);
      return;
    }
    if(!confirm("السماح بإعادة الدخول بنفس كود العميل "+(c.codeHint||"")+"؟\n"+
      "يستطيع أول جهاز جديد يمتلك الكود تسجيل الدخول خلال 10 دقائق فقط، ثم تنتهي الموافقة تلقائيًا.\n"+
      "بعد دخول الجهاز الجديد سيتوقف تسجيل دخول الجهاز السابق. الصلاحية والكود لا يتغيران. متابعة؟"))return;
    btn.disabled=true;
    try{
      var result=await action("code/"+c.id+"/relogin","code-relogin",{});
      if(result.item)selectedCodeSnapshot=result.item;
      var until=result.allowedUntil?dateTime(result.allowedUntil):"خلال 10 دقائق";
      await loadCodes(false);
      manageCode(c.id);
      var message="تم السماح بإعادة الدخول بنفس الكود حتى "+until+
        ". أعط العميل كوده السابق ليدخله في النسخة الجديدة. يمكن تكرار هذه العملية عند الحاجة، "+
        "لكن كل ضغطة تسمح بنقل واحد فقط، ولا تزيد مدة الاشتراك.";
      codeDialogMessage(message,true);
      show("تم السماح بإعادة الدخول لمدة 10 دقائق دون تغيير الكود أو الصلاحية.",true);
    }catch(e){
      if($("codes-dialog").open)codeDialogMessage("تعذر السماح بإعادة الدخول: "+e.message,false);
      show("تعذر السماح بإعادة الدخول: "+e.message,false);
    }finally{btn.disabled=false;}
  }
  async function transferCode(c,btn){
    if(c.status!=="redeemed"||c.channel!=="app"||c.deviceTransferPending||
      Number(c.expiresAt||0)<=Date.now()){
      show("النقل متاح فقط لكود تطبيق مفعل وساري ومرتبط بجهاز. جدّد المنتهي أولًا.",false);
      return;
    }
    if(!confirm("نقل الكود "+(c.codeHint||"")+" لجهاز جديد؟ سيتم إلغاء وصول الجهاز والكود السابق فورًا، ويبقى تاريخ الانتهاء كما هو. لا يمكن التراجع."))return;
    btn.disabled=true;
    try{
      var result=await action("code/"+c.id+"/transfer","code-transfer",{});
      var fresh=String(result.code||"");
      if(fresh)recentlyIssuedCodes.set(String(c.id),fresh);
      if(result.item)selectedCodeSnapshot=result.item;
      selectedCodeId=String(c.id);
      await loadCodes(false);
      manageCode(c.id);
      var note=fresh?
        "تم نقل الجهاز بنجاح. انسخ الكود الجديد أدناه وأرسله للعميل؛ القديم لم يعد صالحًا. مدة الاشتراك لم تتغير.":
        "تم نقل الجهاز. لم يظهر الكود في الاستجابة؛ استخدم نسخ الكود من تفاصيل الاشتراك.";
      codeDialogMessage(note,Boolean(fresh));
      show("تم إلغاء الكود السابق ونقل الجهاز إلى كود جديد دون تجديد المدة.",true);
    }catch(e){
      if($("codes-dialog").open)codeDialogMessage("تعذر نقل الجهاز: "+e.message,false);
      show("تعذر نقل الجهاز: "+e.message,false);
    }finally{btn.disabled=false}
  }
  function renderCodeDetail(){
    var box=$("codes-selected");
    var c=state.codes.find(function(x){return String(x.id)===selectedCodeId});
    if(c)selectedCodeSnapshot=c;
    else c=selectedCodeSnapshot&&String(selectedCodeSnapshot.id)===selectedCodeId?selectedCodeSnapshot:null;
    box.replaceChildren();box.hidden=!c;
    if(!c)return;
    var phase=codePhase(c);
    var phaseNames={unused:"لم يُفعّل",active:"ساري",pending:"بانتظار الجهاز الجديد",
      expired:"منتهي الصلاحية",revoked:"ملغى"};
    box.appendChild(node("h3","اشتراك "+(c.label||"BLOFY STREAM")+" · "+phaseNames[phase]));
    var grid=node("div",undefined,"code-grid");
    detailValue(grid,"الكود",recentlyIssuedCodes.get(String(c.id))||c.codeHint||"مخفي");
    detailValue(grid,"النوع",c.channel==="app"?"تطبيق BLOFY STREAM":"Xtream");
    detailValue(grid,"تاريخ التفعيل",dateTime(c.redeemedAt));
    detailValue(grid,"تاريخ الانتهاء",dateTime(c.expiresAt));
    detailValue(grid,"مدة الكود",String(c.durationDays)+" يوم");
    detailValue(grid,"أقصى الاتصالات",String(c.maxConnections||1));
    detailValue(grid,"الأيام المضافة",String(c.extendedDays||0));
    detailValue(grid,"مميزات الكود",c.channel==="app"?"دخول للتطبيق بكود · هوست داخلي":"حساب Xtream خارجي");
    detailValue(grid,"مرات نقل الجهاز",String(c.transferCount||0));
    detailValue(grid,"مرات إعادة الدخول المكتملة",String(c.adminReloginCount||0));
    if(Number(c.adminReloginUntil||0)>Date.now())
      detailValue(grid,"إذن إعادة الدخول نشط حتى",dateTime(c.adminReloginUntil));
    detailValue(grid,"العميل",c.buyerName||"غير مسجل");
    if(c.buyerPhone)detailValue(grid,"الجوال",c.buyerPhone);
    if(c.status==="redeemed"){
      var remain=Math.ceil((Number(c.expiresAt||0)-Date.now())/86400000);
      detailValue(grid,"المتبقي",remain>0?remain+" يوم":"منتهي");
    }
    box.appendChild(grid);
    var actions=node("div",undefined,"actions");
    if(c.status!=="revoked"&&(c.copyAvailable||recentlyIssuedCodes.has(String(c.id))))
      actions.appendChild(button("نسخ الكود",function(){void copyCode(c)}));
    if(c.status==="redeemed"){
      var row=node("div",undefined,"code-renew-row"),field=node("div",undefined,"field");
      var label=node("label","تجديد الصلاحية بالأيام");
      var days=node("input");days.type="number";days.min="1";days.max="730";
      days.step="1";days.value="30";days.id="selected-code-days";label.htmlFor=days.id;
      field.append(label,days);row.appendChild(field);
      [30,90,180,365,730].forEach(function(n){
        row.appendChild(button(n===365?"سنة":n===730?"سنتان":n+" يوم",
          function(){days.value=String(n)},"secondary sm"));
      });
      var renew=button(phase==="expired"?"إعادة صلاحية الكود":"تجديد / تمديد",async function(){
        var countDays=Number(days.value);
        if(!Number.isSafeInteger(countDays)||countDays<1||countDays>730){
          show("مدة التجديد يجب أن تكون بين 1 و730 يومًا.",false);return;
        }
        if(!confirm("تجديد الكود "+(c.codeHint||"")+" "+countDays+
          " يومًا؟ تُضاف المدة إلى تاريخ الانتهاء الحالي أو إلى اليوم إذا انتهى الاشتراك."))return;
        renew.disabled=true;
        try{
          var d=await action("code/"+c.id+"/extend","code-extend",{days:countDays});
          if(d.item)selectedCodeSnapshot=d.item;
          codeDialogMessage("نجح تجديد الصلاحية، وينتهي الاشتراك بتاريخ "+dateTime(d.item?.expiresAt),true);
          show("تم التجديد. الصلاحية حتى "+dateTime(d.item?.expiresAt),true);
          await loadCodes(false);await loadAccounts(false);
        }catch(e){codeDialogMessage("فشل التجديد: "+e.message,false);
          show("تعذر تجديد الاشتراك: "+e.message,false)}
        finally{renew.disabled=false}
      });
      row.appendChild(renew);box.appendChild(row);
      if(c.channel==="app"&&!c.deviceTransferPending&&Number(c.expiresAt||0)>Date.now()){
        actions.appendChild(button("↻ إعادة دخول بنفس الكود",function(){
          void authorizeSameCodeRelogin(c,this);
        },"secondary sm"));
        actions.appendChild(button("نقل الجهاز",function(){
          void transferCode(c,this);
        },"danger"));
      }else if(c.deviceTransferPending){
        box.appendChild(node("p","تم إصدار كود نقل سابقًا؛ انسخه من السجل وفعّله بالجهاز الجديد قبل طلب نقل آخر.","warn"));
      }else if(c.channel==="app"&&Number(c.expiresAt||0)<=Date.now()){
        box.appendChild(node("p","جدّد الاشتراك أولًا حتى يصبح نقل الجهاز متاحًا.","warn"));
      }
    }else if(c.status==="unused"){
      box.appendChild(node("p","هذا الكود لم يُفعّل بعد؛ مدته تبدأ عند أول استخدام.","muted"));
    }else{
      box.appendChild(node("p","الكود الملغى لا يمكن تجديده أو نقله. أنشئ كودًا جديدًا عند الحاجة.","warn"));
    }
    if(actions.childNodes.length)box.appendChild(actions);
  }
  ["codes-search","codes-filter","codes-sort"].forEach(function(id){
    $(id).addEventListener(id==="codes-search"?"input":"change",renderCodes);
  });
  function renderCodes(){
    var tb=$("codes-list");tb.replaceChildren();
    var filtered=visibleCodes();
    value("codes-filter-count","المعروض "+count(filtered.length)+" من "+count(state.codes.length));
    if(!filtered.length){var tr=node("tr");var td=cell(tr,state.codes.length?"لا توجد أكواد مطابقة للبحث أو الفلتر.":"لم يتم إصدار أكواد بعد");
      td.colSpan=8;tb.appendChild(tr)}
    filtered.forEach(function(code){
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
        code.status==="revoked"?"ملغى":code.deviceTransferPending?"بانتظار الجهاز":
        Number(code.expiresAt||0)<=Date.now()?"منتهي الصلاحية":"ساري";
      var status=node("strong",label,codePhase(code)==="active"?"ok":
        codePhase(code)==="unused"||codePhase(code)==="pending"?"warn":"fail");cell(tr,status);
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
      controls.appendChild(button("المميزات وإدارة الكود",function(){manageCode(code.id)},"secondary sm"));
      if(code.status==="redeemed")
        controls.appendChild(button(codePhase(code)==="expired"?"إعادة صلاحية":"تجديد الصلاحية",
          function(){manageCode(code.id,true)},"secondary sm"));
      if(code.status==="redeemed"&&code.channel==="app"&&!code.deviceTransferPending&&
        Number(code.expiresAt||0)>Date.now()){
        controls.appendChild(button("↻ إعادة دخول",function(){void authorizeSameCodeRelogin(code,this)},"secondary sm"));
        controls.appendChild(button("نقل الجهاز",function(){void transferCode(code,this)},"danger"));
      }
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
    renderCodeDetail();
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
  function audioTrackLabel(tracks){
    if(!tracks)return "لم يُفحص";
    if(tracks.status==="audio-stream-declared")
      return "🎵 "+(tracks.audioCodecs||[]).join("، ")+" (معلن، غير مفكوك)";
    if(tracks.status==="no-audio-stream-declared")
      return "⚠ لا يوجد مسار صوت معلن في PMT";
    if(tracks.status==="pmt-not-observed")return "تعذر العثور على بيانات مسار الصوت";
    return "لم تتوفر معلومات الصوت بعد";
  }
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
      if(item.mediaTracks?.inspectedBytes>0)
        status+=" · صوت: "+audioTrackLabel(item.mediaTracks);
      if(item.audioMode==="aac")status+=" · تحويل AAC تجريبي";
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



  var smartHealthStates={partial:"القياس غير مكتمل · راجع الطبقات الناقصة",
    attention:"توجد مشاكل مهمة تستحق المراجعة",
    review:"توجد ملاحظات محدودة للمراجعة",
    observed_no_flagged_events:"لا تظهر مشاكل في العينات المحدودة",
    unknown:"غير معروف · القياسات غير متاحة"};
  var smartSeverity={high:"مرتفعة",medium:"متوسطة",low:"منخفضة"};
  var smartEventKinds={raised:"تم رصد مشكلة متكررة",resolved:"لم تعد تظهر في عينتين متتاليتين"};
  var smartIssueNames={
    provider_admission_refused:"رفض أو تحديد سعة المصدر",
    provider_upstream_transient:"تعثر الاتصال بالمصدر",
    gateway_media_interrupted:"انقطاع إرسال بعد البداية",
    relay_provider_failures:"تعثر مصدر المشاركة منذ التشغيل",
    relay_audio_ts_transport_anomaly:"اضطراب صوت Relay",
    relay_video_ts_transport_anomaly:"اضطراب صورة Relay",
    relay_pmt_audio_missing:"غياب إعلان PMT للصوت في Relay",
    operator_audio_ts_transport_anomaly:"اضطراب صوت المشرف",
    operator_video_ts_transport_anomaly:"اضطراب صورة المشرف",
    operator_input_pmt_no_audio:"PMT بلا مسار صوت",
    operator_audio_packets_not_seen_in_sample:"لم تُرصد حزم صوت في عينة",
    operator_video_packets_not_seen_in_sample:"لم تُرصد حزم صورة في عينة",
    relay_audio_codec_support_review:"مراجعة دعم ترميز Relay",
    operator_audio_codec_support_review:"مراجعة ترميز مسار المشرف",
    edge_gateway_5xx_last5m:"أخطاء Edge حديثة",
    edge_gateway_denied_last5m:"طلبات Edge مرفوضة",
    media_engine_auth_failure:"مصادقة MediaMTX",
    media_engine_control_unavailable:"اتصال MediaMTX الداخلي",
    operator_restream_recent_probe_failure:"فشل فحص أول بيانات فيديو",
    gateway_catalog_missing:"محتوى مفقود من الفهرس",
    gateway_auth_rejected:"رفض دخول بوابة Xtream"};
  var playbackStatus=null;
  function smartDate(t){
    return Number.isSafeInteger(t)&&t>0?
      new Date(t).toLocaleString("ar-SA-u-nu-latn",{timeZone:"Asia/Riyadh"}):"غير متاح";
  }
  async function loadPlaybackHealth(){
    try{
      var data=await api("playback-health");
      playbackStatus=data;
      var d=data.assessment||{},incidents=Array.isArray(d.incidents)?d.incidents:[],
        coverage=d.coverage||{},missing=Array.isArray(d.missingLayers)?d.missingLayers:[];
      value("playback-health-status",
        "الحالة: "+(smartHealthStates[data.state]||"غير معروف")+
        " · آخر فحص: "+smartDate(data.lastCollectedAt)+
        (data.dataFresh?" · البيانات حديثة":" · البيانات قديمة أو غير مكتملة"));
      value("playback-health-issues",data.dataFresh?count(incidents.length):"غير معروف");
      value("playback-health-audio",data.dataFresh?
        count(incidents.filter(x=>x.area==="audio"||x.area==="decoder").length):"—");
      value("playback-health-video",data.dataFresh?
        count(incidents.filter(x=>x.area==="video").length):"—");
      value("playback-health-missing",data.dataFresh?count(missing.length):"غير معروف");
      value("playback-health-samples",count(data.samplesSinceBoot));
      var rows=$("playback-health-incidents");rows.replaceChildren();
      incidents.slice(0,14).forEach(function(issue){
        var tr=node("tr");
        cell(tr,String(issue.title||smartIssueNames[issue.code]||"مشكلة غير معروفة"));
        cell(tr,smartSeverity[issue.severity]||"غير محددة");
        cell(tr,count(issue.count)+" · "+(issue.evidenceScope==="relay_since_boot"?
          "منذ التشغيل":"ضمن مجال الرصد"));
        cell(tr,String(issue.action||"يلزم فحص يدوي"));
        rows.appendChild(tr);
      });
      if(!rows.children.length){
        var tr=node("tr"),td=cell(tr,data.dataFresh&&missing.length===0?
          "لم تظهر مشاكل في القياسات المحدودة. يلزم تأكيد تجربة الجهاز.":
          "لا توجد نتيجة موثوقة كافية للحكم. راجع مصادر البيانات.");
        td.colSpan=4;rows.appendChild(tr);
      }
      value("playback-health-coverage",
        "طبقات القياس: "+
        Object.entries(coverage).map(function(e){return e[0]+": "+(e[1]?"متاح":"غير متاح")}).join(" · ")+
        " · الحوادث تتضمن عينات محدودة داخل سيرفر واحد، وقد لا تشمل كل العملاء. "+
        (data.state==="partial"?"تحقق من مصدر البيانات الناقص قبل اعتبار العطل محلولًا.":"")+
        " لا توجد تعديلات تلقائية على البث.");
      var events=$("playback-health-events");events.replaceChildren();
      (Array.isArray(data.events)?data.events:[]).slice(-12).reverse().forEach(function(event){
        var tr=node("tr");
        cell(tr,smartDate(event.at));
        cell(tr,smartEventKinds[event.kind]||"تغير حالة");
        cell(tr,smartIssueNames[event.code]||"مشكلة قياس عامة");
        events.appendChild(tr);
      });
      if(!events.children.length){
        var tr=node("tr"),td=cell(tr,"لا توجد حوادث مؤكدة بعد؛ يتطلب الرصد تكرار المشكلة في عينتين.");
        td.colSpan=3;events.appendChild(tr);
      }
      var aiReady=data.ai?.configured===true&&data.dataFresh===true;
      $("playback-health-ai-button").disabled=!aiReady;
      if(!aiReady)value("playback-health-ai-result",data.ai?.configured?
        "أكمل جمع بيانات المراقبة أولًا؛ زر Groq لا يعالج بيانات قديمة.":
        "Groq AI غير مهيأ على السيرفر. التشخيص المحلي يعمل بدون مفتاح خارجي.");
    }catch{
      playbackStatus=null;
      value("playback-health-status","تعذر جمع بيانات Smart Playback Health؛ الحالة غير معروفة");
      $("playback-health-ai-button").disabled=true;
      value("playback-health-coverage","فشل قراءة التشخيص. لا نعتبر صفر المشاهدين أو سلامة الصوت مثبتة دون قياس.");
      $("playback-health-incidents").replaceChildren();
      $("playback-health-events").replaceChildren();
    }
  }
  $("playback-health-refresh").addEventListener("click",loadPlaybackHealth);
  $("playback-health-ai-button").addEventListener("click",async function(){
    if(!playbackStatus?.dataFresh)return;
    this.disabled=true;value("playback-health-ai-result","جار الحصول على تفسير رموز المشاكل فقط...");
    try{
      var ai=await action("playback-health/ai","playback-ai-explain",{});
      value("playback-health-ai-result","Groq (استشارة غير تنفيذية): "+
        (ai.explanationAr||"لم يُرجع تفسيرًا")+
        " · المشكلة الأهم: "+(smartIssueNames[ai.priorityCode]||"غير محددة")+
        " · يتطلب التأكد من جهاز فعلي.");
    }catch{
      value("playback-health-ai-result",
        "تعذر الحصول على تفسير Groq حاليًا. التشخيص المحلي يظل متاحًا؛ لا يُعاد الطلب تلقائيًا.");
    }finally{this.disabled=false;}
  });
  var crossReasons={
    provider_admission_refused:"رفض مصدر Xtream الاتصال 403/429/456. راجع صلاحية المصدر وحدوده ولا تكرر الطلب.",
    provider_upstream_transient:"تعثر نقل مؤقت من المصدر 408/5xx. راجع استقراره قبل تعديل الأكواد.",
    gateway_media_interrupted:"انقطع إرسال HTTP بعد بدء الوسائط في بوابة BLOFY.",
    gateway_catalog_missing:"المحتوى غير موجود في فهرس البوابة. راجع المزامنة ولا تحذف محتوى العملاء.",
    gateway_auth_rejected:"فُشلت محاولة دخول محلية. لا تُنسب إلى تعطل مزود المحتوى.",
    relay_provider_failures:"محرك المشاركة سجّل فشل مصدر منذ تشغيل السيرفر؛ ليس بالضرورة عطلًا جاريًا.",
    relay_audio_ts_transport_anomaly:"مؤشرات نقل صوت غير طبيعي داخل عينة Relay المشترك فقط، وليست إثبات فقدان صوت لدى العميل.",
    relay_video_ts_transport_anomaly:"مؤشرات نقل صورة غير طبيعي في عينة Relay المشترك فقط.",
    relay_pmt_audio_missing:"آخر PMT للتغذية المشتركة لم تعلن مسارًا صوتيًا، وليس دليل صمت نهائيًا.",
    relay_audio_codec_support_review:"ترميز صوت في تغذية Relay قد يحتاج فحص توافق جهاز Android أو Windows.",
    media_engine_control_unavailable:"تعذر الاتصال بواجهة MediaMTX الداخلية. لا نجزم بتوقف بث العملاء من هذا وحده.",
    media_engine_auth_failure:"تعذرت مصادقة MediaMTX الداخلية؛ لا تعرض عدد جلسات افتراضيًا.",
    edge_gateway_5xx_last5m:"أبلغت بوابة Edge عن أخطاء HTTP 5xx من بوابة BLOFY خلال خمس دقائق؛ راجع النقل والخادم.",
    edge_gateway_denied_last5m:"سجل Edge رفض قبول HTTP عبر بوابة BLOFY؛ تحقق من صلاحية الكود وحدود المصدر دون إعادة المحاولة المستمرة.",
    operator_restream_recent_probe_failure:"فشل فحص النقل الأولي مؤخرًا لمسار مشرف، دون إثبات تعطل بقية القنوات.",
    operator_input_pmt_no_audio:"جدول PMT لعينة دخلت للسيرفر لم يعلن مسار صوت. هذا ليس اختبار سماع أو دليلًا على صمت البث بالكامل.",
    operator_audio_codec_support_review:"وجد مسار صوت بترميز قد يختلف دعمه بين الأجهزة (مثل AC3/EAC3). لا يغير النظام الترميز دون موافقة.",
    operator_audio_packets_not_seen_in_sample:"لم تُشاهد حزم صوت على PID المعلن خلال عينة MPEG-TS مكتملة وبها حزم فيديو. لا يثبت ذلك صمت البث كاملًا.",
    operator_video_packets_not_seen_in_sample:"لم تُشاهد حزم فيديو على PID المعلن خلال عينة MPEG-TS مكتملة وبها حزم صوت. لا يثبت ذلك سواد الصورة على الجهاز.",
    operator_audio_ts_transport_anomaly:"رُصدت مؤشرات اضطراب MPEG-TS في حزم الصوت خلال عينة السيرفر (قفز عداد الاستمرارية أو TEI). لا يثبت انقطاع الصوت في الجهاز.",
    operator_video_ts_transport_anomaly:"رُصدت مؤشرات اضطراب MPEG-TS في حزم الصورة خلال عينة السيرفر (قفز عداد الاستمرارية أو TEI). لا يثبت انقطاع الصورة في الجهاز."
  };
  function crossReading(measured,value){
    return measured&&Number.isSafeInteger(value)?count(value):"غير متاح";
  }
  async function loadCrossService(){
    try{
      var d=await api("cross-service");
      if(d?.ok!==true)throw Error("cross_service_unavailable");
      var m=d.observations||{},g=m.gateway||{},direct=m.direct||{},
        relay=m.relay||{},hls=m.operatorHls||{},mtx=m.mediaMtx||{},edge=m.edge||{};
      var states={
        partial:"القياس جزئي · بعض الأنظمة غير معروفة",
        attention:"توجد ملاحظات تحتاج مراجعة",
        observed_no_recent_faults:"لا تظهر أخطاء في المقاييس المحدودة"
      };
      value("cross-service-status",states[d.status]||"تعذر تحديد حالة شاملة");
      value("cross-direct",crossReading(direct.dataAvailable,direct.activeMedia)+
        (direct.countsReliable===false?" (ناقص)":""));
      value("cross-relay",crossReading(relay.dataAvailable,relay.attachedReaders));
      value("cross-hls",crossReading(hls.dataAvailable,hls.activePathReaders));
      value("cross-mediamtx-hls",crossReading(mtx.dataAvailable,mtx.hlsSessions));
      value("cross-mediamtx-paths",crossReading(mtx.online===true,mtx.readyPaths));
      value("cross-mediamtx-status",mtx.controlConfigured===false?"لم تُهيأ المصادقة":
        mtx.online===false?"تعذر الاتصال":mtx.dataAvailable?"متصل":"القراءات غير مكتملة");
      value("cross-edge-requests",crossReading(edge.dataAvailable,edge.requestsLastFiveMinutes));
      value("cross-edge-errors",crossReading(edge.dataAvailable,edge.errors5xxLastFiveMinutes));
      value("cross-edge-p95",edge.dataAvailable&&Number.isSafeInteger(edge.p95GatewayHeaderMs)?
        count(edge.p95GatewayHeaderMs)+" ms":"غير متاح");
      value("cross-edge-status",edge.dataAvailable?"متصل / طلبات فقط":"بيانات Edge غير متوفرة");
      value("cross-started",crossReading(g.dataAvailable,g.attemptedMediaStarts));
      value("cross-failed",crossReading(g.dataAvailable,g.failed));
      value("cross-p95",g.dataAvailable&&Number.isFinite(g.p95StartupMs)?
        count(g.p95StartupMs)+" ms":"غير متاح");
      value("cross-service-coverage",
        "نطاق البوابة: جلسات HTTP مباشرة بهذه العملية فقط؛ نطاق المشاركة: قراء المشاركة في STREAM API فقط؛ نطاق HLS: مسارات المشرف فقط. "+
        "لا تجمع هذه الأعداد لأنها قد تتداخل؛ جلسة MediaMTX HLS ليست مشاهدًا فريدًا. مؤشرات Edge تقيس طلبات HTTP وزمن انتظار رأس استجابة البوابة فقط، وليست جلسات فيديو نشطة. MediaMTX مقاس في STREAM فقط؛ محرك إعادة البث المنفصل وجلسات WebRTC/RTSP ليست ضمن القياس. "+
        (d.status==="partial"?"بعض البيانات غير متوفرة، فلا نعتبر كل الخدمات سليمة.":""));


      var shared=m.sharedRelayTracks||{};
      value("shared-relay-audio-summary",shared.dataAvailable?
        "تغذيات Relay: "+crossReading(true,shared.feeds)+
        " · عينات بلا مسار صوت: "+crossReading(true,shared.audioNoTrackFeeds)+
        " · مراجعة ترميز: "+crossReading(true,shared.audioCodecReviewFeeds)+
        " · اضطراب نقل الصوت: "+crossReading(true,shared.audioTransportAnomalyFeeds)+
        " · اضطراب نقل الصورة: "+crossReading(true,shared.videoTransportAnomalyFeeds)+
        " · عينات قديمة/غير مكتملة: "+crossReading(true,shared.missingOrStaleEvidenceFeeds)+
        (shared.channelsTruncated?" · بعض الصفوف غير معروضة":""):
        "قياس صوت البث المشترك غير متاح.");
      var sharedRows=$("shared-relay-audio-rows");sharedRows.replaceChildren();
      var sharedTrackStates={audio_decoder_compatibility_review:"راجع دعم ترميز الجهاز",
        no_audio_declared_in_observed_pmt:"PMT لم تعلن مسار صوت",
        audio_track_declared:"مسار صوت معلن، السماع غير مفحوص",
        stale:"بيانات الترميز قديمة",not_measured:"لم تُقَس",
        track_metadata_incomplete:"المعلومات غير كافية"};
      var sharedContinuity={transport_anomaly_observed:"مؤشر اضطراب نقل",
        single_continuity_jump:"قفزة واحدة",
        no_anomaly_in_bounded_sample:"لم يظهر اضطراب في العينة",
        no_payload_observed:"لم ترصد حزم",unknown:"غير معروف"};
      (Array.isArray(shared.channels)?shared.channels:[]).slice(0,64).forEach(function(feed){
        var tr=node("tr"),track=feed.diagnosis||{};
        cell(tr,"قناة "+crossReading(true,feed.channel));
        cell(tr,crossReading(true,feed.attachedReaders));
        var codecs=Array.isArray(track.audioCodecs)?track.audioCodecs.slice(0,5).join(", "):"";
        cell(tr,(sharedTrackStates[track.finding]||"غير معروف")+(codecs?" · "+codecs:""));
        cell(tr,sharedContinuity[track.audioTransportState]||"غير معروف");
        cell(tr,sharedContinuity[track.videoTransportState]||"غير معروف");
        cell(tr,Number.isSafeInteger(track.lastObservedAgeSeconds)?
          count(track.lastObservedAgeSeconds)+" ثانية":"لم تحدد");
        sharedRows.appendChild(tr);
      });
      if(!sharedRows.children.length){
        var emptyShared=node("tr"),td=cell(emptyShared,
          shared.dataAvailable?"لا توجد تغذيات Relay نشطة الآن.":"البيانات غير متاحة.");
        td.colSpan=6;sharedRows.appendChild(emptyShared);
      }
      var rest=m.operatorRestream||{};
      var restStates={checking:"الفحص جار",unverified:"لم يفحص",
        first_bytes_verified:"نجح أول بايت",probe_failed:"فشل نقل الوسائط",
        probe_stale:"نتيجة قديمة"};
      var restErrors={
        restream_provider_denied:"رفض المصدر الاتصال",
        restream_provider_unavailable:"تعذر اتصال المصدر",
        restream_provider_not_found:"القناة غير موجودة بالمصدر",
        restream_invalid_media:"استجابة غير صالحة للفيديو",
        restream_first_byte_timeout:"تأخر أول بايت",
        restream_hls_unavailable:"تعذر فتح HLS",
        restream_control_unavailable:"فشل اتصال MediaMTX",
        restream_short_primary_disconnect:"انقطاع قصير من المصدر الأساسي",
        restream_switched_source:"انتقل للمصدر الاحتياطي",
        restream_hls_invalid:"ملف HLS غير صالح"
      };
      value("restream-health-summary",rest.dataAvailable?
        "مسارات المشرف: "+crossReading(true,rest.monitoredPaths)+
        " · فحص فاشل حديث: "+crossReading(true,rest.failedRecentPaths)+
        " · فحوص قديمة: "+crossReading(true,rest.staleProbePaths)+
        " · لم تفحص: "+crossReading(true,rest.unverifiedPaths)+
        " · مصدر احتياطي: "+crossReading(true,rest.backupConfiguredPaths)+
        " · عينة PMT بلا مسار صوت: "+crossReading(true,rest.audioNoTrackPaths)+
        " · مراجعة دعم ترميز الصوت: "+crossReading(true,rest.audioCodecReviewPaths)+
        " · بيانات صوت غير كافية: "+crossReading(true,rest.audioEvidenceUnavailablePaths)+
        " · عينات لا تظهر حزم صوت: "+crossReading(true,rest.audioPayloadNotObservedPaths)+
        " · عينات لا تظهر حزم صورة: "+crossReading(true,rest.videoPayloadNotObservedPaths)+
        " · مؤشرات اضطراب نقل الصوت: "+crossReading(true,rest.audioTransportAnomalyPaths)+
        " · مؤشرات اضطراب نقل الصورة: "+crossReading(true,rest.videoTransportAnomalyPaths)+
        (rest.pathsTruncated?" · جزء من القائمة فقط":""):
        "مؤشرات إعادة البث الخاصة بالمشرف غير متاحة.");
      var trackStates={
        no_audio_declared_in_observed_pmt:"لم تعلن PMT صوتًا في العينة",
        audio_decoder_compatibility_review:"مسار صوت؛ راجع دعم الترميز في الجهاز",
        audio_track_declared:"مسار صوت معلن؛ سماعه غير مفحوص",
        stale:"تحليل ترميزات قديم",
        track_metadata_incomplete:"بيانات PAT/PMT غير كافية",
        not_measured:"لا توجد عينة صوت"
      };
      var tsTransportReadings={
        transport_anomaly_observed:"مؤشرات اضطراب حزم",
        single_continuity_jump:"قفزة عداد واحدة في العينة",
        no_anomaly_in_bounded_sample:"لم يظهر اضطراب في العينة",
        no_payload_observed:"لم تظهر حزم",
        unknown:"غير معروف"
      };
      var packetReadings={observed_payload:"حزم مرصودة",
        not_seen_in_bounded_sample:"لم تظهر في العينة",
        insufficient_sample:"عينة غير كافية",unknown:"غير معروف"};
      var restRows=$("restream-health-rows");restRows.replaceChildren();
      (Array.isArray(rest.paths)?rest.paths:[]).slice(0,32).forEach(function(p){
        var tr=node("tr");
        cell(tr,"مسار "+count(p.slot));
        cell(tr,restStates[p.state]||"غير معروف");
        cell(tr,crossReading(rest.dataAvailable,p.activeOperatorReaders));
        var audio=p.audioTrackDiagnosis||{};
        var codecs=Array.isArray(audio.audioCodecs)?audio.audioCodecs.slice(0,5).join(", "):"";
        cell(tr,(trackStates[audio.finding]||"غير معروف")+(codecs?" · "+codecs:"")+
          (audio.selectedOutputMode==="aac_transcode_configured"?" · AAC مُهيأ، الناتج غير مفحوص":"")+
          " · الصوت: "+(packetReadings[audio.audioPacketEvidence]||"غير معروف")+
          " · الصورة: "+(packetReadings[audio.videoPacketEvidence]||"غير معروف")+
          " · استمرارية TS للصوت: "+(tsTransportReadings[audio.audioTransportState]||"غير معروف")+
          " · استمرارية TS للصورة: "+(tsTransportReadings[audio.videoTransportState]||"غير معروف"));
        cell(tr,p.backupConfigured?"نعم":"لا");
        cell(tr,crossReading(rest.dataAvailable,p.failoversSinceBoot));
        cell(tr,(restErrors[p.lastErrorCode]||"—")+
          (Number.isSafeInteger(p.latestProbeAgeSeconds)?
            " · قبل "+count(p.latestProbeAgeSeconds)+" ثانية":""));
        restRows.appendChild(tr);
      });
      if(!restRows.children.length){
        var emptyRest=node("tr"),emptyCell=cell(emptyRest,
          rest.dataAvailable?"لا توجد مسارات مشرف مهيأة.":"لا تتوفر بيانات المسارات.");
        emptyCell.colSpan=7;restRows.appendChild(emptyRest);
      }
      var rows=$("cross-service-issues");rows.replaceChildren();
      (Array.isArray(d.problems)?d.problems:[]).slice(0,15).forEach(function(item){
        var tr=node("tr");
        cell(tr,item.scope==="relay_since_boot"?"محرك المشاركة":
          item.scope==="mediamtx_current"?"محرك MediaMTX":
          item.scope==="edge_last_5m"?"بوابة Edge":
          item.scope==="operator_restream_recent"?"مسارات المشرف":
          item.scope==="operator_restream_tracks"?"ترميزات المشرف":
          item.scope==="relay_input_sample"?"صوت Relay المشترك":"بوابة Xtream");
        cell(tr,item.scope==="relay_since_boot"?"منذ التشغيل":
          item.scope==="mediamtx_current"?"الحالة الحالية":
          item.scope==="edge_last_5m"?"آخر 5 دقائق":
          item.scope==="operator_restream_recent"?"آخر 5 دقائق":
          item.scope==="operator_restream_tracks"?"آخر دقيقتين":
          item.scope==="relay_input_sample"?"آخر دقيقتين":"آخر ساعة");
        cell(tr,crossReading(true,item.count));
        cell(tr,crossReasons[item.code]||"إشارة غير معروفة");
        rows.appendChild(tr);
      });
      if(!rows.children.length){
        var tr=node("tr"),td=cell(tr,
          d.status==="partial"?
            "بعض مصادر القياس غير متوفرة. غياب التنبيهات هنا لا يثبت سلامة التشغيل.":
            "لا توجد إشارات خلل ضمن المقاييس المتاحة حاليًا.");
        td.colSpan=4;rows.appendChild(tr);
      }
      value("cross-service-check",
        "آخر تجميع: "+new Date(d.checkedAt).toLocaleString("ar-SA-u-nu-latn",
          {timeZone:"Asia/Riyadh"})+
        " · بدأ نقل وسائط صحيح في البوابة لا يعني وصول الصوت والصورة للمشاهد. "+
        "سجل الأداء محدود بحد أقصى 400 حدث لكل عملية خلال ساعة؛ ولا يشمل تلقائيًا الاتصالات المحولة إلى Edge أو العملاء على نسخ أخرى.");
    }catch{
      value("cross-service-status","التشخيص غير متاح · لا توجد نتيجة موثوقة");
      value("cross-service-coverage",
        "تعذر جمع مؤشرات الخدمات. لن نعرض صفر مشاهدين أو نعتبر المصادر تعمل دون دليل.");
      value("restream-health-summary","تعذر قراءة مؤشرات المشرف؛ لا توجد نتيجة موثوقة.");
      $("restream-health-rows").replaceChildren();
      value("shared-relay-audio-summary","تعذر قراءة بيانات Relay الصوتية.");
      $("shared-relay-audio-rows").replaceChildren();
      value("cross-service-check","تحقق من اتصال البوابة بالواجهة المحمية وسجلات السيرفر، دون زيادة طلبات البث.");
    }
  }
  $("cross-service-refresh").addEventListener("click",loadCrossService);
  // Smart Ops 2.0 does NOT poll source URLs or invoke any media action.
  // It reads bounded, already-collected server counters only.
  var smartOpsLabels={
    feed_near_capacity:"القناة قريبة من الحد الداخلي للمشاهدين. راجع صلاحية المصدر قبل زيادة السعة.",
    feed_media_stalled:"توجد جلسات مشاهدة لكن آخر بيانات الوسائط قديمة. افحص النقل والمصدر.",
    provider_failures_increased:"ازدادت حالات تعثر المصدر منذ آخر قراءة.",
    capacity_rejections_increased:"رُفضت طلبات مشاهدة جديدة لحماية السعة الحالية، ولم تُطرد الجلسات القائمة.",
    reconnects_increased:"زادت محاولات إعادة الاتصال بالمصدر (حدود السيرفر كما هي).",
    slow_viewer_disconnects_increased:"فُصلت جلسات قراءة بطيئة لحماية موارد الاتصال والمشاهدين.",
    operator_hls_probe_failed:"فشلت عينة HLS لمسار المشرف. لا يدل وحده على تعطل كل قنوات العملاء."
  };

  // Real cached provider snapshot, not synthetic viewers or a source probe.
  // The browser never receives the source provider URL or bridge secret.
  async function loadSourceCapacity(){
    try{
      var data=await api("source-capacity");
      if(!data.ok||!Array.isArray(data.sources))
        throw Error("source_capacity_unavailable");
      var totals=data.summary||{};
      value("source-capacity-status",
        "مصادر مدرجة: "+count(data.sourceCount)+
        " · تحتاج مراجعة حد المصدر: "+count(totals.restricted)+
        " · تحذيرات: "+count(totals.warning)+
        " · بيانات قديمة/مجهولة: "+count(totals.unknown)+
        (data.accountCountsAvailable?"":" · تعذر قراءة عدد الاشتراكات المرتبطة")+
        (data.truncated?" · القائمة غير مكتملة":"")+
        (data.directHttpTransferMeasurementAvailable?
          " · نقل HTTP مباشر نشط: "+count(data.activeDirectHttpMediaTransfers)+
          " · قنوات مباشرة: "+count(data.activeDirectLiveHttpTransfers)+
          (data.directHttpTransferCountsReliable?"":" (القياس تجاوز السعة، الأرقام ناقصة)"):
          " · قياس النقل المباشر غير متاح"));
      var statuses={online:"متصل حسب آخر حالة",offline:"غير متصل",syncing:"جار التحديث",
        error:"خطأ سابق",unknown:"غير معروف"};
      var levels={
        restricted:"وصل الحد المعلن أو لا توجد سعة",
        warning:"تحتاج مراجعة",
        unknown:"المعلومات غير كافية",
        paused:"مصدر موقوف",
        snapshot_only:"لا يظهر خطر من آخر بيانات محفوظة"
      };
      var tbody=$("source-capacity-rows");tbody.replaceChildren();
       var single=data.sources.filter(function(row){return row.enabled!==false&&row.sourceReportedMaxConnections===1}).length;
       var noCapacity=data.sources.filter(function(row){return row.enabled!==false&&row.sourceReportedMaxConnections===0}).length;
       value("source-capacity-insight",single?
         "⚠ "+count(single)+" مصدر مفعّل يعلن اتصالًا واحدًا فقط لكل حساب؛ مشاركة نفس القناة قد توفر الاتصال عند وجود إذن، لكن تشغيل قنوات مختلفة يتطلب سعة منفصلة من المزود.":
         noCapacity?"⚠ توجد مصادر تعلن عدم السماح بأي اتصال جديد؛ تحقق من المزود.":
         "لم يظهر في البيانات المخزنة مصدر يعلن حدًا يساوي اتصالًا واحدًا. لا يعني ذلك أن السعة كافية حتى تُختبر.");
      data.sources.slice(0,60).forEach(function(row){
        var tr=node("tr");
        cell(tr,String(row.name||"مصدر غير مسمى"));
        cell(tr,row.enabled===false?"متوقف":(statuses[row.status]||"غير معروف"));
        cell(tr,count(row.sourceReportedMaxConnections));
        cell(tr,count(row.sourceReportedActiveConnections));
        cell(tr,count(row.activeGatewayAccounts));
        cell(tr,data.directHttpTransferMeasurementAvailable?
          count(row.activeDirectHttpMediaTransfers):"غير معروف");
        cell(tr,data.directHttpTransferMeasurementAvailable?
          count(row.activeDirectLiveHttpTransfers):"غير معروف");
        cell(tr,row.lastTestAt?
          new Date(row.lastTestAt).toLocaleString("ar-SA-u-nu-latn",
            {timeZone:"Asia/Riyadh"}):"لم يتم تأكيده");
        cell(tr,levels[row.level]||"غير معروف");
        tbody.appendChild(tr);
      });
      if(!tbody.children.length){
        var tr=node("tr"),td=cell(tr,"لا توجد مصادر صالحة في البيانات المخزنة.");
        td.colSpan=9;tbody.appendChild(tr);
      }
      value("source-capacity-warning",
        "آخر البيانات ليست اتصالًا مباشرًا بالمزود، ولا يُثبت عدد اشتراكات الأكواد عدد المشاهدين الفعليين. "+
        "الاشتراكات غير المرتبطة بمصدر محدد: "+count(data.unboundActiveGatewayAccounts)+
        ". قياس HTTP المباشر يشمل جلسات الوكيل المباشرة بهذه العملية فقط؛ لا يشمل التحويل 307 أو المشاركة أو HLS أو خدمات Edge أو نسخ Railway الأخرى، ولا يمثل عدد المشاهدين المميزين. لا يتم إنشاء اتصالات أو تغيير كود أو نقل مشترك.");
    }catch(error){
      value("source-capacity-status","تعذر قراءة حدود المصدر؛ الحالة غير معروفة، ولا يجوز افتراض سلامتها.");
       value("source-capacity-insight","لا توجد قياسات سعة موثوقة حاليًا؛ لا نفترض أن المصادر تسمح بالمشاركة.");
      value("source-capacity-warning","هذا التقرير يتطلب بوابة BLOFY واتصال الإدارة المحمي. لا يوجد فحص بث إضافي. "+String(error.message||"").slice(0,90));
    }
  }
  $("source-capacity-refresh").addEventListener("click",loadSourceCapacity);
  async function loadSmartOps(){
    try{
      var d=await api("smart-ops");
      value("smart-ops-status",d.alertCount===0?"لا توجد تنبيهات تشغيل نشطة":"يوجد "+count(d.alertCount)+" تنبيه");
      value("smart-ops-viewers",count(d.capacity?.activeViewers));
      value("smart-ops-feeds",count(d.capacity?.activeFeeds));
      value("smart-ops-alerts",count(d.alertCount));
      value("smart-ops-critical",count(d.criticalCount));
      value("smart-ops-capacity-delta",d.sampleIntervalMs===null?"جار تكوين خط الأساس":count(d.deltas?.capacityRejections));
      var points=Array.isArray(d.trend)?d.trend:[];
      var peak=points.reduce(function(n,p){return Math.max(n,Number(p.viewers)||0)},0);
      value("smart-ops-peak-viewers",points.length?count(peak):"—");
      var recent=points[points.length-1];
      var ingress=recent&&recent.intervalMs>0?
        ((Number(recent.sourceBytes)||0)*1000/1024/recent.intervalMs).toFixed(1):null;
      value("smart-ops-ingress",ingress===null?"—":ingress);
      value("smart-ops-incidents",count(d.totalRaised));
      var history=$("smart-ops-history");history.replaceChildren();
      (d.recentChanges||[]).slice(0,18).forEach(function(entry){
        var tr=node("tr");
        cell(tr,new Date(entry.at).toLocaleTimeString("en-GB",{timeZone:"Asia/Riyadh"}));
        cell(tr,entry.state==="raised"?"بدأ":"انتهى");
        cell(tr,entry.level==="critical"?"حرج":"تنبيه");
        cell(tr,smartOpsLabels[entry.code]||"مؤشر غير معروف");
        history.appendChild(tr);
      });
      if(!history.children.length){
        var empty=node("tr"),td=cell(empty,"لا توجد حوادث مرصودة منذ تشغيل السيرفر.");
        td.colSpan=4;history.appendChild(empty);
      }
      value("smart-ops-scope",d.sharedLiveEnabled===true?
        "المشاركة مفعّلة لهذه المسارات فقط. الحد الداخلي "+count(d.capacity?.maxViewersPerFeed)+" قارئًا لكل قناة؛ لا يمثل حد مزود المحتوى ولا عدد مشاهدي التطبيق.":
        "مشاركة القنوات غير مفعّلة أو ليس لها مشاهدون. الأرقام لا تشمل بث التطبيق المباشر ولا تثبت قدرة المصدر على 500 مشاهد.");
      var channels=$("smart-ops-channels");channels.replaceChildren();
      (d.channels||[]).slice(0,64).forEach(function(row){
        var tr=node("tr");
        cell(tr,"#"+count(row.channel));
        var states={ready:"يبث",starting:"جار البدء",reconnecting:"يعيد الاتصال",failed:"متعثر",idle:"غير مستخدم",unknown:"غير معروف"};
        cell(tr,states[row.state]||"غير معروف");
        cell(tr,count(row.viewers));
        cell(tr,row.saturationPercent===null?"غير معروف":count(row.saturationPercent)+"٪");
        cell(tr,row.lastMediaAgeMs===null?"لم تظهر بيانات":count(Math.round(row.lastMediaAgeMs/1000))+" ثانية");
        channels.appendChild(tr);
      });
      if(!channels.children.length){
        var empty=node("tr"),td=cell(empty,"لا توجد قنوات مشاركة نشطة ضمن هذه الخدمة.");
        td.colSpan=5;channels.appendChild(empty);
      }
      var alerts=$("smart-ops-issues");alerts.replaceChildren();
      (d.alerts||[]).slice(0,40).forEach(function(issue){
        var tr=node("tr");
        cell(tr,issue.level==="critical"?"حرج":"تنبيه");
        cell(tr,issue.channel?"#"+count(issue.channel):issue.path||"السيرفر");
        cell(tr,smartOpsLabels[issue.code]||"حدث تشغيل غير معروف");
        alerts.appendChild(tr);
      });
      if(!alerts.children.length){
        var empty=node("tr"),td=cell(empty,"لا توجد إشارات خلل في القياسات المتاحة.");
        td.colSpan=3;alerts.appendChild(empty);
      }
      value("smart-ops-last-check",(d.backgroundSampling?"مراقبة آلية كل 15 ثانية":"مراقبة عند الطلب فقط")+
        " · آخر قراءة: "+new Date(d.checkedAt).toLocaleString("ar-SA-u-nu-latn",{timeZone:"Asia/Riyadh"})+
        " · أخطاء المصدر المكتشفة منذ القراءة السابقة: "+count(d.deltas?.providerFailures)+
        " · انقطاعات القراء البطيئين: "+count(d.deltas?.slowViewerDisconnects)+
        ". لا يتم إنشاء طلبات بث إضافية لهذا الفحص.");
    }catch(e){
      value("smart-ops-status","تعذر قراءة مؤشرات الاتصال");
      value("smart-ops-last-check","البيانات غير متاحة، ولا يجوز اعتبار جميع القنوات سليمة. "+e.message);
    }
  }
  $("smart-ops-refresh").addEventListener("click",loadSmartOps);
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
      value("security-active-feeds",count(d.media?.activeFeeds));
      value("security-viewers",count(d.media?.viewers));
      value("security-source-sessions",count(d.media?.upstreamSessionsOpened));
      value("security-initial-retries",count(d.media?.initialRetries));
      value("security-reconnect-recovered",count(d.media?.reconnectRecovered));
      value("security-source-outages",count(d.media?.sourceOutages));
      var toMb=function(v){return (Math.max(0,Number(v)||0)/1048576).toFixed(1)+" MiB";};
      value("security-ingress-mb",toMb(d.media?.sourceBytesReceived));
      value("security-egress-mb",toMb(d.media?.viewerBytesQueued));
      value("security-cooldown-rejections",count(d.media?.cooldownRejections));
      var channelRows=$("security-channel-health");
      channelRows.replaceChildren();
      var channelStates={ready:"✅ يبث",starting:"جاري الاتصال",
        reconnecting:"🔄 يعيد الاتصال"};
      (d.media?.channels||[]).forEach(function(item){
        var tr=node("tr");
        cell(tr,"#"+count(item.channel));
        cell(tr,channelStates[item.state]||"غير متاح");
        cell(tr,count(item.viewers));
        var age=item.lastMediaAgeMs;
        cell(tr,age===null||age===undefined?"لم يصل بث":
          (Math.floor(Number(age)/1000)+" ث"));
        cell(tr,count(item.reconnects));
        cell(tr,audioTrackLabel(item.audio));
        channelRows.appendChild(tr);
      });
      if(!(d.media?.channels||[]).length){
        var empty=node("tr"),td=cell(empty,"لا توجد قنوات مشتركة قيد المشاهدة.");
        td.colSpan=6;channelRows.appendChild(empty);
      }
      var eventsRows=$("security-channel-events");
      eventsRows.replaceChildren();
      var eventLabels={connected:"بدأ البث",reconnecting:"🔄 تعثر وجار الاستعادة",
        recovered:"✅ عاد البث",failed:"⚠️ انقطع المصدر",idle:"توقف لعدم وجود مشاهدين"};
      (d.media?.events||[]).slice(0,32).forEach(function(item){
        var tr=node("tr");
        cell(tr,Number.isFinite(item.at)?new Date(item.at)
          .toLocaleTimeString("en-GB",{timeZone:"Asia/Riyadh"}):"—");
        cell(tr,"#"+count(item.channel));
        cell(tr,(eventLabels[item.kind]||"تغيير الحالة")+
          (item.reason?" · "+item.reason:""));
        eventsRows.appendChild(tr);
      });
      if(!(d.media?.events||[]).length){
        var emptyEvent=node("tr"),tdEvent=cell(emptyEvent,"لا توجد أحداث مسجلة بعد.");
        tdEvent.colSpan=3;eventsRows.appendChild(emptyEvent);
      }
      var status=Number(d.media?.activeFeeds||0)>0?
        (Number(d.media?.sourceOutages||0)>0?"مشاركة تعمل مع انقطاعات مسجلة":
          "قنوات مشتركة نشطة"):
        "لا توجد قناة مشتركة نشطة الآن (ليس خطأ)";
      value("security-note",status+". الحماية تعمل، والتصاريح القصيرة مفعلة. "+
        "المقاييس إجمالية منذ آخر تشغيل؛ ليست ضمانًا لجودة الصوت والصورة.");
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
      var pilot=d.salehOrigin;
      if(pilot){
        value("saleh-origin-mode",pilot.enabled?"وضع saleh التجريبي مفعل":"مجهز · غير مفعل");
        value("saleh-origin-active",count(pilot.sourceActivePaths));
        value("saleh-origin-quota",count(pilot.sourceChannelLimit));
        value("saleh-origin-customers",pilot.customerCutoverEnabled?"محدود":"غير مفعّل");
        value("saleh-origin-note",pilot.enabled?
          "حماية Origin تعمل لقنوات saleh في وضع المشرف. أي قناة مختلفة فوق الحد تُرفض لحماية القناة العاملة؛ توسيع التوزيع لكل المشتركين يحتاج اختبارات فعلية.":
          "بُني نظام الحماية للمصدر saleh في الكود، ولم يُفعّل تحويل المشتركين أو تغيير مصادر أكوادهم. تفعيل وضع Origin يحتاج إعدادًا تشغيليًا صريحًا.");
      }
      if((d.items||[]).some(function(item){return item.probePending;})){
        liveProbeRefresh=setTimeout(loadLive,4000);
      }
    }
    catch(e){$("live-result").textContent="تعذر عرض المسارات: "+e.message}
  }
  $("live-reload").addEventListener("click",loadLive);
  $("read-replica-synthetic-probe").addEventListener("click",async function(){
    if(this.disabled)return;
    var button=this;button.disabled=true;
    value("read-replica-synthetic-result",
      "جار اختبار نقل عينة HLS تجريبية من Origin إلى Replica. لا يتم تشغيل بث saleh.");
    try{
      var result=await action("read-replica/synthetic-probe","replica-synthetic-probe",{});
      var probe=result.probe||{};
      if(probe.ok===true&&probe.transportVerified===true){
        value("read-replica-synthetic-result","✓ وصل مقطع MPEG-TS عبر الخادم الجديد: "+
          count(probe.bytesVerified)+" بايت تحققت. لا يعني اختبار الصوت أو القنوات الحقيقية أو تحويل العملاء.");
      }else{
        var codes={replica_path_not_ready:"مسار العينة التجريبية غير جاهز.",
          replica_private_unreachable:"تعذر الوصول لخادم التوزيع الخاص.",
          replica_invalid_manifest:"قائمة HLS غير صالحة.",
          replica_segment_not_ready:"لم يجهز مقطع HLS خلال نافذة الاختبار.",
          replica_auth_denied:"صلاحيات قراءة MediaMTX رفضت الاختبار.",
          replica_invalid_ts:"لم يتم العثور على حزم MPEG-TS صالحة في المقطع.",
          replica_invalid_segment:"قائمة HLS تشير إلى مسار غير مصرح به."};
        value("read-replica-synthetic-result",
          "لم يكتمل الاختبار: "+(codes[probe.code]||String(probe.code||"غير معروف"))+
          " · لم يتغير مسار أي عميل أو مصدر Xtream.");
      }
    }catch(e){
      value("read-replica-synthetic-result",String(e.message)==="replica_probe_cooldown"?
        "تم تشغيل الاختبار مؤخرًا؛ إعادة التجربة متاحة بعد دقيقتين.":
        "تعذر بدء اختبار التوزيع: "+e.message);
    }finally{button.disabled=false}
  });
  function sharedFailureText(code){
    var labels={
      pilot_source_not_found:"لم يوجد مصدر مرخّص باسم saleh",
      pilot_source_ambiguous:"تكرر اسم المصدر؛ يلزم اختيار مصدر واحد",
      pilot_source_not_enabled:"المصدر غير مفعل أو غير منشور",
      pilot_channel_not_found:"لم يتم العثور على قناة 4K V SPORT المطابقة",
      pilot_channel_ambiguous:"وجدت عدة قنوات متشابهة؛ يلزم الاختيار اليدوي",
      pilot_media_http_failure:"المصدر لم يعطِ استجابة TS ناجحة",
      pilot_source_unavailable:"المصدر لم يستجب لمسار القناة",
      pilot_source_auth_denied:"المصدر رفض طلب الوسائط أو صلاحية الحساب",
      pilot_media_stalled:"البث توقف عن إرسال بيانات الفيديو",
      pilot_stream_ended:"توقف تدفق القناة قبل اكتمال الفحص",
      pilot_source_not_ts:"البيانات ليست MPEG-TS صالحًا للتوزيع",
      pilot_transport_unavailable:"تعذر النقل أو الاتصال الآمن بالمصدر",
      pilot_bridge_unavailable:"بوابة الاتصال بالمصدر غير متاحة",
      pilot_catalog_unavailable:"تعذر تحميل فهرس القنوات",
      pilot_requires_live_ts:"القناة أو صيغتها غير ملائمة لفحص TS",
      pilot_rate_limited:"الفحص مقيد لمدة دقيقة لحماية المصدر",
      pilot_in_progress:"هناك فحص مشاركة جار الآن",
      shared_with_sequential_reconnect:"وصلت البيانات للمشاهدين مع إعادة اتصال متسلسلة",
      shared_single_upstream_verified:"نجح وصول TS إلى مشاهدين من اتصال مصدر واحد"
    };
    return labels[String(code||"")]||String(code||"لم يتم الاختبار");
  }
  async function loadSharedReadiness(){
    try{
      var d=await api("shared-live/status"),last=d.last;
      if(d.state==="running"){
        value("shared-live-readiness-state","الفحص جار الآن");
        value("shared-live-readiness-note","الفحص محدد بمصدر واحد ومشاهدين تجريبيين؛ لا يؤثر على أكواد العملاء.");
        return;
      }
      if(!last){
        value("shared-live-readiness-state","لم يُفحص البث المشترك بعد");
        value("shared-live-readiness-note","البث المشترك للعملاء غير مفعل. استخدم الاختبار لتأكيد النقل.");
        return;
      }
      value("shared-live-readiness-state",last.ok?"✅ نجح فحص النقل":"⚠️ "+sharedFailureText(last.code));
      value("shared-live-readiness-upstreams",count(last.upstreamSessions));
      value("shared-live-readiness-viewers",count(last.viewerSamples));
      var detail=last.checkedAt?new Date(last.checkedAt).toLocaleString("ar-SA",{timeZone:"Asia/Riyadh"}):"—";
      value("shared-live-readiness-note","آخر فحص: "+detail+" · "+
        (last.mode==="boot"?"تلقائي محدود":"يدوي")+
        " · إعادة اتصال: "+count(last.reconnects)+
        (last.failureCodes&&last.failureCodes.length?
          " · رموز التشخيص: "+last.failureCodes.join("، "):"")+
        " · فحص نقل فقط، لم يتم التحقق من فك الصوت والصورة.");
    }catch(e){value("shared-live-readiness-state","تعذر قراءة حالة المشاركة")}
  }
  $("shared-live-readiness-refresh").addEventListener("click",loadSharedReadiness);
  $("shared-live-probe").addEventListener("click",async function(){
    var sourceId=$("live-source").value,channelId=$("live-channel").value;
    if(!sourceId||!channelId){show("اختر مصدرًا وقناة لفحص المشاركة.",false);return}
    if(!$("live-rights").checked){show("يلزم تأكيد صلاحية إعادة بث هذه القناة.",false);return}
    this.disabled=true;
    value("shared-live-probe-result","جار التحقق من سحب المصدر وتوزيعه على قارئين خلال 26 ثانية...");
    try{
      // This diagnostic intentionally renders a sanitized JSON body even
      // when ok:false; the general action() helper throws that evidence away.
      var response=await fetch("/operator/api/shared-live/probe",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"content-type":"application/json",
          "x-blofy-operator-action":"shared-live-probe"},
        body:JSON.stringify({sourceId:sourceId,channelId:channelId,
          rightsConfirmed:true})
      });
      var report=await response.json();
      value("shared-live-probe-result",JSON.stringify(report,null,2));
      if(!response.ok||!report.ok){
        show("فشل فحص المشاركة: "+sharedFailureText(report.code)+
          ". قنوات المشتركين بقيت على المسار السابق.",false);
      }else{
        show("نجح النقل المشترك التجريبي، لكن جودة الصورة والصوت تحتاج تأكيدًا.",true);
      }
      await loadSharedReadiness();
    }catch(e){
      value("shared-live-probe-result","تعذر الفحص: "+e.message);
      show("فشل الفحص بدون تغيير قنوات المشتركين.",false);
    }finally{this.disabled=false;await loadSharedReadiness()}
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
      var audioMode=$("live-aac-audio").checked?"aac":"copy";
      if(audioMode==="aac"&&!confirm(
        "تجربة AAC تخص مسار المشرف فقط وتستهلك CPU. لن تتغير أكواد أو قنوات العملاء. متابعة؟"))
        return;
      var result=await action("live/start","live-start",{
        sourceId:sourceId,channelId:channelId,
        backupSourceId:backupSourceId,backupChannelId:backupChannelId,
        audioMode:audioMode,audioTranscodeConfirmed:audioMode==="aac",
        rightsConfirmed:true
      });
      $("live-result").textContent=
        "✅ تم تجهيز مسار القناة: "+String(result.title||"")+
        "\nالحالة: جاهز عند الطلب (On-Demand)."+
        "\nتنبيه: لم يبدأ سحب المصدر بعد، ولا يعني إنشاء المسار أن الصورة والصوت يعملان."+
        "\nالخطوة التالية: اضغط فحص HLS في صف القناة، ثم انتظر النتيجة."+
        "\nفحص HLS يختبر وصول مقطع، ولا يغني عن معاينة الصورة والصوت."+
        "\nالصوت: "+(result.audioMode==="aac"?"تحويل AAC للمشرف فقط":"نسخ دون تحويل")+
        "\nالمسار: "+String(result.path||"");
      show("تم تجهيز المسار فقط. لا يعتبر البث شغالًا حتى ينجح فحص HLS.",true);
      await loadLive();
    }catch(e){$("live-result").textContent="تعذر تشغيل القناة: "+e.message;show(e.message,false)}
    finally{this.disabled=false}
  });
  async function loadFailureItems(sourceId){
    var tbody=$("diagnostic-failures-items"),status=$("diagnostic-failures-items-status");
    tbody.replaceChildren();status.textContent="جار قراءة العناصر المسجلة بدون طلب بث جديد.";
    try{
      var reply=await api("media-failure-items"+(sourceId?"?sourceId="+encodeURIComponent(sourceId):""));
      var items=Array.isArray(reply.items)?reply.items:[];
      items.forEach(function(item){
        var tr=node("tr");
        var src=(state.overview?.sources||[]).find(function(s){return s.id===item.sourceId});
        cell(tr,src?.name||"المصدر المسجل");
        var info=node("div");info.appendChild(node("strong",item.name||("العنصر "+item.itemId),"name"));
        info.appendChild(node("small","ID: "+item.itemId,"meta num"));
        cell(tr,info);
        cell(tr,item.kind==="movie"?"فيلم":item.kind==="series"?"حلقة مسلسل":"غير معروف");
        cell(tr,node("span",item.state==="missing"?"404 موثّق":item.state==="recovered"?"تعافٍ موثّق":"غير معروف",
          "diag-state "+(item.state==="missing"?"warning":item.state==="recovered"?"ok":"unknown")));
        var format=function(time){return time?new Date(time).toLocaleString("ar-SA-u-nu-latn",{timeZone:"Asia/Riyadh"}):"لم يُفحص"};
        cell(tr,format(item.lastCheckedAt));cell(tr,format(item.nextCheckAt));tbody.appendChild(tr);
      });
      if(!items.length){var tr=node("tr");var td=cell(tr,"لا يوجد عناصر مسجلة من هذا المصدر.");td.colSpan=6;tbody.appendChild(tr)}
      status.textContent="عدد العناصر المعروضة: "+count(items.length)+
        " · من سجل 404 الحقيقي فقط. التاريخ لا يثبت الحالة الحالية؛ لا يتم تشغيل الفيديو هنا.";
    }catch(e){
      var tr=node("tr"),td=cell(tr,"تعذر عرض تفاصيل 404 حاليًا. لا يؤثر ذلك على قائمة الملخص.");td.colSpan=6;tbody.appendChild(tr);
      status.textContent="تعذر قراءة العناصر التفصيلية: "+String(e.message||"").slice(0,65);
    }
  }
  async function loadFailures(){
    var tbody=$("diagnostic-failures"),summary=$("diagnostic-failures-summary");
    var sourceId=$("diagnostic-failures-source").value||"";
    $("diagnostic-failures-recheck").disabled=!sourceId;
    void loadFailureItems(sourceId);
    tbody.replaceChildren();summary.textContent="جار قراءة السجل المحفوظ؛ لا يبدأ فحص تشغيل جديد.";
    try{
      var d=await api("media-failures"+(sourceId?"?sourceId="+encodeURIComponent(sourceId):""));
      if(d.ok===false)throw Error(d.code||"media_failures_unavailable");
      // Aggregate states only. The upstream currently exposes no safe item-level
      // replay endpoint; do not imply an individual 404 was rechecked.
      var rows=Array.isArray(d.entries)?d.entries:[];
      var missing=0,due=0,recovered=0;
      rows.forEach(function(e){
        var n=Number(e.count)||0,needs=Number(e.due)||0;
        if(e.state==="missing"){missing+=n;due+=needs}
        if(e.state==="recovered")recovered+=n;
        var tr=node("tr");
        var source=(state.overview?.sources||[]).find(function(s){return s.id===e.sourceId});
        cell(tr,source?.name||"مصدر غير مسمى");
        cell(tr,({live:"قنوات",movie:"أفلام",series:"مسلسلات",episode:"حلقات"})[e.kind]||String(e.kind||"—"));
        cell(tr,node("span",e.state==="missing"?"مفقود سابقًا":
          e.state==="recovered"?"تعافٍ مسجّل":"سجل غير مصنف",
          "diag-state "+(e.state==="missing"?"warning":e.state==="recovered"?"ok":"unknown")));
        cell(tr,count(e.count));cell(tr,count(e.due));tbody.appendChild(tr);
      });
      if(!rows.length){
        var empty=node("tr");var td=cell(empty,"لا توجد حالات 404 مسجلة ضمن نطاق الفلتر الحالي.");
        td.colSpan=5;tbody.appendChild(empty);
      }
      summary.textContent="مفقود مسجّل: "+count(missing)+" · تستحق إعادة فحص: "+count(due)+
        " · تعافٍ موثّق: "+count(recovered)+
        " · السجل لا يثبت الحالة الحالية لكل عنصر.";
    }catch(e){
      summary.textContent="تعذّر قراءة سجل 404؛ لا يمكن الحكم على العناصر.";
      var row=node("tr");var td=cell(row,"تعذر عرض سجل الأعطال: "+e.message);
      td.colSpan=5;tbody.appendChild(row);
    }
  }
  $("diagnostic-failures-reload").addEventListener("click",loadFailures);
  $("diagnostic-failures-source").addEventListener("change",loadFailures);
  $("diagnostic-failures-recheck").addEventListener("click",async function(){
    var sourceId=$("diagnostic-failures-source").value||"";
    if(!sourceId){value("diagnostic-failures-recheck-result","اختر مصدرًا محددًا أولًا.");return}
    var source=(state.overview?.sources||[]).find(function(s){return s.id===sourceId});
    var name=String(source?.name||"المصدر المحدد");
    var msg="فحص 404 سيختبر أول بيانات لحد أقصى 3 عناصر سبق أن أعاد مزودها 404 من المصدر: "+name+
      ". قد يستهلك اتصال مزود إضافيًا، خاصة إذا كان حد الاتصال واحدًا. لا يُعدّل الفهرس أو الأكواد. هل تؤكد؟";
    if(!confirm(msg))return;
    var btn=this;btn.disabled=true;
    value("diagnostic-failures-recheck-result","جار اختبار عناصر 404 المسجلة لهذا المصدر فقط...");
    try{
      var report=await action("media-failures/recheck-now","media-failures-recheck-now",{sourceId,confirmed:true});
      value("diagnostic-failures-recheck-result",
        (report.busy?"فحص آخر قيد التنفيذ. ":"")+"عناصر فُحصت: "+count(report.checked)+
        " • تعافت: "+count(report.recovered)+" • ما زالت مفقودة: "+count(report.stillMissing)+
        " • نتائج غير مؤكدة: "+count(report.transient)+
        " • لم يُحذف أي محتوى أو اشتراك.");
      await loadFailures();
    }catch(e){
      var code=String(e.message||"");
      var hints={unavailable_recheck_disabled:"فحص التعافي غير مفعّل للمصدر في Railway.",
        unavailable_source_not_allowed:"المصدر غير مصرّح له بإعادة الفحص.",
        unified_bridge_unreachable:"تعذر الاتصال ببوابة المصدر.",
        unavailable_recheck_unavailable:"لم يكتمل فحص 404 المحدود."};
      value("diagnostic-failures-recheck-result",hints[code]||"تعذر تنفيذ الفحص: "+code.slice(0,80));
    }finally{btn.disabled=!$("diagnostic-failures-source").value}
  });
  if(tabs[location.hash.slice(1)]&&location.hash!=="#home")tab(location.hash.slice(1));
  refresh();loadLive();loadFailures();loadAutoHealth();loadSecurity();loadSharedReadiness();loadSmartOps();loadSourceCapacity();loadCrossService();loadPlaybackHealth();
  setInterval(function(){if(!document.hidden){refresh();loadLive();loadFailures();loadAutoHealth();loadSecurity();loadSharedReadiness();loadSmartOps();loadSourceCapacity();loadCrossService();loadPlaybackHealth()}},60000);
})();
</script>
</body></html>`;
  return html.replace('__NONCE__',nonce);
}
