// Independent BLOFY STREAM control UI. No dependency on the legacy dashboard.
(() => {
  const $ = id => document.getElementById(id);
  const prefix = location.pathname === '/stream' || location.pathname.startsWith('/stream/') ? '/stream' : '';
  const API = prefix + '/admin-api/';
  let pollTimer = null;
  function message(text, kind='') {
    const el=$('message'); el.textContent=text; el.className='message '+kind;
  }
  function panel(loggedIn) {
    $('loginPanel').hidden=loggedIn;
    $('sourcePanel').hidden=!loggedIn;
  }
  function badge(text, kind='') {
    $('stateBadge').textContent=text; $('stateBadge').className='badge '+kind;
  }
  async function request(route, {method='GET',body,timeout=12000}={}) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try {
      const response=await fetch(API+route,{
        method, credentials:'same-origin', redirect:'error',
        signal:controller.signal,
        headers:body?{'content-type':'application/json'}:{},
        body:body?JSON.stringify(body):undefined,
        cache:'no-store'
      });
      const data=await response.json().catch(()=>({}));
      if(response.status===401) {panel(false);throw new Error('يلزم تسجيل الدخول');}
      if(!response.ok)throw new Error(String(data.error||'فشل الطلب'));
      return data;
    } catch(error) {
      if(error.name==='AbortError')throw new Error('انتهت مهلة الاتصال بالسيرفر. اضغط تحديث الحالة.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async function refresh() {
    $('refreshButton').disabled=true;
    try {
      const result=await request('xtream-source');
      panel(true);
      const source=result.source||{},runtime=result.runtime||{};
      if(document.activeElement!==$('sourceHost')) $('sourceHost').value=source.host||'';
      if(document.activeElement!==$('sourceUser')) $('sourceUser').value=source.username||'';
      $('sourceCount').textContent=String(Number(runtime.count||0));
      $('disableButton').hidden=!source.enabled;
      if(!source.configured) {
        badge('غير مربوط');
        $('sourceDetails').textContent='جاهز لإضافة السيرفر';
        message('اللوحة جاهزة. أدخل بيانات Xtream واضغط حفظ وتفعيل.');
      } else if(!source.enabled) {
        badge('متوقف','warn');
        $('sourceDetails').textContent='تم إيقاف المصدر';
        message('المصدر متوقف. أدخل البيانات من جديد لإعادة التفعيل.');
      } else if(runtime.lastError) {
        badge('خطأ في الاستيراد','error');
        $('sourceDetails').textContent='تعذر قراءة فهرس المحتوى';
        message('تم حفظ المصدر، لكن استيراد القائمة فشل: '+String(runtime.lastError),'error');
      } else if(result.syncing) {
        badge('جارٍ استيراد المحتوى','warn');
        $('sourceDetails').textContent='جاري مزامنة القنوات والأفلام والمسلسلات';
        message('تم حفظ المصدر. يجري تحديث المكتبة الآن.','ok');
        if(!pollTimer)pollTimer=setTimeout(()=>{pollTimer=null;refresh()},5000);
      } else {
        badge('مفعّل','ok');
        $('sourceDetails').textContent='المصدر محفوظ؛ بيانات تسجيل الدخول لا تُعرض.';
        message('المصدر مفعّل. عناصر المكتبة: '+String(Number(runtime.count||0)),'ok');
      }
    } catch(e) {
      message('تعذر جلب حالة السيرفر: '+e.message,'error');
    } finally {$('refreshButton').disabled=false;}
  }
  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const button=$('loginButton'); button.disabled=true; message('جاري تسجيل الدخول…');
    try {
      await request('login',{method:'POST',body:{password:$('adminPassword').value},timeout:15000});
      $('adminPassword').value=''; panel(true);
      await refresh();
    } catch(e) {message('فشل تسجيل الدخول: '+e.message,'error');}
    finally{button.disabled=false;}
  });
  $('sourceForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const button=$('saveButton');button.disabled=true;
    message('جارٍ التحقق من البيانات وحفظ السيرفر…');
    try {
      await request('xtream-source',{
        method:'POST', timeout:22000,
        body:{
          host:$('sourceHost').value.trim(), username:$('sourceUser').value.trim(),
          password:$('sourcePass').value, rightsConfirmed:$('rightsConfirmed').checked,
          rightsReference:'owner-attestation'
        }
      });
      $('sourcePass').value='';
      message('تم حفظ Xtream. يبدأ تحميل المحتوى بعد المزامنة.','ok');
      await refresh();
    } catch(e) {message('لم يتم تفعيل المصدر: '+e.message,'error');}
    finally{button.disabled=false;}
  });
  $('refreshButton').addEventListener('click',refresh);
  $('disableButton').addEventListener('click',async()=>{
    if(!confirm('هل تريد إيقاف المصدر؟'))return;
    $('disableButton').disabled=true;
    try{await request('xtream-source/disable',{method:'POST',body:{}});await refresh();}
    catch(e){message('تعذر إيقاف المصدر: '+e.message,'error');}
    finally{$('disableButton').disabled=false;}
  });
  const timeout=setTimeout(()=>{if($('message').textContent.includes('جاري فحص'))message('لم يكتمل الفحص. جرّب تحديث الصفحة.','error');},13000);
  refresh().finally(()=>clearTimeout(timeout));
})();