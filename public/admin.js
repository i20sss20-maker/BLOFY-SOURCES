const $=id=>document.getElementById(id);
const API='/admin-api/';
const PAGE_SIZE=60;
let state=null,allSubscribers=[],catalogOffset=0,arabicOffset=0,arabicKind='',subscriberFilter='',renewUser='',passwordUser='',lastCreated=null;

const titles={
  overview:['الرئيسية','BLOFY CONTROL CENTER'],
  subscribers:['إدارة المشتركين','XTREAM USERS'],
  arabic:['المحتوى العربي','ARABIC FIRST'],
  catalog:['المكتبة الكاملة','CATALOG'],
  access:['اختبار السيرفر','XTREAM TEST']
};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmt=n=>new Intl.NumberFormat('ar-SA').format(Number(n||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateText=v=>v?new Date(v).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'بدون انتهاء';
const daysLeft=v=>v?Math.ceil((new Date(v).getTime()-Date.now())/86400000):null;

function toast(message,type=''){
  const box=$('statusbar');box.textContent=message;box.className='toast show '+type;
  clearTimeout(window.__toast);window.__toast=setTimeout(()=>box.className='toast',4200);
}

async function api(path,opts={}){
  const r=await fetch(API+path,{...opts,headers:{'content-type':'application/json',...(opts.headers||{})}});
  const j=await r.json().catch(()=>({}));
  if(r.status===401){$('login').classList.remove('hidden');throw new Error(j.error||'admin_auth_required')}
  if(!r.ok)throw new Error(j.error||`request_${r.status}`);
  return j;
}

function subscriberStatus(a){
  if(!a.enabled)return{key:'disabled',label:'معطل',cls:'off'};
  if(a.expired)return{key:'expired',label:'منتهي',cls:'err'};
  const left=daysLeft(a.expiresAt);
  if(left!=null&&left<=7)return{key:'soon',label:`باقي ${Math.max(0,left)} يوم`,cls:'warn'};
  return{key:'active',label:'نشط',cls:'ok'};
}

function currentCredentials(){
  return{
    host:String(state?.baseUrl||'').replace(/\/+$/,''),
    username:$('serverUsername').value.trim(),
    password:$('serverPassword').value
  };
}

function credentialUrl(path,extra=''){
  const c=currentCredentials();
  if(!c.host||!c.username||!c.password)return'أدخل كلمة السر';
  return `${c.host}${path}?username=${encodeURIComponent(c.username)}&password=${encodeURIComponent(c.password)}${extra}`;
}

function renderAccessLinks(){
  $('playerApiValue').textContent=credentialUrl('/player_api.php');
  $('m3uValue').textContent=credentialUrl('/get.php','&type=m3u_plus&output=ts');
  $('xmltvValue').textContent=credentialUrl('/xmltv.php');
}

function setHealth(ok,syncing=false){
  const dot=$('sidebarStatusDot'),hero=$('heroHealthDot');
  dot.className='status-dot '+(syncing?'warn':ok?'ok':'warn');
  hero.className='health-dot '+(syncing?'warn':ok?'ok':'warn');
  $('sidebarStatus').textContent=syncing?'مزامنة جارية':ok?'الخدمة تعمل':'تحتاج مراجعة';
  $('heroHealth').textContent=syncing?'مزامنة':ok?'سليم':'مراجعة';
}

function renderSourceFilter(providers){
  const select=$('sourceFilter'),current=select.value;
  select.innerHTML='<option value="">كل المصادر</option>'+providers.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  if([...select.options].some(o=>o.value===current))select.value=current;
}

function renderSources(providers){
  $('sourceList').innerHTML=providers.map(p=>{
    const rt=p.runtime||{},c=p.counts||{},cls=rt.lastError?'err':p.enabled?'ok':'off';
    const label=rt.lastError?'خطأ':p.enabled?'مفعل':'معطل';
    return `<div class="source-row">
      <div class="source-main"><strong>${esc(p.name)}</strong><span>${fmt(c.total??rt.count??0)} عنصر · مباشر ${fmt(c.live)} · فيديو ${fmt(c.movies)} · حلقات ${fmt(c.episodes)}</span></div>
      <span class="badge ${cls}">${label}</span>
      ${p.enabled?`<button class="tiny-btn source-sync" data-source="${esc(p.id)}">مزامنة</button>`:''}
    </div>`;
  }).join('');
}

function renderDashboardSubscribers(){
  const candidates=allSubscribers
    .filter(a=>subscriberStatus(a).key==='expired'||subscriberStatus(a).key==='soon')
    .sort((a,b)=>(a.expired===b.expired?0:a.expired?-1:1)||(new Date(a.expiresAt||0)-new Date(b.expiresAt||0)))
    .slice(0,6);
  $('attentionSubscribers').innerHTML=candidates.length?candidates.map(a=>{
    const st=subscriberStatus(a);
    return `<div class="attention-item">
      <div><strong>${esc(a.label||a.username)}</strong><small class="ltr-inline">${esc(a.username)}</small></div>
      <div class="attention-actions"><span class="badge ${st.cls}">${st.label}</span><button class="tiny-btn primary quick-renew" data-user="${esc(a.username)}">تجديد</button></div>
    </div>`;
  }).join(''):'<div class="attention-item"><div><strong>كل شيء مرتب ✓</strong><small>لا توجد اشتراكات منتهية أو قريبة خلال 7 أيام.</small></div></div>';
}

function renderStatus(s){
  state=s;$('login').classList.add('hidden');
  const stats=s.stats||{},arabic=s.arabic||stats.arabic||{},acc=s.accountsSummary||{},providers=s.providers||[];
  $('mActive').textContent=fmt(acc.active);
  $('mExpired').textContent=fmt(acc.expired);
  $('mTotal').textContent=fmt(stats.totalItems);
  $('mArabic').textContent=fmt(arabic.total);
  $('subtitle').textContent=`${fmt(stats.totalItems)} عنصر · ${fmt(acc.total)} مشترك · ${fmt(arabic.total)} عربي`;
  $('navExpired').textContent=fmt(acc.expired);$('navExpired').hidden=!acc.expired;
  $('heroTitle').textContent=acc.expired?`عندك ${fmt(acc.expired)} اشتراك منتهي`:'لوحتك مرتبة وجاهزة';
  $('heroText').textContent=s.syncing?'المحتوى يتزامن الآن، ويظل السيرفر متاحًا أثناء المزامنة.':`المكتبة فيها ${fmt(stats.totalItems)} عنصر، وآخر مزامنة محفوظة بنجاح.`;
  setHealth(true,Boolean(s.syncing));

  $('dLive').textContent=fmt(stats.live);$('dMovies').textContent=fmt(stats.movies);$('dSeries').textContent=fmt(stats.series);$('dEpisodes').textContent=fmt(stats.episodes);
  const values=[Number(stats.live||0),Number(stats.movies||0),Number(stats.series||0),Number(stats.episodes||0)],max=Math.max(...values,1);
  [['barLive',values[0]],['barMovies',values[1]],['barSeries',values[2]],['barEpisodes',values[3]]].forEach(([id,v])=>$(id).style.width=`${Math.max(4,Math.round(v/max*100))}%`);

  $('aLive').textContent=fmt(arabic.live);$('aMovies').textContent=fmt(arabic.movies);$('aSeries').textContent=fmt(arabic.series);$('aEpisodes').textContent=fmt(arabic.episodes);
  $('syncState').textContent=s.syncing?'المزامنة تعمل الآن…':'المكتبة جاهزة';
  $('lastSync').textContent=stats.lastSyncAt?new Date(stats.lastSyncAt).toLocaleString('ar-SA'):'لم تتم بعد';
  const enabledProviders=providers.filter(p=>p.enabled),failedProviders=enabledProviders.filter(p=>p.runtime?.lastError);
  $('sourceHealthSummary').textContent=failedProviders.length?`${failedProviders.length} مصدر يحتاج مراجعة · ${enabledProviders.length-failedProviders.length} سليم`:`كل ${enabledProviders.length} المصادر المفعلة سليمة`;
  $('sourceHealthDot').className='mini-health '+(failedProviders.length?'warn':'ok');
  $('syncLog').innerHTML=(s.lastSyncLog||[]).slice(-8).map(x=>`<span class="sync-chip ${x.status==='error'?'err':'ok'}">${esc(x.source)} · ${x.status==='ok'?fmt(x.count):esc(x.status)}</span>`).join('');
  $('hostValue').textContent=s.baseUrl||'—';$('adminHostValue').textContent=s.adminBaseUrl||'—';
  renderSources(s.providers||[]);renderSourceFilter(s.providers||[]);renderAccessLinks();
}

async function refresh(){
  const s=await api('status');renderStatus(s);return s;
}

async function waitForSync(timeoutMs=25*60_000){
  const start=Date.now();
  while(Date.now()-start<timeoutMs){
    const s=await refresh();
    if(!s.syncing)return s;
    await sleep(2200);
  }
  throw new Error('المزامنة أخذت وقتًا أطول من المتوقع');
}

async function syncAll(){
  try{
    $('syncBtn').disabled=true;$('syncBtn2').disabled=true;toast('بدأت مزامنة المكتبة…');
    await api('sync',{method:'POST',body:'{}'});await waitForSync();
    toast('اكتملت المزامنة','success');
    if(document.querySelector('.nav button.active')?.dataset.view==='arabic')loadArabic(true);
    if(document.querySelector('.nav button.active')?.dataset.view==='catalog')loadCatalog(true);
  }catch(e){toast(e.message,'error')}finally{$('syncBtn').disabled=false;$('syncBtn2').disabled=false}
}

async function syncOne(source,button){
  try{button.disabled=true;toast(`مزامنة ${source}…`);await api('sync',{method:'POST',body:JSON.stringify({source})});await waitForSync();toast('اكتملت مزامنة المصدر','success')}
  catch(e){toast(e.message,'error')}finally{button.disabled=false}
}

function rowHtml(x){
  return `<tr>
    <td>${x.icon?`<img class="thumb" src="${esc(x.icon)}" loading="lazy" onerror="this.style.display='none'">`:'<span class="thumb-empty">•</span>'}</td>
    <td><strong>${esc(x.title)}</strong>${x.language==='ar'?'<small class="arabic-tag">عربي</small>':''}</td>
    <td>${esc(x.category||'—')}</td><td>${esc(x.source)}</td><td>${x.kind==='live'?'مباشر':x.kind==='series_episode'?'حلقة':'فيديو'}</td>
  </tr>`;
}

async function loadCatalog(reset=false){
  try{
    if(reset)catalogOffset=0;
    const p=new URLSearchParams({kind:$('kindFilter').value,source:$('sourceFilter').value,q:$('searchInput').value,limit:String(PAGE_SIZE),offset:String(catalogOffset)});
    const j=await api('catalog?'+p);
    $('catalogRows').innerHTML=j.items.length?j.items.map(rowHtml).join(''):'<tr><td colspan="5">لا توجد نتائج</td></tr>';
    $('catalogCount').textContent=j.total?`${fmt(j.offset+1)}–${fmt(j.offset+j.items.length)} من ${fmt(j.total)}`:'0 نتيجة';
    $('catalogPrev').disabled=j.offset<=0;$('catalogNext').disabled=!j.hasMore;
  }catch(e){toast(e.message,'error')}
}

async function loadArabic(reset=false){
  try{
    if(reset)arabicOffset=0;
    const p=new URLSearchParams({arabic:'1',kind:arabicKind,q:$('arabicSearch').value,limit:String(PAGE_SIZE),offset:String(arabicOffset)});
    const j=await api('catalog?'+p);
    $('arabicRows').innerHTML=j.items.length?j.items.map(rowHtml).join(''):'<tr><td colspan="5">لا توجد نتائج عربية بهذا الفلتر</td></tr>';
    $('arabicCount').textContent=j.total?`${fmt(j.offset+1)}–${fmt(j.offset+j.items.length)} من ${fmt(j.total)}`:'0 نتيجة';
    $('arabicPrev').disabled=j.offset<=0;$('arabicNext').disabled=!j.hasMore;
  }catch(e){toast(e.message,'error')}
}

function filteredSubscribers(){
  const q=$('subscriberSearch').value.trim().toLowerCase();
  const selectFilter=$('subscriberStatus').value||subscriberFilter;
  const sort=$('subscriberSort')?.value||'attention';
  const rows=allSubscribers.filter(a=>{
    const matches=!q||`${a.username} ${a.label||''} ${a.note||''}`.toLowerCase().includes(q);
    if(!matches)return false;
    if(!selectFilter)return true;
    return subscriberStatus(a).key===selectFilter;
  });
  const rank=a=>{const k=subscriberStatus(a).key;return k==='expired'?0:k==='soon'?1:k==='active'?2:3};
  rows.sort((a,b)=>{
    if(sort==='expiry'){
      const ax=a.expiresAt?new Date(a.expiresAt).getTime():Number.MAX_SAFE_INTEGER;
      const bx=b.expiresAt?new Date(b.expiresAt).getTime():Number.MAX_SAFE_INTEGER;
      return ax-bx||String(a.label||a.username).localeCompare(String(b.label||b.username),'ar');
    }
    if(sort==='newest')return new Date(b.createdAt||0)-new Date(a.createdAt||0);
    if(sort==='name')return String(a.label||a.username).localeCompare(String(b.label||b.username),'ar');
    return rank(a)-rank(b)||((a.expiresAt?new Date(a.expiresAt).getTime():Number.MAX_SAFE_INTEGER)-(b.expiresAt?new Date(b.expiresAt).getTime():Number.MAX_SAFE_INTEGER));
  });
  return rows;
}

function openRenew(user){
  renewUser=user;const a=allSubscribers.find(x=>x.username===user);
  $('renewTitle').textContent=`تجديد ${a?.label||user}`;
  $('renewSubtitle').textContent=`Username: ${user} · الانتهاء الحالي: ${dateText(a?.expiresAt)}`;
  $('renewModal').hidden=false;
}

function closeRenew(){$('renewModal').hidden=true;renewUser=''}
function openPassword(user){
  const a=allSubscribers.find(x=>x.username===user);passwordUser=a?.id||'';
  $('passwordTitle').textContent=`كلمة سر جديدة ${a?.label||user}`;
  $('passwordSubtitle').textContent=`Username: ${user} · سيتم توليد كلمة سر قوية جديدة من نظام الحسابات المتوافق مع المشغلات.`;
  $('newSubscriberPassword').value='';$('newSubscriberPassword').disabled=true;
  $('passwordResult').hidden=true;
  $('passwordModal').hidden=false;
}
function closePassword(){$('passwordModal').hidden=true;passwordUser='';$('newSubscriberPassword').value='';$('newSubscriberPassword').disabled=false;$('passwordResult').hidden=true}
async function savePassword(){
  if(!passwordUser)return;
  try{
    $('saveSubscriberPassword').disabled=true;
    const j=await api('compat-accounts/reset',{method:'POST',body:JSON.stringify({id:passwordUser})});
    const tested=await api('account/test',{method:'POST',body:JSON.stringify({username:j.username,password:j.password})});
    if(!tested.auth)throw new Error('account_validation_failed');
    $('passwordResult').hidden=false;
    $('passwordResult').innerHTML=`<strong>تم تغيير كلمة السر واختبارها على Xtream ✓</strong><div class="created-grid"><span>Host</span><code>${esc(j.host)}</code><span>Username</span><code>${esc(j.username)}</code><span>Password</span><code>${esc(j.password)}</code></div><button id="copyPasswordResult" class="btn primary">نسخ Host + Username + Password</button>`;
    $('serverUsername').value=j.username;$('serverPassword').value=j.password;renderAccessLinks();
    toast('تم تغيير كلمة السر','success');
  }catch(e){
    toast(e.message==='invalid_password'?'كلمة السر يجب أن تكون 8 أحرف أو أكثر':e.message,'error');
  }finally{$('saveSubscriberPassword').disabled=false}
}

function renderSubscribers(){
  const rows=filteredSubscribers();
  $('subscriberCount').textContent=`${fmt(rows.length)} من ${fmt(allSubscribers.length)} مشترك`;
  $('subscriberRows').innerHTML=rows.length?rows.map(a=>{
    const st=subscriberStatus(a),left=daysLeft(a.expiresAt);
    return `<tr class="subscriber-row status-${st.key}">
      <td><strong>${esc(a.label||'بدون اسم')}</strong><div class="muted ltr-inline username-line">${esc(a.username)} <button class="copy-user inline-copy" data-user="${esc(a.username)}">نسخ</button></div></td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td>${dateText(a.expiresAt)}${left!=null&&!a.expired? `<div class="muted">${fmt(Math.max(0,left))} يوم</div>`:''}</td>
      <td>${fmt(a.maxConnections||1)}</td>
      <td><div class="subscriber-actions">
        <button class="tiny-btn primary renew-user" data-user="${esc(a.username)}">تجديد</button>
        ${a.bootstrap?'':`<button class="tiny-btn password-user" data-user="${esc(a.username)}">كلمة السر</button>`}
        <button class="tiny-btn toggle-user" data-user="${esc(a.username)}" data-enable="${a.enabled?'0':'1'}">${a.enabled?'تعطيل':'تفعيل'}</button>
        ${a.bootstrap?'':`<button class="tiny-btn danger delete-user" data-user="${esc(a.username)}">حذف</button>`}
      </div></td>
    </tr>`;
  }).join(''):'<tr><td colspan="5">لا توجد نتائج</td></tr>';
  renderDashboardSubscribers();
}

async function loadSubscribers(){
  try{
    const j=await api('compat-accounts');allSubscribers=j.accounts||[];const s=j.summary||{};
    $('sTotal').textContent=fmt(s.total);$('sActive').textContent=fmt(s.active);$('sExpired').textContent=fmt(s.expired);$('sSoon').textContent=fmt(s.expiringSoon);$('sDisabled').textContent=fmt(s.disabled);
    renderSubscribers();
  }catch(e){toast(e.message,'error')}
}

async function createSubscriber(){
  const body={
    label:$('newLabel').value.trim(),username:$('newUsername').value.trim(),password:$('newPassword').value,
    durationDays:Number($('newDuration').value),maxConnections:Number($('newConnections').value)
  };
  try{
    $('createSubscriberBtn').disabled=true;
    const j=await api('compat-accounts',{method:'POST',body:JSON.stringify(body)});
    const tested=await api('account/test',{method:'POST',body:JSON.stringify({username:j.username,password:j.password})});
    if(!tested.auth)throw new Error('account_validation_failed');
    lastCreated=j;
    $('createdSubscriber').hidden=false;
    $('createdSubscriber').innerHTML=`<strong>تم إنشاء الحساب واختباره على Xtream ✓</strong>
      <div class="created-grid"><span>Host</span><code>${esc(j.host)}</code><span>Username</span><code>${esc(j.username)}</code><span>Password</span><code>${esc(j.password)}</code><span>الانتهاء</span><code>${esc(dateText(j.expiresAt))}</code></div>
      <button id="copyCreatedSubscriber" class="btn primary">نسخ Host + Username + Password + M3U</button>`;
    $('serverUsername').value=j.username;$('serverPassword').value=j.password;renderAccessLinks();
    $('newLabel').value='';$('newUsername').value='';$('newPassword').value='';
    toast('تم إنشاء المشترك','success');await Promise.all([loadSubscribers(),refresh()]);
  }catch(e){
    const map={username_exists:'اسم المستخدم موجود مسبقًا',invalid_username:'اسم المستخدم غير صالح',invalid_password:'كلمة السر يجب أن تكون 8 أحرف أو أكثر',xtream_gateway_username_exists:'اسم المستخدم موجود مسبقًا',xtream_gateway_username_invalid:'اسم المستخدم غير صالح',xtream_gateway_password_invalid:'كلمة السر يجب أن تكون 8 أحرف أو أكثر'};
    toast(map[e.message]||e.message,'error');
  }finally{$('createSubscriberBtn').disabled=false}
}

async function renewSubscriber(user,days){
  try{
    const account=allSubscribers.find(x=>x.username===user);if(!account?.id)throw new Error('account_not_found');
    await api('compat-accounts/renew',{method:'POST',body:JSON.stringify({id:account.id,days})});
    closeRenew();toast(`تم تجديد ${user} لمدة ${days===365?'سنة':days===730?'سنتين':days+' يوم'}`,'success');
    await Promise.all([loadSubscribers(),refresh()]);
  }catch(e){toast(e.message,'error')}
}

async function toggleSubscriber(user,enabled,button){
  try{button.disabled=true;const account=allSubscribers.find(x=>x.username===user);if(!account?.id)throw new Error('account_not_found');await api('compat-accounts/toggle',{method:'POST',body:JSON.stringify({id:account.id,enabled})});toast(enabled?'تم تفعيل المشترك':'تم تعطيل المشترك','success');await Promise.all([loadSubscribers(),refresh()])}
  catch(e){toast(e.message,'error')}finally{button.disabled=false}
}

async function deleteSubscriber(user,button){
  if(!confirm(`حذف المشترك ${user} نهائيًا؟`))return;
  try{button.disabled=true;const account=allSubscribers.find(x=>x.username===user);if(!account?.id)throw new Error('account_not_found');await api(`compat-accounts?id=${encodeURIComponent(account.id)}`,{method:'DELETE'});toast('تم حذف المشترك','success');await Promise.all([loadSubscribers(),refresh()])}
  catch(e){toast(e.message,'error')}finally{button.disabled=false}
}

function setServerBadge(kind,text){const b=$('serverBadge');b.className=`status-badge ${kind}`;b.textContent=text}

async function testAccount(){
  const c=currentCredentials();if(!c.username||!c.password)return toast('أدخل Username وكلمة السر','error');
  try{
    $('testAccountBtn').disabled=true;setServerBadge('neutral','جاري الاختبار…');
    const j=await api('account/test',{method:'POST',body:JSON.stringify({username:c.username,password:c.password})});
    const box=$('serverTestResult');box.hidden=false;
    if(!j.auth){setServerBadge('err','فشل');box.className='test-result err';box.innerHTML='<strong>الحساب غير صالح</strong><span>قد يكون منتهيًا أو معطلًا أو البيانات غير صحيحة.</span>';return}
    setServerBadge('ok','يعمل');box.className='test-result ok';
    box.innerHTML=`<strong>الاتصال ناجح ✓</strong><span>${fmt(j.stats.live)} مباشر · ${fmt(j.stats.movies)} فيديو · ${fmt(j.stats.series)} مسلسل · ${fmt(j.stats.episodes)} حلقة</span>`;
    renderAccessLinks();toast('بيانات Xtream صحيحة','success');
  }catch(e){setServerBadge('err','خطأ');toast(e.message,'error')}finally{$('testAccountBtn').disabled=false}
}

function gotoView(name){
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===name));
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${name}`));
  $('pageTitle').textContent=titles[name]?.[0]||'لوحة الإدارة';$('pageKicker').textContent=titles[name]?.[1]||'BLOFY';
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='subscribers')loadSubscribers();
  if(name==='arabic')loadArabic(true);
  if(name==='catalog')loadCatalog(true);
}

async function copyText(text,msg='تم النسخ'){
  try{await navigator.clipboard.writeText(text);toast(msg,'success')}catch{toast('تعذر النسخ','error')}
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  try{await api('login',{method:'POST',body:JSON.stringify({password:$('adminPassword').value})});$('adminPassword').value='';await Promise.all([refresh(),loadSubscribers()]);toast('تم تسجيل الدخول','success')}
  catch(e){toast(e.message==='too_many_login_attempts'?'محاولات كثيرة، حاول لاحقًا':'تعذر تسجيل الدخول','error')}
});

$('logoutBtn').onclick=async()=>{try{await api('logout',{method:'POST',body:'{}'})}catch{}location.reload()};
$('refreshBtn').onclick=()=>Promise.all([refresh(),loadSubscribers()]).then(()=>toast('تم التحديث','success')).catch(e=>toast(e.message,'error'));
$('syncBtn').onclick=syncAll;$('syncBtn2').onclick=syncAll;

document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>gotoView(b.dataset.view));
document.querySelectorAll('.jump').forEach(b=>b.onclick=()=>{gotoView(b.dataset.target);if(b.dataset.create==='1')setTimeout(()=>{$('createSubscriberCard').hidden=false;$('createdSubscriber').hidden=true},120)});

$('sourceList').addEventListener('click',e=>{const b=e.target.closest('.source-sync');if(b)syncOne(b.dataset.source,b)});
$('attentionSubscribers').addEventListener('click',e=>{const b=e.target.closest('.quick-renew');if(b)openRenew(b.dataset.user)});

$('openCreateSubscriber').onclick=()=>{$('createSubscriberCard').hidden=false;$('createdSubscriber').hidden=true;$('newLabel').focus()};
$('closeCreateSubscriber').onclick=()=>{$('createSubscriberCard').hidden=true};
$('createSubscriberBtn').onclick=createSubscriber;

$('subscriberSearch').addEventListener('input',renderSubscribers);
$('subscriberStatus').onchange=()=>{subscriberFilter='';document.querySelectorAll('.summary-pill').forEach(x=>x.classList.toggle('active',x.dataset.status===$('subscriberStatus').value));renderSubscribers()};
$('subscriberSort').onchange=renderSubscribers;
document.querySelectorAll('.summary-pill').forEach(b=>b.onclick=()=>{subscriberFilter=b.dataset.status;$('subscriberStatus').value=b.dataset.status;document.querySelectorAll('.summary-pill').forEach(x=>x.classList.toggle('active',x===b));renderSubscribers()});

$('subscriberRows').addEventListener('click',e=>{
  const c=e.target.closest('.copy-user');if(c)return copyText(c.dataset.user,'تم نسخ Username');
  const r=e.target.closest('.renew-user');if(r)return openRenew(r.dataset.user);
  const p=e.target.closest('.password-user');if(p)return openPassword(p.dataset.user);
  const t=e.target.closest('.toggle-user');if(t)return toggleSubscriber(t.dataset.user,t.dataset.enable==='1',t);
  const d=e.target.closest('.delete-user');if(d)return deleteSubscriber(d.dataset.user,d);
});

$('renewModal').addEventListener('click',e=>{if(e.target===$('renewModal'))closeRenew()});
$('closeRenewModal').onclick=closeRenew;
document.querySelectorAll('.renew-options button').forEach(b=>b.onclick=()=>renewUser&&renewSubscriber(renewUser,Number(b.dataset.days)));

$('passwordModal').addEventListener('click',e=>{if(e.target===$('passwordModal'))closePassword()});
$('closePasswordModal').onclick=closePassword;
$('saveSubscriberPassword').onclick=savePassword;
$('newSubscriberPassword').addEventListener('keydown',e=>{if(e.key==='Enter')savePassword()});
$('passwordResult').addEventListener('click',e=>{
  if(e.target.id!=='copyPasswordResult')return;
  const user=$('serverUsername').value,password=$('serverPassword').value,host=String(state?.baseUrl||'').replace(/\/+$/,'');
  copyText(`Host: ${host}\nUsername: ${user}\nPassword: ${password}`,'تم نسخ بيانات الدخول');
});

$('exportSubscribersBtn').onclick=()=>{
  if(!allSubscribers.length)return toast('لا يوجد مشتركون للتصدير','error');
  const rows=[['username','label','status','expires_at','max_connections','note']];
  for(const a of allSubscribers){
    const st=subscriberStatus(a);
    rows.push([a.username,a.label||'',st.key,a.expiresAt||'',a.maxConnections||1,a.note||'']);
  }
  const csv='\uFEFF'+rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`blofy-subscribers-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  toast('تم تصدير المشتركين','success');
};

$('createdSubscriber').addEventListener('click',e=>{
  if(e.target.id!=='copyCreatedSubscriber'||!lastCreated)return;
  copyText(`Host: ${lastCreated.host}\nUsername: ${lastCreated.username}\nPassword: ${lastCreated.password}\nM3U: ${lastCreated.m3u}`,'تم نسخ بيانات المشترك');
});

$('testAccountBtn').onclick=testAccount;
$('togglePassword').onclick=()=>{const i=$('serverPassword');i.type=i.type==='password'?'text':'password';$('togglePassword').textContent=i.type==='password'?'إظهار':'إخفاء'};
$('serverUsername').addEventListener('input',renderAccessLinks);
$('serverPassword').addEventListener('input',()=>{renderAccessLinks();setServerBadge('neutral','غير مختبر')});
$('copyAllBtn').onclick=()=>{const c=currentCredentials();if(!c.username||!c.password)return toast('أدخل كلمة السر أولًا','error');copyText(`Host: ${c.host}\nUsername: ${c.username}\nPassword: ${c.password}\nM3U: ${$('m3uValue').textContent}`,'تم نسخ بيانات السيرفر')};
document.querySelectorAll('.copy').forEach(b=>b.onclick=()=>{const t=$(b.dataset.copy).textContent;if(!t||t==='—'||t.includes('أدخل'))return toast('أدخل كلمة السر أولًا','error');copyText(t)});
document.querySelectorAll('.copy-input').forEach(b=>b.onclick=()=>copyText($(b.dataset.input).value));

$('searchBtn').onclick=()=>loadCatalog(true);$('searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')loadCatalog(true)});$('sourceFilter').onchange=()=>loadCatalog(true);$('kindFilter').onchange=()=>loadCatalog(true);
$('catalogPrev').onclick=()=>{catalogOffset=Math.max(0,catalogOffset-PAGE_SIZE);loadCatalog()};$('catalogNext').onclick=()=>{catalogOffset+=PAGE_SIZE;loadCatalog()};
$('arabicSearchBtn').onclick=()=>loadArabic(true);$('arabicSearch').addEventListener('keydown',e=>{if(e.key==='Enter')loadArabic(true)});
$('arabicPrev').onclick=()=>{arabicOffset=Math.max(0,arabicOffset-PAGE_SIZE);loadArabic()};$('arabicNext').onclick=()=>{arabicOffset+=PAGE_SIZE;loadArabic()};
$('arabicFilters').addEventListener('click',e=>{const b=e.target.closest('[data-kind]');if(!b)return;arabicKind=b.dataset.kind;document.querySelectorAll('#arabicFilters [data-kind]').forEach(x=>x.classList.toggle('active',x===b));loadArabic(true)});

Promise.all([refresh(),loadSubscribers()]).then(([s])=>{if(s.syncing)waitForSync().catch(()=>{})}).catch(()=>{});
