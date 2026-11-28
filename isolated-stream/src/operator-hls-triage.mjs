// Evidence-scoped reasons for an already completed, owner-only HLS probe.
// No FFmpeg decoding, provider queries, subscriber inference or auto-repair.
const STATUS=new Set(['queued','running','transport_verified','transport_failed',
  'failed','skipped','unknown','cancelled']);
const CODE=new Set(['ok','unknown','timeout','cancelled','path_not_active',
  'path_gone','probe_not_started','probe_unavailable']);
const AUDIO_REVIEW=new Set(['ac3','eac3','truehd','dts','aac-latm']);
const safeCount=v=>Number.isSafeInteger(v)&&v>=0&&v<=1_000_000?v:null;
const reason=(level,code,title,nextStep)=>({
  level,code,title,nextStep,audioDecoded:false,videoDecoded:false,
  scope:'operator_hls_transport_and_bounded_ts_pmt_sample_only'
});
export function diagnoseOperatorHlsResult(result){
  if(!result||!STATUS.has(result.state))
    return reason('unknown','result_unavailable',
      'نتيجة فحص غير متاحة','أعد تحميل النتائج من لوحة الفحص؛ لا تعتبر القناة سليمة.');
  const state=result.state,tracks=result.tracks;
  if(state==='queued'||state==='running')
    return reason('pending','probe_pending','العينة قيد الانتظار أو الفحص',
      'تابع حالة الطابور؛ لم تصدر نتيجة قابلة للحكم بعد.');
  if(state==='cancelled')
    return reason('unknown','probe_cancelled','لم يُفحص هذا المسار',
      'تم إيقاف جدولة الفحص قبل دوره؛ لا توجد نتيجة تشغيل.');
  if(state==='skipped')
    return reason('unknown','path_not_active','المسار لم يعد نشطًا',
      'افحص حالة قناة المشرف، ولا تفتح اتصالًا جديدًا دون مراجعة حد المصدر.');
  if(state==='unknown')
    return reason('unknown','transport_unconfirmed','انتهت المهلة أو غابت النتيجة',
      'راجع اتصال المحرك وسجلات المشرف؛ لا تفترض نجاح النقل أو فشله.');
  if(state==='failed'||state==='transport_failed'||result.transportVerified!==true){
    const code=CODE.has(result.code)?result.code:'transport_failed';
    return reason('review',code,'تعذر إثبات وصول مقطع HLS صالح',
      'راجع أخطاء النقل والصلاحيات والاتصال بالسيرفر؛ لا تغيّر مسارات العملاء تلقائيًا.');
  }
  if(!tracks||typeof tracks!=='object')
    return reason('unknown','ts_metadata_unavailable','وصل HLS لكن معلومات المسارات غير متاحة',
      'شغّل تشخيص PMT على عينة مصرح بها. الوصول للملف لا يثبت وجود صوت وصورة.');
  const packets=safeCount(tracks.observedPackets);
  const audio=safeCount(tracks.audioPayloadPackets);
  const video=safeCount(tracks.videoPayloadPackets);
  const audioGaps=safeCount(tracks.transportAudioAnomalies);
  const videoGaps=safeCount(tracks.transportVideoAnomalies);
  const codecs=Array.isArray(tracks.audioCodecs)?tracks.audioCodecs.filter(v=>typeof v==='string'):[];
  const videoCodecs=Array.isArray(tracks.videoCodecs)?tracks.videoCodecs.filter(v=>typeof v==='string'):[];
  if(tracks.audioTrackDeclared===false)
    return reason('review','pmt_no_audio','PMT لا يعلن مسارًا صوتيًا في العينة',
      'تأكد من المصدر والبرنامج الصوتي؛ تغيير مشغل التطبيق لن ينشئ صوتًا غير موجود.');
  if(tracks.audioTrackDeclared===true&&packets!==null&&packets>=300&&audio===0)
    return reason('review','audio_packets_not_observed','لم تُرصد حزم صوت في نافذة العينة',
      'راجع استمرارية TS ومقطعًا آخر مرخصًا؛ النتيجة لا تثبت صمت القناة بشكل دائم.');
  if(packets!==null&&packets>=300&&video===0)
    return reason('review','video_packets_not_observed','لم تُرصد حزم صورة في نافذة العينة',
      'راجع تسلسل TS ومسار الفيديو؛ شاشة سوداء على جهاز واحد وحدها ليست دليلًا.');
  if((audioGaps!==null&&audioGaps>0)||(videoGaps!==null&&videoGaps>0))
    return reason('review','ts_continuity_anomaly','رُصدت فجوات نقل TS في العينة',
      'افحص ثبات الاتصال والتقطّع؛ فجوات العداد لا تثبت وحدها فشل فك الترميز.');
  if(codecs.some(v=>AUDIO_REVIEW.has(v)))
    return reason('review','audio_codec_compatibility','ترميز الصوت المرصود يحتاج مراجعة توافق الأجهزة',
      'قارن التشغيل على Android 9 وWindows قبل اقتراح تحويل AAC لمسار المشرف فقط.');
  if(tracks.audioTrackDeclared===null||!videoCodecs.length)
    return reason('unknown','track_evidence_incomplete','وصل HLS لكن دليل المسارات غير كافٍ',
      'اطلب عينة TS أخرى مصرح بها؛ لا تعتبر عدم ظهور PMT دليل غياب الصوت.');
  if(audio!==null&&audio>0&&video!==null&&video>0)
    return reason('observed','transport_packets_observed','رُصد نقل حزم صوت وصورة في العينة',
      'استكمل اختبار فك الترميز والاستماع على جهاز حقيقي قبل اعتماد القناة.');
  return reason('unknown','track_payload_unconfirmed','وصول HLS ثابت، لكن حزم الوسائط غير مؤكدة',
    'راجع مدة الرصد ووجود PMT والحزم، ثم اختبر فك الترميز على جهاز فعلي.');
}
export function summarizeOperatorHlsRuns(runs=[]){
  const totals={runs:0,paths:0,review:0,observed:0,unknown:0,pending:0};
  for(const run of Array.isArray(runs)?runs.slice(0,5):[]){
    if(!run||!Array.isArray(run.results))continue;
    totals.runs++;
    for(const row of run.results.slice(0,2)){
      const diagnosis=diagnoseOperatorHlsResult(row);
      totals.paths++;
      if(diagnosis.level==='review')totals.review++;
      else if(diagnosis.level==='observed')totals.observed++;
      else if(diagnosis.level==='pending')totals.pending++;
      else totals.unknown++;
    }
  }
  return {
    ...totals,
    completeCatalogVerified:false,
    decodedAudioVerified:0,
    decodedVideoVerified:0,
    explanation:'هذه أعداد ضمن آخر خمس عمليات فحص يدوية مؤقتة، وليست نتائج جميع القنوات.'
  };
}
