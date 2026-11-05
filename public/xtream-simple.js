// Minimal BLOFY Xtream source settings. Existing admin login/session is reused.
(() => {
  const $ = (id) => document.getElementById(id);
  const apiRoot = location.pathname.startsWith('/stream') ? '/stream/admin-api/' : '/admin-api/';
  const request = async (endpoint, options={}) => {
    const response=await fetch(apiRoot+endpoint,{credentials:'same-origin',...options,headers:{'content-type':'application/json',...(options.headers||{})}});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(body.error||('HTTP '+response.status));
    return body;
  };
  let lastRequest=0;
  async function refresh() {
    const requestNumber=++lastRequest;
    const badge=$('xtreamSourceBadge');
    try {
      const data=await request('xtream-source');
      if(requestNumber!==lastRequest)return;
      const source=data.source||{},runtime=data.runtime||{};
      badge.textContent=!source.configured?'غير مربوط':!source.enabled?'متوقف':runtime.lastError?'خطأ بالمصدر':data.syncing?'جارٍ الاستيراد':'مفعّل';
      badge.className='status-badge '+(!source.enabled?'neutral':runtime.lastError?'err':source.configured?'ok':'neutral');
      if(document.activeElement!==$('xtreamSourceHost'))$('xtreamSourceHost').value=source.host||'';
      if(document.activeElement!==$('xtreamSourceUsername'))$('xtreamSourceUsername').value=source.username||'';
      $('xtreamSourceCount').textContent=String(runtime.count||0);
      $('xtreamSourceDisableBtn').hidden=!source.enabled;
      $('xtreamSourceSyncStatus').textContent=runtime.lastError?'فشل استيراد القائمة: '+runtime.lastError:data.syncing?'جارٍ استيراد القنوات والأفلام والمسلسلات…':source.configured&&source.enabled?'المصدر محفوظ. العناصر تظهر في المكتبة بعد المزامنة.':'';
      $('xtreamSourceMessage').textContent=source.configured?(source.enabled?'المصدر مربوط ويمكن تحديث بياناته.':'المصدر متوقف.'):'أدخل بيانات Host وUsername وPassword.';
    } catch (e) {badge.textContent='خطأ';$('xtreamSourceMessage').textContent='تعذر فحص الربط: '+e.message;}
  }
  $('xtreamSourceForm')?.addEventListener('submit',async (event)=>{
    event.preventDefault();
    const save=$('xtreamSourceSaveBtn');
    save.disabled=true;
    $('xtreamSourceMessage').textContent='جارٍ التحقق من بيانات الاتصال…';
    try {
      await request('xtream-source',{method:'POST',body:JSON.stringify({
        host:$('xtreamSourceHost').value.trim(),
        username:$('xtreamSourceUsername').value.trim(),
        password:$('xtreamSourcePassword').value,
        rightsConfirmed:$('xtreamRightsConfirmed').checked,
        rightsReference:'owner-attestation'
      })});
      $('xtreamSourcePassword').value='';
      await refresh();
    } catch(e){$('xtreamSourceMessage').textContent='لم يتم الربط: '+e.message;}
    finally{save.disabled=false;}
  });
  $('xtreamSourceRefreshBtn')?.addEventListener('click',refresh);
  $('xtreamSourceDisableBtn')?.addEventListener('click',async()=>{
    if(!confirm('إيقاف هذا المصدر؟'))return;
    try{await request('xtream-source/disable',{method:'POST',body:'{}'});await refresh()}catch(e){$('xtreamSourceMessage').textContent=e.message;}
  });
  document.querySelector('button[data-view="restream"]')?.addEventListener('click',refresh);
  refresh();
})();
