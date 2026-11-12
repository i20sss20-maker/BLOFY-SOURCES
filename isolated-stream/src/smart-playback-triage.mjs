// BLOFY Smart Playback Health — deterministic, read-only recommendations from
// already-sanitized cross-service observations. A transport hint is NEVER a
// claim that a client's decoder plays audible audio or visible video.
// No device/customer/provider identities, URLs, media probes or code writes.
const RULES={
  provider_admission_refused:{area:'source',severity:'high',action:'verify_provider_entitlement',
    cause:'provider_refusal_or_rate_limit',
    title:'المصدر يرفض بعض الطلبات أو يقيّدها',
    advice:'راجع صلاحيات المصدر وحدّ الاتصالات المسموح به مع مزود الخدمة. لا تتجاوز 403/429/456 ولا تكرر الطلبات تلقائيًا.'},
  provider_upstream_transient:{area:'network',severity:'high',action:'review_provider_transport',
    cause:'provider_transport_instability',
    title:'أخطاء نقل مؤقتة بين البوابة والمصدر',
    advice:'قارن أوقات 408/5xx مع سجلات الشبكة والمصدر. تحقق من استقرار الاتصال دون تغيير الأكواد أو توجيه العملاء.'},
  gateway_media_interrupted:{area:'transport',severity:'high',action:'inspect_http_stream_lifecycle',
    cause:'direct_http_transfer_interrupted',
    title:'انقطاع اتصال بعد بداية نقل الوسائط',
    advice:'افحص إغلاق HTTP المبكر وسبب الانقطاع في بوابة Xtream، ثم اختبر التشغيل على جهاز مصرح به.'},
  relay_provider_failures:{area:'relay',severity:'low',action:'check_recent_relay_events',
    cause:'historic_relay_provider_error',
    title:'تعثرات مسجلة بمصدر Relay منذ تشغيل السيرفر',
    advice:'راجع التوقيت والاتجاه الحالي للأخطاء قبل اعتبارها مشكلة قائمة؛ العدد تراكمي منذ التشغيل.'},
  relay_audio_ts_transport_anomaly:{area:'audio',severity:'medium',action:'check_input_ts_audio',
    cause:'relay_audio_ts_continuity_signal',
    title:'مؤشرات اضطراب في حزم الصوت على Relay',
    advice:'راجع عينة TS ومدتها وتأكد من توافق الصوت على جهاز الاختبار. قفزات CC/TEI لا تثبت الصمت.'},
  operator_audio_ts_transport_anomaly:{area:'audio',severity:'medium',action:'check_input_ts_audio',
    cause:'operator_audio_ts_continuity_signal',
    title:'مؤشرات اضطراب في حزم صوت مسار المشرف',
    advice:'تحقق من عينة MPEG-TS ونتيجة اختبار الصوت على الجهاز، دون تبديل المصدر تلقائيًا.'},
  relay_video_ts_transport_anomaly:{area:'video',severity:'medium',action:'check_input_ts_video',
    cause:'relay_video_ts_continuity_signal',
    title:'مؤشرات اضطراب في نقل صورة Relay',
    advice:'افحص TS ثم جرّب فك ترميز الصورة على الجهاز. القفزات ليست دليلًا على شاشة سوداء.'},
  operator_video_ts_transport_anomaly:{area:'video',severity:'medium',action:'check_input_ts_video',
    cause:'operator_video_ts_continuity_signal',
    title:'مؤشرات اضطراب في نقل صورة مسار المشرف',
    advice:'قارن عينة الفيديو بمشغل مصرح به؛ لا تغيّر المسار تلقائيًا.'},
  relay_pmt_audio_missing:{area:'audio',severity:'medium',action:'check_source_audio_tracks',
    cause:'relay_pmt_audio_undeclared',
    title:'جدول PMT على Relay لم يعلن مسارًا صوتيًا',
    advice:'راجع جدول المسارات الصوتية في عينة أحدث ثم افحص التشغيل فعليًا؛ قد تتغير المسارات أثناء البث.'},
  operator_input_pmt_no_audio:{area:'audio',severity:'medium',action:'check_source_audio_tracks',
    cause:'operator_pmt_audio_undeclared',
    title:'جدول PMT بمسار المشرف لم يعلن صوتًا',
    advice:'راجع PMT وأصل الصوت بعينة حديثة. عدم إعلان الصوت ليس تشخيصًا نهائيًا للصمت.'},
  operator_audio_packets_not_seen_in_sample:{area:'audio',severity:'medium',
    action:'inspect_audio_payload_and_decoder',cause:'audio_payload_absent_sample',
    title:'لم تظهر حزم صوت في عينة كاملة من مسار المشرف',
    advice:'تحقق من المسار الصوتي وصيغته واختبر سماع الصوت على الجهاز، فقد تفوّت العينة القصيرة الحزم المتأخرة.'},
  operator_video_packets_not_seen_in_sample:{area:'video',severity:'medium',
    action:'inspect_video_payload_and_decoder',cause:'video_payload_absent_sample',
    title:'لم تظهر حزم فيديو في عينة كاملة من مسار المشرف',
    advice:'راجع حزم الفيديو ثم اختبر الصورة على الجهاز. غياب الحزم في العينة لا يثبت سواد الشاشة.'},
  relay_audio_codec_support_review:{area:'decoder',severity:'medium',
    action:'test_android9_audio_decoder',cause:'relay_audio_decoder_compatibility_possible',
    title:'قد يحتاج ترميز الصوت على Relay إلى مشغل متوافق',
    advice:'افحص توافق AC3/EAC3/DTS/AAC-LATM على جهاز Android 9 أو Windows متأثر، ولا تغيّر محرك التشغيل قبل اختبار A/B.'},
  operator_audio_codec_support_review:{area:'decoder',severity:'medium',
    action:'test_android9_audio_decoder',cause:'operator_audio_decoder_compatibility_possible',
    title:'قد يتطلب ترميز صوت مسار المشرف مراجعة توافق',
    advice:'اختبر فك ترميز الصوت على جهاز فعلي ومشغل بديل مصرح به. وجود مسار PMT لا يثبت أن الصوت مسموع.'},
  edge_gateway_5xx_last5m:{area:'edge',severity:'high',action:'review_edge_gateway_5xx',
    cause:'edge_gateway_error',
    title:'أخطاء Edge إلى البوابة خلال آخر خمس دقائق',
    advice:'راجع أوقات 5xx وزمن استجابة البوابة؛ هذه طلبات رؤوس HTTP وليست جلسات تشغيل مكتملة.'},
  edge_gateway_denied_last5m:{area:'edge',severity:'medium',
    action:'check_gateway_auth_and_provider_rate_limits',cause:'edge_denied',
    title:'طلبات Edge مرفوضة خلال آخر خمس دقائق',
    advice:'تحقق من صلاحية الكود وحدود الطلبات المعلنة دون الالتفاف على رفض المزود.'},
  media_engine_auth_failure:{area:'engine',severity:'high',
    action:'review_mediamtx_control_auth',cause:'media_engine_auth_issue',
    title:'فشلت مصادقة واجهة MediaMTX الداخلية',
    advice:'راجع مطابقة بيانات تحكم MediaMTX دون عرض الأسرار أو إيقاف محرك الفيديو.'},
  media_engine_control_unavailable:{area:'engine',severity:'medium',
    action:'review_mediamtx_internal_connectivity',cause:'media_engine_control_unavailable',
    title:'تعذر قياس محرك MediaMTX الداخلي',
    advice:'تحقق من خدمة MediaMTX وواجهة التحكم الخاصة. لا تعتبر غياب الإحصاء إثبات توقف القنوات.'},
  operator_restream_recent_probe_failure:{area:'restream',severity:'medium',
    action:'review_recent_first_byte_probe',cause:'operator_restream_first_byte_failure',
    title:'فشل فحص حديث لوصول أول بيانات الفيديو',
    advice:'افحص نتيجة الفحص الحديثة لمسار المشرف. لا يعكس هذا جميع قنوات العملاء.'},
  gateway_catalog_missing:{area:'catalog',severity:'low',action:'review_catalog_sync',
    cause:'gateway_catalog_entry_missing',
    title:'طلبات محتوى غير موجود بالفهرس',
    advice:'راجع المزامنة والتصنيفات دون حذف بيانات العملاء أو فرض إعادة مزامنة شاملة.'},
  gateway_auth_rejected:{area:'auth',severity:'low',action:'review_local_gateway_auth',
    cause:'local_gateway_auth_rejected',
    title:'رفض وصول محلي في بوابة Xtream',
    advice:'راجع صلاحية العميل أو الحساب المحلي؛ ليس دليل تعطل المصدر.'}
};
const SORT={high:0,medium:1,low:2};
const num=(value,max=100000)=>typeof value==='number'&&
  Number.isSafeInteger(value)&&value>=0&&value<=max?value:null;
const validTime=(value)=>Number.isSafeInteger(value)&&value>0?value:null;
export const SMART_ACTION_CODES=Object.freeze([...new Set(Object.values(RULES).map(v=>v.action))]);
export function analyzeSmartPlaybackHealth(report,{now=Date.now()}={}){
  if(!Number.isSafeInteger(now)||now<0)
    throw Error('smart_playback_invalid_clock');
  if(report?.ok!==true||!report.observations||!Array.isArray(report.problems))
    return {ok:false,status:'unknown',code:'smart_playback_evidence_unavailable',
      evidenceAvailable:false,incidents:[],recommendations:[],
      actualDecodedAudioVerified:false,actualDecodedVideoVerified:false};
  const observations=report.observations;
  const coverage={
    gateway:observations.gateway?.dataAvailable===true,
    relay:observations.relay?.dataAvailable===true,
    relayTracks:observations.sharedRelayTracks?.dataAvailable===true,
    restream:observations.operatorRestream?.dataAvailable===true,
    mediaMtx:observations.mediaMtx?.dataAvailable===true,
    edge:observations.edge?.dataAvailable===true,
    directTransfers:observations.direct?.dataAvailable===true
  };
  const cards=[];
  for(const entry of report.problems.slice(0,80)){
    const rule=RULES[entry?.code],count=num(entry?.count);
    if(!rule||count===null||count===0)continue;
    cards.push({
      code:entry.code,cause:rule.cause,
      severity:rule.severity,area:rule.area,count,
      title:rule.title,actionCode:rule.action,action:rule.advice,
      evidenceScope:['gateway_last_hour','relay_since_boot','relay_input_sample',
        'mediamtx_current','edge_last_5m','operator_restream_recent',
        'operator_restream_tracks'].includes(entry.scope)?entry.scope:'unknown',
      // No inference proves client A/V, source entitlement or global viewers.
      conclusion:'suspected_from_server_indicators',
      devicePlaybackVerified:false,autoRepairAvailable:false
    });
  }
  cards.sort((a,b)=>SORT[a.severity]-SORT[b.severity]||
    b.count-a.count||a.code.localeCompare(b.code));
  const incidents=cards.slice(0,14);
  const omissions=Object.entries(coverage).filter(([,ok])=>!ok).map(([key])=>key);
  const actions=[...new Set(incidents.map(x=>x.actionCode))].slice(0,8);
  if(omissions.length)actions.push('check_missing_telemetry');
  if(incidents.some(x=>x.area==='audio'||x.area==='decoder'))
    actions.push('verify_audio_on_real_device');
  const status=omissions.length?'partial':
    incidents.some(x=>x.severity==='high')?'attention':
    incidents.length?'review':'observed_no_flagged_events';
  return {ok:true,readOnly:true,actionsTaken:0,status,checkedAt:validTime(report.checkedAt)||now,
    evidenceAvailable:true,
    coverage,missingLayers:omissions,
    knownIncidents:cards.length,incidentsTruncated:cards.length>14,
    incidents,recommendations:[...new Set(actions)].slice(0,10),
    actualDecodedAudioVerified:false,actualDecodedVideoVerified:false,
    audibleSoundVerified:false,uniqueViewersMeasured:false,
    providerRedistributionRightsVerified:false,
    ruleVersion:'playback-triage-1',
    note:'Warnings are from bounded server observations only. Follow manual read-only recommendations and verify affected playback on authorized Android/Windows devices; no automatic source switching, transcoding or license-limit bypass.'};
}
