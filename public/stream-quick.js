// BLOFY STREAM administration: Xtream source, independent Xtream subscriber accounts,
// catalogue and a navigation link to the separate BLOFY PLAYER activation-code system.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const prefix = location.pathname === '/stream' || location.pathname.startsWith('/stream/') ? '/stream' : '';
  const API = prefix + '/admin-api/';
  const panels = ['overview','source','codes','subscribers','catalog','appcodes'];
  let signedIn=false, activeTab='overview', sourceTimer=null, subscriberRows=[], freshCodes=[], catalogOffset=0, catalogHasMore=false, searchTimer=null;
  const format = n => Number(n||0).toLocaleString('en-US');
  const readableDate = x => x ? new Date(x).toLocaleDateString('en-GB',{year:'numeric',month:'2-digit',day:'2-digit'}) : 'بدون انتهاء';

  function setMessage(value, kind='') {
    const box=$('message');
    box.textContent=String(value||'');
    box.className='message '+kind;
  }
  function badge(value,kind='') {
    $('stateBadge').textContent=value;
    $('stateBadge').className='badge '+kind;
  }
  function node(tag,value='',cls='') {
    const e=document.createElement(tag);
    if(value!==null && value!==undefined)e.textContent=String(value);
    if(cls)e.className=cls;
    return e;
  }
  function clear(el) { el.replaceChildren(); }
  function session(ok) {
    signedIn=ok;
    $('loginPanel').hidden=ok;
    $('streamNav').hidden=!ok;
    if(!ok)panels.forEach(x=>$(x+'Panel').hidden=true);
    else selectTab(activeTab,false);
  }
  function selectTab(name,load=true) {
    if(!signedIn)return;
    if(!panels.includes(name))name='overview';
    activeTab=name;
    panels.forEach(x=>$(x+'Panel').hidden=(x!==name));
    document.querySelectorAll('[data-tab]').forEach(button=>{
      const selected=button.dataset.tab===name;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-current',selected?'page':'false');
    });
    if(load) {
      const tasks={overview:loadOverview,source:loadSource,codes:()=>{},subscribers:loadSubscribers,catalog:()=>loadCatalog(true),appcodes:()=>{}};
      Promise.resolve(tasks[name]()).catch(e=>setMessage('تعذر تحميل القسم: '+e.message,'error'));
    }
    if(history.replaceState)history.replaceState(null,'',location.pathname+'#'+name);
  }
  async function api(route,{method='GET',body,timeout=15000}={}) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try {
      const response=await fetch(API+route,{
        method, credentials:'same-origin', redirect:'error', signal:controller.signal,
        cache:'no-store',headers:body===undefined?{}:{'content-type':'application/json'},
        body:body===undefined?undefined:JSON.stringify(body)
      });
      const data=await response.json().catch(()=>({}));
      if(response.status===401){session(false);throw new Error('انتهت جلسة الإدارة، سجّل الدخول مجددًا');}
      if(!response.ok)throw new Error(String(data.error||'HTTP '+response.status));
      return data;
    } catch(error) {
      if(error?.name==='AbortError')throw new Error('انتهت مهلة الطلب، جرّب تحديث الحالة.');
      throw error;
    } finally {clearTimeout(timer);}
  }
  async function loadSource() {
    const data=await api('xtream-source'),source=data.source||{},runtime=data.runtime||{};
    if(document.activeElement!==$('sourceHost'))$('sourceHost').value=source.host||'';
    if(document.activeElement!==$('sourceUser'))$('sourceUser').value=source.username||'';
    $('sourceCount').textContent=format(runtime.count||0);
    $('disableButton').hidden=!source.enabled;
    if(!source.configured){
      badge('غير مربوط');
      $('sourceDetails').textContent='جاهز لإضافة المصدر';
    } else if(!source.enabled){
      badge('متوقف','warn');$('sourceDetails').textContent='المصدر موقوف';
    } else if(runtime.lastError){
      badge('مشكلة بالمزامنة','error');$('sourceDetails').textContent='المحتوى السابق محفوظ أثناء فشل التحديث';
    } else if(data.syncing){
      badge('جارٍ التحديث','warn');$('sourceDetails').textContent='المكتبة تتحدّث';
    } else {
      badge('مفعّل','ok');$('sourceDetails').textContent='المصدر محفوظ ويمكن تحديث بياناته';
    }
    if(activeTab==='source'){
      const info=!source.configured?'أدخل بيانات Host وUsername وPassword ثم احفظ.':
        !source.enabled?'المصدر موقوف. أعد تفعيله إذا رغبت.':
        runtime.lastError?'تعذر آخر استيراد: '+String(runtime.lastError):
        data.syncing?'جارٍ مزامنة المحتوى…':'المصدر مرتبط. العناصر المستوردة: '+format(runtime.count);
      setMessage(info,runtime.lastError?'error':source.enabled?'ok':'');
    }
    if(sourceTimer)clearTimeout(sourceTimer);
    if(data.syncing && activeTab==='source')sourceTimer=setTimeout(()=>loadSource().catch(()=>{}),7000);
    return data;
  }
  async function loadOverview() {
    setMessage('جاري تحميل ملخص BLOFY…');
    const s=await api('status',{timeout:30000});
    const stats=s.stats||{},accounts=s.accountsSummary||{};
    const values={statTotal:stats.totalItems,statLive:stats.live,statMovies:stats.movies,statEpisodes:stats.episodes,
      statUsers:accounts.total,statActiveUsers:accounts.active};
    Object.entries(values).forEach(([key,val])=>$(key).textContent=format(val||0));
    setMessage('مركز BLOFY جاهز. يمكنك إدارة المصدر والحسابات والمكتبة من الأقسام أعلاه.','ok');
  }
  async function loadSubscribers() {
    const data=await api('accounts',{timeout:18000});
    subscriberRows=data.accounts||[];
    const s=data.summary||{};
    $('subscribersSummary').textContent='الإجمالي '+format(s.total)+' · نشط '+format(s.active)+' · منتهي '+format(s.expired)+' · موقوف '+format(s.disabled);
    renderSubscribers();
  }
  function accountStatus(account) {
    if(!account.enabled)return {label:'موقوف',cls:'error',type:'disabled'};
    if(account.expired)return {label:'منتهي',cls:'warn',type:'expired'};
    return {label:'نشط',cls:'ok',type:'active'};
  }
  function renderSubscribers() {
    const target=$('subscribersList'),query=$('searchSubscribers').value.trim().toLowerCase(),filter=$('filterSubscribers').value;
    clear(target);
    const found=subscriberRows.filter(x=>{
      const st=accountStatus(x);
      return(filter==='all'||filter===st.type)&&(!query||String(x.username+' '+(x.label||'')).toLowerCase().includes(query));
    });
    if(!found.length){target.append(node('p','لا توجد حسابات مطابقة للبحث.','mini-note'));return;}
    found.slice(0,150).forEach(account=>{
      const box=node('article','','customer'),top=node('div','','row'),name=node('div','','customer-name');
      name.append(node('strong',account.label||account.username),node('small',account.username+' · '+readableDate(account.expiresAt)+' · '+account.maxConnections+' اتصال'));
      const st=accountStatus(account),pill=node('span',st.label,'pill '+st.cls);
      top.append(name,pill);box.append(top);
      const actions=node('div','','customer-actions');
      [
        ['renew','تجديد'],['toggle',account.enabled?'إيقاف':'تفعيل'],
        ['reset','إعادة تعيين كلمة المرور']
      ].forEach(([act,label])=>{
        const b=node('button',label,'secondary');
        b.type='button';b.dataset.action=act;b.dataset.user=account.username;actions.append(b);
      });
      box.append(actions);target.append(box);
    });
    if(found.length>150)target.append(node('p','يُعرض أول 150 حساب. استخدم البحث للوصول إلى حساب معين.','mini-note'));
  }
  async function accountAction(action,username) {
    const account=subscriberRows.find(x=>x.username===username);
    if(!account)return;
    if(action==='renew'){
      const days=prompt('كم يوم تريد إضافته؟','30');
      if(days===null)return;
      const amount=Number(days);
      if(!Number.isInteger(amount)||amount<1||amount>3650){setMessage('مدة التجديد غير صالحة','error');return;}
      await api('accounts/renew',{method:'POST',body:{username,days:amount}});
      setMessage('تم تجديد حساب '+username,'ok');
    }else if(action==='toggle'){
      if(!confirm('تأكيد '+(account.enabled?'إيقاف':'تفعيل')+' حساب '+username+'؟'))return;
      await api('accounts/toggle',{method:'POST',body:{username,enabled:!account.enabled}});
      setMessage('تم تحديث حالة '+username,'ok');
    }else if(action==='reset'){
      if(!confirm('سيتم تغيير كلمة المرور الحالية. هل تريد الاستمرار؟'))return;
      const result=await api('accounts/password',{method:'POST',body:{username}});
      const secret=String(result.password||'');
      freshCodes=[{username,password:secret,expiresAt:result.expiresAt,host:result.host}];
      selectTab('codes',false);renderCreated();
      setMessage('تم إنشاء كلمة مرور جديدة. انسخها قبل مغادرة الصفحة.','ok');
      return;
    }
    await loadSubscribers();
  }
  function renderCreated() {
    const target=$('createdAccountsRows');clear(target);
    $('createdAccountsPanel').hidden=freshCodes.length===0;
    if(!freshCodes.length)return;
    const table=node('table'),thead=node('thead'),head=node('tr');
    ['Username','Password','ينتهي','اتصالات'].forEach(x=>head.append(node('th',x)));
    thead.append(head);table.append(thead);
    const tbody=node('tbody');
    freshCodes.forEach(x=>{
      const tr=node('tr');
      tr.append(node('td',x.username,'code-cell'),node('td',x.password,'code-cell'),node('td',readableDate(x.expiresAt)),node('td',x.maxConnections||1));
      tbody.append(tr);
    });
    table.append(tbody);target.append(table);
  }
  function downloadCsv() {
    if(!freshCodes.length)return;
    const safe=v=>{
      let text=String(v??'');
      if(/^[\s]*[=+\-@]/.test(text))text="'"+text;
      return '"'+text.replaceAll('"','""')+'"';
    };
    const header=['username','password','host','expires_at','max_connections'];
    const rows=[header.join(',')].concat(freshCodes.map(x=>header.map(k=>safe({
      username:x.username,password:x.password,host:x.host,expires_at:x.expiresAt,max_connections:x.maxConnections
    }[k])).join(',')));
    const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='BLOFY-XTREAM-accounts.csv';
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function createAccounts(event) {
    event.preventDefault();
    const count=Number($('codesCount').value),durationDays=Number($('codesDays').value),
      maxConnections=Number($('codesConnections').value),labelPrefix=$('codesLabel').value.trim();
    if(!Number.isInteger(count)||count<1||count>100){setMessage('اختر عدد حسابات من 1 إلى 100','error');return;}
    if(!confirm('إنشاء '+count+' حساب Xtream لمدة '+durationDays+' يوم؟'))return;
    const button=$('generateCodes');button.disabled=true;
    try {
      const result=await api('accounts/bulk',{method:'POST',body:{count,durationDays,maxConnections,labelPrefix},timeout:45000});
      freshCodes=(result.accounts||[]).map(x=>({...x,host:result.host}));
      renderCreated();
      setMessage('تم إنشاء '+format(freshCodes.length)+' حساب. احفظ بيانات الدخول الآن.','ok');
    }catch(e){setMessage('فشل إصدار الحسابات: '+e.message,'error')}
    finally{button.disabled=false;}
  }
  async function loadCatalog(reset=false) {
    if(reset)catalogOffset=0;
    const query=$('searchCatalog').value.trim(),kind=$('catalogKind').value;
    const params=new URLSearchParams({limit:'40',offset:String(catalogOffset)});
    if(query)params.set('q',query);
    if(kind)params.set('kind',kind);
    $('catalogInfo').textContent='جاري قراءة المكتبة…';
    const data=await api('catalog?'+params,{timeout:30000});
    const target=$('catalogList');clear(target);
    catalogHasMore=!!data.hasMore;
    $('catalogInfo').textContent='النتائج: '+format(data.total)+' عنصر';
    $('catalogPage').textContent='صفحة '+format(Math.floor(catalogOffset/40)+1);
    $('catalogPrev').disabled=catalogOffset===0;
    $('catalogNext').disabled=!catalogHasMore;
    (data.items||[]).forEach(item=>{
      const box=node('article','','catalog-item'),top=node('div','','row'),info=node('div','','customer-name');
      info.append(node('strong',item.title),node('small',item.category||'بدون تصنيف'));
      const names={live:'قناة',movie:'فيلم',series_episode:'حلقة'};
      top.append(info,node('span',names[item.kind]||'محتوى','pill'));box.append(top);target.append(box);
    });
    if(!(data.items||[]).length)target.append(node('p','لا يوجد محتوى مطابق.','mini-note'));
  }
  async function syncCatalog() {
    const b=$('syncCatalog');b.disabled=true;
    try {
      await api('sync',{method:'POST',body:{source:'managed-xtream'}});
      setMessage('بدأت مزامنة مكتبة Xtream. اضغط تحديث بعد انتهاء الاستيراد.','ok');
    }catch(e){setMessage('فشلت المزامنة: '+e.message,'error')}
    finally{b.disabled=false;}
  }

  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();const b=$('loginButton');b.disabled=true;
    try{
      await api('login',{method:'POST',body:{password:$('adminPassword').value}});
      $('adminPassword').value='';session(true);selectTab('overview');
    }catch(e){setMessage('تعذر الدخول: '+e.message,'error')}
    finally{b.disabled=false;}
  });
  $('sourceForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const b=$('saveButton');b.disabled=true;setMessage('جاري التحقق من المصدر وحفظه…');
    try{
      await api('xtream-source',{method:'POST',timeout:25000,body:{
        host:$('sourceHost').value.trim(),username:$('sourceUser').value.trim(),
        password:$('sourcePass').value,rightsConfirmed:$('rightsConfirmed').checked,rightsReference:'owner-attestation'
      }});
      $('sourcePass').value='';await loadSource();
      setMessage('المصدر محفوظ؛ يتم تحديث المكتبة.','ok');
    }catch(e){setMessage('تعذر تفعيل المصدر: '+e.message,'error')}
    finally{b.disabled=false;}
  });
  $('disableButton').addEventListener('click',async()=>{
    if(!confirm('هل تريد إيقاف مصدر Xtream؟'))return;
    try{await api('xtream-source/disable',{method:'POST',body:{}});await loadSource()}catch(e){setMessage(e.message,'error')}
  });
  $('refreshButton').addEventListener('click',()=>loadSource().catch(e=>setMessage(e.message,'error')));
  $('refreshOverview').addEventListener('click',()=>loadOverview().catch(e=>setMessage(e.message,'error')));
  $('refreshSubscribers').addEventListener('click',()=>loadSubscribers().catch(e=>setMessage(e.message,'error')));
  $('createAccountsForm').addEventListener('submit',createAccounts);
  $('downloadCodes').addEventListener('click',downloadCsv);
  $('searchSubscribers').addEventListener('input',renderSubscribers);
  $('filterSubscribers').addEventListener('change',renderSubscribers);
  $('subscribersList').addEventListener('click',event=>{
    const b=event.target.closest('[data-action]');if(!b)return;
    b.disabled=true;accountAction(b.dataset.action,b.dataset.user)
      .catch(e=>setMessage('تعذر تحديث الحساب: '+e.message,'error')).finally(()=>{b.disabled=false;});
  });
  $('syncCatalog').addEventListener('click',syncCatalog);
  $('searchCatalog').addEventListener('input',()=>{
    clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadCatalog(true).catch(e=>setMessage(e.message,'error')),400);
  });
  $('catalogKind').addEventListener('change',()=>loadCatalog(true).catch(e=>setMessage(e.message,'error')));
  $('catalogPrev').addEventListener('click',()=>{catalogOffset=Math.max(0,catalogOffset-40);loadCatalog().catch(e=>setMessage(e.message,'error'));});
  $('catalogNext').addEventListener('click',()=>{if(catalogHasMore){catalogOffset+=40;loadCatalog().catch(e=>setMessage(e.message,'error'));}});
  document.querySelectorAll('[data-tab],[data-open]').forEach(b=>{
    b.addEventListener('click',()=>selectTab(b.dataset.tab||b.dataset.open));
  });

  const fromHash=location.hash.slice(1);
  if(panels.includes(fromHash))activeTab=fromHash;
  const bootstrapTimer=setTimeout(()=>setMessage('الاستجابة متأخرة، جرّب تحديث الصفحة.','error'),16000);
  api('xtream-source',{timeout:12000}).then(()=>{
    session(true);selectTab(activeTab);
  }).catch(e=>{
    if(e.message.includes('جلسة الإدارة'))setMessage('سجّل دخولك لإدارة BLOFY.');
    else setMessage('تعذر الاتصال بلوحة الإدارة: '+e.message,'error');
  }).finally(()=>clearTimeout(bootstrapTimer));
})();
