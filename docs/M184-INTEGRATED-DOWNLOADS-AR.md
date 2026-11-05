# المثبّتات المحدثة مع أدوات التهيئة M184

تتضمن هذه الملفات البرنامج وأدوات إعداد المعلم والطلاب في تثبيت واحد. لا تحتاج تنزيل ZIP التهيئة منفصلًا. هذه حزم تجريبية للتجربة في المعمل، ولا تتضمن مفتاح معمل حقيقيًا.

| النظام | المعلم | الطالب |
|---|---|---|
| Windows 10/11 x64 | [تنزيل EXE](https://github.com/F0500322988/FBS/releases/download/m184-windows-integrated-verified-4-1/FBS-Classroom-Teacher-M184-Setup-PREVIEW.exe) | [تنزيل EXE](https://github.com/F0500322988/FBS/releases/download/m184-windows-integrated-verified-4-1/FBS-Classroom-Student-M184-Setup-PREVIEW.exe) |
| macOS 13+، Intel وApple Silicon | [تنزيل PKG](https://github.com/F0500322988/FBS/releases/download/m184-macos-preview-47-1/FBS-Classroom-Teacher-M184-macOS-Universal-PREVIEW.pkg) | [تنزيل PKG](https://github.com/F0500322988/FBS/releases/download/m184-macos-preview-47-1/FBS-Classroom-Student-M184-macOS-Universal-PREVIEW.pkg) |

[كل ملفات Windows وبصماتها](https://github.com/F0500322988/FBS/releases/tag/m184-windows-integrated-verified-4-1) — [كل ملفات Mac بصيغتي PKG وDMG وبصماتها](https://github.com/F0500322988/FBS/releases/tag/m184-macos-preview-47-1).

## بعد التثبيت

على Windows افتح **M184 Prepare Students** من قائمة ابدأ على المعلم. وعلى Mac افتح نافذة إعداد المعلم واضغط **فتح أدوات تهيئة المعمل M184**، ثم شغّل `Prepare-Teacher-Mac.command`.

انقل المجلد الخاص الناتج من سطح المكتب عبر USB موثوق إلى الطلاب. أغلق الطالب قبل الاستيراد، ثم شغّل `Setup-Student` المناسب من مجلد المعلم. يمكنك أيضًا اختيار `lab-profile.json` عبر **M184 Import Teacher Profile** في قائمة ابدأ، أو `Import-Student-Mac.command` من الأدوات المرفقة على Mac.

اعتمد الجهاز من لوحة المعلم وأكمل أذونات macOS المطلوبة. المجلد الخاص الناتج يحتوي مفتاح معملك للنقل؛ لا ترسله في المحادثة أو تنشره. لا يتضمن كلمة مرور المعلم أو مفتاح شهادته الخاص أو هوية طالب آخر.

## التحديث من المثبّت السابق

أغلق البرنامج أولًا. على Windows استخدم الإزالة المعتادة قبل تثبيت هذه الحزمة؛ المثبّت لا يستبدل مجلدًا موجودًا أو غير فارغ. لا تحذف مجلد بيانات المستخدم أو هويته، واحتفظ بأي ملفات خاصة باقية. على Mac ثبّت PKG بعد إغلاق التطبيق، أو استبدل التطبيق في Applications من DMG. قد يطلب Keychain إذن الوصول بعد تحديث تطبيق بتوقيع تجريبي.

رقم التطبيق الأساسي **0.183.0** يبقى متوافقًا مع أدوات M184، بينما مراجعة حزمة التثبيت هي **M184**. ظهور الرقم الأساسي لا يعني غياب الأدوات: الاختصارات ومجلد SetupKit هما موضع الأدوات المدمجة.

[التعليمات المرفقة بالمثبّت](../deployment/integrated/INTEGRATED-START-HERE-AR.md) — [نتائج الفحوص وحدودها](M184-INTEGRATED-RESULTS-AR.md).
