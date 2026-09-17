# BLOFY SOURCES — Open Media Xtream Gateway

مشروع مستقل لتجميع **محتوى مفتوح أو قابل لإعادة الاستخدام وفق ترخيص/إرشادات واضحة** في كتالوج واحد، ثم تقديمه بصيغتي **Xtream Codes API** و **M3U** من Host واحد.

> هذا المشروع ليس جزءًا من BLOFY PLAYER ولا يعتمد عليه.

## ماذا يفعل؟

- يجمع Live / Movies / Series Episodes من مصادر متعددة.
- يوحّد التصنيفات والهوية والأرقام داخل Catalog واحد.
- يوفر `player_api.php` / `panel_api.php` المتوافقة مع أشهر Xtream Players.
- يوفر `get.php` لإخراج M3U Plus.
- يوفر مسارات `/live/...` و`/movie/...` و`/series/...`.
- لا يعيد استضافة ملفات الفيديو افتراضيًا؛ يحل رابط المصدر ثم يرسل `302 Redirect` للمصدر الأصلي.
- يحتفظ بمعلومات الترخيص والمصدر لكل عنصر.
- لوحة إدارة عربية لإنشاء Server / Username / Password، المزامنة، فحص المصادر والبحث في الكتالوج.

## المصادر الحالية

### Internet Archive
يُستخدم Advanced Search ويُقبل فقط المحتوى الذي يحمل `licenseurl` متوافقًا مع CC0 / CC BY / CC BY-SA / Public Domain. يتم استبعاد NC/ND في هذه النسخة.

### Wikimedia Commons
يتم قراءة `imageinfo + extmetadata` وفحص الترخيص آليًا قبل الإدخال.

### PeerTube
يتم قبول تراخيص PeerTube IDs: 1 (BY)، 2 (BY-SA)، 7 (Public Domain)، 8 (No known restrictions). المحتوى NSFW يُستبعد.

### NASA Image and Video Library
يستخدم API الرسمي. إرشادات NASA تنطبق، ويجب تجنب أي مادة موسومة بحقوق طرف ثالث.

### IPTV-org
مدعوم للبث المباشر لكنه **معطل افتراضيًا**. المشروع نفسه يجمع روابط بث متاحة للعامة، لكن هذا ليس ضمانًا لترخيص إعادة التوزيع لكل قناة. لا تفعله إلا بعد مراجعة الاستخدام المقصود.

## التشغيل

```bash
cp .env.example .env
# اضبط ADMIN_PASSWORD و SESSION_SECRET و PUBLIC_BASE_URL
node src/server.mjs
```

ثم افتح:

```text
http://localhost:8080/admin
```

## إعداد Player

من لوحة الإدارة أنشئ بيانات Xtream، ثم استخدم:

```text
Server:   https://your-host.example
Username: generated-user
Password: generated-password
```

أو رابط M3U الذي يظهر في نفس الصفحة.

## Endpoints

```text
GET /health
GET /player_api.php?username=...&password=...
GET /player_api.php?username=...&password=...&action=get_live_categories
GET /player_api.php?username=...&password=...&action=get_live_streams
GET /player_api.php?username=...&password=...&action=get_vod_categories
GET /player_api.php?username=...&password=...&action=get_vod_streams
GET /player_api.php?username=...&password=...&action=get_series_categories
GET /player_api.php?username=...&password=...&action=get_series
GET /player_api.php?username=...&password=...&action=get_vod_info&vod_id=...
GET /player_api.php?username=...&password=...&action=get_series_info&series_id=...
GET /get.php?username=...&password=...&type=m3u_plus&output=ts
GET /live/:username/:password/:id.ts
GET /movie/:username/:password/:id.mp4
GET /series/:username/:password/:episodeId.mp4
```

## التخزين

الكتالوج وبيانات حساب Xtream تحفظ في `DATA_DIR` (افتراضيًا `./data`). في Railway/Azure/أي Container platform استخدم Volume إذا أردت بقاء بيانات الحساب عبر إعادة النشر. حتى بدون Volume يمكن إعادة مزامنة الكتالوج من المصادر.

## ملاحظات الحجم

ابدأ بالقيم الافتراضية ثم ارفع `IA_LIMIT`, `WIKIMEDIA_LIMIT`, `PEERTUBE_LIMIT` تدريجيًا بعد مراقبة الذاكرة وزمن المزامنة. Internet Archive وحده يحتوي على ملايين عناصر الفيديو، لذلك الهدف هو **مكتبة كبيرة لكن مُفلترة الحقوق** لا مجرد جمع أكبر عدد من الروابط.
