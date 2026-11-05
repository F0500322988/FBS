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

## M183 — واجهة المرجع على Windows وMac

- طلب المستخدم تطبيق شكل الصورة على النظامين. أُنشئ `public/reference-theme.css` وأُعيد تنظيم HTML مع إبقاء الوظائف والمعرّفات. الشريط الأيسر والرأس والشبكة والإجراءات والمشاركة والإعدادات ونافذة الطالب مطبقة. العودة من العروض المستقلة عبر زر الشريط، والأدوات الإضافية من قائمة المعلم السفلية.
- حالة الطالب الفعلية عبر `/status/local` محمي برمز محلي ويرفض Origin؛ تعتمد على أحدث heartbeat TLS واعتماد الجهاز، ويصل اسم المعمل من المعلم. لا يُعرض اتصال أخضر بمجرد تشغيل التطبيق.
- نافذة الطالب الجديدة WinForms/AppKit مع إعدادات منفصلة، ورسوم قبعة. إعداد Mac الطويل قابل للتمرير، وإعداد الطالب المحفوظ يبدأ الاتصال عند الفتح. الإيقاف المحلي وفحوص انتهاء صلاحية التحكم قبل الشبكة محفوظة.
- فحص المتصفح21 جهازًا كشف معاينة خارج الحاوية وقائمة طويلة تخفي بدء المشاركة؛ صُححتا وأضيف تحقق للموقع والزر. المصدر التشغيلي النهائي Mac `65cc25d`، Windows native `300c209`، واختبار مثبّتاته من `1445e2c`. كل ملفات JS/public الحالية تطابق مرحلتيWindows وحمولتيMac:41 ملفًا لكل دور.
- JavaScript1513/1513 بلا فشل/تجاوز، `/tmp/fbs-m183-js-release.log`. Chromium regression `/tmp/fbs-m183-browser-final2.log` وvisual `/tmp/fbs-m183-visual-final.log` نجحا. صور `/workspace/outputs/M183-UI` بيانات اختبار معلّمة فقط.
- Windows النهائي run42029666946/job127252584422 نجح10 مشاريع231 تحققًا، تثبيت وإزالة المثبّتين،588 بصمة ملفات مثبتة،Node، حمايةunknown-file، وصياغة جامعPowerShell. بناء `/workspace/setup/m183-installers-r2` من `/workspace/setup/m183-installer-stage-r2`، وسجل `/tmp/fbs-m183-installers-r2.log`.
- فرعWindows `downloads/m183-preview` عند1445e2c. SHAالمعلم `58df89a0b0ec9bdca1551c57fdd8552706ab66d7e04c11275ee41589a8d48851` والطالب `2a7cb40cf74ca69dc07953de5e1ff8b8d5e9c9069c5bb666892ee00d2de667d7`. تحقق تنزيل الرابطين العامين بالبصمات. حزمةالأجهزةSHA `4adcbcbcac9f370bb44a18e1319cc920e0a06ace92151e85d597128062c8ff4d`.
- Mac ARM النهائيrun42029031804/job127250424264 نجح ونشر `m183-macos-arm-preview-18-1` بحزمUniversal للمعلم والطالبPKG/DMG. تم تنزيل الأربع والتحققSHAوصيغxar/koly؛ نتائج `/workspace/outputs/M183-Mac-final` وسجل `/tmp/fbs-m183-mac-arm-download.log`. صورةAppKit خارج الشاشة من حزمة المصدر النهائي.
- عند كتابة هذا السطر، تشغيلIntelالنهائي42029026374 لا يزال قيد البناء؛ لا يُفترض نجاحه. تشغيلIntelالسابق42028692768 نجح البناء/اختباراتالحزمة ثم فشل رفعArtifact بسبب timeout من خدمةGitHub؛ لا يعني فشل البرنامج، ولا يوجد إصدارReleaseمنه. النتائج النهائية تُضاف أدناه عند التحقق.
- لا تغييراتعلىmain، لا اختبارجديدفعليعلىأجهزةالمستخدم، لا توقيعWindows، لاDeveloper ID/notarization. واجهةالمعلم التشغيليةمتصفح مشتركة، وتهيئةالمعلمالأصلية منفصلة. لا ادعاء تطابقبكسلي مع اختلافإطارالنظاموالخطوط/DPI.

- تحديث ختامي M183: نجحIntel النهائي42029026374/job127250405220 بكامل الخطوات، ونشرm183-macos-preview-45-1 من65cc25d. تقاريره نُزّلت ببادئةIntel- إلىM183-Mac-final. أُزيلت حالة الانتظار من تقرير النتائج النهائي.

## M184 — حزمة تهيئة المعمل (العمل الجاري)

- طلب المستخدم حزمة تقلل الإعداد اليدوي بعد تثبيت M183 على الطلاب. لا تتوفر إعدادات/أسرار معمله في السحابة؛ الأدوات العامة تُنشئ ملفه الخاص محليًا على جهاز المعلم، دون طلب إرسال المفتاح.
- إضافة `windows/FBS.LabSetup` أداة Console self-contained win-x64 (0.184)، تربط كود M183 الفعلي لقراءةTeacherConnectionSettings وStudentPairingKeyStore وStudentTeacherConnectionSettings. Teacher export يقرأDPAPI ويحسبSHA256 للشهادة الفعلية، يختارLAN-IP إن لزم، ويصدرمجلدًا خاصًا علىDesktop. Student import يتطلبطالبM183 مثبتًا ومغلقًا، يحفظالمفتاحDPAPI والاتصالالمثبت وينطلقالتطبيق. لا يستبدلإعدادًا مختلفًا/ناقصًا، ويحفظالهوية؛ القفلوتراجعالملفالمملوك يمنعانالكتابةالمتزامنة/الضياع.
- إضافة `deployment/m184/LabSetup.swift` أداةUniversal تستخدمKeychain ونفسConnectionConfig/PlatformServices الخاصةM183. تحفظبإضافةفقطولا تستبدل إعدادًا مختلفًا. تُصرّح صراحةً لملفM183الطالبالمثبت بقراءةعنصرKeychain معالأداة، ولا تمنح صلاحياتTCC. تصدرالبصمةمنالشهادةالموجودةولا تنشئشهادةإذاكانتغيرموجودة. الطالبفي`/Applications` وبإصدار0.183.0مطلوب.
- الملفالخاص`lab-profile.json` نسخةنقلمقروءةمنمفتاحالمعمل+عنوانالمعلم+منفذ4180+البصمة، لاكلمةمرورالمعلمولاTLSprivatekeyولاstudentidentity. يُحمى600/700علىMac وACLcurrentUser+SYSTEMعلىWindows، لكنUSB/exFAT/المشاركةالمنقولة تحتاجحفظًاخاصًا. لايُرفعالمجلدالخاصإلىGitHub/المحادثة. أضيفإلى.gitignore وإلىمرشحSourceZIP. الحزمةالعامةلايتضمنهاملفإعدادحقيقي.
- أربع launchers Windows.cmd / Mac.command وREADME-AR.md ينسخهاالمعلممعالأداتين. حزمةواحدةتدعمOSمختلطًا. لا تغييرلمثبّتاتM183أومحتوىالواجهةأوموافقةالتقاط/مدخلاتالطالبأو أذوناتالنظام أو تسجيلدخول/تشغيلتلقائيعندإقلاعالنظام. اعتمادكلجهازمازالمنالمعلمبعداتصاله. الحسابالحاليمطلوب؛ ليسMDMلكلحساباتالجهاز.
- `deployment/m184/ProvisioningChecks.swift` و`KeychainConsumerCheck.swift`: خدماتKeychainاختباربأسماءUUID؛ Readerمستقلموقّعad-hocيرفضغيرnamespaceالاختبارويستعملAuthenticationUIFailلإثباتالقراءةالمصرحبهادونحوار. Readerلايُنشرضمنالحزمة.
- workflow `.github/workflows/lab-kit-m184.yml`: Windowsيبنيالأداةويجري39تحققDPAPIوإعدادM183فعلي، ينشرhelper +log. Macmatrix[macos-26-intel,macos-15] يبنيUniversal، يتحققlipo/codesign ويجريالاختباراتثمZipعامبأسماءمسموحةفقطويرفعمباشرةإلىRelease (دوناعتمادعلىArtifactService). `package-kit.py` يرفضlab-profileفيoutputويتحقق9مدخلات، معصلاحياتتنفيذMacفيZIP.
- دليل `M184-START-HERE.md` ومسودةREADMEفيrootأحدثمنCIفيجملتيمنفذ4180وموقعApplications؛ يمكنتحديثالنصبالإصدارالنهائيللحزمةمحليًادونإعادةبناءالأدوات.
- تنبيهGit: root `/workspace/FBS` تاريخهالقديمناقص؛ أثناءأولنشرM184 أُنشئخطأًr1منه، وحُذفالفرعالبعيدالخاصبهفورًا. لايُستخدمالتزام7d3edabللتسليم. sourceالفعليالكامللا يزالclone`/workspace/setup/github-delivery-m171`. فروعr2(20c0d6d),r3(dc03838),r4(9c400ad),r5(dd38742),r6(26e4f63) منتاريخM183الكاملdca1b1e. لاmainتغيرولافرضpush.
- Windows39/39نجحتعلىCIمرات:run42041106262(2),42041887588(3),42042776598(4),42043390709(5),42043969491(6). سجلأولنجاح`/workspace/outputs/M184-Evidence/Windows-provisioning-checks.log`. Nativepublishمحلي`/workspace/setup/m184-windows-helper`، سجل`/tmp/fbs-m184-helper-publish.log`. helper.exeنحو155MiBقبلZIP. لااختبارعلىأجهزةالمستخدم.
- الفشلالأوليMacفيr2/r3كانأمرlipoبترتيبخاطئ؛ صُححإلى`lipo "$file" -verify_arch arm64 x86_64`. البناءSwiftتجاوزالترجمةفيهما،لكنلاتدعنجاحKeychain. r4/r5مازالتبعضاختباراتهاقيدالتنفيذ/الانتظارعندكتابةهذهالنقطة؛ يوجداحتمالانتظارحوارloginKeychainفيRunner. لهذاr6ينشئCIkeychainمملوكًاومفتوحًافيworkdirمؤقت، يحفظdefault/searchالسابقويستعيدهويحذفمخزنالاختبارفقطعبرtrap. هذاCIفقطولايمسKeychainالمستخدم.
- **تشغيلالتسليمالحاليr6** `42043969491`:Windowsjob127301824034نجح؛Macjobs127302729837 و127302730096قيدالانتظارعندآخرقراءة. مراقب`python3 /workspace/setup/check-m184-ci.py 42043969491` يدعمmatrixpublicHTMLبـX-Requested-With:XMLHttpRequest. لاGitHubAPIمتاحمنالسحابةولاتجاوزالسياسة. رنregressionWindows231+مثبّتيM183`42043969237/job127301824244` مازاليعملعندآخرقراءة.
- Releasesالمتوقعةعندنجاح6: `m184-windows-kit-6-1`، `m184-lab-kit-macos-26-intel-6-1` و`m184-lab-kit-macos-15-6-1`. لا تعتمدوجودحزمةMacقبلتحققالنجاحوالتنزيلوبصماتSHA.
- مايبقى:انتظار/إصلاحr6حتىنجاححفظوقراءةKeychainوالConsumerبدونUIعلىCPUالمتاح، تنزيلZIPوالأدلةومراجعة9مدخلاتوصيغPE/MachOوصلاحياتMacوخلوهامنملفالحزمةالخاص، إعدادM184results/validation/downloadguide، sourceZIPمن`/workspace/setup/source-zip-m184.py`، حفظكلذلكعلىفرع`downloads/m184-final`جديدفيcloneالكامل، والتحققمنالرابطالعامقبلالردالعربي. إناستُبدلREADMEمحليًابعدتنزيلZIP، أعدالتغليفمنالقائمةالمسموحةبنفسhelperبصماتهمثمالتحققمنSHAجديد. لمتُستخدمأيمفاتيححقيقيةولايُطلبمنالمستخدمإرسالها.

### تسليم M184

- نجح Mac Intel النهائي في run42043969491/job127302730096 بكل خطوات البناء والتغليف والنشر. نجح 41 تحققًا، منها برنامج قارئ مستقل مع AuthenticationUIFail. نجح Windows39 في job127301824034. الاختبار يخص مخزن Keychain مؤقتًا ومفتوحًا في Runner؛ لا يُفترض منه نجاح أذونات المستخدم الفعلية.
- نُشرت حزمة CI على Release `m184-lab-kit-macos-26-intel-6-1`. نُزّلت إلى `/workspace/outputs/M184-Final/CI-Lab-Setup-Kit.zip` مع CI-SHA256SUMS، وتحقق SHA، وتسعة مداخل فقط، وPE x64 وMach-O بمعماريتي arm64/x86_64، وصلاحيات تنفيذ Mac وغياب ملف المعمل الخاص. تقرير `Kit-verification.json`؛ سكربت التحقق `/workspace/setup/verify-m184-kit.py`.
- أُعيد تغليف ZIP بعد تحسين نص README العربي، مع الحفاظ على بايتات الأداتين المختبرتين بالبصمات. النهائي `/workspace/outputs/M184-Final/package/FBS-Classroom-M184-Lab-Setup-Kit.zip`، حجم65822860، SHA `fbae6767a8d5e52443f45b611a5b42e22cb5662a09047bac275174eedf3cd20f`. برنامج package-kit.py يقتصر على القائمة المسموحة. تغيير النص فقط لا يبدل الإعداد أو المتطلبات.
- نجح أيضًا رن Regression Windows42043969237/job127301824244 بكامل الخطوات،231 تحققًا وتثبيت/إزالة M183 وبصمات588 ملفًا. لم تُعد مجموعة1513 كاملة محليًا لهذه المرحلة؛ كودJavaScriptللتطبيق لم يتغير.
- بقي Apple Silicon job127302729837 في الانتظار عند كتابة التقرير؛ Universal مُجمّع ومتحقق المعماريتين، لكن تنفيذ أداة M184 على ARM لا يُعد ناجحًا. source26e4f63 للأدوات؛ الوثائق النهائية أحدث فقط في النص. لا اختبار على أجهزة المستخدم، ولا ملف معمل خاص مُنشأ من أجهزته.
