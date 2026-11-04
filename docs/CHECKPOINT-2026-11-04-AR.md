# نقطة الاستئناف — M174 — 4 نوفمبر 2026

- المصدر الحالي `/workspace/FBS`؛ لا تُعد استخراج الأرشيف القديم فوقه.
- تم إنتاج مثبّت EXE مستقل للمعلم وآخر للطالب باستخدام NSIS؛ إصدار التطبيق الداخلي 0.170.0-preview، ومرحلة التغليف M171.
- الناتجان في `/workspace/outputs` بأسماء FBS-Classroom-Teacher-M170-Setup-PREVIEW.exe وFBS-Classroom-Student-M170-Setup-PREVIEW.exe.
- جرى استخراج المثبّتين والتحقق من أحجام وبصمات SHA256 لجميع ملفات الحمولة: 42 للمعلم و41 للطالب. تقرير الأدلة FBS-Classroom-M171-Installer-Verification.json.
- آخر تشغيل JavaScript: 1436 ناجحًا، صفر فشل. آخر فحوص .NET: 48 للإعداد وTLS و80 NativeGate على Linux؛ لا تعني تشغيل واجهة Windows.
- المثبّتان غير موقّعين. لم يُنفذ تثبيت/إلغاء تثبيت أو واجهات Windows/DPAPI على Windows فعلي. لم يُختبر جهازان على شبكة فعلية.
- دليل النسخة M171-START-HERE.md؛ أدوات إعادة البناء والتحقق في windows/nsis.
- مرجع الواجهة المطلوبة موثق في docs/UI-TARGET-AR.md؛ مطابقة الصورة واستكمال الميزات المذكورة في دليل M171 ما زالا مطلوبين. لا تصف البرنامج بأنه نهائي.
- المستخدم لديه جهاز Windows واحد ولم يشغّل Test-Windows.cmd وفق إفادته. لا توجد جلسة اتصال بجهازه تتيح تنفيذ ذلك نيابة عنه.
- لم تُنشر البيئة ولم تُرفع تغييرات GitHub أو يُشغّل workflow. احتفظ بهذا القيد.

## تحديث M172

- اكتمل تعديل واجهة المعلم في public/index.html وpublic/app.js وpublic/style.css. راجع M172-START-HERE.md.
- نجح 1436 اختبار JavaScript، ونجح اختبار Chromium الفعلي للواجهة ببيانات API محاكية؛ ملف الاختبار tests/browser/m172-workspace.cjs.
- أضيف FBS_RELEASE_STAGE لأداة بناء NSIS دون كسر المسار القديم.
- أذن المستخدم لاحقًا برفع الملفات إلى GitHub. رُفع M171 بالفعل في downloads/m171-preview بعد إلغاء تعليق ChatGPT Codex Connector؛ main لم يتغير. منع الرفع السابق لم يعد ساريًا لملفات التنزيل التي طلبها. لا تنشر إعداد البيئة.
- حمولتا M172 تستخدمان الملفات الأصلية 0.170.0-preview مع تحديث واجهة الويب؛ لا تدّعِ إعادة بناء .NET أو اختباره في هذه المرحلة.

- اكتمل بناء مثبّتي M172 والتحقق من83 ملفًا. الناتجان FBS-Classroom-Teacher-M172-Setup-PREVIEW.exe وFBS-Classroom-Student-M172-Setup-PREVIEW.exe في /workspace/outputs.

## تحديث M173

- أضيف classroom-messages.js وصفحة رسائل المعلم ونافذة TeacherMessagesForm.cs لدى الطالب، مع نقل TLS وتوقيع طلبات الطالب وتأكيد استلام/قراءة منفصلين. التفاصيل والقيود في M173-START-HERE.md.
- الإصدار الأصلي أصبح0.173.0-preview؛ أُعيد نشر Teacher وStudent ذاتيي الاحتواء دون أخطاء أو تحذيرات.
- 1445 اختبار JavaScript ناجحًا؛ تكامل رسائل TLS فعلي على Linux؛ اختبار Chromium ناجح ببيانات محاكية. .NET:48 Setup/TLS و80 NativeGate ناجحًا على Linux. لم تُنفذ واجهة Windows أو تثبيت/إزالة فعلية.
- رُفع M172 بالفعل في downloads/m172-preview؛ main محفوظ كما هو. رُفضت محاولة commit_refs مؤقتًا ثم نجحت الإعادة غير القسرية.
- تُجهز ملفات M173 في /workspace/setup/m173-installers، وحمولتها في /workspace/setup/m173-installer-stage، ونواتج النشر الأصلية في /workspace/setup/windows-m173.

- اكتمل بناء مثبّتي M173 وفحص85 ملفًا مستخرجًا بنجاح؛ نُسخ الناتجان والتقرير إلى /workspace/outputs.

## تحديث M174

- أضيف classroom-broadcast.js ومشاركة شاشة المعلم في لوحة الويب ونافذة TeacherBroadcastForm.cs في الطالب. التفاصيل M174-START-HERE.md.
- الإصدار0.174.0-preview؛ أُعيد نشر Teacher وStudent دون أخطاء أو تحذيرات.
- 1454 اختبار JavaScript ناجحًا، وتكامل TLS فعلي على Linux، وChromium مع Canvas MediaStream واختيار شاشة محاكى. .NET:48 Setup/TLS و80 NativeGate ناجحًا. تشغيل التقاط Windows ونافذة العرض والتثبيت والإزالة وDPAPI على Windows لم يُنفذ.
- رُفع M173 في downloads/m173-preview؛ إذن رفع حزم التنزيل إلى GitHub مستمر. main لم يتغير ولا يوجد إذن لنشر إعداد البيئة.
- تجهيز M174 في /workspace/setup/m174-installer-stage وبناؤه إلى /workspace/setup/m174-installers.

- اكتمل بناء مثبّتي M174 وفحص87 ملفًا مستخرجًا؛ الناتجان والتقرير في /workspace/outputs.
