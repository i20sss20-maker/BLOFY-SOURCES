# BLOFY SOURCES — Arabic-first Xtream Gateway

مشروع مستقل لتجميع **محتوى مفتوح أو مجاني رسميًا وفق سياسة المصدر** في كتالوج واحد، ثم تقديمه من Host واحد بصيغ **Xtream Codes + M3U + XMLTV**.

> المشروع مستقل عن تطبيق BLOFY PLAYER. عند نشره على Azure يحافظ على بوابة BLOFY الحالية ويضيف Xtream بدون كسر مسارات الموقع القديمة.

## الواجهة

عند تشغيله كخدمة مستقلة يمكن فتح لوحة الإدارة مباشرة. وعند دمجه مع بوابة Azure الحالية تكون لوحة Xtream على:

```text
/xtream
```

وتبقى المسارات القديمة مثل `/portal` و`/admin` و`/downloads` موجهة إلى خدمات BLOFY الحالية.

لوحة Xtream مبسطة إلى:

- الرئيسية
- المشتركون
- العربي
- المكتبة
- اختبار السيرفر

## إدارة المشتركين

يدعم أكثر من حساب Xtream في نفس الوقت:

- إنشاء Username/Password تلقائيًا أو يدويًا.
- مدة 30 / 90 / 180 / 365 يوم أو بدون انتهاء.
- تجديد الاشتراك المنتهي **بنفس Username وPassword**.
- تعطيل وتفعيل الحساب.
- تحديد عدد الاتصالات.
- حالة نشط / منتهي / قريب الانتهاء / معطل.
- كلمة السر تحفظ كـ `scrypt hash + salt` ولا تحفظ كنص صريح.

## Xtream / M3U

```text
GET /player_api.php?username=...&password=...
GET /panel_api.php?username=...&password=...
GET /player_api.php?...&action=get_live_categories
GET /player_api.php?...&action=get_live_streams
GET /player_api.php?...&action=get_vod_categories
GET /player_api.php?...&action=get_vod_streams
GET /player_api.php?...&action=get_series_categories
GET /player_api.php?...&action=get_series
GET /player_api.php?...&action=get_vod_info&vod_id=...
GET /player_api.php?...&action=get_series_info&series_id=...
GET /get.php?username=...&password=...&type=m3u_plus&output=ts
GET /get.php?username=...&password=...&type=m3u_plus&output=m3u8
GET /xmltv.php?username=...&password=...
GET /live/:username/:password/:id.ts
GET /movie/:username/:password/:id.mp4
GET /series/:username/:password/:episodeId.mp4
```

ردود Xtream الكبيرة تُرسل تدريجيًا عبر streaming مع gzip عند دعم اللاعب لذلك، لتجنب بناء كتالوج 100k+ كاملًا في الذاكرة قبل الإرسال. و`category_id=0` / `all` / `*` تعامل كـ "كل المحتوى" لرفع التوافق مع اللاعبين.

## العربي أولًا

### Live

`Free-TV` مصدر البث المجاني الأساسي. قبل إضافة القنوات:

- تستبعد روابط صفحات YouTube / Twitch / Dailymotion / Facebook التي ليست stream مباشرًا.
- تصنف السعودية والخليج والعالم العربي تحت `عربي · ...`.
- القنوات العربية تمر بفحص وصول؛ 404/410 وصفحات HTML تستبعد.
- الحجب الجغرافي أو timeout لا يؤدي إلى حذف القناة تلقائيًا حتى لا نستبعد بثًا قد يعمل عند المستخدم النهائي.

### VOD / Series

- Internet Archive: CC0 / CC BY / CC BY-SA / Public Domain مع بحث عربي مستقل وفهم صيغ `الحلقة` / `الموسم` / `الجزء`.
- Wikimedia Commons: فيديو مفتوح مع بحث عربي مستقل ومواد عربية مرخصة.
- PeerTube: تراخيص مفتوحة فقط، NSFW مستبعد، وبحث عربي أولًا عبر عدة instances.
- NASA: مكتبة الفيديو الرسمية مع تطبيق إرشادات المصدر.
- IPTV-org موجود لكنه معطل افتراضيًا لأن توفر رابط عام لا يساوي ضمان حق إعادة التوزيع.

## التخزين الدائم

محليًا يستخدم `DATA_DIR`.

على Azure Container Apps يدعم Azure Blob تلقائيًا عبر **Managed Identity** بدون Storage Key داخل الكود. الملفات الدائمة:

```text
state.json    # حسابات Xtream المشفرة/المهشمة ومدة الاشتراك
catalog.json  # الكتالوج وحالة المصادر
```

المتغيرات:

```text
AZURE_STORAGE_ACCOUNT=...
AZURE_CLIENT_ID=...
BLOFY_BLOB_CONTAINER=blofy-xtream
```

إذا Managed Identity غير متاح يرجع تلقائيًا للتخزين المحلي.

## Azure

الملف:

```text
.github/workflows/deploy-azure.yml
```

مصمم لتحديث **`blofy-gateway` الموجود** بدل إنشاء موقع بديل. يقوم بـ:

1. تشغيل check + tests.
2. تسجيل الدخول إلى Azure عبر OIDC.
3. اكتشاف ACR / Storage / Key Vault / Managed Identity الحالية.
4. بناء الصورة ودفعها إلى ACR.
5. ربط أسرار الإدارة من Key Vault بدون كشف قيمها.
6. تحديث صورة البوابة ومتغيراتها فقط.
7. الإبقاء على `blofy-activation` و`blofy-releases` كخدمات upstream.
8. فحص `/health` و`/xtream` ومسارات الموقع القديمة بعد النشر.

يتطلب متغيرات GitHub Actions التالية في هذا المستودع:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
BLOFY_AZURE_RG
```

ويجب أن يكون Federated Credential الخاص بـOIDC مسموحًا لمستودع `i20sss20-maker/BLOFY-SOURCES`.

## التشغيل المحلي

```bash
cp .env.example .env
npm ci
npm run check
npm test
npm start
```

ثم استخدم `/xtream` في وضع البوابة الموحدة، أو API endpoints مباشرة.

## الحجم الافتراضي

```text
IA_LIMIT=6000
IA_SERIES_LIMIT=2500
IA_ARABIC_LIMIT=2500
WIKIMEDIA_LIMIT=1200
WIKIMEDIA_ARABIC_LIMIT=800
PEERTUBE_LIMIT=3000
PEERTUBE_ARABIC_LIMIT=800
NASA_LIMIT=700
FREE_TV_LIMIT=4000
```

الهدف هو **مكتبة كبيرة قابلة للتشغيل ومفلترة الحقوق**، وليس مجرد أكبر عدد من الروابط.
