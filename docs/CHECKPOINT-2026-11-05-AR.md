# نقطة الاستئناف — 5 نوفمبر 2026 — M179

- المصدر الحالي /workspace/FBS؛ نسخة النشرGit في/workspace/setup/github-delivery-m171. لا تعيد استخراجZIP قديم فوقهما.
- M178 Windows فعليًا اجتاز155فحص.NET وتثبيت وإزالةالمثبّتين وفحص93ملفًا مثبتًا وحمايةملفغيرتابع. run41867613957؛ المصدر والدليلعلىdownloads/m178-validated-windows-r2.
- محاولاتMac أمس فشلتلعدم تخصيصRunner؛ أعدنااليوم على26Intel/ARM. IntelM178run41973228251/job127066041182 نجحالبناء والتثبيتوالفحوص ويجريالنشرعندآخرمراجعة. ARMM178run41973601547/job127067236272 اجتازJS ويجريالبناء. لا تفترضنتيجةغيرمراجعة.
- M179 يضيفمكتبةملفاتتنظيممستقلة lab-profiles.json حتى10ملفات، لا تعزلشبكاتأواعتمادات. التحميلإلىالمسودةفقط، وتطبيقهصريحعبرحفظإعداداتالمعمل. حذفملفلايحذفالمعملالحالي.
- فُصلتكتابةJSONالذريةفيatomic-json-store.js، معحفظمخططlab-settings.json القديم. تحققتاختباراتM177القديمة؛ اصلاحUnicode normalizationبعدهفحصحد60محرفًا. المكتبةالجديدةلاتستبدلالملفالتالف، ورقمالمراجعةوالقفلتمنعتعارضالكتابة.
- نموذجProfilesيتحققمنقابليةملفالتنظيمللتطبيقضمنحد64KiBللإعداداتالنشطة؛ المكتبةحدها1MiB.
- نجح1488اختبارJS قبلإضافةفحصحدحجمالملف، والفحصالثامن الجديدنجحمستقلًا؛ التشغيلالكاملالنهائيجارٍفي/tmp/fbs-m179-js-final.log والمتوقع1489 دونافتراضحتىتكتملالنتيجة. ChromiumM179نجحمعرجوعM178 والرسائل/الملفات/البثومعالجةالتعارض والحذف.
- نُشرNativeWindows0.179.0-preview محليًا إلى/workspace/setup/windows-m179؛ يجريإنشاءNSISفي/workspace/setup/m179-installers. لاتدّعاختبارWindowsM179 قبلتشغيلفحصه.
- صلاحيةGitHubوالنشرممنوحةسابقًا، لا تطلبها مجددًا. لا تغيرmain أوتنشرإعداداتالبيئة. الفروعbuild/m175-macos-* وbuild/windows-m176-checks-* تعملللفحوص؛ استخدمفرعًاجديدًا لأنتحديثفروعموجودةكانيفشلcommit_refs500.

## آخر تقدم

- اكتمل1489JS النهائي بلا فشل/تخطٍّ: /tmp/fbs-m179-js-final.log. ChromiumالنهائيبعدحمايةEnterنجح:/tmp/fbs-m179-browser-final.log؛ صورة/workspace/outputs/FBS-Classroom-M179-Profiles.png.
- MacM178 اكتملفعليًا علىIntel وARM:Intelrun41973228251/releasem178-macos-preview-14-1 وARMrun41973601547/releasem178-macos-arm-preview-3-1. نُزلتPKG/DMGIntelالأربعوتحققتSHA256 وصيغxar/koly، وتقاريرIntel/ARM تحت/workspace/outputs/M178-Mac-final.
- M179 featureda19bb5، وإصلاحEnterf13b729؛ الحزم النهائيةيجبأنترتبطبالمصدرf13b729 لاالبناءالأول. MacIntelالنهائيrun41974556464/job127070289085 وARMrun41974577926/job127070355860.
- WindowsM179 التغليفالأولقديملإصلاحEnter؛ تجاهلهللتسليم. النهائي/workspace/setup/m179-installers-r2 و/tmp/fbs-m179-installers-final.log. مرحلةالحمولة/workspace/setup/m179-installer-stage حُدثتapp.js بعداكتمالالتغليفالأول.
- بعداكتمالNSIS النهائي:أنشئTest-M179-Installed.ps1 منTest-M178 معالبصماتالجديدة، وانسخpayload-Teacher/Student.json إلىwindows/nsis/m179-ci، ثمارفعالحزمتينإلىفرعdownloads/m179-preview قبلتشغيلWindowsCI الذيينزلهما.

## نتيجة التسليم النهائية M179

- WindowsM179 run41975128335/job127072073053 اجتاز155.NET والتثبيتوالإزالةوحمايةملفغيرمعروف، مع97ملفًا مثبتًا. ملفاتEXEالنهائية من/workspace/setup/m179-installers-r2؛ SHAمثبتفي/workspace/outputs/FBS-Classroom-M179-Windows-Installer-Verification.json. أُعيدتنزيلالاثنينمنGitHubوتحققتالبصمات.
- Intelالمصححrun41974556464/job127070289085 نجحونشرm179-macos-preview-18-1؛ tagيطابقf13b7294971836b96cefe83bd0fa6f7f044ee409. حزمPKG/DMGالأربعوتقاريرهافُحصتSHAوصيغxar/koly وتوجد/workspace/outputs/M179-Mac-final.
- ARMإعادةالتشغيلrun41975217557/job127072358668 نجحتونشرتm179-macos-arm-preview-6-1؛ مصدر42af480 يختلففقطبتشخيصالـworkflow عنمصدرالتطبيقf13b729. تقريرARMيثبتselfCheckHostArchitecture=arm64 والتثبيتوالإزالة. توجدARM-*.json معتقاريرIntel.
- ARMالمحاولةrun41974577926 فشلتبعدتوقيعالطالبقبلنشرالحزم؛ سببهاغيرمؤكدلأنGitHubأسقطنهايةالتشخيص. حسّنتالـworkflow ليعرضآخر8أسطروأعدتالتشغيلدونتغييرالتطبيقفنجح. لا تدعأنالسببتمتشخيصهأوأنكلGUIاُختبرت.
- لا تستخدمm179-macos-preview-16-1 أوarm-preview-4-1 للتسليمالنهائي؛ هماقبلإصلاحEnter. استعملpreview-18-1 أوarm-preview-6-1.
- الخطوةالقادمةبعدهذهالمرحلة:لا تكررM179أوتستخدماختباراتM178 كدليلبديل؛ القفلنظاميًاوالتحكمومطابقةالواجهةوالقبولالفعليمازالتبحاجةتطوير/تحقق. لا توجدجلسةتحكمبجهازالمستخدم؛ لديهWindowsواحدولميبلغعنإجراءاختبارفعلي.

## M180 — قيد إنهاء التحقق والتغليف

- أضيفت مساعدة محدودة مستقلة عن مسار التحكم القديم: حركة مؤشر نسبية ونص Unicode عادي فقط، بعد تثبيت عنوان المعلم وبصمته ومشاركة الشاشة الكاملة وموافقة محلية. لا نقر أو اختصارات أو Enter.
- الموافقة بحد أقصى دقيقتين، ومهلة تجديد ست ثوانٍ، وصورة حديثة، ومؤشر إيقاف ظاهر. ينهي إيقاف المشاركة أو تغير العملية أو فقد الصلاحيات الجلسة، ولا تُستعاد الموافقة تلقائيًا.
- المصدر الأساسي 1debb36؛ إضافة اختبارات إيقاف المشاركة ورفض صفحة التقاط قديمة في3114a4c لا تغير كود التطبيق.
- Windows owned input run41982970269/job127097086148 نجح بكل المشاريع السبعة، بما فيها نافذة يملكها الاختبار، ونص عربي وEmoji ورفض الإدخال معShift. لا يثبت هذا اختبار شبكة إلى سطح مكتب المستخدم.
- نجح1499JS في/tmp/fbs-m180-js-release.log. آخر إعادة أثناء ضغطNSIS فشلت في مهلة اختبار الرسائلM173 فقط:1498/1499؛ السبب غير محسوم، ويجب إعادة الاختبار بعد اكتمال التغليف دون تغيير المهلة أو تجاهل الفشل. اختبارM180TLS الأخير10/10نجح.
- MacIntel المصححrun41982973174/127097094899 وARMrun41983173466/127097725340؛ راجع النتيجة الفعلية قبل تسليم الحزم. لا يُفترض اختبارCGEvent الحقيقي أوAccessibility من مجرد نجاح البناء.
- يجريNSIS تحت/workspace/setup/m180-installers والحمولة تحت/workspace/setup/m180-installer-stage. لا تسلّم قبل فحص البصمات والتثبيت الفعلي.

## التسليم المتحقق M180

- نجح Windows النهائي run41983722170/job127099478943 بكل الخطوات:185.NET، واختباراتAPI/TLS، وتثبيت وإزالة المثبّتين، وفحص584ملفًا مثبتًا، وتشغيلNode والحفاظ على الملف غير المملوك.
- ملفاتEXE فيdownloads/m180-preview تحتdownloads/M180؛ SHA المعلم0c96e4eabcd1853cc51939295f17deb39ba0c17df59c963aa8f691ceff9d9239 والطالبa1e5628accff1ca8d91793c529de3b66696bccb695372c4842462acd44a777c1. أُعيد تنزيلهما والتحقق من الحجم والبصمة.
- نجح MacIntel النهائيrun41982973174 وARMrun41983173466. Intelrelease m180-macos-preview-22-1 عند1debb36؛ ARMrelease m180-macos-arm-preview-7-1 عند3114a4c. الفرق اختبار فقط، وكودالتطبيق واحد. لا تسلمpreview-21-1 الأقدم.
- نُزلت حزمIntelالأربع وتحققتSHAوصيغxar/koly. تقاريرIntel/ARM في/workspace/outputs/M180-Mac-final؛ كل منهمايثبت بنيةالمضيف والتثبيتوالإزالةوالـloopback، ولا يثبتCGEvent الفعلي أوأذوناتAccessibility.
- إعادةJS النهائية بعدNSIS نجحت1499/1499 بلا تخطٍّ في/tmp/fbs-m180-complete-retry.log؛ السبب الدقيق لمهلةM173 السابقة غير مؤكد. Chromiumالنهائي نجح في/tmp/fbs-m180-browser-release.log.
- التقرير العربيdocs/M180-RESULTS-AR.md والدليلdocs/M180-ASSISTANCE-AR.md. المرحلة ما زالتPreview؛ لا نقر أواختصارات أوتحكمكامل أوقفلحسابنظام، ولا اختبارمعملفعلي.

## M181 — التحكم وقفل الحساب والتصميم

- طلب المستخدم صراحةً إكمال التحكم والقفل والتصميم واختبار الأجهزة. أكد توفر Windows وMac، لكن لا يوجد وصول مباشر لهما ولا تقارير فعلية بعد.
- المصدر الأساسي للتحكم2458d9b، والتصميم الأخير9a19955، وتجديد اختبار النقل وتشخيصCI في3ff3e71، واحتياطيDMG في5f06da5. نسخةالنشر الحاليةdownloads/m181-preview عند4f4a69c تتضمن مثبّتيWindows وحزمةاختبارالأجهزة وTest-M181-Installed.ps1 وبصمات584ملفًا.
- Windowsreadiness run41985458798 ثم41986058603 نجحا بفحوصالمشاريعالسبعة:حركة ونصUnicode ونقرةCtrl+A وEnter فينافذةيملكهاالاختبار. الاختبارالنهائيأضيفإليهScroll/Drag وفحصالإفلات، ولا يُفترضنجاحهحتىrun41987165867/job127110517507 النهائي.
- مصدرWindowsالحالي0.181.0-preview منشورإلى/workspace/setup/windows-m181. الحمولة/workspace/setup/m181-installer-stage. التغليفالأول/workspace/setup/m181-installers قديمقبلترتيبالأعمدة؛ النهائي/workspace/setup/m181-installers-r2 مع/tmp/fbs-m181-installers-final.log. البصماتوأحجامالتنزيلأعيدالتحققمنGitHub.
- SHAالمعلم860ff2a5fab255db47e536981a2096f21eb3160dbf591281cd78bd58484484f4 والطالب06b461260f26f84c222f685026c923aef4a461bff51f9526cfef4f17db79bc16. الحزمةالجديدةFBS-Classroom-M181-Device-Tests.zip ببصمة91a68463f672577a61877d8b59bcad2133f360222b5daf229221ca3cb162d4f6.
- نجح1502JS في/tmp/fbs-m181-js.log. اختبارالنقلالنهائيبعدتجديدleaseنجح13/13 في/tmp/fbs-m181-transport-final.log. Chromiumالنهائيبعدالأعمدةنجحفي/tmp/fbs-m181-browser-final-r2.log وصورة/workspace/outputs/FBS-Classroom-M181-Desktop.png.
- MacIntelr2 run41986063029 فشلفيJS دونتشخيصدقيق؛ أضيفتشخيصمحدودللـworkflow. ARMr2run41986067255 فشلفيDMGNoSpaceعندنسخNodeداخلالصورة؛ أضيفت128MiBمساحةاحتياطيةوصيغةHFS+صريحة. لا تفترضالمعالجةحتىنتيجةالمحاولةالنهائية.
- MacالنهائيالمطلوبIntelr5run41986694465/job127108991926 وARMr5run41986698311/job127109004021 عند5f06da5؛ استخدمحزمهمافقطعندالنجاح، لاالحزمالأوليةالأقدم. انتهىJSبنجاحفيكليهماعندآخرمراجعةويجريالبناء.
- اختباراتالقفلالفعليوCGEvent/AccessibilityعلىMacوشبكةالجهازينالفعليينمازالتغيرمنفذة. WindowsLockWorkStationوMacCtrlCmdQطلباتمحليةبتأكيدمستقل، وليستإثباتًاحدوثالقفل. لا يوجدفتحقفلعنبعد.

## تسليم M181 المتحقق

- Windows النهائي41987165867/job127110517507 نجح بكل الخطوات و198.NET (25owned-input)، وتثبيت وإزالةالمثبّتين وبصمات584ملفًا وNode وحمايةملفغيرمملوك، وتحليلصياغةPowerShellالمجمّع.
- Intelr5run41986694465 نجحبتجهيزالمعلم ثمفشلإنشاءDMGالطالببـResourceBusy. أضيفتإعادةمحاولةمحدودةثلاثمراتلمرشحاتداخلwork المملوكبدونحذفملفاتالمستخدم. مصدرالتغليفedb41dc3ce1ed80fd93ea166be6162ef02e35d73.
- Intelr6run41987727361/job127112366199 نجحونشرm181-macos-preview-34-1 عندedb41dc؛ ARMr5run41986698311/job127109004021 نجحونشرm181-macos-arm-preview-12-1 عند5f06da5. كودالتطبيقواحد؛ الفرقفيالتغليفوفحوصCIوملفاتنشرWindows. لا تستخدمالحزم24/28/30للتسليمالنهائيالجديد.
- نجحت1502JS علىالمضيفين وChromiumالنهائي. المساعدةالجديدةتحت/assistv2 وتدعمClick/Scroll/Drag/Keys ونصUnicode؛ /controlالقديممازالمعطّلًا.
- قفلWindowsLockWorkStationوMacCtrlCmdQبتأكيدمحليمنفصلينهيالتحكمقبله، وفتحالقفلبكلمةالمرورمحليًا. لا تدّعاختبارالقفلالفعليأووصولمباشرلأجهزةالمستخدم:أكدتوفرWindowsوMacلكنلميرسلنتائجحتىالآن.
- حزمةاختبارالأجهزةونُسخWindowsتحتdownloads/m181-preview/downloads/M181؛ ستُنشرالتقاريروالمصدرالنهائيفيdownloads/m181-final. تقاريرMacوبصماتالحزمفي/workspace/outputs/M181-Mac-final.

## M182 — تجربة المعمل والتسليم

- المستخدم قدم صورة تجربةفعليةM179 وطلب عرضشاشةالمعلم تلقائيًا دونقبول/رفض، وملءالشاشة، وتشغيل/إيقافالجميع. أكدEthernet. لا تُفسرالتلقائيةعلىأنهاالتقاطخفي لشاشةالطالب؛ هيعرضالمعلمفقط.
- NativeMacBroadcastWindow فيStudentViews.swift جديدبحدودNSScreen وبدونtitlebar، ويفتح تلقائيًامنhost.ready ويختفيعندتقادم/إيقافالبث. WindowsTeacherBroadcastFormborderlessprimarytopmost، وعرضهتلقائيمنPoll؛ مُنعالإغلاقالعاديأثناءالصورةالحديثة. مهلةWindowsالنهائيةStopwatchmonotonic.
- classroom-power.js جديد: طلباتpowerTTL30s مقيدةبالمفتاحوالجهازوالمهلة والتكرار، وحفظwake-devices.jsonذريًا للأجهزةالمعتمدة، وWakeMagicPacketلـEthernetبـUDP9داخلشبكاتخاصة. start/wakeيتطلبانteacherAuth وOriginصحيحًا وتأكيدالمعلم. nativeprivatelocalPowerبعدACKreceivedفقط؛ لاShellغيرمقيّد. NativePowerUIيحتاجعنوانوبصمةالمعلممثبتينصراحةًومفتاحاعتمادمحفوظ.
- MacSystemEventsيحتاجAutomationمرةواحدةعندالإعداد؛ لا تتجاوزTCC. Windowsshutdown/s أو/r/t0بلا/f، وسكونAPIالنظام. الإرساللايثبتالإطفاء. WakeمنسكونمحتملحسبالعتادولايمكنضمانتشغيلMacمطفأبالكاملخصوصًاAppleSilicon.
- جرىخطأGitمحلي: Root/workspace/FBSأصبحذوفرعوتاريخأولي50f157e ناقصالتتبع. فروعM182r1المبنيةمنهغيرصالحةللتسليم. لا تعُدلاستخدامGitrootللنشر. نسخةالنشرالكاملة/workspace/setup/github-delivery-m171 هيالمعتمدة. المصدرالصحيحfc4e44ed1fa7868430f31430bb68dd699e4e9cc1 ثمWindowsmonotonicb83a904. لاforcepushولاmainchanges.
- نجاح1512JS:/tmp/fbs-m182-js.log. نجاحPowerTLSوالموديل10/10:/tmp/fbs-m182-power-tests.log. PowerGate13/13(بدونOSPower):/tmp/fbs-m182-power-gate-final.log. Chromium:/tmp/fbs-m182-browser.log. الصورة/workspace/outputs/FBS-Classroom-M182-Power.pngمنبياناتاختبار.
- MacIntelrun41990809762/job127122330355 وARMrun41990812443/job127122339009 نجحا. tagsIntel m182-macos-preview-37-1 وARM m182-macos-arm-preview-14-1 كلاهماfc4e44e. تقارير/حزمSHAوصيغxar/kolyتحت/workspace/outputs/M182-Mac-final. تحقق40ملفًاJS/publicبالبصماتمعالمصدرالحالي. NativeMacGUI/Automationوالطاقةالفعليلمتُختبرعلىالمعملالمصحح.
- Windowsreadinessr2run41990805598 نجح9مشاريع؛ r3run42016011934/job127206616172 نجحبعدmonotonic. النهائيrun42016890437/job127209537109 نجح222.NET والتثبيت/الإزالة وبصمات586ملفًا وNode وحمايةunknown-file وتحليلPSCollector. القوةالحقيقيةللإطفاء/الإيقاظغيرمختبرةوموسومةكذلك.
- التغليفالأولي/workspace/setup/m182-installers أُوقفحاويتهالمملوكةقبلالتسليمليدخلتحسينالمهلة. النهائي/workspace/setup/m182-installers-r2 من/workspace/setup/m182-installer-stage-r2 وNative/workspace/setup/windows-m182-r2؛ /tmp/fbs-m182-installers-final.log.
- WindowsassetsوDeviceTests.zipعلىdownloads/m182-preview عند1af06a9. SHAالمعلمd80c00603a83e65c5598fb82d10d72c89f36d1e5b51c040b044819547187bc52 والطالب8abdaa1afe98548cd2314b893f5279888f6f5b5eddf88065680a8ce99e70eb4b. حزمةالأجهزةfce9f37c5a28bf66b2051349e0b742180bab3495540bd72b2033cd7fcf59d67e. راجعتنزيلهاالعامقبلالتسليم.
- تقريرdocs/M182-RESULTS-AR.md ودليلdiagnostics/M182-DEVICE-TESTS-AR.md. الخطوةالفعليةالتالية:تجربةطالبM182ومعلمM182علىMacواحدثمبقيةالمعملواستلامنتائجالبثملءالشاشةوالسكون/Wakeوالطاقة. لا تستنتجنتيجةعتادمننجاحpacketSentأوانقطاعالشبكة.
