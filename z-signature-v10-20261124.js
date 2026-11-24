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

/* BLOFYSAT SIGNATURE V4 — storefront-only customer experience */
(() => {
  "use strict";
  const d=document;
  const el=(tag,klass,text)=>{
    const x=d.createElement(tag);if(klass)x.className=klass;
    if(text!==undefined)x.textContent=text;
    return x;
  };
  const link=(text,href,cls)=>{
    const a=el("a",cls||"",text);a.href=href;return a;
  };
  const find=id=>d.getElementById(id);
  function catClick(category) {
    const tab=Array.from(d.querySelectorAll('#categorytabs button[data-category]'))
       .find(n=>n.dataset.category===category);
    if(tab)tab.click();
  }
  function spotlight() {
    const feature=d.querySelector('body.zid-store .feature-banners');
    if(!feature||d.querySelector(".v4-category-spotlight"))return;
    const section=el("section","v4-category-spotlight");
    section.id="discover";
    const intro=el("div","v4-category-heading");
    intro.append(el("span","v4-eyebrow","BLOFYSAT / DISCOVER"),
      el("h2","","اكتشف اللي يناسبك."),
      el("p","","اختيارات مرتبة لتوصل للجهاز أو الملحق المناسب بسهولة."));
    section.append(intro);
    const grid=el("div","v4-category-grid");
    const cards=[
      {name:"الرسيفرات",copy:"تصفح الأجهزة وقارن المواصفات حسب استخدامك.",category:"رسيفرات",number:"01",icon:"▣"},
      {name:"الملحقات",copy:"كمّل تجهيزك بالقطع والملحقات المناسبة.",category:"ملحقات",number:"02",icon:"◇"},
      {name:"كل المنتجات",copy:"اعرض المجموعة كاملة في مكان واحد.",category:"الكل",number:"03",icon:"⌕"}
    ];
    for(const item of cards){
      const a=link("","#products","v4-category-card");
      a.dataset.v4Category=item.category;
      a.append(el("span","v4-cat-number",item.number));
      const icon=el("span","v4-cat-icon",item.icon);
      icon.setAttribute("aria-hidden","true");a.append(icon);
      a.append(el("strong","",item.name));
      a.append(el("small","",item.copy));
      a.append(el("span","v4-cat-more","استعرض الآن ←"));
      a.addEventListener("click",()=>{
        const activate=()=>catClick(item.category);
        activate();
        setTimeout(activate,80);
      });
      grid.append(a);
    }
    section.append(grid);
    feature.insertAdjacentElement("afterend",section);
  }
  function advice() {
    const story=d.querySelector('body.zid-store .brand-story');
    if(!story||d.querySelector(".v4-buyers-guide"))return;
    const section=el("section","v4-buyers-guide");
    section.id="guide";
    const intro=el("div","v4-guide-header");
    intro.append(el("span","v4-eyebrow","BLOFYSAT / SMART CHOICE"),
      el("h2","","اختيار الجهاز صار أوضح."),
      el("p","","قبل الطلب، راجع هذي النقاط عشان تختار الجهاز المناسب لك."));
    section.append(intro);
    const grid=el("div","v4-guide-grid");
    const tips=[
      ["01","حدّد احتياجك","شاهد فئة المنتج والاستخدام الموصوف في تفاصيله."],
      ["02","راجع التفاصيل","تحقق من المواصفات والسعر والصور قبل الاختيار."],
      ["03","تأكد من التوفر","راجع حالة المخزون والسياسات قبل تأكيد الطلب."]
    ];
    tips.forEach(([n,h,t])=>{
      const c=el("article","v4-guide-card");
      c.append(el("span","v4-guide-index",n),
         el("h3","",h),el("p","",t));
      grid.append(c);
    });
    section.append(grid);
    story.insertAdjacentElement("afterend",section);
  }
  function faq() {
    const main=d.querySelector("body.zid-store main");
    if(!main||d.querySelector(".v4-faq"))return;
    const section=el("section","v4-faq");
    section.id="faq";
    const heading=el("div","v4-faq-heading");
    heading.append(el("span","v4-eyebrow","HELP / BLOFYSAT"),
      el("h2","","أسئلة مهمة قبل الطلب"),
      el("p","","إجابات تساعدك تتصفح براحة وتعرف وين تلاقي تفاصيل طلبك."));
    section.append(heading);
    const rows=el("div","v4-faq-list");
    const faqs=[
      ["كيف أتأكد أن المنتج متوفر؟","راجع حالة التوفر داخل تفاصيل المنتج. التوفر يتغير بحسب المخزون المعروض في المتجر."],
      ["كيف أعرف تكلفة الشحن؟","تظهر قيمة الشحن والتفاصيل النهائية عند تجهيز الطلب، وفق خيارات التوصيل المتاحة وقت الشراء."],
      ["وين ألقى سياسة الاسترجاع؟","تقدر تراجع صفحة الاستبدال والاسترجاع من روابط سياسات المتجر أسفل الموقع قبل أي طلب."],
      ["كيف أتابع طلب سابق؟","اضغط على «طلباتي» في أعلى المتجر أو شريط الجوال واتبع الخطوات المعروضة."]
    ];
    faqs.forEach(([question,answer],i)=>{
      const details=el("details","v4-faq-item");
      const title=el("summary","","");
      title.append(el("span","",question));
      const plus=el("span","v4-faq-plus","+");plus.setAttribute("aria-hidden","true");
      title.append(plus);
      const p=el("p","",answer); details.append(title,p);
      rows.append(details);
    });
    section.append(rows);
    main.append(section);
    for(const a of d.querySelectorAll('body.zid-store a[href="#contact"]'))a.setAttribute("aria-label","تواصل معنا وسياسات المتجر");
  }
  function recent() {
    const products=find("products"),detail=find("detailtitle"),body=find("detailbody"),modal=find("productmodal");
    if(!products||!detail||!body||!modal)return;
    const key="blofysat.recent.productnames.v4";
    const validName=x=>x&&x.length<110&&!/تفاصيل المنتج/.test(x);
    const read=()=>{try{
      const arr=JSON.parse(sessionStorage.getItem(key)||"[]");
      return Array.isArray(arr)?arr.filter(x=>typeof x==="string"&&validName(x)).slice(0,5):[];
    }catch{return []}};
    let names=read();
    const box=el("div","v4-recent");
    box.id="v4recent";
    box.setAttribute("aria-label","المنتجات التي شاهدتها");
    const header=el("div","v4-recent-header");
    header.append(el("strong","","شاهدتها مؤخرًا"));
    const chips=el("div","v4-recent-chips");
    box.append(header,chips);
    const toolbar=products.querySelector(".catalog-toolbar");
    if(toolbar)toolbar.insertAdjacentElement("afterend",box);
    else products.append(box);
    function paint(){
      chips.replaceChildren();box.hidden=!names.length;
      names.forEach(name=>{
        const b=el("button","v4-recent-chip",name);b.type="button";
        b.title="ابحث عن "+name;
        b.addEventListener("click",()=>{
          const input=find("searchproducts");if(!input)return;
          input.value=name;
          input.dispatchEvent(new Event("input",{bubbles:true}));
          catClick("الكل");
          products.scrollIntoView({behavior:"smooth",block:"start"});
        });
        chips.append(b);
      });
    }
    paint();
    let ticket=0;
    const observer=new MutationObserver(()=>{
      clearTimeout(ticket); ticket=setTimeout(()=>{
        if(modal.hidden||!body.children.length)return;
        const name=detail.textContent.trim().replace(/\s+/g," ");
        if(!validName(name))return;
        names=[name,...names.filter(x=>x!==name)].slice(0,5);
        try{sessionStorage.setItem(key,JSON.stringify(names))}catch{}
        paint();
      },160);
    });
    observer.observe(modal,{attributes:true,attributeFilter:["hidden"]});
    observer.observe(detail,{childList:true,characterData:true,subtree:true});
    observer.observe(body,{childList:true});
  }
  function searchTools(){
    const search=find("searchproducts");
    if(!search||d.querySelector(".v4-search-clear"))return;
    const wrap=search.closest(".shopsearch");
    if(wrap){
      const clear=el("button","v4-search-clear","×");
      clear.type="button";clear.title="مسح البحث";clear.setAttribute("aria-label","مسح بحث المنتجات");
      const update=()=>{clear.hidden=!search.value.trim()};
      clear.addEventListener("click",()=>{
        search.value="";
        search.dispatchEvent(new Event("input",{bubbles:true}));
        search.focus();
      });
      search.addEventListener("input",update);
      wrap.append(clear);update();
    }
    d.addEventListener("keydown",e=>{
      const tag=(e.target&&e.target.tagName)||"";
      const editable=e.target&&e.target.isContentEditable;
      if((e.key==="/"||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"))&&!["INPUT","TEXTAREA","SELECT"].includes(tag)&&!editable){
        if(!d.querySelector(".modal:not([hidden]),.drawer:not([hidden]),dialog[open]")){
          e.preventDefault();find("products")?.scrollIntoView({behavior:"smooth",block:"start"});
          search.focus({preventScroll:true});
        }
      }
    });
  }
  function imagePerf(){
    const grid=find("productlist");if(!grid)return;
    let raf=0;
    const apply=()=>{
      raf=0;
      const imgs=grid.querySelectorAll("img");
      imgs.forEach((img,i)=>{
        if(img.dataset.v4ImageDone)return;
        img.dataset.v4ImageDone="1";
        img.decoding="async";
        if(i>1)img.loading="lazy";
        else if(!img.loading)img.loading="eager";
        img.addEventListener("error",()=>img.classList.add("v4-image-error"),{once:true});
      });
    };
    new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(apply)})
      .observe(grid,{childList:true,subtree:true});
    apply();
  }
  function quickActions(){
    if(d.querySelector(".v4-floating-actions"))return;
    const nav=el("div","v4-floating-actions");
    nav.setAttribute("aria-label","اختصارات المتجر");
    const search=el("button","v4-float-search","⌕");
    search.type="button";search.setAttribute("aria-label","ابحث في المنتجات");
    search.title="بحث سريع";
    search.addEventListener("click",()=>{
      find("products")?.scrollIntoView({behavior:"smooth",block:"start"});
      setTimeout(()=>find("searchproducts")?.focus({preventScroll:true}),200);
    });
    const up=el("button","v4-float-top","↑");
    up.type="button";up.setAttribute("aria-label","العودة إلى أعلى الصفحة");
    up.title="إلى الأعلى";
    up.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
    nav.append(search,up);
    d.body.append(nav);
    let busy=false;
    window.addEventListener("scroll",()=>{
      if(busy)return;busy=true;
      requestAnimationFrame(()=>{
        busy=false;
        up.hidden=window.scrollY<550;
      });
    },{passive:true});
    up.hidden=window.scrollY<550;
  }
  function start(){
    if(!d.body.classList.contains("zid-store")||d.body.classList.contains("v5-product-page"))return;
    for(const fn of [spotlight,advice,faq,recent,searchTools,imagePerf,quickActions]){
      try{fn()}catch(e){console.warn("BLOFYSAT optional V4 enhancement failed:",String(e?.message||e))}
    }
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start,{once:true});
  else start();
})();


/* BLOFYSAT V5 / true dedicated customer product pages; never writes orders or cart */
(() => {
 "use strict";
 const d=document;
 const productQuery=new URLSearchParams(location.search);
 const productToken=productQuery.get("item");
 const productId=/^[1-9][0-9]{0,12}$/.test(productToken||"")?Number(productToken):null;
 const find=id=>d.getElementById(id);
 const make=(tag,cls,text)=>{
   const a=d.createElement(tag);
   if(cls)a.className=cls;
   if(text!==undefined)a.textContent=text;
   return a;
 };
 function money(halalas){
   const val=Number(halalas)/100;
   if(!Number.isFinite(val))return "السعر غير متوفر";
   try{return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2,maximumFractionDigits:2}).format(val)}
   catch{return val.toFixed(2)+" ر.س"}
 }
 function productLink(item){return "/?item="+encodeURIComponent(String(item.id))}
 function validPicture(url){
   return typeof url==="string"&&(url.startsWith("/media/")||url.startsWith("https://"));
 }
 function descriptionLines(raw){
  return String(raw||"").split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean).slice(0,24);
 }
 function makeImage(item,cls){
   const div=make("div",cls);
   if(validPicture(item.image_url)){
     const img=make("img","","");
     img.src=item.image_url;
     img.alt="صورة "+String(item.name||"المنتج");
     img.loading="lazy";
     img.decoding="async";
     img.referrerPolicy="no-referrer";
     img.addEventListener("error",()=>{
       if(!div.contains(img))return;
       div.replaceChildren(make("span","v5-no-image-icon","▣"),make("span","v5-no-image-label","صورة المنتج غير متوفرة"));
       div.classList.add("v5-empty-image");
     },{once:true});
     div.append(img);
   }else{
     div.classList.add("v5-empty-image");
     div.append(make("span","v5-no-image-icon","▣"),make("span","v5-no-image-label","صورة المنتج غير متوفرة"));
   }
   return div;
 }
 function detailsProduct(item,others,container){
  container.replaceChildren();
  container.setAttribute("aria-busy","false");
  const bread=make("nav","v5-product-breadcrumb");
  bread.setAttribute("aria-label","مسار التنقل");
  for(const [name,url] of [
    ["الرئيسية","/"],
    [item.category||"المنتجات","/#products"]
  ]){
    const a=make("a","",name);a.href=url;bread.append(a,make("span","v5-crumb-separator","/"));
  }
  bread.append(make("span","v5-crumb-current",item.name));
  container.append(bread);

  const layout=make("div","v5-product-layout");
  const gallery=make("div","v5-product-gallery");
  const media=makeImage(item,"v5-product-main-image");
  media.setAttribute("aria-label","صورة المنتج");
  media.title=validPicture(item.image_url)?"اضغط لتكبير صورة المنتج":"";
  if(validPicture(item.image_url)){
    const img=media.querySelector("img");
    media.classList.add("v5-clickable-image");
    media.tabIndex=0;
    media.setAttribute("role","button");
    media.setAttribute("aria-label","تكبير صورة المنتج");
    const zoom=()=>{
      if(!img||!img.complete||!img.naturalWidth)return;
      const modal=d.createElement("dialog");
      modal.className="v5-product-lightbox";
      const close=make("button","v5-lightbox-close","إغلاق ×");
      close.type="button";
      close.addEventListener("click",()=>modal.close());
      const picture=make("img","");
      picture.src=img.currentSrc||img.src;
      picture.alt=img.alt;
      modal.append(close,picture);
      modal.addEventListener("close",()=>modal.remove(),{once:true});
      modal.addEventListener("click",e=>{if(e.target===modal)modal.close()});
      d.body.append(modal);
      if(typeof modal.showModal==="function")modal.showModal();
      else {modal.remove();window.open(picture.src,"_blank","noopener,noreferrer")}
    };
    media.addEventListener("click",zoom);
    media.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();zoom()}});
  }
  gallery.append(media);
  const note=make("p","v5-gallery-note",validPicture(item.image_url)?"الصورة المعروضة من بيانات المنتج الحالية":"لا توجد صورة مرفوعة لهذا المنتج بعد");
  gallery.append(note);
  const share=make("div","v5-product-quicklinks");
  const copy=make("button","v5-copy-link","نسخ رابط المنتج");
  copy.type="button";
  copy.addEventListener("click",async()=>{
    const url=location.href.split("#")[0];
    try{await navigator.clipboard.writeText(url);copy.textContent="تم نسخ الرابط ✓"}
    catch{copy.textContent="الرابط موجود في شريط العنوان"}
    setTimeout(()=>copy.textContent="نسخ رابط المنتج",2400);
  });
  const all=make("a","v5-product-back","← العودة للمتجر");all.href="/#products";
  share.append(copy,all);
  gallery.append(share);
  layout.append(gallery);

  const info=make("div","v5-product-info");
  info.append(make("span","v5-product-kicker","BLOFYSAT / PRODUCT DETAILS"));
  info.append(make("h1","v5-product-name",item.name));
  const status=make("div",item.stock>0?"v5-stock-ready":"v5-stock-out",item.stock>0?"● متوفر حاليًا":"● غير متوفر حاليًا");
  info.append(status);
  const short=descriptionLines(item.description)[0];
  if(short)info.append(make("p","v5-product-excerpt",short));
  const price=make("div","v5-product-price-row");
  price.append(make("strong","v5-price",money(item.price_halalas)));
  price.append(make("small","v5-price-hint","السعر المعروض للقطعة"));
  info.append(price);

  const highlights=make("div","v5-product-facts");
  const facts=[["الفئة",item.category||"غير محددة"],["رمز المنتج",String(item.sku||"—")]];
  if(Number(item.weight_grams)>0)facts.push(["الوزن",Number(item.weight_grams)+" جرام"]);
  facts.forEach(([label,val])=>{
    const row=make("div","v5-product-fact");
    row.append(make("span","",label),make("strong","",val));
    highlights.append(row);
  });
  info.append(highlights);

  const ctas=make("div","v5-product-cta");
  const action=make("a","v5-button-primary",item.stock>0?"متابعة الطلب في المتجر ←":"استعراض المنتج في المتجر");
  action.href="/?product="+encodeURIComponent(String(item.id))+"&from=details";
  ctas.append(action);
  const note2=make("p","v5-cta-note",item.stock>0?"ينقلك الزر إلى المنتج في المتجر؛ إتمام الطلب يعتمد على توفر الدفع والشحن.":"المنتج غير متوفر حاليًا، ويمكنك العودة لاستعراض منتجات أخرى.");
  info.append(ctas,note2);

  const policy=make("div","v5-policies");
  policy.append(make("strong","","معلومات مهمة قبل الشراء"));
  const policies=make("div","v5-policy-links");
  for(const [text,href] of [
    ["الشحن والتوصيل","/policies/shipping"],
    ["الاستبدال والاسترجاع","/policies/returns"],
    ["الخصوصية","/policies/privacy"]
  ]){
    const a=make("a","",text);a.href=href;policies.append(a);
  }
  policy.append(policies);
  info.append(policy);
  layout.append(info);
  container.append(layout);

  const detail=make("section","v5-description");
  detail.append(make("span","v5-section-label","DETAILS / BLOFYSAT"));
  detail.append(make("h2","","وصف ومواصفات المنتج"));
  const lines=descriptionLines(item.description);
  if(lines.length){
    const copy=make("div","v5-description-copy");
    for(const line of lines)copy.append(make("p","",line));
    detail.append(copy);
  }else{
    detail.append(make("p","v5-desc-muted","لم يُضف وصف تفصيلي لهذا المنتج بعد."));
  }
  const spec=make("div","v5-specifications");
  const facts2=[["الاسم",item.name],["الفئة",item.category||"غير محددة"],["رمز المنتج",String(item.sku||"—")],["حالة التوفر",item.stock>0?"متوفر":"غير متوفر"]];
  if(Number(item.weight_grams)>0)facts2.push(["الوزن",Number(item.weight_grams)+" جرام"]);
  for(const [label,value] of facts2){
    const row=make("div","v5-spec-row");
    row.append(make("span","",label),make("strong","",value));
    spec.append(row);
  }
  detail.append(spec);
  container.append(detail);

  const related=(others||[]).filter(p=>Number(p.id)!==Number(item.id)&&p.category===item.category)
     .sort((a,b)=>(b.stock>0)-(a.stock>0)).slice(0,4);
  if(related.length){
    const section=make("section","v5-related");
    section.append(make("span","v5-section-label","DISCOVER MORE / BLOFYSAT"));
    section.append(make("h2","","قد تناسبك أيضًا"));
    const grid=make("div","v5-related-grid");
    related.forEach(product=>{
      const a=make("a","v5-related-card");a.href=productLink(product);
      a.append(makeImage(product,"v5-related-image"));
      const text=make("div","v5-related-copy");
      text.append(make("small","",product.category||"منتج"));
      text.append(make("strong","",product.name));
      text.append(make("b","",money(product.price_halalas)));
      text.append(make("span","v5-related-more","عرض التفاصيل ←"));
      a.append(text);grid.append(a);
    });
    section.append(grid);container.append(section);
  }
  const footer=make("div","v5-product-bottom");
  footer.append(make("strong","","اختر بثقة وتصفح بوضوح"));
  footer.append(make("span","","تأكد من السعر والمواصفات وسياسات المتجر قبل طلبك."));
  container.append(footer);
  d.title=item.name+" | BLOFYSAT";
 }
 const catalogKey="blofysat_products_cache_v5";
 const cachedProducts=()=>{
   try{
     const d=JSON.parse(sessionStorage.getItem(catalogKey)||"{}");
     return d&&Date.now()-d.at<900000&&Array.isArray(d.list)?d.list:[];
   }catch{return []}
 };
 const cacheProducts=list=>{
   try{sessionStorage.setItem(catalogKey,JSON.stringify({at:Date.now(),list:list.slice(0,200)}))}catch{}
 };
 async function page(){
   d.body.classList.add("v5-product-page");
   const root=d.querySelector("body.zid-store .wrap");
   if(!root)return;
   const home=root.querySelector("main");
   if(!home)return;
   const section=make("div","v5-product-page-shell");
   section.setAttribute("aria-live","polite");
   section.setAttribute("aria-busy","true");
   section.append(make("div","v5-loading","جاري تحميل تفاصيل المنتج…"));
   root.insertBefore(section,home);
   const nav=root.querySelector("header.nav");
   if(nav){
     nav.querySelectorAll('a[href^="#"]').forEach(a=>a.href="/"+a.getAttribute("href"));
   }
   const dock=d.querySelector(".luxe-mobile-dock");
   if(dock){dock.querySelectorAll('a[href^="#"]').forEach(a=>a.href="/"+a.getAttribute("href"))}
   const cached=cachedProducts();
   let usedCache=false;
   try{
     const early=cached.find(p=>Number(p.id)===productId&&p.active!==false);
     if(early){detailsProduct(early,cached,section);usedCache=true}
     let list;
     try{
       const controller=typeof AbortController!=="undefined"?new AbortController():null;
       const timeout=controller?setTimeout(()=>controller.abort(),10000):null;
       let response;
       try{response=await fetch("/api/products",{credentials:"same-origin",cache:"no-store",...(controller?{signal:controller.signal}:{})})}
       finally{if(timeout)clearTimeout(timeout)}
       if(!response.ok)throw Error("catalog_http_"+response.status);
       list=await response.json();
       if(!Array.isArray(list))throw Error("invalid_catalog");
       cacheProducts(list);
     }catch(networkError){
       if(!usedCache)throw networkError;
       const note=make("p","v5-cache-note","تفاصيل المنتج المعروضة محفوظة من زيارتك الأخيرة، وقد تتغير الأسعار والمخزون. التحقق النهائي يتم من المتجر.");
       section.append(note);
       console.warn("BLOFYSAT V5 stale cache shown",String(networkError&&networkError.message||networkError));
       return;
     }
     const item=list.find(p=>Number(p.id)===productId&&p.active!==false);
     if(!item){
       section.replaceChildren();
       section.setAttribute("aria-busy","false");
       section.append(make("h1","v5-product-name","المنتج غير متوفر"));
       section.append(make("p","v5-desc-muted","قد يكون المنتج أزيل من المتجر أو لم يعد متاحًا."));
       const back=make("a","v5-button-primary","العودة إلى المنتجات");back.href="/#products";section.append(back);
       return;
     }
     detailsProduct(item,list,section);
   }catch(e){
     section.replaceChildren();
     section.setAttribute("aria-busy","false");
     section.append(make("h1","v5-product-name","تعذر عرض تفاصيل المنتج"));
     section.append(make("p","v5-desc-muted","تحقق من اتصالك ثم حدّث الصفحة، أو ارجع لقائمة المنتجات."));
     const retry=make("button","v5-button-primary","إعادة المحاولة");retry.type="button";
     retry.addEventListener("click",()=>{section.remove();page()},{once:true});
     const native=make("a","v5-product-back","فتح المنتج من قائمة المتجر");native.href="/?product="+productId+"&from=details";
     const back=make("a","v5-product-back","العودة للمتجر");back.href="/#products";
     section.append(retry,native,back);
     console.warn("BLOFYSAT V5 detail page error",String(e&&e.message||e));
   }
 }
 function cards(){
   const grid=find("productlist");
   if(!grid)return;
   let products=[];
   let scheduled=false;
   function enhance(){
     scheduled=false;
     if(!products.length)return;
     for(const card of grid.children){
       if(!card||card.matches(".empty")||card.querySelector(".v5-card-details"))continue;
       const heading=card.querySelector("h3,h4");
       if(!heading)continue;
       const name=heading.textContent.trim();
       const p=products.find(x=>x.name.trim()===name);
       if(!p)continue;
       const a=make("a","v5-card-details","تفاصيل المنتج ←");
       a.href=productLink(p);
       a.setAttribute("aria-label","عرض تفاصيل "+p.name);
       a.addEventListener("click",e=>e.stopPropagation());
       card.append(a);
     }
   }
   try{
     fetch("/api/products",{credentials:"same-origin"}).then(r=>r.ok?r.json():[])
     .then(arr=>{
       if(!Array.isArray(arr))return;
       products=arr.filter(x=>x&&x.active!==false&&typeof x.name==="string");
       cacheProducts(products);
       enhance();
     }).catch(()=>{});
   }catch{}
   new MutationObserver(()=>{
     if(scheduled)return;
     scheduled=true;
     setTimeout(enhance,70);
   }).observe(grid,{childList:true,subtree:true});
 }
 function fromDetail(){
   const params=new URLSearchParams(location.search);
   if(params.get("from")!=="details")return;
   const product=params.get("product");
   if(!/^[1-9][0-9]{0,12}$/.test(product||""))return;
   fetch("/api/products",{credentials:"same-origin"})
    .then(r=>r.ok?r.json():[])
    .then(items=>{
       const item=Array.isArray(items)&&items.find(x=>String(x.id)===product);
       if(!item)return;
       const input=find("searchproducts");
       const results=find("products");
       if(input){
         const tabs=Array.from(d.querySelectorAll('#categorytabs [data-category]'));
         tabs.find(x=>x.dataset.category==="الكل")?.click();
         input.value=item.name;
         input.dispatchEvent(new Event("input",{bubbles:true}));
         setTimeout(()=>{
           if(results)results.scrollIntoView({behavior:"smooth",block:"start"});
         },230);
       }
    }).catch(()=>{});
 }
 function start(){
   if(!d.body.classList.contains("zid-store"))return;
   if(productId){page();return}
   cards();fromDetail();
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start,{once:true});
 else start();
})();


/* BLOFYSAT SIGNATURE V6 — device comparison, customer website only.
   Reuses live catalog; doesn't modify auth, prices, orders or checkout. */
(() => {
  "use strict";
  const d=document, storageKey="blofysat_product_comparison_v6";
  const catalogCache="blofysat_products_cache_v5";
  const max=3;
  let catalog=[],chosen=[],tray=null,modal=null,notice=null,gridObserver=null,detailObserver=null;
  let timer=null;
  const byId=id=>d.getElementById(id);
  function el(tag,cls,txt){
    const n=d.createElement(tag);
    if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=txt;
    return n;
  }
  function isGood(p){
    return p && Number.isSafeInteger(Number(p.id)) && Number(p.id)>0 &&
      typeof p.name==="string" && p.name.trim() && p.active!==false;
  }
  function readSaved(){
    try{
      const v=JSON.parse(sessionStorage.getItem(storageKey)||"[]");
      if(!Array.isArray(v))return [];
      return [...new Set(v.map(Number).filter(x=>Number.isSafeInteger(x)&&x>0))].slice(0,max);
    }catch{return []}
  }
  function save(){
    try{sessionStorage.setItem(storageKey,JSON.stringify(chosen))}catch{}
  }
  function money(value){
    const n=Number(value);
    if(!Number.isFinite(n)||n<0)return "—";
    try{return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100)}
    catch{return (n/100).toFixed(2)+" ر.س"}
  }
  function getProduct(id){return catalog.find(p=>Number(p.id)===Number(id))}
  function announce(message){
    if(!notice){
      notice=el("div","v6-compare-announcement");
      notice.setAttribute("role","status");
      notice.setAttribute("aria-live","polite");
      d.body.append(notice);
    }
    notice.textContent=message;
    notice.classList.add("v6-show-notice");
    clearTimeout(timer);
    timer=setTimeout(()=>notice.classList.remove("v6-show-notice"),3300);
  }
  function toggle(id){
    id=Number(id);
    if(!getProduct(id))return;
    if(chosen.includes(id)){
      chosen=chosen.filter(x=>x!==id);
    }else if(chosen.length>=max){
      announce("تقدر تقارن 3 منتجات كحد أقصى. احذف واحدًا لإضافة غيره.");
      return;
    }else chosen.push(id);
    save();renderTray();updateButtons();
    if(modal && modal.open)renderModal();
  }
  function button(id){
    const n=el("button","v6-compare-toggle","＋ قارن");
    n.type="button";
    n.dataset.productId=String(id);
    n.setAttribute("aria-label","إضافة المنتج إلى المقارنة");
    n.setAttribute("aria-pressed",chosen.includes(Number(id))?"true":"false");
    n.addEventListener("click",ev=>{
      ev.stopPropagation();
      ev.preventDefault();
      toggle(id);
    });
    return n;
  }
  function updateButtons(){
    for(const b of d.querySelectorAll(".v6-compare-toggle")){
      const selected=chosen.includes(Number(b.dataset.productId));
      b.classList.toggle("v6-is-selected",selected);
      b.setAttribute("aria-pressed",String(selected));
      const label=selected?"✓ في المقارنة":"＋ قارن";
      if(b.textContent!==label)b.textContent=label;
    }
  }
  function image(p){
    const holder=el("div","v6-compare-image");
    const url=String(p.image_url||"");
    if(/^https:\/\/[^\s"'<>]+$/.test(url)||/^\/media\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(url)){
      const img=el("img");
      img.src=url;img.alt="صورة "+p.name;
      img.loading="lazy";img.decoding="async";
      img.addEventListener("error",()=>holder.replaceChildren(el("span","v6-image-blank","▣")),{once:true});
      holder.append(img);
    }else holder.append(el("span","v6-image-blank","▣"));
    return holder;
  }
  function ensureTray(){
    if(tray)return tray;
    tray=el("section","v6-compare-tray");
    tray.setAttribute("aria-label","المنتجات المحددة للمقارنة");
    tray.hidden=true;
    d.body.append(tray);
    return tray;
  }
  function renderTray(){
    const root=ensureTray();
    root.replaceChildren();
    const products=chosen.map(getProduct).filter(Boolean);
    if(products.length!==chosen.length){
      chosen=products.map(p=>Number(p.id));save();
    }
    root.hidden=products.length===0;
    if(!products.length)return;
    const caption=el("div","v6-tray-caption");
    caption.append(el("strong","","قارن منتجاتك"));
    caption.append(el("small","",products.length+" / 3 منتجات"));
    root.append(caption);
    const chips=el("div","v6-tray-chips");
    products.forEach(p=>{
      const chip=el("div","v6-tray-chip");
      chip.append(el("span","",p.name));
      const remove=el("button","v6-chip-remove","×");
      remove.type="button";remove.setAttribute("aria-label","إزالة "+p.name+" من المقارنة");
      remove.addEventListener("click",()=>toggle(p.id));
      chip.append(remove);chips.append(chip);
    });
    root.append(chips);
    const actions=el("div","v6-tray-actions");
    const show=el("button","v6-tray-open",products.length>=2?"عرض المقارنة ←":"أضف منتجًا ثانيًا");
    show.type="button";show.disabled=products.length<2;
    show.addEventListener("click",openModal);
    const clear=el("button","v6-tray-clear","مسح");
    clear.type="button";clear.addEventListener("click",()=>{
      chosen=[];save();renderTray();updateButtons();
      if(modal&&modal.open)modal.close();
    });
    actions.append(clear,show);root.append(actions);
  }
  function value(p,key){
    switch(key){
      case "السعر":return money(p.price_halalas);
      case "التوفر":return Number(p.stock)>0?"متوفر":"غير متوفر";
      case "الفئة":return p.category||"غير محددة";
      case "رمز المنتج":return p.sku||"—";
      case "الوزن":return Number(p.weight_grams)>0?Number(p.weight_grams)+" جرام":"—";
      case "الوصف":return (p.description||"لم يتوفر وصف مختصر").slice(0,280);
      default:return "—";
    }
  }
  function cell(content,head){
    const t=el(head?"th":"td");
    if(head)t.scope="row";
    if(typeof content==="string")t.textContent=content;
    else if(content)t.append(content);
    return t;
  }
  function renderModal(){
    if(!modal)return;
    const products=chosen.map(getProduct).filter(Boolean);
    if(products.length<2){
      if(modal.open)modal.close();
      return;
    }
    const content=modal.querySelector(".v6-compare-content");
    if(!content)return;
    content.replaceChildren();
    const scroller=el("div","v6-table-scroll");
    scroller.tabIndex=0;scroller.setAttribute("aria-label","جدول المقارنة، اسحب أفقيًا لمشاهدة الأعمدة");
    const table=el("table","v6-compare-table");
    const thead=el("thead"),tr=el("tr");
    const head=el("th","","المواصفات");head.scope="col";
    tr.append(head);
    products.forEach(p=>{
      const th=el("th");
      th.scope="col";
      th.append(image(p),el("strong","v6-product-name",p.name));
      const details=el("a","v6-product-link","تفاصيل المنتج ↗");
      details.href="/?item="+encodeURIComponent(String(p.id));
      th.append(details);
      tr.append(th);
    });
    thead.append(tr);table.append(thead);
    const tbody=el("tbody");
    for(const field of ["السعر","التوفر","الفئة","رمز المنتج","الوزن","الوصف"]){
      const row=el("tr");
      row.append(cell(field,true));
      products.forEach(p=>row.append(cell(String(value(p,field)),false)));
      tbody.append(row);
    }
    table.append(tbody);scroller.append(table);content.append(scroller);
    const foot=el("div","v6-modal-foot");
    foot.append(el("small","","المقارنة حسب البيانات الموجودة في المتجر، وتختلف الأسعار والمخزون حسب التحديثات."));
    content.append(foot);
  }
  function openModal(){
    if(chosen.length<2){announce("اختر منتجين على الأقل لبدء المقارنة");return}
    if(!modal){
      modal=el("dialog","v6-compare-modal");
      modal.setAttribute("aria-label","مقارنة منتجات BLOFYSAT");
      const head=el("div","v6-modal-head");
      const labels=el("div");
      labels.append(el("small","","BLOFYSAT / SMART COMPARISON"));
      labels.append(el("h2","","مقارنة المنتجات"));
      head.append(labels);
      const close=el("button","v6-modal-close","إغلاق ×");
      close.type="button";close.addEventListener("click",()=>modal.close());
      head.append(close);modal.append(head);
      modal.append(el("div","v6-compare-content"));
      modal.addEventListener("click",event=>{
        if(event.target===modal)modal.close();
      });
      d.body.append(modal);
    }
    renderModal();
    if(typeof modal.showModal==="function"){
      if(!modal.open)modal.showModal();
    }else{
      announce("عرض المقارنة غير مدعوم في هذا المتصفح");
    }
  }
  function fromCard(card){
    const id=Number(card.dataset.productId||card.dataset.id||"0");
    if(id&&getProduct(id))return id;
    const heading=card.querySelector("h3,h4");
    if(!heading)return null;
    const name=heading.textContent.trim();
    const p=catalog.find(x=>x.name.trim()===name);
    return p?Number(p.id):null;
  }
  function bindGrid(){
    const root=byId("productlist");
    if(!root)return;
    const update=()=>{
      if(!catalog.length)return;
      for(const card of root.children){
        if(!card||card.nodeType!==1||card.querySelector(".v6-compare-toggle"))continue;
        const id=fromCard(card);
        if(!id)continue;
        card.append(button(id));
      }
      updateButtons();
    };
    if(!gridObserver){
      let queued=false;
      gridObserver=new MutationObserver(()=>{
        if(queued)return;queued=true;
        setTimeout(()=>{queued=false;update()},75);
      });
      gridObserver.observe(root,{childList:true});
    }
    update();
  }
  function bindDetails(){
    const shell=d.querySelector(".v5-product-page-shell");
    if(!shell)return;
    const id=new URLSearchParams(location.search).get("item");
    const number=Number(id);
    if(!number||!getProduct(number))return;
    const add=()=>{
      const target=shell.querySelector(".v5-product-cta")||shell.querySelector(".v5-product-info");
      if(!target||target.querySelector(".v6-compare-toggle"))return;
      const b=button(number);
      b.classList.add("v6-detail-compare");
      target.append(b);
      updateButtons();
    };
    if(!detailObserver){
      let queued=false;
      detailObserver=new MutationObserver(()=>{
        if(queued)return;queued=true;
        setTimeout(()=>{queued=false;add()},75);
      });
      detailObserver.observe(shell,{childList:true,subtree:true});
    }
    add();
  }
  function discoveryNote(){
    if(catalog.length<2 || d.querySelector(".v6-compare-intro"))return;
    const grid=byId("productlist");
    if(!grid)return;
    const box=el("div","v6-compare-intro");
    const icon=el("span","v6-intro-icon","⇄");
    icon.setAttribute("aria-hidden","true");
    const copy=el("div","v6-intro-copy");
    copy.append(el("strong","","اختيارك صار أسهل مع المقارنة"));
    copy.append(el("small","","اضغط «قارن» في بطاقات المنتجات، واختر جهازين أو ثلاثة لمقارنة الأسعار والمواصفات والتوفر."));
    const action=el("button","v6-intro-action","كيف أقارن؟");
    action.type="button";
    action.addEventListener("click",()=>{
      const first=grid.querySelector(".v6-compare-toggle");
      if(first)first.focus({preventScroll:true});
      grid.scrollIntoView({behavior:"smooth",block:"center"});
      announce("اختر المنتجات بزر «قارن»، ثم اضغط «عرض المقارنة».");
    });
    box.append(icon,copy,action);
    grid.insertAdjacentElement("beforebegin",box);
  }
  function refreshCatalog(list){
    if(!Array.isArray(list))return;
    catalog=list.filter(isGood);
    chosen=chosen.filter(id=>Boolean(getProduct(id)));
    save();renderTray();bindGrid();bindDetails();discoveryNote();
  }
  function initialize(){
    if(!d.body.classList.contains("zid-store"))return;
    chosen=readSaved();
    try{
      const old=JSON.parse(sessionStorage.getItem(catalogCache)||"{}");
      if(old&&Array.isArray(old.list)&&Date.now()-old.at<900000)refreshCatalog(old.list);
    }catch{}
    ensureTray();
    fetch("/api/products",{credentials:"same-origin",cache:"no-store"})
      .then(resp=>{if(!resp.ok)throw Error("catalog_http_"+resp.status);return resp.json()})
      .then(refreshCatalog)
      .catch(err=>console.warn("BLOFYSAT optional compare catalog unavailable",String(err?.message||err)));
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();


/* BLOFYSAT SIGNATURE V7 — guided shopping assistant, customer storefront only.
   Matching uses only real catalog categories, current prices and availability. */
(() => {
  "use strict";
  const doc=document;
  if(typeof document==="undefined")return;
  const id=x=>doc.getElementById(x);
  const make=(tag,cls,text)=>{
    const el=doc.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=String(text);
    return el;
  };
  const cacheKey="blofysat_products_cache_v5";
  let root=null,modal=null,products=[],currentStatus="not_loaded",lastLoadAt=0,pendingLoad=null;
  const safeImage=url=>typeof url==="string" &&
    (/^https:\/\/[^\s<>"']+$/i.test(url)||/^\/media\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(url));
  function cash(price){
    const number=Number(price);
    if(!Number.isSafeInteger(number)||number<0)return "السعر غير متوفر";
    try{return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2,maximumFractionDigits:2}).format(number/100)}
    catch{return (number/100).toFixed(2)+" ر.س"}
  }
  function validProduct(p){
    return p&&Number.isSafeInteger(Number(p.id))&&Number(p.id)>0&&typeof p.name==="string"&&p.name.trim()&&
      p.active!==false&&Number.isSafeInteger(Number(p.price_halalas))&&Number(p.price_halalas)>=0;
  }
  function image(p){
    const box=make("span","v7-product-photo");
    if(safeImage(p.image_url)){
      const img=make("img");
      img.src=p.image_url;img.alt="صورة "+p.name;
      img.loading="lazy";img.decoding="async";
      img.addEventListener("error",()=>{
        box.replaceChildren(make("span","v7-image-fallback","▣"));
      },{once:true});
      box.append(img);
    }else box.append(make("span","v7-image-fallback","▣"));
    return box;
  }
  function fromCache(){
    try{
      const cached=JSON.parse(sessionStorage.getItem(cacheKey)||"{}");
      if(!cached||!Array.isArray(cached.list)||Date.now()-cached.at>900000)return [];
      return cached.list.filter(validProduct);
    }catch{return []}
  }
  async function loadCatalog(force=false){
    if(!force&&products.length&&Date.now()-lastLoadAt<120000)return products;
    if(pendingLoad)return pendingLoad;
    pendingLoad=(async()=>{
      const timeout=new AbortController();
      const t=setTimeout(()=>timeout.abort(),10500);
      try{
        const res=await fetch("/api/products",{credentials:"same-origin",cache:"no-store",signal:timeout.signal});
        if(!res.ok)throw Error("catalog_http_"+res.status);
        const data=await res.json();
        if(!Array.isArray(data))throw Error("catalog_not_array");
        products=data.filter(validProduct);
        lastLoadAt=Date.now();currentStatus="live";
        try{sessionStorage.setItem(cacheKey,JSON.stringify({at:lastLoadAt,list:products.slice(0,200)}))}catch{}
        return products;
      }catch(ex){
        const old=fromCache();
        if(old.length){products=old;lastLoadAt=Date.now();currentStatus="cached";return products}
        currentStatus="unavailable";throw ex;
      }finally{clearTimeout(t);pendingLoad=null}
    })();
    return pendingLoad;
  }
  function mount(){
    if(!doc.body.classList.contains("zid-store"))return;
    const target=doc.querySelector("body.zid-store .shoptools");
    if(!target||doc.querySelector(".v7-assistant-feature"))return;
    root=make("section","v7-assistant-feature");
    root.id="smart-chooser";
    root.setAttribute("aria-label","مساعد اختيار الأجهزة");
    const art=make("div","v7-feature-art");
    const star=make("span","v7-feature-icon","✦");star.setAttribute("aria-hidden","true");
    art.append(star,make("span","v7-art-orbit","BLOFYSAT"));
    const copy=make("div","v7-feature-content");
    copy.append(make("span","v7-feature-eyebrow","BLOFYSAT / SMART SHOPPING"),
      make("h2","","مو متأكد أي جهاز يناسبك؟"),
      make("p","","اختر القسم والميزانية، ونرتب لك الخيارات من المنتجات الموجودة فعلًا في المتجر."));
    const btn=make("button","v7-feature-button","ساعدني أختار ←");
    btn.type="button";
    btn.addEventListener("click",open);
    const body=make("div","v7-feature-body");
    body.append(copy,btn);
    root.append(art,body);
    target.insertAdjacentElement("beforebegin",root);
  }
  function chooserDialog(){
    if(modal)return modal;
    const dlg=make("dialog","v7-chooser-dialog");
    dlg.setAttribute("aria-label","مساعد اختيار منتجات BLOFYSAT");
    const top=make("div","v7-dialog-header");
    const text=make("div");
    text.append(make("span","v7-dialog-eyebrow","BLOFYSAT / DISCOVER"),
      make("h2","","نختار لك من المنتجات المتاحة"));
    const close=make("button","v7-dialog-close","إغلاق ×");
    close.type="button";close.addEventListener("click",()=>dlg.close());
    top.append(text,close);
    const filters=make("form","v7-chooser-filters");
    filters.id="v7-chooser-form";
    filters.addEventListener("submit",e=>{e.preventDefault();showResults()});
    const categoryLabel=make("label","v7-chooser-field");
    categoryLabel.append(make("span","","القسم"));
    const category=make("select");
    category.id="v7-category-select";category.name="category";
    categoryLabel.append(category);
    const budgetLabel=make("label","v7-chooser-field");
    budgetLabel.append(make("span","","ميزانيتك"));
    const budget=make("select");
    budget.id="v7-budget-select";budget.name="budget";
    budgetLabel.append(budget);
    const stockLabel=make("label","v7-chooser-checkbox");
    const stock=make("input");stock.type="checkbox";stock.checked=true;
    stock.id="v7-stock-only";
    stockLabel.append(stock,make("span","","المتوفر فقط"));
    const filterBtn=make("button","v7-show-results","اعرض الخيارات ←");
    filterBtn.type="submit";
    filters.append(categoryLabel,budgetLabel,stockLabel,filterBtn);
    const feedback=make("div","v7-chooser-feedback");
    feedback.setAttribute("role","status");feedback.setAttribute("aria-live","polite");
    const result=make("div","v7-chooser-results");
    result.id="v7-chooser-results";
    dlg.append(top,filters,feedback,result);
    dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});
    doc.body.append(dlg);
    modal=dlg;
    return dlg;
  }
  function option(label,value){
    const e=make("option","",label);e.value=String(value);return e;
  }
  function setupChoices(){
    const cats=id("v7-category-select"),budgets=id("v7-budget-select");
    if(!cats||!budgets)return;
    const selected=cats.value;
    const unique=[...new Set(products.map(p=>String(p.category||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ar"));
    cats.replaceChildren(option("جميع المنتجات","all"),...unique.map(x=>option(x,x)));
    if(unique.includes(selected))cats.value=selected;
    const currentBudget=budgets.value;
    const arr=[...new Set(products.map(p=>Number(p.price_halalas)).filter(x=>Number.isFinite(x)&&x>=0))].sort((a,b)=>a-b);
    const thresholds=[];
    for(const q of [.25,.5,.75]){
      if(!arr.length)break;
      const i=Math.min(arr.length-1,Math.floor((arr.length-1)*q));
      const rounded=Math.ceil(arr[i]/1000)*1000;
      if(rounded>0&&!thresholds.includes(rounded))thresholds.push(rounded);
    }
    budgets.replaceChildren(option("بدون حد أقصى","all"),...thresholds.sort((a,b)=>a-b).map(x=>option("حتى "+cash(x),x)));
    if(thresholds.some(x=>String(x)===currentBudget))budgets.value=currentBudget;
    feedback();
  }
  function feedback(){
    const label=modal?.querySelector(".v7-chooser-feedback");
    if(!label)return;
    const msg=currentStatus==="cached"
       ?"النتائج من بيانات محفوظة مؤقتًا؛ تأكد من الأسعار والتوفر داخل صفحة المنتج."
       :currentStatus==="unavailable"?"تعذر جلب المنتجات؛ تأكد من الاتصال وأعد المحاولة."
       :"المقترحات تعتمد على أسعار وأقسام ومخزون المنتجات المسجلة حاليًا.";
    label.textContent=msg;
    label.classList.toggle("v7-data-stale",currentStatus!=="live");
  }
  function productCard(p){
    const a=make("a","v7-option-card");
    a.href="/?item="+encodeURIComponent(String(p.id));
    a.append(image(p));
    const body=make("span","v7-option-body");
    body.append(make("small","v7-option-category",p.category||"منتج"));
    body.append(make("strong","v7-option-title",p.name));
    body.append(make("b","v7-option-price",cash(p.price_halalas)));
    body.append(make("span",Number(p.stock)>0?"v7-option-stock":"v7-option-stock v7-out-of-stock",
      Number(p.stock)>0?"● متوفر":"● غير متوفر"));
    body.append(make("span","v7-option-link","تفاصيل المنتج ←"));
    a.append(body);
    return a;
  }
  function showResults(){
    const results=id("v7-chooser-results");
    if(!results)return;
    results.replaceChildren();
    if(!products.length){
      results.append(make("div","v7-no-results","ما فيه منتجات منشورة للعرض حاليًا."));
      return;
    }
    const cat=id("v7-category-select")?.value||"all";
    const budget=id("v7-budget-select")?.value||"all";
    const available=id("v7-stock-only")?.checked!==false;
    const budgetVal=budget==="all"?Infinity:Number(budget);
    const filtered=products
      .filter(p=>cat==="all"||String(p.category||"")===cat)
      .filter(p=>!available||Number(p.stock)>0)
      .filter(p=>Number(p.price_halalas)<=budgetVal)
      .sort((a,b)=>{
        const availability=Number(b.stock>0)-Number(a.stock>0);
        return availability||Number(a.price_halalas)-Number(b.price_halalas)||Number(b.id)-Number(a.id);
      });
    const heading=make("div","v7-results-heading");
    heading.append(make("strong","",filtered.length?"خيارات من المتجر":"ما حصلنا منتج مطابق"));
    heading.append(make("small","",filtered.length+" منتج مطابق"));
    results.append(heading);
    if(!filtered.length){
      results.append(make("p","v7-no-results","جرّب رفع الميزانية أو إلغاء خيار «المتوفر فقط» لإظهار خيارات إضافية."));
      return;
    }
    const grid=make("div","v7-results-grid");
    filtered.slice(0,6).forEach(p=>grid.append(productCard(p)));
    results.append(grid);
    if(filtered.length>6)results.append(make("p","v7-more-results","عرضنا 6 خيارات. بإمكانك استعراض بقية المنتجات من المتجر."));
  }
  async function open(){
    const dlg=chooserDialog();
    if(typeof dlg.showModal==="function"){
      if(!dlg.open)dlg.showModal();
    }else dlg.setAttribute("open","");
    const label=dlg.querySelector(".v7-chooser-feedback");
    if(label)label.textContent="جاري فحص المنتجات المتاحة…";
    try{
      await loadCatalog();
      if(!dlg.open)return;
      setupChoices();showResults();
    }catch(err){
      if(label)label.textContent="تعذر عرض المنتجات الآن. جرّب إعادة المحاولة.";
      const result=id("v7-chooser-results");
      if(result){
        result.replaceChildren();
        const retry=make("button","v7-show-results","إعادة المحاولة");
        retry.type="button";retry.addEventListener("click",()=>{pendingLoad=null;open()});
        result.append(retry);
      }
      console.warn("BLOFYSAT chooser optional catalog error",String(err&&err.message||err));
    }
  }
  function init(){
    try{mount()}catch(err){console.warn("BLOFYSAT optional chooser unavailable",String(err&&err.message||err))}
  }
  if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();


/* BLOFYSAT SIGNATURE V8: cart and checkout experience, customer-facing only.
   Does not change purchase/payment logic or write customer data. */
(() => {
 "use strict";
 const d=document;
 const get=id=>d.getElementById(id);
 const tag=(name,cls,text)=>{
   const n=d.createElement(name);
   if(cls)n.className=cls;
   if(text!==undefined)n.textContent=String(text);
   return n;
 };
 let ready=null,loadPromise=null,products=null,updateTask=0;
 function currency(halalas){
   const n=Number(halalas);
   if(!Number.isSafeInteger(n)||n<0)return "السعر غير متوفر";
   try{return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100)}
   catch{return (n/100).toFixed(2)+" ر.س"}
 }
 function progress(active){
   const list=tag("ol","v8-progress");
   list.setAttribute("aria-label","خطوات الطلب");
   ["السلة","بيانات التوصيل","مراجعة الدفع"].forEach((label,i)=>{
     const li=tag("li",i===active?"v8-progress-current":i<active?"v8-progress-past":"v8-progress-upcoming");
     if(i===active)li.setAttribute("aria-current","step");
     li.append(tag("b","",i<active?"✓":String(i+1)),tag("span","",label));
     list.append(li);
   });
   return list;
 }
 function statusMessage(){
   const n=tag("p","v8-readiness");
   n.setAttribute("role","status");
   if(ready===false){
     n.classList.add("v8-readiness-pending");
     n.textContent="الشراء والدفع الإلكتروني غير متاحين حاليًا حتى اكتمال التجهيز. تستطيع تصفح المنتجات ومراجعة السياسات.";
   }else if(ready===true){
     n.textContent="تظهر التفاصيل النهائية للسعر والشحن قبل تأكيد الدفع.";
   }else{
     n.textContent="الأسعار والشحن النهائيان يتحددان عند إتمام الطلب.";
   }
   return n;
 }
 function policies(){
   const links=tag("div","v8-policy-links");
   for(const [label,url] of [
     ["الشحن والتوصيل","/policies/shipping"],
     ["الاستبدال والاسترجاع","/policies/returns"],
     ["الخصوصية","/policies/privacy"]]){
     const a=tag("a","",label);
     a.href=url;a.target="_blank";a.rel="noopener noreferrer";links.append(a);
   }
   return links;
 }
 function cartCount(){
   const raw=String(get("cartcount")?.textContent||"").trim();
   const count=Number(raw.replace(/[^\d]/g,""));
   return Number.isSafeInteger(count)&&count>0?count:0;
 }
 function cartUI(){
   const cart=get("cart");if(!cart||cart.hidden)return;
   let region=cart.querySelector(".v8-cart-journey");
   if(!region){
     region=tag("section","v8-cart-journey");
     region.setAttribute("aria-label","مراحل التسوق");
     region.append(tag("small","v8-cart-label","BLOFYSAT / YOUR CART"),progress(0));
     const holder=tag("div","v8-cart-readiness");
     region.append(holder);
     const head=cart.querySelector(".row");
     if(head)head.insertAdjacentElement("afterend",region);
     else cart.prepend(region);
   }
   const message=region.querySelector(".v8-cart-readiness");
   if(message)message.replaceChildren(statusMessage());
   const footer=cart.querySelector(".cart-footer");
   if(footer&&!footer.querySelector(".v8-cart-policy-block")){
     const panel=tag("div","v8-cart-policy-block");
     panel.append(tag("strong","","راجع سياسات المتجر قبل الطلب"),policies());
     footer.append(panel);
   }
   let badge=cart.querySelector(".v8-cart-badge");
   if(!badge){
     badge=tag("span","v8-cart-badge");
     cart.querySelector(".row h2")?.append(badge);
   }
   if(badge)badge.textContent=cartCount()?" · "+cartCount()+" منتجات":"";
   let discover=cart.querySelector(".v8-cart-discovery");
   if(!discover&&cartCount()>0)discover=recommendations();
   if(discover)discover.hidden=cartCount()===0;
 }
 function checkoutUI(){
   const modal=get("checkoutmodal");
   const inner=modal?.querySelector(".modal-inner");
   if(!inner)return;
   let region=inner.querySelector(".v8-checkout-journey");
   if(!region){
     region=tag("section","v8-checkout-journey");
     region.setAttribute("aria-label","خطوات إتمام الطلب");
     region.append(tag("small","v8-cart-label","BLOFYSAT / CHECKOUT"),progress(1));
     const holder=tag("div","v8-checkout-readiness");
     region.append(holder);
     const title=inner.querySelector(".row");
     if(title)title.insertAdjacentElement("afterend",region);
     else inner.prepend(region);
   }
   const message=region.querySelector(".v8-checkout-readiness");
   if(message)message.replaceChildren(statusMessage());
   const form=get("orderform");
   if(form){
     const attrs={customer_name:"name",phone:"tel",email:"email",city:"address-level2",address:"street-address"};
     for(const name in attrs){
       const input=form.querySelector('[name="'+name+'"]');
       if(input&&!input.hasAttribute("autocomplete"))input.setAttribute("autocomplete",attrs[name]);
     }
     form.querySelector('[name="phone"]')?.setAttribute("inputmode","tel");
   }
 }
 function image(p){
   const box=tag("span","v8-recommend-image");
   const url=String(p.image_url||"");
   if(/^https:\/\/[^\s"'<>]+$/.test(url)||/^\/media\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(url)){
     const img=tag("img");img.src=url;img.alt="صورة "+p.name;img.loading="lazy";img.decoding="async";
     img.addEventListener("error",()=>box.replaceChildren(tag("span","v8-image-fallback","▣")),{once:true});
     box.append(img);
   }else box.append(tag("span","v8-image-fallback","▣"));
   return box;
 }
 function valid(p){
   return p&&Number.isSafeInteger(Number(p.id))&&Number(p.id)>0&&p.active!==false&&
     Number(p.stock)>0&&typeof p.name==="string"&&p.name.trim()&&
     Number.isSafeInteger(Number(p.price_halalas))&&Number(p.price_halalas)>=0;
 }
 async function getCatalog(){
   if(products)return products;
   if(loadPromise)return loadPromise;
   try{
     const cached=JSON.parse(sessionStorage.getItem("blofysat_products_cache_v5")||"{}");
     if(Array.isArray(cached.list)&&Date.now()-cached.at<900000){
       products=cached.list.filter(valid);
       return products;
     }
   }catch{}
   loadPromise=(async()=>{
     const controller=new AbortController();
     const timer=setTimeout(()=>controller.abort(),8000);
     try{
       const response=await fetch("/api/products",{credentials:"same-origin",signal:controller.signal});
       if(!response.ok)throw Error("catalog_http_"+response.status);
       const data=await response.json();
       products=Array.isArray(data)?data.filter(valid):[];
       return products;
     }finally{clearTimeout(timer);loadPromise=null}
   })();
   return loadPromise;
 }
 function recommendations(){
   const cart=get("cart");
   if(!cart)return null;
   const pane=tag("details","v8-cart-discovery");
   pane.append(tag("summary","","اكتشف منتجات أخرى من المتجر"));
   const items=tag("div","v8-cart-other-products");
   items.append(tag("p","v8-recommend-muted","جاري تحميل الخيارات…"));
   pane.append(items);
   const footer=cart.querySelector(".cart-footer");
   if(footer)cart.insertBefore(pane,footer);
   else cart.append(pane);
   (async()=>{
     try{
       const list=await getCatalog();
       if(!pane.isConnected)return;
       items.replaceChildren();
       const existing=String(get("cartitems")?.textContent||"");
       const options=list.filter(p=>!existing.includes(p.name)).slice(0,3);
       for(const p of options){
         const a=tag("a","v8-recommend-card");
         a.href="/?item="+encodeURIComponent(String(p.id));
         const copy=tag("span","v8-recommend-copy");
         copy.append(tag("strong","",p.name),tag("small","",currency(p.price_halalas)));
         a.append(image(p),copy,tag("b","v8-recommend-arrow","←"));
         items.append(a);
       }
       if(!options.length)items.append(tag("p","v8-recommend-muted","لا توجد منتجات أخرى متوفرة حاليًا."));
       else items.append(tag("small","v8-recommend-note","مقترحات من المنتجات المتوفرة، وليست إضافات تلقائية إلى السلة."));
     }catch{
       items.replaceChildren(tag("p","v8-recommend-muted","تعذر جلب منتجات إضافية، وسلتك الحالية لم تتغير."));
     }
   })();
   return pane;
 }
 function refresh(){
   if(!d.body.classList.contains("zid-store"))return;
   checkoutUI();
   cartUI();
 }
 function readConfig(){
   fetch("/api/config",{credentials:"same-origin",cache:"no-store"})
     .then(r=>r.ok?r.json():Promise.reject(Error("unavailable")))
     .then(c=>{ready=c.checkout_enabled===true;refresh()})
     .catch(()=>{ready=null;refresh()});
 }
 function init(){
   if(!d.body.classList.contains("zid-store"))return;
   const cart=get("cart"),modal=get("checkoutmodal");
   if(!cart||!modal)return;
   checkoutUI();
   const observer=new MutationObserver(()=>{
     if(updateTask)return;
     updateTask=setTimeout(()=>{updateTask=0;refresh()},75);
   });
   observer.observe(cart,{attributes:true,attributeFilter:["hidden"]});
   observer.observe(modal,{attributes:true,attributeFilter:["hidden"]});
   const rows=get("cartitems");
   if(rows)observer.observe(rows,{childList:true});
   const badge=get("cartcount");
   if(badge)observer.observe(badge,{childList:true,characterData:true,subtree:true});
   get("cartopen")?.addEventListener("click",()=>setTimeout(refresh,100));
   readConfig();
   refresh();
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();


/* BLOFYSAT SIGNATURE V9 — fast searchable product suggestions and verified
   description-derived specs. Display-only; never modifies checkout, admin,
   stock, product information or orders. */
(() => {
 "use strict";
 const doc=document;
 const get=id=>doc.getElementById(id);
 const create=(tag,cls,value)=>{
   const el=doc.createElement(tag);
   if(cls)el.className=cls;
   if(value!==undefined)el.textContent=String(value);
   return el;
 };
 const cacheKey="blofysat_products_cache_v5";
 let catalog=[],lastCatalog=0,pending=null;
 function valid(p){
   return p&&Number.isSafeInteger(Number(p.id))&&Number(p.id)>0&&
     typeof p.name==="string"&&p.name.trim()&&p.active!==false;
 }
 function fromCache(){
   try{
     const cache=JSON.parse(sessionStorage.getItem(cacheKey)||"{}");
     if(cache&&Array.isArray(cache.list)&&Date.now()-cache.at<900000)
       return cache.list.filter(valid);
   }catch{}
   return [];
 }
 function cash(p){
   const amount=Number(p.price_halalas);
   if(!Number.isSafeInteger(amount)||amount<0)return "السعر غير متوفر";
   try{return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2,maximumFractionDigits:2}).format(amount/100)}
   catch{return (amount/100).toFixed(2)+" ر.س"}
 }
 function normalize(text){
   return String(text||"").toLowerCase()
     .replace(/[\u064b-\u065f\u0670]/g,"")
     .replace(/[أإآٱ]/g,"ا")
     .replace(/ى/g,"ي")
     .replace(/ة/g,"ه")
     .replace(/\s+/g," ").trim();
 }
 async function load(){
   if(catalog.length&&Date.now()-lastCatalog<120000)return catalog;
   if(pending)return pending;
   const old=fromCache();
   if(old.length&&!catalog.length){catalog=old;lastCatalog=Date.now()-120000}
   pending=(async()=>{
     const controller=typeof AbortController!=="undefined"?new AbortController():null;
     const timeout=controller?setTimeout(()=>controller.abort(),9000):null;
     try{
       const response=await fetch("/api/products",{
         credentials:"same-origin",cache:"no-store",...(controller?{signal:controller.signal}:{})
       });
       if(!response.ok)throw Error("catalog_http_"+response.status);
       const data=await response.json();
       if(!Array.isArray(data))throw Error("catalog_invalid");
       catalog=data.filter(valid);
       lastCatalog=Date.now();
       try{sessionStorage.setItem(cacheKey,JSON.stringify({at:lastCatalog,list:catalog.slice(0,200)}))}catch{}
       return catalog;
     }catch(err){
       if(catalog.length)return catalog;
       throw err;
     }finally{
       if(timeout)clearTimeout(timeout);
       pending=null;
     }
   })();
   return pending;
 }
 function initAutocomplete(){
   const input=get("searchproducts"),wrap=input?.closest(".shopsearch");
   if(!input||!wrap||wrap.querySelector(".v9-suggestions"))return;
   const box=create("div","v9-suggestions");
   box.id="v9-suggestion-list";
   box.hidden=true;
   box.setAttribute("role","listbox");
   box.setAttribute("aria-label","اقتراحات المنتجات");
   wrap.append(box);
   input.setAttribute("aria-autocomplete","list");
   input.setAttribute("aria-controls",box.id);
   input.setAttribute("aria-expanded","false");
   input.setAttribute("autocomplete","off");
   let matches=[],selected=-1,debounce=0,lastQuery="",disposed=false;
   function hide(){
     box.hidden=true;selected=-1;
     input.setAttribute("aria-expanded","false");
     input.removeAttribute("aria-activedescendant");
   }
   function updateSelected(){
     const options=box.querySelectorAll('[role="option"]');
     options.forEach((n,i)=>{
       const active=i===selected;
       n.classList.toggle("v9-suggestion-selected",active);
       n.setAttribute("aria-selected",String(active));
     });
     if(options[selected])input.setAttribute("aria-activedescendant",options[selected].id);
     else input.removeAttribute("aria-activedescendant");
   }
   function paint(){
     const text=input.value.trim();
     const q=normalize(text);
     lastQuery=text;
     if(q.length<2){hide();box.replaceChildren();return}
     matches=catalog.filter(p=>{
       const phrase=normalize(p.name+" "+(p.sku||"")+" "+(p.category||""));
       return phrase.includes(q);
     }).sort((a,b)=>{
       const aName=normalize(a.name),bName=normalize(b.name);
       const starts=Number(bName.startsWith(q))-Number(aName.startsWith(q));
       const stock=(Number(b.stock)>0)-(Number(a.stock)>0);
       return starts||stock||Number(b.id)-Number(a.id);
     }).slice(0,7);
     box.replaceChildren();
     const label=create("div","v9-suggest-header",matches.length?"نتائج سريعة من المتجر":"ما لقينا نتيجة مطابقة");
     box.append(label);
     if(!matches.length){
       box.append(create("p","v9-suggest-empty","جرّب اسمًا آخر أو تصفّح الأقسام."));
     }else{
       matches.forEach((p,i)=>{
         const a=create("a","v9-suggest-option");
         a.href="/?item="+encodeURIComponent(String(p.id));
         a.id="v9-product-option-"+i;
         a.setAttribute("role","option");
         a.setAttribute("aria-selected","false");
         const media=create("span","v9-suggest-image");
         const url=String(p.image_url||"");
         if(/^https:\/\/[^\s"'<>]+$/.test(url)||/^\/media\/[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(url)){
           const img=create("img");
           img.src=url;img.alt="";img.loading="lazy";img.decoding="async";
           img.addEventListener("error",()=>media.replaceChildren(create("span","v9-suggest-placeholder","▣")),{once:true});
           media.append(img);
         }else media.append(create("span","v9-suggest-placeholder","▣"));
         const content=create("span","v9-suggest-copy");
         content.append(create("strong","",p.name),
           create("small","",p.category||"منتج"));
         const info=create("span","v9-suggest-meta");
         info.append(create("b","",cash(p)),
           create("small",Number(p.stock)>0?"متوفر":"غير متوفر"));
         a.append(media,content,info);
         a.addEventListener("pointerdown",e=>e.stopPropagation());
         box.append(a);
       });
     }
     box.hidden=false;selected=-1;
     input.setAttribute("aria-expanded","true");
   }
   function onInput(){
     const text=input.value.trim();
     clearTimeout(debounce);
     if(text.length<2){hide();return}
     debounce=setTimeout(()=>{
       if(disposed)return;
       paint();
       if(!catalog.length)load().then(()=>{if(lastQuery===input.value.trim())paint()}).catch(()=>{});
       else if(Date.now()-lastCatalog>=120000)
         load().then(()=>{if(lastQuery===input.value.trim())paint()}).catch(()=>{});
     },130);
   }
   input.addEventListener("input",onInput);
   input.addEventListener("focus",()=>{if(input.value.trim().length>=2)onInput()});
   input.addEventListener("keydown",e=>{
     if(box.hidden)return;
     if(e.key==="Escape"){hide();return}
     if(!matches.length)return;
     if(e.key==="ArrowDown"||e.key==="ArrowUp"){
       e.preventDefault();
       selected=e.key==="ArrowDown"?(selected+1)%matches.length:
         (selected<0?matches.length-1:(selected-1+matches.length)%matches.length);
       updateSelected();
     }else if(e.key==="Enter"&&selected>=0){
       e.preventDefault();
       const target=box.querySelector("#v9-product-option-"+selected);
       if(target)window.location.assign(target.href);
     }
   });
   doc.addEventListener("pointerdown",e=>{
     if(!wrap.contains(e.target))hide();
   });
   const clear=wrap.querySelector(".v4-search-clear");
   clear?.addEventListener("click",hide);
   // Paint immediately from prior valid catalog to avoid waiting for the network.
   catalog=fromCache();lastCatalog=0;
 }
 function parseTechDescription(){
   const root=doc.querySelector("body.zid-store.v5-product-page .v5-product-page-shell");
   if(!root||root.querySelector(".v9-extracted-specs"))return;
   const desc=root.querySelector(".v5-description-copy");
   if(!desc)return;
   const specs=[];
   const common=new Set(["الاسم","الفئة","السعر","حالة التوفر","حالة المخزون","رمز المنتج","الوزن"]);
   const lines=Array.from(desc.querySelectorAll("p")).map(n=>n.textContent.trim());
   for(const line of lines){
     if(specs.length>=12)break;
     const m=line.match(/^([^:：\n]{2,46})\s*[:：]\s*(.{1,220})$/);
     if(!m)continue;
     const k=m[1].trim(),v=m[2].trim();
     if(!k||!v||common.has(k)||/^(?:صور?\s*المنتج|صور?\s*إضافية|gallery|صور?\s*\d+|images?|image\s*\d*)$/i.test(k)||specs.some(s=>s[0]===k))continue;
     specs.push([k,v]);
   }
   if(!specs.length)return;
   const section=create("section","v9-extracted-specs");
   section.setAttribute("aria-label","المواصفات المذكورة في وصف المنتج");
   section.append(create("span","v5-section-label","PRODUCT / TECHNICAL DETAILS"),
     create("h2","","مواصفات إضافية"));
   section.append(create("p","v9-spec-note","البيانات التالية مستخرجة من وصف المنتج كما هو مسجل في المتجر."));
   const table=create("dl","v9-spec-grid");
   for(const [key,value] of specs){
     const row=create("div","v9-spec-line");
     row.append(create("dt","",key),create("dd","",value));
     table.append(row);
   }
   section.append(table);
   const description=root.querySelector(".v5-description");
   description?.insertAdjacentElement("afterend",section);
 }
 function addSharing(){
   const root=doc.querySelector("body.zid-store.v5-product-page .v5-product-page-shell");
   if(!root)return;
   const bar=root.querySelector(".v5-product-quicklinks");
   if(!bar||bar.querySelector(".v9-product-share"))return;
   const share=create("button","v9-product-share","مشاركة المنتج");
   share.type="button";
   share.setAttribute("aria-label","مشاركة رابط هذا المنتج");
   share.addEventListener("click",async()=>{
     const url=new URL(location.href);
     url.hash="";
     url.searchParams.delete("from");
     url.searchParams.delete("product");
     const data={title:doc.title,url:url.toString()};
     const old=share.textContent;
     try{
       if(navigator.share)await navigator.share(data);
       else if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(data.url);
       else throw Error("clipboard_unavailable");
       share.textContent=navigator.share?"تمت المشاركة ✓":"تم نسخ الرابط ✓";
     }catch(e){
       if(e&&e.name==="AbortError")return;
       share.textContent="انسخ الرابط من شريط العنوان";
     }
     setTimeout(()=>share.textContent=old,2600);
   });
   bar.insertBefore(share,bar.firstChild);
 }
 function productPage(){
   if(!doc.body.classList.contains("zid-store")||!new URLSearchParams(location.search).has("item"))return;
   const shell=doc.querySelector(".v5-product-page-shell");
   if(!shell)return;
   const enhance=()=>{try{addSharing();parseTechDescription()}catch(e){console.warn("BLOFYSAT product detail extras",String(e&&e.message||e))}};
   enhance();
   // Only observe direct detail layout replacement, not the controls we add.
   const observer=new MutationObserver(enhance);
   observer.observe(shell,{childList:true});
 }
 function init(){
   if(!doc.body.classList.contains("zid-store"))return;
   try{initAutocomplete()}catch(e){console.warn("BLOFYSAT suggestions optional",String(e&&e.message||e))}
   try{productPage()}catch(e){console.warn("BLOFYSAT detail extras optional",String(e&&e.message||e))}
 }
 if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();


/* BLOFYSAT SIGNATURE V10 — real multi-image gallery for product detail pages.
 * Extra images are displayed ONLY when the product description explicitly
 * contains approved image URLs. No fabricated images, no backend writes. */
(() => {
 "use strict";
 const d=document, key="blofysat_products_cache_v5";
 const q=sel=>d.querySelector(sel);
 const mk=(name,klass,content)=>{
   const el=d.createElement(name);
   if(klass)el.className=klass;
   if(content!==undefined)el.textContent=String(content);
   return el;
 };
 const isImg=url=>/^https:\/\/[^\s<>"']+\.(?:png|jpe?g|webp|avif)(?:\?[^\s<>"']*)?$/i.test(url)||
 /^\/media\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/i.test(url);
 const acceptedHeading=/^(?:(?:صور|صورة)\s*(?:المنتج|إضافية|اضافية|\d+)|gallery|images?|image\s*\d*)\s*[:：]?\s*$/i;
 const assigned=/^(?:صور|صورة)\s*(?:المنتج|إضافية|اضافية|\d+)\s*[:：]\s*(.+)$/i;
 function extractImages(p){
   const images=[];
   const add=url=>{
     url=String(url||"").trim().replace(/^["'(]+|[)"',،؛]+$/g,"");
     if(!isImg(url)||images.includes(url)||images.length>=8)return;
     images.push(url);
   };
   add(p.image_url);
   let section=false;
   const markedLines=new Set();
   for(const raw of String(p.description||"").split(/\r?\n/).slice(0,200)){
     const line=raw.trim();
     if(!line){section=false;continue}
     if(acceptedHeading.test(line)){
       section=true;markedLines.add(line);continue;
     }
     const direct=assigned.exec(line);
     if(direct){
       const urls=direct[1].match(/(?:https:\/\/[^\s,،؛<> "'()]+|\/media\/[0-9a-f-]{36}\.(?:png|jpg|webp))/gi)||[];
       if(urls.length){urls.forEach(add);markedLines.add(line)}
       section=false;continue;
     }
     if(section){
       const units=line.split(/[\s,،؛]+/).filter(Boolean);
       if(units.length&&units.every(isImg)){
         units.forEach(add);
         markedLines.add(line);
         continue;
       }
       section=false;
     }
   }
   return {images,markedLines};
 }
 function saved(){
   try{
     const cache=JSON.parse(sessionStorage.getItem(key)||"{}");
     if(cache&&Array.isArray(cache.list)&&Date.now()-cache.at<900000)return cache.list;
   }catch{}
   return [];
 }
 function findItem(id,arr){
   return arr.find(p=>p&&Number(p.id)===id&&p.active!==false);
 }
 const state={lastHost:null};
 async function fetchItem(id){
   const old=findItem(id,saved());
   if(old)return old;
   const ctrl=typeof AbortController==="function"?new AbortController():null;
   const timer=ctrl?setTimeout(()=>ctrl.abort(),9000):null;
   try{
     const response=await fetch("/api/products",{
       credentials:"same-origin",...(ctrl?{signal:ctrl.signal}:{})
     });
     if(!response.ok)throw Error("gallery_catalog_"+response.status);
     const list=await response.json();
     return Array.isArray(list)?findItem(id,list):null;
   }catch{
     return null;
   }finally{
     if(timer)clearTimeout(timer);
   }
 }
 function gallery(shell,product){
   const host=shell.querySelector(".v5-product-gallery");
   const picture=host?.querySelector(".v5-product-main-image");
   if(!host||!picture||host.querySelector(".v10-gallery-controls"))return;
   const {images,markedLines}=extractImages(product);
   if(!images.length)return;
   const title=shell.querySelector(".v5-product-name")?.textContent||product.name;
   const original=picture.querySelector("img");
   const primaryImage=original||mk("img");
   if(!original){
     picture.replaceChildren(primaryImage);
     picture.classList.remove("v5-empty-image");
     picture.setAttribute("aria-label","تكبير صورة المنتج");
     picture.setAttribute("role","button");
     picture.tabIndex=0;
     picture.classList.add("v5-clickable-image");
     const zoom=()=>{
       if(!primaryImage.complete||!primaryImage.naturalWidth)return;
       const dlg=mk("dialog","v5-product-lightbox");
       const close=mk("button","v5-lightbox-close","إغلاق ×");
       close.type="button";
       close.addEventListener("click",()=>dlg.close());
       const img=mk("img");img.src=primaryImage.currentSrc||primaryImage.src;img.alt=primaryImage.alt;
       dlg.append(close,img);
       dlg.addEventListener("close",()=>dlg.remove(),{once:true});
       dlg.addEventListener("click",ev=>{if(ev.target===dlg)dlg.close()});
       d.body.append(dlg);
       if(typeof dlg.showModal==="function")dlg.showModal();
       else{dlg.remove();window.open(img.src,"_blank","noopener,noreferrer")}
     };
     picture.addEventListener("click",zoom);
     picture.addEventListener("keydown",event=>{
       if(event.key==="Enter"||event.key===" "){event.preventDefault();zoom()}
     });
   }
   if(images.length>1){
     const holder=mk("div","v10-gallery-controls");
     holder.setAttribute("aria-label","صور المنتج");
     const bar=mk("div","v10-gallery-nav");
     const prev=mk("button","v10-gallery-arrow","‹");
     const next=mk("button","v10-gallery-arrow","›");
     prev.type=next.type="button";
     prev.setAttribute("aria-label","الصورة السابقة");
     next.setAttribute("aria-label","الصورة التالية");
     const count=mk("span","v10-gallery-count");
     count.setAttribute("aria-live","polite");
     bar.append(prev,count,next);
     const thumbs=mk("div","v10-gallery-thumbnails");
     thumbs.setAttribute("role","group");
     thumbs.setAttribute("aria-label","اختر صورة المنتج");
     const buttons=[];
     let current=0;
     const show=index=>{
       current=(index+images.length)%images.length;
       const url=images[current];
       primaryImage.src=url;
       primaryImage.alt="صورة "+(current+1)+" من "+images.length+" — "+title;
       primaryImage.decoding="async";
       count.textContent=(current+1)+" / "+images.length;
       buttons.forEach((b,i)=>{
         const active=i===current;
         b.classList.toggle("v10-thumb-active",active);
         b.setAttribute("aria-pressed",String(active));
       });
       const note=host.querySelector(".v5-gallery-note");
       if(note)note.textContent="صور المنتج المسجلة في بيانات المتجر • اضغط الصورة للتكبير";
     };
     images.forEach((src,index)=>{
       const button=mk("button","v10-gallery-thumb");
       button.type="button";
       button.setAttribute("aria-label","عرض الصورة "+(index+1));
       button.setAttribute("aria-pressed","false");
       const img=mk("img");img.src=src;img.alt="";img.loading="lazy";img.decoding="async";
       img.addEventListener("error",()=>{
         button.classList.add("v10-thumb-broken");
         button.disabled=true;
         button.setAttribute("aria-label","الصورة "+(index+1)+" غير متوفرة");
       },{once:true});
       button.append(img);
       button.addEventListener("click",()=>show(index));
       thumbs.append(button);buttons.push(button);
     });
     prev.addEventListener("click",()=>show(current-1));
     next.addEventListener("click",()=>show(current+1));
     picture.addEventListener("keydown",event=>{
       if(event.key==="ArrowRight"||event.key==="ArrowLeft"){
         event.preventDefault();
         show(current+(event.key==="ArrowLeft"?1:-1));
       }
     });
     holder.append(bar,thumbs);
     const oldNote=host.querySelector(".v5-gallery-note");
     if(oldNote)oldNote.insertAdjacentElement("beforebegin",holder);
     else host.append(holder);
     show(0);
   }else{
     primaryImage.src=images[0];
     primaryImage.alt="صورة المنتج — "+title;
   }
   // Only remove explicitly marked image manifest lines, not product specifications.
   if(markedLines.size){
     const lines=shell.querySelectorAll(".v5-description-copy p");
     lines.forEach(line=>{
       if(markedLines.has(line.textContent.trim()))line.remove();
     });
     const intro=shell.querySelector(".v5-product-excerpt");
     if(intro&&markedLines.has(intro.textContent.trim()))intro.remove();
   }
 }
 function sticky(shell){
   if(shell.querySelector(".v10-mobile-buybar"))return;
   const item=shell.querySelector(".v5-product-info");
   const original=item?.querySelector(".v5-product-cta a");
   const price=item?.querySelector(".v5-price");
   if(!item||!original||!price)return;
   const bar=mk("div","v10-mobile-buybar");
   bar.setAttribute("aria-label","شريط المنتج");
   const details=mk("div","v10-buybar-price");
   details.append(mk("small","","سعر المنتج"),mk("strong","",price.textContent.trim()));
   const button=mk("a","v10-buybar-action","عرضه في المتجر ←");
   button.href=original.href;
   bar.append(details,button);
   shell.append(bar);
 }
 function enhance(){
   const shell=q(".v5-product-page-shell");
   if(!shell)return;
   sticky(shell);
   const id=Number(new URLSearchParams(location.search).get("item"));
   if(!Number.isSafeInteger(id)||id<=0)return;
   const host=shell.querySelector(".v5-product-main-image");
   if(!host||host===state.lastHost)return;
   state.lastHost=host;
   fetchItem(id).then(p=>{
     if(!p)return;
     if(!shell.isConnected)return;
     gallery(shell,p);
   }).catch(err=>console.warn("BLOFYSAT optional gallery",String(err&&err.message||err)));
 }
 function init(){
   if(!d.body.classList.contains("zid-store")||
      !new URLSearchParams(location.search).has("item"))return;
   enhance();
   const shell=q(".v5-product-page-shell");
   if(!shell)return;
   const observer=new MutationObserver(enhance);
   observer.observe(shell,{childList:true});
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
