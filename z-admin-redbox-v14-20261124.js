/* BLOFYSAT V12 - Manual Redbox dispatch overview (admin-only).
   Data is retrieved only from the existing Basic-Auth-protected admin API.
   No shipment is created automatically. */
(() => {
 "use strict";
 const d=document;
 if(!d.body.classList.contains("admin"))return;
 const target=d.getElementById("orders");
 if(!target)return;
 const create=(tag,cls,text)=>{
   const n=d.createElement(tag);
   if(cls)n.className=cls;
   if(text!==undefined)n.textContent=String(text);
   return n;
 };
 const validMap=u=>/^https:\/\/(?:maps\.app\.goo\.gl\/|www\.google\.com\/maps\/|maps\.google\.com\/|goo\.gl\/maps\/)[^\s<>"']*$/i.test(String(u||""));
 const validPoint=u=>/^(?:https:\/\/(?:redboxsa\.com\/|www\.redboxsa\.com\/)[^\s<>"']*|https:\/\/(?:maps\.app\.goo\.gl\/|www\.google\.com\/maps\/|maps\.google\.com\/)[^\s<>"']*)$/i.test(String(u||""));
 const SAR=n=>{
  const v=Number(n);
  if(!Number.isFinite(v)||v<0)return "—";
  return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR"}).format(v/100);
 };
 const waPhone=raw=>{
  const digits=String(raw||"").replace(/\D/g,"");
  if(/^05\d{8}$/.test(digits))return "966"+digits.slice(1);
  if(/^5\d{8}$/.test(digits))return "966"+digits;
  if(/^9665\d{8}$/.test(digits))return digits;
  return "";
 };
 const manual=o=>["redbox_pickup","manual_home","manual_whatsapp"].includes(o.delivery_method)||o.status==="pending_confirmation";
 const pointLink="https://redboxsa.com/ar/collect/find-a-redbox-point/";
 const panel=create("section","v12-admin-shipping");
 panel.id="v12-admin-shipping";
 const head=create("div","v12-admin-shipping-header");
 const label=create("div");
 label.append(create("small","","BLOFYSAT / MANUAL REDBOX"),
  create("h2","","تجهيز شحنات ريدبوكس يدويًا"),
  create("p","","اختر طلب العميل، ثم افتح موقع النقطة وأصدر الشحنة بنفسك من تطبيق ريدبوكس. هذا القسم لا ينشئ شحنات تلقائيًا ولا يؤكد الدفع."));
 const refresh=create("button","smallbtn v12-admin-refresh","تحديث الطلبات");
 refresh.type="button";
 head.append(label,refresh);
 const status=create("p","v12-admin-status","جاري تحميل طلبات الشحن اليدوي…");
 status.setAttribute("role","status");
 const cards=create("div","v12-admin-shipping-list");
 panel.append(head,status,cards);
 target.parentElement.insertBefore(panel,target);
 const link=(name,url,cls)=>{
  const a=create("a",cls||"smallbtn",name);
  a.href=url;a.target="_blank";a.rel="noopener noreferrer";
  return a;
 };
 function meta(label,value){
  const row=create("div","v12-admin-row");
  row.append(create("strong","",label),create("span","",value||"—"));
  return row;
 }
 function renderOrder(o){
  const isRedbox=o.delivery_method==="redbox_pickup";
  const el=create("article","v12-admin-order");
  const header=create("div","v12-admin-order-title");
  const left=create("div");
  left.append(create("strong","",o.id||"رقم غير متوفر"),
   create("span","v12-admin-shipping-chip",isRedbox?"🔴 استلام ريدبوكس":o.delivery_method==="manual_home"?"🚚 توصيل للعنوان":"📦 طلب يدوي سابق"));
  const state=create("span","v12-admin-state",o.status==="pending_confirmation"?"بانتظار التأكيد":String(o.status||"غير معروف"));
  header.append(left,state);el.append(header);
  el.append(meta("اسم العميل",o.customer_name),meta("جوال العميل",o.phone),meta("المدينة",o.city));
  if(isRedbox)el.append(meta("نقطة ريدبوكس التي اختارها العميل",o.point_id));
  el.append(meta(isRedbox?"عنوان العميل / للتواصل":"عنوان التوصيل",o.address));
  const items=Array.isArray(o.items)?o.items:[];
  el.append(meta("المنتجات",items.map(i=>String(i.name||"منتج")+" × "+Number(i.qty||1)).join("، ")));
  el.append(meta("قيمة المنتجات بدون رسوم الشحن",SAR(o.subtotal_halalas)));
  const actions=create("div","v12-admin-actions");
  if(isRedbox){
   const chosen=String(o.redbox_point_url||"").trim();
   if(validPoint(chosen))actions.append(link("📍 موقع نقطة ريدبوكس المختارة",chosen));
   else{
     const search="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([o.point_id,o.city,"Redbox"].filter(Boolean).join(" "));
     actions.append(link("🔎 البحث عن النقطة في الخريطة",search));
   }
   actions.append(link("خريطة نقاط ريدبوكس الرسمية",pointLink));
  }
  const map=String(o.maps_url||"").trim();
  if(validMap(map))actions.append(link("📌 موقع العميل على Google Maps",map));
  else if(o.lat!=null&&o.lng!=null&&Number.isFinite(Number(o.lat))&&Number.isFinite(Number(o.lng))){
   const u="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(o.lat+","+o.lng);
   actions.append(link("📌 إحداثيات العميل على Google Maps",u));
  }else{
   const search="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([o.address,o.city].filter(Boolean).join(" "));
   actions.append(link("🔎 البحث عن عنوان العميل",search));
  }
  const whatsapp=waPhone(o.phone);
  if(whatsapp){
   const msg="مرحبًا، معك متجر BLOFYSAT بخصوص طلبك "+o.id+". نؤكد معك "+(isRedbox?"نقطة استلام ريدبوكس":"عنوان الشحن")+" وتكلفة التوصيل قبل إصدار الشحنة.";
   actions.append(link("💬 تواصل مع العميل عبر واتساب","https://wa.me/"+whatsapp+"?text="+encodeURIComponent(msg),"v12-admin-wa"));
  }
  el.append(actions);
  const shippingForm=create("form","v14-shipping-form");
  shippingForm.setAttribute("aria-label","تسجيل الشحن اليدوي للطلب "+o.id);
  const formTitle=create("strong","v14-ship-heading","تسجيل الشحنة من تطبيق ريدبوكس");
  const explainer=create("p","v14-ship-help","بعد إصدار الشحنة يدويًا في تطبيق ريدبوكس، أدخل رقم التتبع وحدّث حالتها هنا. هذا الإجراء لا يصدر شحنة ولا يؤكد استلام الدفع.");
  const inputs=create("div","v14-shipping-inputs");
  const statusField=create("label","v14-shipping-field");
  statusField.append(create("span","","حالة الشحنة"));
  const stateSelect=create("select","v14-shipping-select");
  stateSelect.name="shipping_status";
  const choices=[["ready_manual","بانتظار إصدار الشحنة"],["shipped_manual","تم إصدار الشحنة"],["delivered_manual","تم التسليم"]];
  for(const [value,label] of choices){
    const option=create("option","",label);option.value=value;
    stateSelect.append(option);
  }
  if(choices.some(([v])=>v===o.shipping_status))stateSelect.value=o.shipping_status;
  else stateSelect.value="ready_manual";
  statusField.append(stateSelect);
  const trackingField=create("label","v14-shipping-field");
  trackingField.append(create("span","","رقم التتبع من التطبيق"));
  const tracking=create("input","v14-shipping-tracking");
  tracking.name="tracking_number";
  tracking.type="text";
  tracking.maxLength=100;
  tracking.value=String(o.tracking_number||"");
  tracking.autocomplete="off";
  tracking.placeholder="اكتبه بعد إنشاء الشحنة";
  trackingField.append(tracking);
  const submit=create("button","v14-save-tracking","حفظ بيانات الشحنة");
  submit.type="submit";
  inputs.append(statusField,trackingField,submit);
  const message=create("span","v14-shipping-feedback","");
  message.setAttribute("role","status");
  shippingForm.append(formTitle,explainer,inputs,message);
  shippingForm.addEventListener("submit",async ev=>{
    ev.preventDefault();
    if(submit.disabled)return;
    const status=stateSelect.value,code=tracking.value.trim();
    if((status==="shipped_manual"||status==="delivered_manual")&&!code){
      message.textContent="أدخل رقم تتبع الشحنة أولًا.";return;
    }
    if(code&&!/^[a-zA-Z0-9\-_\/ ]{3,100}$/.test(code)){
      message.textContent="رقم التتبع يحتوي رموزًا غير مسموحة.";return;
    }
    submit.disabled=true;
    message.textContent="جاري حفظ بيانات الشحنة…";
    try{
      const response=await fetch("/api/admin/orders/"+encodeURIComponent(o.id)+"/manual-shipping",{
        method:"POST",credentials:"same-origin",
        headers:{"content-type":"application/json","x-blofysat-admin":"1"},
        body:JSON.stringify({shipping_status:status,tracking_number:code})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.error||"HTTP "+response.status);
      message.textContent="تم حفظ بيانات الشحنة بنجاح ✓";
      await reload();
    }catch(err){
      message.textContent="تعذر الحفظ: "+String(err?.message||"مشكلة في الاتصال");
    }finally{submit.disabled=false}
  });
  el.append(shippingForm);
  const note=create("p","v12-admin-note","ملاحظة: نقاط ريدبوكس يتم التحقق منها عند فتح التطبيق الرسمي، ولا يُحجز صندوق أو تُصدر شحنة تلقائيًا.");
  el.append(note);
  return el;
 }
 let loading=false;
 async function reload(){
  if(loading)return;
  loading=true;refresh.disabled=true;
  status.textContent="جاري تحديث بيانات الطلبات…";
  try{
   const r=await fetch("/api/admin/orders",{cache:"no-store",credentials:"same-origin"});
   if(!r.ok)throw Error("HTTP "+r.status);
   const rows=await r.json();
   if(!Array.isArray(rows))throw Error("بيانات الطلبات غير صحيحة");
   const manualOrders=rows.filter(manual).slice(0,100);
   cards.replaceChildren();
   for(const o of manualOrders)cards.append(renderOrder(o));
   status.textContent=manualOrders.length?
     "طلبات الشحن اليدوي: "+manualOrders.length+" — تحقق من رقم النقطة والموقع داخل تطبيق ريدبوكس قبل الإصدار.":
     "لا توجد طلبات شحن يدوي حتى الآن.";
  }catch(e){
   status.textContent="تعذر تحميل الطلبات: "+String(e?.message||"خطأ غير معروف");
  }finally{loading=false;refresh.disabled=false}
 }
 function hideOldAutoShipmentButton(){
  const legacy=d.getElementById("orders");
  if(!legacy)return;
  const buttons=legacy.querySelectorAll("button");
  buttons.forEach(b=>{
    if(b.textContent?.trim()==="إصدار شحنة ريدبوكس"){
      b.hidden=true;
      b.disabled=true;
      b.setAttribute("aria-label","إصدار الشحنات يدويًا من القسم المخصص أعلاه");
    }
  });
 }
 const oldList=d.getElementById("orders");
 if(oldList){
   const observer=new MutationObserver(()=>hideOldAutoShipmentButton());
   observer.observe(oldList,{childList:true,subtree:true});
   hideOldAutoShipmentButton();
 }
 refresh.addEventListener("click",reload);
 d.getElementById("reloadorders")?.addEventListener("click",()=>setTimeout(reload,100));
 reload();
})();