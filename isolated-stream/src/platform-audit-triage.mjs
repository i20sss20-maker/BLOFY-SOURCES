// Safe diagnostic triage. Suggestions are advisory only; this module NEVER
// mutates source credentials, subscriber sessions, catalog or MediaMTX paths.
const RULES=Object.freeze({
  sources_not_all_online:{priority:'high',module:'sources',
    action:'راجع المصادر المتعثرة واختبر اتصال كل مصدر يدويًا. تجنب إعادة المزامنة أثناء الانقطاع.'},
  no_enabled_sources:{priority:'high',module:'sources',
    action:'لا يوجد مصدر مفعّل. راجع المصدر ونشره وصلاحيات استخدامه قبل أي تغيير.'},
  media_listener_unreachable:{priority:'high',module:'restream',
    action:'افحص سجلات MediaMTX واتصال الشبكة الداخلية قبل محاولة إعادة التشغيل.'},
  mediamtx_control_offline:{priority:'high',module:'restream',
    action:'تحقق من واجهة التحكم الخاصة بمحرك MediaMTX وصلاحية الاتصال الداخلي.'},
  recent_playback_failures:{priority:'high',module:'diagnostics',
    action:'راجع أخطاء تشغيل المصدر والرموز 403/404/429/456؛ افحص عينة واحدة مصرحًا بها.'},
  media_relay_failures:{priority:'high',module:'diagnostics',
    action:'افصل بين أخطاء القنوات والأفلام والمسلسلات، وراجع رموز المصدر دون إعادة تشغيل جماعية.'},
  slow_playback_start:{priority:'medium',module:'diagnostics',
    action:'راجع زمن وصول أول بايت وتكرار الطلبات وأداء الجهاز قبل تغيير إعدادات التخزين المؤقت.'},
  operator_paths_failed:{priority:'high',module:'restream',
    action:'افحص مسارات HLS المتعثرة فقط. لا توقف المسارات السليمة.'},
  verified_provider_404_recorded:{priority:'medium',module:'diagnostics',
    action:'راجع العناصر ذات 404 الموثقة، ثم استخدم إعادة فحص محدودة دون حذف المحتوى.'},
  no_indexed_items:{priority:'medium',module:'library',
    action:'راجع حالة الفهرسة والمصدر، واحتفظ بآخر فهرس سليم قبل بدء مزامنة جديدة.'},
  no_playback_samples:{priority:'low',module:'diagnostics',
    action:'القياسات غير كافية؛ اختبر عينة تشغيل مصرحًا بها على جهاز حقيقي.'},
  media_listener_replied:{priority:'low',module:'restream',
    action:'استجابة HTTP لا تثبت وصول الصورة والصوت إلى المشاهد.'},
  restore_test_not_observed:{priority:'medium',module:'diagnostics',
    action:'تحقق من سياسة النسخ الاحتياطي ونفّذ اختبار استعادة في بيئة منفصلة.'},
  release_channel_not_examined:{priority:'low',module:'diagnostics',
    action:'افحص ملفات التحديث الموقّعة وتوافق الإصدار قبل النشر العام.'},
  audio_track_not_decoded:{priority:'low',module:'diagnostics',
    action:'اجمع نوع ترميز الصوت وسجل جهاز متأثر قبل تغيير محرك التشغيل.'},
  subtitle_render_not_tested:{priority:'low',module:'diagnostics',
    action:'تحقق من توقيت مسار الترجمة وتوافق الترميز في جهاز Android TV وWindows.'},
  episode_playback_not_sampled:{priority:'low',module:'diagnostics',
    action:'قارن مواسم المسلسل ومعرّفات حلقاته ثم جرّب تشغيل عينة مرخصة.'}
});
export function triagePlatformChecks(checks=[]){
  const entries=Array.isArray(checks)?checks.slice(0,35):[];
  const result=[];
  const allowed=new Set(['warning','unknown']);
  for(const c of entries){
    if(!c||!allowed.has(c.status))continue;
    const rule=RULES[c.code];
    if(!rule)continue;
    result.push({checkId:String(c.id||'').slice(0,50),
      code:c.code,priority:rule.priority,module:rule.module,
      recommendation:rule.action,requiresApproval:true,automatedChange:false});
  }
  const priority={high:0,medium:1,low:2};
  result.sort((a,b)=>priority[a.priority]-priority[b.priority]);
  return result.slice(0,12);
}
