# نقطة الاستئناف — M175 — 4 نوفمبر 2026

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

## تحديث M175 — macOS / iMac

- أكد المستخدم دعم iMac Intel وApple Silicon معًا، وأذن صراحة برفع المصدر وتشغيل بناء macOS ونشر حزم PKG/DMG تجريبية.
- أُضيف macos/Sources لتطبيقي AppKit، وحفظ الإعداد في Keychain، وتشغيل Node المضمن، ورسائل الطالب وعرض شاشة المعلم. أضيف macos/build.sh وverify-payload.py واختبارات إعداد Swift وقفل بصمات Node22.23.4 الرسميتين. الحد الأدنى المستهدف macOS13.
- نُشر المصدر الأولي في build/m175-macos عند68c5c330c1bfbb16e1879d50408d53dc9ce9825e. مهمة GitHub41818786658 نجحت في اختبارات JavaScript وفشلت في تجميع Swift. لم تُنتج PKG/DMG أو يُنشر إصدار Mac بعد.
- عُدلت عزلة MainActor ومؤقتات واجهة Mac وحماية الردود القديمة واسم معمل Mac. التصحيحات محفوظة محليًا في /workspace/FBS، ونسخة الرفع /workspace/setup/github-delivery-m171 عند11e5bd2. تحديث الفرع فشل عدة مرات بخطأ GitHub الداخلي commit_refs/Internal Server Error. لا force ولا حذف فروع.
- مُنع تلقائيًا توسيع فروع workflow إلىbuild/m175-macos-*؛ سُئل المستخدم صراحة عن هذا النطاق وما زالت الموافقة مطلوبة عند كتابة النقطة. ملف workflow المحلي مُعدّ للمراجعة فقط؛ لا تنشره أو تشغّل فرعًا إضافيًا حتى تصل الموافقة.
- تحقق محلي:1454 JavaScript ناجحًا،5 اختبارات Python لمطابقة الحمولة ناجحة، وصياغة bash صحيحة. رفض سكربت Mac التنفيذ على Linux ولم ينشئ حزمة وهمية. تجميع AppKit واختبارات Keychain/GUI على Mac لم تنجح أو تُنفذ بعد.
- آخر نسخة Windows قابلة للتنزيل M174 في downloads/m174-preview. لم تُغير main ولم تنشر إعداد البيئة.

### متابعة موافقة المستخدم وبناء Mac

- وافق المستخدم صراحة لاحقًا: «نعم موافقة كاملة على جميع الخطوات التالية» بعد سؤال نطاق build/m175-macos-*. لم تعد موافقة فروع إعادة البناء معلقة؛ لا تطلبها مجددًا.
- نُشرت فروعr2 وr3 وr4 ضمن النطاق الموافق عليه. مشغّلARM فيr2 بقي queued؛ نُقل البناء إلىmacos-15-intel فيr3، مع بقاء الملف Universal للمعالجين.
- نجح تجميع Swift للمعالجين فعليًا على مشغّلIntel في41833907902؛ فشل فحصlipo بسبب ترتيب المعاملات، ثم صُحح في4a4abef ورُفعbuild/m175-macos-r4.
- نجحت23 فحوص إعداد Swift محليًا في حاويةSwift6.2، ونجح فحص صياغة ملفاتSwift كلها. هذه ليست اختبارات AppKit أوKeychain على جهاز مستخدم.
- تقرير Mac يذكر معالجSelf-check الفعلي ولا يدّعي تشغيل المعالج الآخر. لا تدّعِ إنتاجPKG/DMG حتى نجاحr4 أو أحدث وظهور الملفات.

### M175 مكتملة كحزم Mac تجريبية

- نجحr5 كاملًا في41836081806: تجميعUniversal وفحوص المصدر والحزم ومونتDMG وتثبيت/إزالةالتطبيقين وفحصالمثبتعلىMacIntel.
- الإصدارالحالي https://github.com/F0500322988/FBS/releases/tag/m175-macos-preview-5-1 ؛ آخرمصدرNativeمختبر3d9dc17. PKGحوالي75.5MBوDMGحوالي84.9MBلكلدور. نُزلتالأربعةإلى/workspace/outputsوطابقتSHA256ورؤوسXAR/UDIF.
- تقاريرمؤكدة: installedOnMacTested=true وuninstallOnIsolatedRunnerTested=true وnativeBundleSelfCheck=true وloopbackHTTPTested=true. GUI/Keychain/ScreenRecording/TwoMacLan=false. selfCheckHostArchitecture=x86_64 وotherArchitectureExecuted=false.
- 23 SwiftConfigChecksو5PythonPayloadChecksناجحةعلىMac؛1454JSمشتركةناجحة. توقيعAd-hocفقط،وليسDeveloperIDأوNotarization.
- الموافقاتمكتملةلكلالبناءوالنشرالتجريبيولفروعbuild/m175-macos-*؛لاتعدطلبها. لا تغييرmainأونشرإعدادالبيئة.
