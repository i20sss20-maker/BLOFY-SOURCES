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
   try{
     const response=await fetch("/api/products",{credentials:"same-origin"});
     if(!response.ok)throw Error("catalog_unavailable");
     const list=await response.json();
     if(!Array.isArray(list))throw Error("invalid_catalog");
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
     retry.addEventListener("click",()=>{retry.remove();page()},{once:true});
     const back=make("a","v5-product-back","العودة للمتجر");back.href="/#products";
     section.append(retry,back);
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
