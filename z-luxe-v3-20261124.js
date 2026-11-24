/* BLOFYSAT Signature V3 progressive UX. Does not alter orders, auth or checkout. */
(() => {
  "use strict";
  const doc = document;
  function node(tag, klass, txt) {
    const el=doc.createElement(tag);
    if(klass) el.className=klass;
    if(txt) el.textContent=txt;
    return el;
  }
  function setLink(parent,label,href) {
    const a=node("a","",label); a.href=href;parent.appendChild(a);return a;
  }
  function store() {
    const wrap=doc.querySelector("body.zid-store .wrap");
    if(!wrap) return;
    const nav=wrap.querySelector("header.nav");
    if(!doc.querySelector(".zid-announcement")) {
      const bar=node("div","zid-announcement");
      const dot=node("span","zid-announcement-dot");
      dot.setAttribute("aria-hidden","true");bar.append(dot);
      bar.append(node("span","","اختيارات مميزة لعالم الأجهزة والملحقات"));
      setLink(bar,"تصفح المنتجات ←","#products");
      doc.body.insertBefore(bar,doc.body.firstChild);
    }
    if(nav && !doc.querySelector(".zid-shortcuts")) {
      const sub=node("div","zid-shortcuts");
      const crumbs=node("div","zid-crumbs");
      setLink(crumbs,"جميع المنتجات","#products");
      setLink(crumbs,"الرسيفرات والملحقات","#collections");
      setLink(crumbs,"عن المتجر","#about-us");
      setLink(crumbs,"السياسات","#contact");
      sub.append(crumbs);
      sub.append(node("b","","BLOFYSAT / PREMIUM STORE"));
      nav.insertAdjacentElement("afterend",sub);
    }
    const showroom=doc.querySelector(".showroom");
    if(showroom && !doc.querySelector(".zid-perks")) {
      const perks=node("section","zid-perks");
      perks.setAttribute("aria-label","مميزات تجربة التسوق");
      const items=[
        ["⌕","بحث وتنقل سريع","اكتشف الأجهزة والأقسام بسهولة"],
        ["♡","قائمة المفضلة","احتفظ بالمنتجات التي تعجبك"],
        ["↗","متابعة الطلبات","ارجع إلى طلباتك من المتجر"]
      ];
      for(const [icon,title,subtitle] of items) {
        const outer=node("div","zid-perk");
        const mark=node("span","zid-perk-icon",icon);
        mark.setAttribute("aria-hidden","true");
        const copy=node("div","");
        copy.append(node("strong","",title),node("small","",subtitle));
        outer.append(mark,copy);perks.append(outer);
      }
      showroom.insertAdjacentElement("afterend",perks);
    }

    /* Mobile quick dock delegates all actions to the existing store controls. */
    if(!doc.querySelector(".luxe-mobile-dock")) {
      const dock=node("nav","luxe-mobile-dock");
      dock.setAttribute("aria-label","الوصول السريع");
      const products=setLink(dock,"","#products");
      products.className="luxe-dock-item";
      products.append(node("span","luxe-dock-symbol","▦"),node("span","","المنتجات"));
      const actions=[
        ["favopen","♡","المفضلة","favcount"],
        ["cartopen","♧","السلة","cartcount"],
        ["trackopen","☷","طلباتي",null]
      ];
      for(const [id,icon,label,countID] of actions) {
        const target=doc.getElementById(id);
        if(!target)continue;
        const b=node("button","luxe-dock-item");
        b.type="button";
        b.setAttribute("aria-label","فتح "+label);
        b.append(node("span","luxe-dock-symbol",icon),node("span","",label));
        if(countID) {
          const count=node("span","luxe-dock-count");
          const existing=doc.getElementById(countID);
          if(existing) {
            const refresh=()=>{const val=Number(existing.textContent.replace(/[^0-9]/g,""))||0;count.textContent=val>99?"99+":String(val);count.hidden=val===0;};
            refresh();
            new MutationObserver(refresh).observe(existing,{characterData:true,childList:true,subtree:true});
          } else count.hidden=true;
          b.append(count);
        }
        b.addEventListener("click",()=>target.click());
        dock.append(b);
      }
      doc.body.appendChild(dock);
    }
    const modal=doc.getElementById("productmodal");
    const details=doc.getElementById("detailbody");
    if(!modal || !details) return;
    let zoomDialog;
    function openPhoto(img) {
      if(!zoomDialog) {
        zoomDialog=doc.createElement("dialog");
        zoomDialog.className="luxe-photo-dialog";
        zoomDialog.setAttribute("aria-label","تكبير صورة المنتج");
        const close=node("button","luxe-photo-close","إغلاق ×");
        close.type="button";
        close.addEventListener("click",()=>zoomDialog.close());
        const photo=doc.createElement("img");
        photo.alt="صورة المنتج بالحجم الكبير";
        zoomDialog.append(close,photo);
        zoomDialog.addEventListener("click",(e)=>{
          if(e.target===zoomDialog)zoomDialog.close();
        });
        doc.body.appendChild(zoomDialog);
      }
      const picture=zoomDialog.querySelector("img");
      picture.src=img.currentSrc||img.src;
      picture.alt=img.alt||"صورة المنتج";
      if(typeof zoomDialog.showModal==="function")zoomDialog.showModal();
    }
    function enhance() {
      if(!details.children.length) return;
      if(!details.querySelector(".luxe-product-help")) {
        const help=node("div","luxe-product-help");
        const mark=node("span","luxe-product-help-mark","◇");
        mark.setAttribute("aria-hidden","true");
        const copy=node("div","");
        copy.append(node("b","","تفاصيل المنتج أمامك بوضوح"));
        copy.append(node("small","","راجع المواصفات والتوفر والسعر المعروض قبل إتمام الطلب."));
        help.append(mark,copy);
        details.appendChild(help);
      }
      for(const img of details.querySelectorAll("img")) {
        if(img.dataset.luxeZoomReady==="1") continue;
        img.dataset.luxeZoomReady="1";
        if(!img.getAttribute("src"))continue;
        img.classList.add("luxe-zoomable");
        img.title=img.title||"اضغط لتكبير الصورة";
        img.tabIndex=0;
        img.addEventListener("click",()=>{if(img.naturalWidth)openPhoto(img)});
        img.addEventListener("keydown",e=>{
          if((e.key==="Enter"||e.key===" ")&&img.naturalWidth){e.preventDefault();openPhoto(img)}
        });
      }
    }
    let pending=false;
    const observer=new MutationObserver(()=>{
      if(pending)return;
      pending=true;
      queueMicrotask(()=>{pending=false;enhance()});
    });
    observer.observe(details,{childList:true,subtree:true});
    enhance();
  }
  function admin() {
    const root=doc.querySelector("body.admin>.wrap");
    if(!root || doc.querySelector(".zid-admin-shell")) return;
    const sections=[
      ["المنتجات","products"],
      ["الطلبات","orders"],
      ["إدارة المنتجات","productform"],
      ["بيانات المتجر","merchantform"],
      ["جاهزية الخدمات","readiness"],
      ["الاستيراد","productcsv"]
    ];
    const ids={};
    for(const [label,id] of sections) {
      const child=doc.getElementById(id);
      const section=child && child.closest("section.panel");
      if(section) {
        const target="luxe-"+id;
        section.id=target;
        ids[label]=target;
      }
    }
    const kpi=doc.querySelector(".admin-kpi");
    if(kpi){kpi.id="luxe-dashboard"}
    const shell=node("div","zid-admin-shell");
    const side=node("aside","zid-admin-sidebar");
    side.setAttribute("aria-label","التنقل في لوحة الإدارة");
    const brand=node("div","zid-sidebrand","BLOFYSAT");
    brand.append(node("small","","CONTROL CENTER"));
    side.append(brand,node("span","zid-sidecaption","لوحة التحكم"));
    const links=[["⌂","نظرة عامة","#luxe-dashboard"]];
    for(const [label] of sections) {
      if(!ids[label])continue;
      const icon=label==="الطلبات"?"☷":label==="المنتجات"?"▦":label==="إدارة المنتجات"?"＋":label==="بيانات المتجر"?"⚙":label==="جاهزية الخدمات"?"◉":"⇅";
      links.push([icon,label,"#"+ids[label]]);
    }
    links.push(["↗","عرض المتجر","/"]);
    for(const [symbol,label,href] of links) {
      const a=setLink(side,symbol+"  "+label,href);
      a.addEventListener("click",()=>{
        for(const n of side.querySelectorAll('a[aria-current]'))n.removeAttribute("aria-current");
        a.setAttribute("aria-current","location");
      });
    }
    side.append(node("div","zid-sidefooter","إدارة BLOFYSAT • جميع الوظائف محفوظة"));
    doc.body.insertBefore(shell,root);
    root.classList.add("zid-admin-main");
    shell.append(side,root);
    const header=root.querySelector("header.nav");
    if(header && !root.querySelector(".zid-admin-welcome")) {
      const banner=node("section","zid-admin-welcome");
      const intro=node("div","");
      intro.append(node("h1","","مرحبًا بك في إدارة BLOFYSAT"));
      intro.append(node("p","","نظرة أوضح على المنتجات والطلبات وجاهزية المتجر."));
      const actions=node("div","zid-admin-welcome-actions");
      if(ids["المنتجات"])setLink(actions,"المنتجات","#"+ids["المنتجات"]);
      if(ids["الطلبات"])setLink(actions,"الطلبات","#"+ids["الطلبات"]);
      banner.append(intro,actions);
      header.insertAdjacentElement("afterend",banner);
    }
  }
  function start(){
    try {if(doc.body.classList.contains("zid-store"))store();}
    catch(e){console.warn("BLOFYSAT optional store enhancement unavailable",String(e?.message||e))}
    try {if(doc.body.classList.contains("admin"))admin();}
    catch(e){console.warn("BLOFYSAT optional admin enhancement unavailable",String(e?.message||e))}
  }
  if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();