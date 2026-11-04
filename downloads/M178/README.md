# FBS Classroom M178 — حجب عرض مؤقت

نافذة تركيز للطالب أثناء الشرح، مع الإيقاف من المعلم، وزر إنهاء محلي وEsc، وانتهاء تلقائي عند فقد التجديد. هذه نافذة داخل التطبيق، وليست قفلًا لحساب النظام ولا تحجب اختصاراته.

## Windows x64

- [مثبّت المعلم EXE](https://github.com/F0500322988/FBS/raw/refs/heads/downloads/m178-preview/downloads/M178/FBS-Classroom-Teacher-M178-Setup-PREVIEW.exe)
- [مثبّت الطالب EXE](https://github.com/F0500322988/FBS/raw/refs/heads/downloads/m178-preview/downloads/M178/FBS-Classroom-Student-M178-Setup-PREVIEW.exe)
- [المصدر ZIP](https://github.com/F0500322988/FBS/raw/refs/heads/downloads/m178-preview/downloads/M178/FBS-Classroom-M178-Source.zip)

الحزم غير موقّعة وتجريبية. نجح البناء واستخراج93ملفًا والتحقق من بصماتها؛ تشغيل المثبّتين وتجربة برنامج الطالب الكامل لم يُنفذا. نجح1480اختبارJavaScript و137فحص.NET محمولًا واختبارChromium.

[اختبارWindows/WinForms الجديد](https://github.com/F0500322988/FBS/actions/runs/41865123015) في انتظار جهازGitHub عند آخر مراجعة؛ لا تعتبره ناجحًا قبل اكتماله.

أغلق التطبيقين وأزل النسخة التجريبية السابقة قبل التثبيت في المسار نفسه. على جهازWindows واحد سيغطي الطالب لوحة المعلم عند الحجب؛ استخدمEsc أوزر الإنهاء المحلي للعودة.

## Mac / iMac

المصدر يستهدفmacOS13+ وIntel وAppleSilicon. [بناءPKG/DMG المصحح](https://github.com/F0500322988/FBS/actions/runs/41865372433) في انتظار جهازGitHub؛ حزمM178 لم تُنتج بعد. نجح فحص صياغةSwift علىLinux، وهو لا يعادل بناءAppKit علىMac.

حزمMac السابقةM176 على[صفحة الإصدارات](https://github.com/F0500322988/FBS/releases) لا تحتويميزاتM177/M178. راجع [الدليل العربي](M178-START-HERE.md) و[تقرير التحقق](M178-Validation-Summary.json) قبل التجربة.
