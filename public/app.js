async function fbsTeacherAuth(){
 const state=await fetch('/api/auth').then(r=>r.json());
 if(!state.required||state.authenticated)return;
 const cover=document.createElement('div');
 cover.style.cssText='position:fixed;inset:0;background:#101c34;z-index:9999;display:grid;place-items:center;direction:rtl;color:white;font-family:system-ui';
 cover.innerHTML='<form style="background:#233454;padding:32px;border-radius:16px;min-width:280px"><h2>تسجيل دخول المعلم</h2><input type="password" required autocomplete="current-password" placeholder="كلمة مرور المعلم" style="padding:12px;width:100%;box-sizing:border-box;margin-bottom:12px"><button style="padding:12px;width:100%;cursor:pointer">دخول</button><p role="alert"></p></form>';
 document.body.appendChild(cover);
 cover.querySelector('form').addEventListener('submit',async e=>{
  e.preventDefault();const password=cover.querySelector('input').value;
  const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
  if(res.ok){cover.remove();location.reload();}else cover.querySelector('[role=alert]').textContent='كلمة المرور غير صحيحة';
 });
}
fbsTeacherAuth().catch(console.error);
'use strict';
let previousMonitorSnapshot=null,monitorHistory=[],monitorInterrupted=false;let roster=[];let frames=new Map();let pageNow="home";let selectedScreen=null;let lastStatusAt=0,lastStatusMode='unconfigured';
const labels={home:'الرئيسية',screens:'عرض الشاشات',broadcast:'مشاركة الشاشة',control:'التحكم عن بُعد',lock:'حجب العرض',settings:'الإعدادات',power:'طاقة الأجهزة',files:'توزيع الملفات',messages:'الرسائل',labs:'إدارة المعمل',monitor:'مراقبة الأجهزة',enrollment:'اعتماد الأجهزة'};
const el=id=>document.getElementById(id);
let deviceView='grid',refreshBusy=false,previewUnavailable=false;
const plannedPages=new Set([]);
function updatePageNotice(){
 const notice=el('notice');
 notice.hidden=true;
 if(pageNow==='enrollment'){notice.hidden=false;notice.textContent='راجع الجهاز قبل اعتماده؛ لم يتم بعد إثبات امتلاك مفتاح Windows CNG. اعتماد المعمل لا يفعّل التحكم عن بُعد.';}
 else if(pageNow==='control'){notice.hidden=false;notice.textContent='شاشات الدخول المحمية غير متاحة للتحكم؛ يلزم إذن الطالب وشاشة كاملة حديثة. قفل حساب النظام يحتاج تأكيدًا محليًا مستقلًا.';}
 else if(pageNow==='screens'){notice.hidden=false;notice.textContent=previewUnavailable?'تعذر تحديث صور الشاشات؛ أُزيلت الصور السابقة. ستُعاد المحاولة تلقائيًا.':'تظهر لقطات الشاشة عند مشاركة الطالب وموافقته فقط. نقل المعمل عبر TLS؛ التحقق الكامل من هوية كل جهاز لم يكتمل.';}
 else if(plannedPages.has(pageNow)){notice.hidden=false;notice.textContent='هذه الوظيفة قيد التطوير وغير متاحة في هذه النسخة.';}
}
function render(){
 document.body.dataset.page=pageNow;
 updateReferenceHeader();
 el('settings-frame').hidden=!['labs','settings'].includes(pageNow);
 if(pageNow==='settings'){for(const id of ['assist-panel','power-panel','pause-panel','files-panel','messages-panel','broadcast-panel','monitor-panel','view-toolbar','empty-state'])el(id).hidden=true;el('devices').replaceChildren();renderSettings();return;}
 const custom=pageNow==='monitor'||pageNow==='enrollment';
 el('view-toolbar').hidden=custom||plannedPages.has(pageNow)||pageNow==='messages';
 el('power-panel').hidden=pageNow!=='power';
 if(pageNow==='power'){for(const id of ['assist-panel','pause-panel','files-panel','labs-panel','messages-panel','broadcast-panel','monitor-panel','view-toolbar','empty-state'])el(id).hidden=true;el('devices').replaceChildren();renderPowerDevices();loadPower();return;}
 el('assist-panel').hidden=pageNow!=='control';
 if(pageNow==='control'){el('view-toolbar').hidden=true;el('files-panel').hidden=true;el('labs-panel').hidden=true;el('messages-panel').hidden=true;el('broadcast-panel').hidden=true;el('pause-panel').hidden=true;el('devices').replaceChildren();el('empty-state').hidden=true;renderAssistanceDevices();return;}
 el('pause-panel').hidden=pageNow!=='lock';
 if(pageNow==='lock'){el('view-toolbar').hidden=true;el('files-panel').hidden=true;el('labs-panel').hidden=true;el('messages-panel').hidden=true;el('broadcast-panel').hidden=true;el('devices').replaceChildren();el('empty-state').hidden=true;renderPauseRecipients();return;}
 el('labs-panel').hidden=pageNow!=='labs';
 if(pageNow==='labs'){settingsTab='labs';renderSettings();el('view-toolbar').hidden=true;el('files-panel').hidden=true;el('messages-panel').hidden=true;el('broadcast-panel').hidden=true;el('devices').replaceChildren();el('empty-state').hidden=true;return;}
 el('files-panel').hidden=pageNow!=='files';
 if(pageNow==='files'){el('view-toolbar').hidden=true;el('messages-panel').hidden=true;el('broadcast-panel').hidden=true;el('devices').replaceChildren();el('empty-state').hidden=true;renderFileRecipients();return;}
 el('broadcast-panel').hidden=pageNow!=='broadcast';
 el('messages-panel').hidden=pageNow!=='messages';
 if(pageNow==='broadcast'){el('view-toolbar').hidden=true;el('devices').replaceChildren();el('empty-state').hidden=true;renderBroadcastRecipients();return;}
 if(pageNow==='messages'){el('devices').replaceChildren();el('empty-state').hidden=true;renderMessageRecipients();return;}
 el('empty-state').hidden=true;
 el('devices').classList.toggle('list-view',!custom&&deviceView==='list');
 if(pageNow==='monitor'){renderMonitor();return;}
 if(pageNow==='enrollment'){renderEnrollment();return;}
 if(plannedPages.has(pageNow)){el('devices').replaceChildren();return;}
 const q=el('search').value.trim().toLowerCase();
 const filtered=groupRoster().filter(s=>s.id.toLowerCase().includes(q));
 el('visible-count').textContent=`عرض ${filtered.length} من ${roster.length} جهاز`;
 el('empty-state').hidden=filtered.length>0;
 el('empty-state').textContent=lastStatusAt===0?'بيانات الأجهزة غير متاحة حاليًا':roster.length===0?'لا توجد أجهزة مسجلة بعد. شغّل تطبيق الطالب واتصل بالمعلم، ثم راجع صفحة اعتماد الأجهزة.':'لا توجد أجهزة تطابق البحث';
 el('devices').replaceChildren(...filtered.map(s=>{
  const c=document.createElement('article');c.className='device'+(s.online?'':' offline')+(s.approved?'':' unapproved');c.title=[s.id,s.ip,s.platform||s.os].filter(Boolean).join(' · ');
  const screen=document.createElement('div');screen.className='screen';
  const name=document.createElement('b');name.textContent=s.id;
  const detail=document.createElement('small');detail.textContent=[s.ip,s.platform||s.os].filter(Boolean).join(' · ');
  const status=document.createElement('small');status.className='device-status';
  const dot=document.createElement('span');dot.className='dot';
  status.append(dot,document.createTextNode(s.online?' متصل':' غير متصل'));
  if(['screens','home'].includes(pageNow)&&s.online&&frames.has(s.id)){
   const img=document.createElement('img');img.src=frames.get(s.id);img.alt='مشاركة شاشة '+s.id;
   screen.append(img);screen.classList.add('has-preview');screen.tabIndex=0;screen.setAttribute('role','button');screen.setAttribute('aria-label','تكبير شاشة '+s.id);
   screen.addEventListener('click',()=>openScreen(s.id));screen.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openScreen(s.id);}});
  }else{screen.classList.add('no-preview');screen.textContent=pageNow==='screens'?'لا توجد مشاركة نشطة':'▣';screen.setAttribute('aria-label','رمز جهاز — ليست صورة شاشة فعلية');}
  c.append(screen,name,detail,status);return c;
 }));
}
async function refresh(){
 if(refreshBusy)return;
 refreshBusy=true;
 try{
  const r=await fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const data=await r.json();roster=Array.isArray(data.students)?data.students:[];
  lastStatusMode=data.mode;lastStatusAt=Date.now();recordMonitorSnapshot(roster,data.mode);
  await refreshLabSettings();
  frames.clear();previewUnavailable=false;
  if(['screens','home'].includes(pageNow)){
   try{
    const fr=await fetch('/api/frames',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!fr.ok)throw new Error('HTTP '+fr.status);
    const d=await fr.json();if(!Array.isArray(d.frames))throw new Error('Invalid frames');
    if(['screens','home'].includes(pageNow))frames=new Map(d.frames.filter(x=>roster.some(s=>s.id===x.id&&s.online===true&&s.approved===true)&&typeof x.jpeg==='string'&&x.jpeg.startsWith('data:image/jpeg;base64,')&&Number.isFinite(x.at)&&Date.now()-x.at>=0&&Date.now()-x.at<5000).map(x=>[x.id,x.jpeg]));
   }catch{frames.clear();previewUnavailable=true;}
  }
  el('total').textContent=roster.length;el('online').textContent=roster.filter(x=>x.online).length;el('offline').textContent=roster.filter(x=>!x.online).length;
  el('lab-name').textContent=data.lab?.name||'المعمل';
  el('mode').textContent=data.mode==='demo'?'وضع العرض التجريبي':data.mode==='live'?'أجهزة حقيقية على الشبكة':'الاتصال غير مهيأ';
  el('mode').dataset.mode=data.mode;updateReferenceHeader();updatePageNotice();render();updateLargeScreen();if(pageNow==='messages')loadMessageHistory();if(pageNow==='broadcast')loadBroadcastState();if(pageNow==='files')loadFileHistory();if(pageNow==='lock')loadPauseState();if(pageNow==='control')loadAssistanceState();
 }catch(e){
  monitorInterrupted=true;previousMonitorSnapshot=null;lastStatusAt=0;roster=[];frames.clear();
  el('total').textContent='—';el('online').textContent='—';el('offline').textContent='—';
  el('mode').textContent='تعذر الاتصال بالخادم';el('mode').dataset.mode='error';el('lab-name').textContent='المعمل — البيانات غير متاحة';
  render();updateLargeScreen();el('notice').hidden=false;el('notice').textContent='تعذر تحميل الأجهزة؛ تحقق من تشغيل تطبيق المعلم. ستُعاد المحاولة تلقائيًا.';
 }finally{refreshBusy=false;}
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('nav button').forEach(x=>{x.classList.remove('active');x.removeAttribute('aria-current');});
 b.classList.add('active');b.setAttribute('aria-current','page');if(pageNow==='broadcast'&&b.dataset.page!=='broadcast')stopBroadcast();if(pageNow==='lock'&&b.dataset.page!=='lock')stopPause();if(pageNow==='control'&&b.dataset.page!=='control')stopAssistance();pageNow=b.dataset.page;
 if(['labs','settings'].includes(pageNow))el('lab-editor-details').open=pageNow==='labs';
 el('page-title').textContent=labels[pageNow];el('section-title').textContent=pageNow==='home'?'أجهزة الطلاب':labels[pageNow];
 frames.clear();if(el('screen-dialog').open)el('screen-dialog').close();
 updatePageNotice();el('monitor-panel').hidden=pageNow!=='monitor';render();
 if(pageNow==='enrollment')loadEnrollment();else refresh();
}));
for(const view of ['grid','list'])el('view-'+view).addEventListener('click',()=>{
 deviceView=view;for(const option of ['grid','list'])el('view-'+option).setAttribute('aria-pressed',String(option===view));render();
});
el('card-size').addEventListener('input',()=>{el('devices').style.setProperty('--card-size',el('card-size').value+'px');el('devices').style.setProperty('--columns',String(Math.max(2,Math.min(8,Math.round(900/Number(el('card-size').value))))));});
el('search').addEventListener('input',render);el('refresh').addEventListener('click',refresh);refresh();setInterval(refresh,2000);

function openScreen(id){if(!frames.has(id))return;selectedScreen=id;el('screen-dialog-title').textContent='شاشة الطالب — '+id;updateLargeScreen();el('screen-dialog').showModal();}
function updateLargeScreen(){if(!selectedScreen)return;const jpeg=frames.get(selectedScreen);if(jpeg){el('screen-large').src=jpeg;el('screen-dialog-state').textContent='عرض لقطات متتابعة — لا يوجد تحكم عن بُعد في هذا الإصدار';}else{el('screen-large').removeAttribute('src');el('screen-dialog-state').textContent='توقفت مشاركة الشاشة أو انقطع الاتصال';}}
el('screen-close').addEventListener('click',()=>el('screen-dialog').close());
el('screen-dialog').addEventListener('close',()=>{selectedScreen=null;});

// M9: control-session requests only. Native input injection remains disabled.
async function requestControlSession(deviceId){
 const r=await fetch('/api/control/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deviceId})});
 const data=await r.json();
 if(!r.ok)throw new Error(data.error||'Request failed');
 return data;
}

// M13: teacher-side enrollment management; not cryptographic device attestation.
let enrollmentDevices=[];
async function loadEnrollment(){
 try{const response=await fetch('/api/enrollment/devices',{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json();enrollmentDevices=data.devices;renderEnrollment();
 }catch(error){el('notice').hidden=false;el('notice').textContent='تعذر تحميل الاعتمادات: '+error.message;}
}
function renderEnrollment(){
 const q=el('search').value.trim().toLowerCase();
 const items=enrollmentDevices.filter(x=>x.id.toLowerCase().includes(q));
 el('devices').replaceChildren(...items.map(device=>{
 const card=document.createElement('article');card.className='device';
 const name=document.createElement('b');name.textContent=device.id;
 const detail=document.createElement('small');detail.textContent=[device.ip,device.platform,device.online?'متصل':'غير متصل'].filter(Boolean).join(' · ');
 const state=document.createElement('small');state.textContent=device.approved?'معتمد إداريًا':'بانتظار الاعتماد';
 const button=document.createElement('button');button.type='button';button.textContent=device.approved?'إلغاء الاعتماد':'اعتماد الجهاز';
 button.addEventListener('click',async()=>{
  const action=device.approved?'revoke':'approve';
  if(!confirm((device.approved?'إلغاء اعتماد ':'اعتماد ')+device.id+'؟'))return;
  button.disabled=true;
  try{const r=await fetch('/api/enrollment/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deviceId:device.id})});
   if(!r.ok)throw Error('HTTP '+r.status);await loadEnrollment();
  }catch(e){alert('تعذر تغيير حالة الجهاز: '+e.message);button.disabled=false;}
 });
 card.append(name,detail,state,button);return card;
 }));
}
const originalRefresh=refresh;
// The roster continues refreshing independently of enrollment actions.
setInterval(()=>{if(pageNow==='enrollment')loadEnrollment();},10000);

// M104: read-only, automatically refreshed status dashboard. Never enables remote input.
function monitorState(s){
 if(!s||typeof s.id!=='string'||!s.id)return 'invalid';
 if(s.approved!==true)return 'unapproved';
 return s.online===true?'online':'offline';
}
function monitorCounts(devices){
 const counts={online:0,offline:0,unapproved:0,invalid:0};
 for(const d of devices)counts[monitorState(d)]++;
 return counts;
}
function renderMonitor(){
 const q=el('search').value.trim().toLowerCase();
 const fresh=lastStatusAt>0&&Date.now()-lastStatusAt<7000;
 const counts=monitorCounts(roster);
 const summary=el('monitor-summary');
 summary.textContent=fresh?`متصل ومعتمد: ${counts.online} | منقطع: ${counts.offline} | غير معتمد: ${counts.unapproved} | غير صالح: ${counts.invalid}`:'تعذر الحصول على حالة حديثة من الخادم — لا تعتمد على بيانات قديمة';
 const filtered=fresh?FBSDevicePriority.select(roster,{query:q,sort:el('monitor-sort').value,onlyAttention:el('monitor-attention-only').checked}):[];
 el('monitor-visible-count').textContent=fresh?`عرض ${filtered.length} من ${roster.length} جهاز`:'البيانات غير متاحة';
 const renderDevice=s=>{
  const state=monitorState(s),card=document.createElement('article');
  card.className='device monitor-device '+state;
  const name=document.createElement('b');name.textContent=s.id;
  const label=document.createElement('span');label.className='monitor-state';
  label.textContent=({online:'● متصل ومعتمد',offline:'● غير متصل',unapproved:'● بانتظار الاعتماد',invalid:'● بيانات غير صالحة'})[state];
  const details=document.createElement('small');details.textContent=[s.platform,s.os].filter(Boolean).join(' · ');
  card.append(name,label,details);
  if(el('monitor-custom-enabled').checked){const select=document.createElement('select');select.setAttribute('aria-label','مجموعة '+s.id);for(const optionName of ['غير موزعة',...customGroups.names]){const opt=document.createElement('option');opt.value=optionName==='غير موزعة'?'':optionName;opt.textContent=optionName;select.append(opt);}select.value=customGroups.assignments[s.id]||'';select.addEventListener('change',()=>{customGroups=FBSCustomGroups.assign(customGroups,s.id,select.value);saveCustomGroups();renderMonitor();});card.append(select);}
  return card;
 };
 if(el('monitor-seat-enabled').checked){
  const layout=FBSSeatMap.layout(filtered,seatMap),grid=document.createElement('div');grid.className='monitor-seat-grid';const zoom=FBSSeatView.zoom(el('monitor-seat-zoom').value);grid.style.gridTemplateColumns=`repeat(${layout.columns},minmax(${Math.round(105*zoom/100)}px,1fr))`;grid.style.fontSize=`${zoom}%`;const focusId=el('monitor-seat-focus').value;el('monitor-seat-focus-status').textContent=FBSSeatView.summary(FBSSeatView.focus(roster,focusId));
  layout.slots.forEach((device,index)=>{const seat=document.createElement('div');seat.className='monitor-seat'+(device&&device.id===focusId?' monitor-seat-focused':'');const number=document.createElement('small');number.textContent=`مقعد ${index+1}`;seat.append(number);if(device){seat.append(renderDevice(device));const selector=document.createElement('select');selector.setAttribute('aria-label','تحديد مقعد '+device.id);const empty=document.createElement('option');empty.value='0';empty.textContent='تلقائي';selector.append(empty);for(let n=1;n<=layout.capacity;n++){const option=document.createElement('option');option.value=String(n);option.textContent=`مقعد ${n}`;selector.append(option);}selector.value=String(seatMap.seats[device.id]||0);selector.addEventListener('change',()=>{seatMap=FBSSeatMap.place(seatMap,device.id,Number(selector.value));saveSeatMap();renderMonitor();});seat.append(selector);
   // M113: drag a device onto a seat; source and target validated locally.
   const card=seat.querySelector('.monitor-device');
   if(card){card.draggable=true;card.setAttribute('aria-label','اسحب '+device.id+' إلى مقعد آخر، أو استخدم قائمة تحديد المقعد');card.addEventListener('dragstart',event=>{event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',device.id);});}
  }else{const blank=document.createElement('span');blank.className='monitor-seat-empty';blank.textContent='فارغ';seat.append(blank);}seat.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('text/plain')){event.preventDefault();event.dataTransfer.dropEffect='move';seat.classList.add('monitor-seat-drop-target');}});
   seat.addEventListener('dragleave',()=>seat.classList.remove('monitor-seat-drop-target'));
   seat.addEventListener('drop',event=>{event.preventDefault();seat.classList.remove('monitor-seat-drop-target');const id=event.dataTransfer.getData('text/plain');const result=FBSSeatDrag.move(seatMap,id,index+1,roster.map(d=>d.id));if(!result.changed)return;seatMap=result.config;saveSeatMap();renderMonitor();});
   grid.append(seat);});
  el('devices').replaceChildren(grid);const pending=FBSSeatManagement.unassigned(roster,seatMap);el('monitor-seat-unassigned').textContent=pending.length?`بدون مقعد محدد (${pending.length}): ${pending.slice(0,40).map(d=>d.id).join('، ')}`:'جميع الأجهزة المسجلة لها مقاعد محددة';el('monitor-seat-summary').textContent=`المقاعد: ${layout.capacity} | الأجهزة المعروضة: ${filtered.length} | خارج المخطط: ${layout.unplaced.length}`;return;
 }
 el('monitor-seat-summary').textContent='';el('monitor-seat-unassigned').textContent='';el('monitor-seat-focus-status').textContent='';
 const size=Number(el('monitor-group-size').value);
 if(size===0&&!el('monitor-custom-enabled').checked){el('devices').replaceChildren(...filtered.map(renderDevice));}
 else{const groups=el('monitor-custom-enabled').checked?FBSCustomGroups.group(filtered,customGroups):FBSDeviceGroups.group(filtered,size);el('devices').replaceChildren(...groups.map(g=>{const section=document.createElement('section');section.className='monitor-group';const heading=document.createElement('h4');heading.textContent=`${g.label} — ${g.devices.length} جهاز | ${g.online} متصل | ${g.attention} يحتاج متابعة`;const cards=document.createElement('div');cards.className='monitor-group-devices';cards.replaceChildren(...g.devices.map(renderDevice));section.append(heading,cards);return section;}));}
}

// M105: transient, read-only status history; no notifications on first load or after outage.
function recordMonitorSnapshot(devices,mode){
 if(mode!=='live'){previousMonitorSnapshot=null;monitorInterrupted=false;return;}
 const current=FBSDeviceEvents.snapshot(devices);
 if(previousMonitorSnapshot&&!monitorInterrupted){
  monitorHistory=FBSDeviceEvents.append(monitorHistory,FBSDeviceEvents.diff(previousMonitorSnapshot,current,Date.now()));
 }
 previousMonitorSnapshot=current;monitorInterrupted=false;
}
function renderMonitorEvents(){
 const list=el('monitor-events'),status=el('monitor-events-status');
 if(!list||!status)return;
 const labels={disconnected:'انقطع الاتصال',reconnected:'عاد الاتصال', 'approval-removed':'أُلغي الاعتماد','approval-granted':'تم الاعتماد',state:'تغيرت الحالة'};
 const filter=el('monitor-filter').value;
 const visible=FBSMonitorAlerts.filterEvents(monitorHistory,filter);
 list.replaceChildren(...visible.slice().reverse().map(event=>{
  const item=document.createElement('li');item.className='monitor-event '+event.type;
  const message=document.createElement('span');message.textContent=`${event.id} — ${labels[event.type]||labels.state}`;
  const when=document.createElement('time');when.dateTime=new Date(event.at).toISOString();when.textContent=new Date(event.at).toLocaleTimeString('ar-SA');
  item.append(message,when);return item;
 }));
 status.textContent=lastStatusAt===0?'الاتصال بالخادم غير متاح؛ أُوقفت مقارنة الحالات حتى وصول بيانات جديدة':monitorHistory.length?`عرض ${visible.length} من أصل ${monitorHistory.length} حدث (آخر 100 حدث في هذه الصفحة فقط)`:'لم تُرصد تغيرات منذ فتح الصفحة';
 const alert=el('monitor-alert');const active=FBSMonitorAlerts.offlineSummary(roster,lastStatusAt>0&&Date.now()-lastStatusAt<7000&&lastStatusMode==='live');
 alert.hidden=active.kind==='none';alert.className='monitor-alert '+active.kind;alert.textContent=active.message;
}
el('monitor-filter').addEventListener('change',renderMonitorEvents);
el('monitor-clear').addEventListener('click',()=>{monitorHistory=[];renderMonitorEvents();});
const m105RenderMonitor=renderMonitor;
renderMonitor=function(){m105RenderMonitor();renderMonitorEvents();};

// M107: client-side ordering only; does not change device state or approval.
el('monitor-sort').addEventListener('change',()=>{if(pageNow==='monitor')renderMonitor();});
el('monitor-attention-only').addEventListener('change',()=>{if(pageNow==='monitor')renderMonitor();});

// M108: logical groups are presentation-only.
el('monitor-group-size').addEventListener('change',()=>{if(pageNow==='monitor')renderMonitor();});

// M109: local-only named groups. Storage errors are non-fatal (private browsing).
const customStorageKey='fbs-m109-groups-v1';
let customGroups=FBSCustomGroups.normalize({});
try{customGroups=FBSCustomGroups.normalize(JSON.parse(localStorage.getItem(customStorageKey)||'{}'));}catch(_error){}
function saveCustomGroups(){try{localStorage.setItem(customStorageKey,JSON.stringify(customGroups));}catch(_error){el('monitor-custom-message').textContent='تعذر حفظ التخصيص محليًا';}}
el('monitor-custom-enabled').addEventListener('change',()=>{if(pageNow==='monitor')renderMonitor();});
el('monitor-custom-edit').addEventListener('click',()=>{const editor=el('monitor-custom-editor');editor.hidden=!editor.hidden;if(!editor.hidden)el('monitor-custom-names').value=customGroups.names.join('\n');});
el('monitor-custom-save').addEventListener('click',()=>{const names=el('monitor-custom-names').value.split(/\r?\n/).map(FBSCustomGroups.cleanName).filter(Boolean);if(names.length>8){el('monitor-custom-message').textContent='الحد الأقصى 8 مجموعات';return;}customGroups=FBSCustomGroups.normalize({names,assignments:customGroups.assignments});saveCustomGroups();el('monitor-custom-message').textContent='تم حفظ المجموعات محليًا';if(pageNow==='monitor')renderMonitor();});

// M110: per-browser, presentation-only seating diagram.
const seatStorageKey='fbs-m110-seats-v1';
let seatMap=FBSSeatMap.normalize({});
try{seatMap=FBSSeatMap.normalize(JSON.parse(localStorage.getItem(seatStorageKey)||'{}'));}catch(_error){}
function saveSeatMap(){try{localStorage.setItem(seatStorageKey,JSON.stringify(seatMap));}catch(_error){el('monitor-seat-summary').textContent='تعذر حفظ مخطط المقاعد محليًا';}}
for(const id of ['monitor-seat-enabled','monitor-seat-rows','monitor-seat-columns'])el(id).addEventListener('change',()=>{seatMap=FBSSeatMap.normalize({...seatMap,rows:Number(el('monitor-seat-rows').value),columns:Number(el('monitor-seat-columns').value)});saveSeatMap();if(pageNow==='monitor')renderMonitor();});
el('monitor-seat-rows').value=String(seatMap.rows);el('monitor-seat-columns').value=String(seatMap.columns);

// M111: offline JSON backup and import of seating layout only.
el('monitor-seat-export').addEventListener('click',()=>{
 try{
  const blob=new Blob([FBSSeatTransfer.serialize(seatMap)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fbs-classroom-seats.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  el('monitor-seat-transfer-message').textContent='تم إعداد ملف النسخة الاحتياطية';
 }catch(error){el('monitor-seat-transfer-message').textContent=error.message;}
});
el('monitor-seat-import').addEventListener('click',()=>el('monitor-seat-file').click());
el('monitor-seat-file').addEventListener('change',async event=>{
 const file=event.target.files&&event.target.files[0];if(!file)return;
 try{
  if(file.size>FBSSeatTransfer.MAX_BYTES)throw Error('الملف يتجاوز الحد المسموح');
  const imported=FBSSeatTransfer.parse(await file.text());
  if(!window.confirm('استبدال توزيع المقاعد الحالي بالتوزيع المستورد؟'))return;
  seatMap=imported;saveSeatMap();el('monitor-seat-rows').value=String(seatMap.rows);el('monitor-seat-columns').value=String(seatMap.columns);
  if(pageNow==='monitor')renderMonitor();
  el('monitor-seat-transfer-message').textContent='تم استيراد مخطط المقاعد بنجاح';
 }catch(error){el('monitor-seat-transfer-message').textContent='فشل الاستيراد: '+error.message;}
 finally{event.target.value='';}
});

// M112: clear manual seat assignments only after confirmation. Auto-layout remains available.
el('monitor-seat-reset').addEventListener('click',()=>{if(!window.confirm('إلغاء جميع تعيينات المقاعد اليدوية؟ سيبقى عدد الصفوف والأعمدة كما هو.'))return;seatMap=FBSSeatManagement.reset(seatMap);saveSeatMap();if(pageNow==='monitor')renderMonitor();});

// M114: local-only zoom and highlighted device, independent of student control.
function refreshSeatFocusOptions(){const select=el('monitor-seat-focus'),selected=select.value;select.replaceChildren(new Option('بدون تحديد',''),...roster.filter(d=>d&&typeof d.id==='string').map(d=>new Option(d.id,d.id)));select.value=roster.some(d=>d.id===selected)?selected:'';}
for(const id of ['monitor-seat-zoom','monitor-seat-focus'])el(id).addEventListener('change',()=>{if(pageNow==='monitor')renderMonitor();});
for(const [id,dir] of [['monitor-seat-zoom-in',1],['monitor-seat-zoom-out',-1]])el(id).addEventListener('click',()=>{el('monitor-seat-zoom').value=String(FBSSeatView.next(el('monitor-seat-zoom').value,dir));if(pageNow==='monitor')renderMonitor();});
el('monitor-seat-focus-clear').addEventListener('click',()=>{el('monitor-seat-focus').value='';if(pageNow==='monitor')renderMonitor();});
const oldRenderMonitor=renderMonitor;renderMonitor=function(){refreshSeatFocusOptions();oldRenderMonitor();};

// M173: plain-text teacher messages; no remote command execution.
const messageSelection=new Set();let messageSending=false,messageHistoryBusy=false,messageRecipientsKey='';
function renderMessageRecipients(){
 const available=groupRoster().filter(s=>s.online===true&&s.approved===true);
 const ids=new Set(available.map(s=>s.id));for(const id of messageSelection)if(!ids.has(id))messageSelection.delete(id);
 const key=JSON.stringify(available.map(s=>s.id));
 if(key!==messageRecipientsKey){
  messageRecipientsKey=key;
  el('message-recipients').replaceChildren(...available.map(s=>{
   const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=s.id;input.checked=messageSelection.has(s.id);
   input.addEventListener('change',()=>{if(input.checked)messageSelection.add(s.id);else messageSelection.delete(s.id);updateMessageSend();});
   label.append(input,document.createTextNode(s.id));return label;
  }));
  if(!available.length)el('message-recipients').textContent='لا توجد أجهزة متصلة ومعتمدة حاليًا';
 }
 updateMessageSend();
}
function updateMessageSend(){el('message-send').disabled=messageSending||messageSelection.size===0||!el('message-text').value.trim();}
el('message-text').addEventListener('input',updateMessageSend);
el('message-select-all').addEventListener('click',()=>{
 for(const input of el('message-recipients').querySelectorAll('input')){input.checked=true;messageSelection.add(input.value);}updateMessageSend();
});
el('message-form').addEventListener('submit',async e=>{
 e.preventDefault();if(messageSending||!messageSelection.size)return;
 messageSending=true;updateMessageSend();el('message-result').textContent='جارٍ إرسال الرسالة...';
 try{
  const response=await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:el('message-text').value,deviceIds:[...messageSelection]}),signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error(response.status===409?'تأكد من اتصال الأجهزة واعتمادها':response.status===429?'قائمة الرسائل ممتلئة؛ انتظر انتهاء صلاحية الرسائل السابقة':'تعذر إرسال الرسالة');
  el('message-result').textContent='أُضيفت الرسالة إلى قائمة الإرسال؛ تابع تأكيد الاستلام والقراءة أدناه.';el('message-text').value='';await loadMessageHistory();
 }catch(error){el('message-result').textContent=error.name==='TimeoutError'?'لم يصل تأكيد الإرسال؛ راجع السجل قبل إعادة المحاولة لتجنب التكرار.':error.message;}
 finally{messageSending=false;updateMessageSend();}
});
async function loadMessageHistory(){
 if(messageHistoryBusy)return;messageHistoryBusy=true;
 try{
  const response=await fetch('/api/messages',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Unavailable');const body=await response.json();
  const states={queued:'بانتظار الاستلام',received:'استلمها تطبيق الطالب',read:'أكد الطالب قراءتها',expired:'انتهت الصلاحية',revoked:'أُلغي اعتماد الجهاز'};
  el('message-history').replaceChildren(...body.messages.map(m=>{
   const card=document.createElement('article');card.className='message-card';const text=document.createElement('p');text.textContent=m.text;card.append(text);
   for(const r of m.recipients){const state=document.createElement('small');state.textContent=r.id+' — '+(states[r.state]||'غير معروف');card.append(state);}return card;
  }));if(!body.messages.length)el('message-history').textContent='لم تُرسل رسائل في هذه الجلسة';
 }catch{el('message-history').textContent='تعذر تحديث سجل الرسائل؛ لا يوجد تأكيد حديث للاستلام أو القراءة';}
 finally{messageHistoryBusy=false;}
}

// M174: explicit browser display selection and key-bound, short-lived JPEG broadcast.
const broadcastSelection=new Set();let broadcastRecipientsKey='',broadcastStream=null,broadcastSession=null,broadcastTimer=null,broadcastBusy=false,broadcastSending=false,broadcastGeneration=0,broadcastSequence=0,broadcastStateBusy=false;
function updateBroadcastButtons(){
 el('lab-group-filter').disabled=broadcastBusy||!!broadcastSession||pauseBusy||pauseOwned||assistBusy||!!assistToken;
 el('broadcast-start').disabled=broadcastBusy||!!broadcastSession||!broadcastSelection.size;
 el('broadcast-stop').disabled=!broadcastBusy&&!broadcastSession;
 for(const input of el('broadcast-recipients').querySelectorAll('input'))input.disabled=broadcastBusy||!!broadcastSession;
}
function renderBroadcastRecipients(){
 const available=groupRoster().filter(s=>s.online===true&&s.approved===true),ids=new Set(available.map(s=>s.id));
 for(const id of broadcastSelection)if(!ids.has(id))broadcastSelection.delete(id);
 const key=JSON.stringify(available.map(s=>s.id));
 if(key!==broadcastRecipientsKey){
  broadcastRecipientsKey=key;el('broadcast-recipients').replaceChildren(...available.map(s=>{
   const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=s.id;input.checked=broadcastSelection.has(s.id);
   input.addEventListener('change',()=>{if(input.checked)broadcastSelection.add(s.id);else broadcastSelection.delete(s.id);updateBroadcastButtons();});label.append(input,document.createTextNode(s.id));return label;
  }));if(!available.length)el('broadcast-recipients').textContent='لا توجد أجهزة متصلة ومعتمدة حاليًا';
 }updateBroadcastButtons();
}
async function broadcastApi(path,body){
 const response=await fetch('/api/broadcast'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(4000)});
 if(!response.ok)throw Error('Broadcast HTTP '+response.status);return response.json();
}
async function loadBroadcastState(){
 if(broadcastStateBusy||broadcastBusy)return;broadcastStateBusy=true;const generation=broadcastGeneration;
 try{
  const state=await broadcastApi('');
  if(broadcastBusy||generation!==broadcastGeneration)return;
  if(state.active){
   broadcastSession=state;el('broadcast-state').textContent=broadcastStream?'مشاركة شاشة المعلم جارية — لقطات متتابعة بلا صوت':'توجد جلسة على الخادم؛ يمكنك إيقافها قبل بدء مشاركة جديدة';
  }else if(broadcastStream){await stopBroadcast();}else{broadcastSession=null;el('broadcast-state').textContent='لا توجد مشاركة نشطة';}
 }catch{if(generation===broadcastGeneration){el('broadcast-state').textContent='تعذر تحديث حالة المشاركة';if(broadcastStream)await stopBroadcast();}}
 finally{broadcastStateBusy=false;updateBroadcastButtons();}
}
async function stopBroadcast(){
 const stopped=broadcastSession;broadcastGeneration++;broadcastSession=null;broadcastBusy=false;
 clearInterval(broadcastTimer);broadcastTimer=null;
 const stream=broadcastStream;broadcastStream=null;stream?.getTracks().forEach(track=>track.stop());
 el('broadcast-preview').srcObject=null;el('broadcast-preview').hidden=true;
 el('broadcast-state').textContent='تم إيقاف التقاط الشاشة';updateBroadcastButtons();
 if(stopped)try{await broadcastApi('/stop',{sessionId:stopped.id});el('broadcast-state').textContent='تم إيقاف مشاركة الشاشة';}catch{el('broadcast-state').textContent='توقف الالتقاط محليًا؛ تعذر تأكيد إيقاف الخادم. تختفي الصور عند تقادمها تلقائيًا.';}
}
async function startBroadcast(){
 if(broadcastBusy||broadcastSession||!broadcastSelection.size)return;
 if(!navigator.mediaDevices?.getDisplayMedia){el('broadcast-state').textContent='مشاركة الشاشة غير مدعومة في هذا المتصفح؛ استخدم متصفحًا حديثًا على جهاز المعلم';return;}
 broadcastBusy=true;const generation=++broadcastGeneration,deviceIds=[...broadcastSelection];updateBroadcastButtons();
 el('broadcast-state').textContent='اختر الشاشة أو النافذة التي تريد مشاركتها';
 let openedSession=null,chosenStream=null;
 try{
  chosenStream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:1},audio:false});
  if(generation!==broadcastGeneration){chosenStream.getTracks().forEach(t=>t.stop());return;}
  broadcastStream=chosenStream;
  chosenStream.getVideoTracks()[0].addEventListener('ended',()=>{if(generation===broadcastGeneration)stopBroadcast();});
  openedSession=await broadcastApi('/start',{deviceIds});
  if(generation!==broadcastGeneration){await broadcastApi('/stop',{sessionId:openedSession.id});return;}
  broadcastSession=openedSession;broadcastSequence=0;
  const video=el('broadcast-preview');video.srcObject=chosenStream;video.hidden=false;await video.play();
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
  const context=canvas.getContext('2d');
  const upload=async()=>{
   if(generation!==broadcastGeneration||broadcastSending||!video.videoWidth)return;
   broadcastSending=true;
   try{
    context.fillStyle='#101e35';context.fillRect(0,0,1280,720);
    const ratio=Math.min(1280/video.videoWidth,720/video.videoHeight),w=video.videoWidth*ratio,h=video.videoHeight*ratio;
    context.drawImage(video,(1280-w)/2,(720-h)/2,w,h);
    let jpeg=canvas.toDataURL('image/jpeg',.55);if(jpeg.length>170000)jpeg=canvas.toDataURL('image/jpeg',.25);if(jpeg.length>170000)throw Error('Frame too large');
    await broadcastApi('/frame',{sessionId:openedSession.id,sequence:++broadcastSequence,jpeg});
   }catch{if(generation===broadcastGeneration){await stopBroadcast();el('broadcast-state').textContent='توقفت المشاركة لتعذر إرسال صورة حديثة؛ تحقق من الاتصال والأجهزة';}}
   finally{broadcastSending=false;}
  };
  el('broadcast-state').textContent='مشاركة شاشة المعلم جارية — لقطات متتابعة بلا صوت';
  broadcastTimer=setInterval(upload,1000);await upload();
 }catch(error){
  chosenStream?.getTracks().forEach(t=>t.stop());
  if(generation===broadcastGeneration){if(openedSession)broadcastSession=openedSession;await stopBroadcast();el('broadcast-state').textContent=error.name==='NotAllowedError'?'لم تبدأ المشاركة؛ أُلغي اختيار الشاشة أو رُفض الإذن':'تعذر بدء المشاركة؛ راجع حالة الخادم قبل إعادة المحاولة';}
 }finally{if(generation===broadcastGeneration)broadcastBusy=false;updateBroadcastButtons();}
}
el('broadcast-all').addEventListener('click',()=>{if(broadcastBusy||broadcastSession)return;for(const input of el('broadcast-recipients').querySelectorAll('input')){input.checked=true;broadcastSelection.add(input.value);}updateBroadcastButtons();});
el('broadcast-start').addEventListener('click',startBroadcast);el('broadcast-stop').addEventListener('click',stopBroadcast);
window.addEventListener('pagehide',()=>{const stopped=broadcastSession;broadcastGeneration++;broadcastStream?.getTracks().forEach(t=>t.stop());if(stopped)navigator.sendBeacon('/api/broadcast/stop',JSON.stringify({sessionId:stopped.id}));});

// M176: explicit file selection and receipt tracking; never opens transferred files.
const fileSelection=new Set();let fileRecipientsKey='',fileSending=false,fileHistoryBusy=false;
function updateFileSend(){el('file-send').disabled=fileSending||!fileSelection.size||!el('file-input').files.length;}
function renderFileRecipients(){
 const available=groupRoster().filter(s=>s.online===true&&s.approved===true),ids=new Set(available.map(s=>s.id));for(const id of fileSelection)if(!ids.has(id))fileSelection.delete(id);
 const key=JSON.stringify(available.map(s=>s.id));if(key!==fileRecipientsKey){fileRecipientsKey=key;el('file-recipients').replaceChildren(...available.map(s=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=s.id;input.checked=fileSelection.has(s.id);input.addEventListener('change',()=>{if(input.checked)fileSelection.add(s.id);else fileSelection.delete(s.id);updateFileSend();});label.append(input,document.createTextNode(s.id));return label;}));if(!available.length)el('file-recipients').textContent='لا توجد أجهزة متصلة ومعتمدة';}updateFileSend();
}
el('file-input').addEventListener('change',updateFileSend);el('file-all').addEventListener('click',()=>{for(const input of el('file-recipients').querySelectorAll('input')){input.checked=true;fileSelection.add(input.value);}updateFileSend();});
el('files-form').addEventListener('submit',async event=>{
 event.preventDefault();if(fileSending||!fileSelection.size)return;const file=el('file-input').files[0];if(!file)return;
 if(!file.size||file.size>5*1024*1024){el('file-result').textContent='اختر ملفًا غير فارغ لا يتجاوز 5 ميجابايت';return;}
 const targets=[...fileSelection];fileSending=true;updateFileSend();el('file-result').textContent='جارٍ تحميل الملف...';
 try{
  const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file);});
  const response=await fetch('/api/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,base64,deviceIds:targets}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(response.status===409?'تأكد من اتصال الأجهزة واعتمادها':response.status===429?'قائمة الملفات ممتلئة؛ انتظر انتهاء صلاحيتها':'تعذر توزيع الملف؛ تحقق من الاسم والحجم');
  el('file-result').textContent='الملف متاح للطلاب المحددين؛ تابع تأكيد التنزيل والحفظ أدناه';el('file-input').value='';await loadFileHistory();
 }catch(e){el('file-result').textContent=e.name==='TimeoutError'?'لم يصل التأكيد؛ راجع السجل قبل إعادة الإرسال':e.message||'تعذر قراءة الملف';}
 finally{fileSending=false;updateFileSend();}
});
async function loadFileHistory(){
 if(fileHistoryBusy)return;fileHistoryBusy=true;
 try{const response=await fetch('/api/files',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error();const result=await response.json();
  const states={queued:'متاح للتنزيل',downloaded:'تحقق وكيل الطالب من الملف',saved:'أكد تطبيق الطالب الحفظ',expired:'انتهت الصلاحية',revoked:'أُلغي اعتماد الجهاز'};
  el('file-history').replaceChildren(...result.files.map(f=>{const card=document.createElement('article');card.className='message-card';const title=document.createElement('strong');title.textContent=f.name+' — '+Math.ceil(f.size/1024)+' كيلوبايت';card.append(title);for(const r of f.recipients){const item=document.createElement('small');item.textContent=r.id+' — '+(states[r.state]||'غير معروف');card.append(item);}return card;}));if(!result.files.length)el('file-history').textContent='لم تُرسل ملفات في هذه الجلسة';
 }catch{el('file-history').textContent='تعذر تحديث سجل الملفات؛ لا يوجد تأكيد حديث';}finally{fileHistoryBusy=false;}
}

// M177: persisted organization only. Groups never grant enrollment or input permissions.
let labSnapshot=null,labDraft=null,labDirty=false,labBusy=false,labSaving=false,labGroupId='',labGeneration=0;
function groupRoster(){if(!labGroupId)return roster;const group=labSnapshot?.groups.find(g=>g.id===labGroupId);return group?roster.filter(s=>group.deviceIds.includes(s.id)):[];}
function updateLabFilter(){
 const select=el('lab-group-filter');const options=[new Option('جميع الأجهزة','')];
 for(const g of labSnapshot?.groups||[])options.push(new Option(g.name,g.id));
 if(labGroupId&&!options.some(o=>o.value===labGroupId))options.push(new Option('المجموعة غير متاحة — أعد الاختيار',labGroupId));
 select.replaceChildren(...options);select.value=labGroupId;document.querySelector('.group-filter').hidden=['home','screens','settings'].includes(pageNow)&&!(labSnapshot?.groups.length||labGroupId);
}
function markLabDirty(){labDirty=true;el('lab-save').disabled=labSaving||!labDraft;el('lab-result').textContent='توجد تعديلات غير محفوظة';}
function drawLabDraft(){
 if(!labDraft)return;
 el('lab-title').value=labDraft.name;el('lab-platform').value=labDraft.platform;
 el('lab-groups').replaceChildren(...labDraft.groups.map(g=>{
  const row=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='مجموعة أجهزة';
  const name=document.createElement('input');name.value=g.name;name.maxLength=60;name.required=true;name.setAttribute('aria-label','اسم المجموعة');name.addEventListener('input',()=>{g.name=name.value;markLabDirty();});
  const members=document.createElement('textarea');members.value=g.deviceIds.join(', ');members.setAttribute('aria-label','معرّفات أجهزة المجموعة');members.placeholder='PC-01, PC-02';members.maxLength=3000;members.addEventListener('input',()=>{g.deviceIds=members.value.split(/[,،\n]/).map(s=>s.trim()).filter(Boolean);markLabDirty();});
  const remove=document.createElement('button');remove.type='button';remove.textContent='حذف المجموعة';remove.addEventListener('click',()=>{labDraft.groups=labDraft.groups.filter(x=>x.id!==g.id);markLabDirty();drawLabDraft();});row.append(legend,name,members,remove);return row;
 }));
 el('lab-add-group').disabled=labSaving||labDraft.groups.length>=20;el('lab-save').disabled=labSaving||!labDirty;
}
async function refreshLabSettings(force=false){
 if(labBusy||labSaving)return;labBusy=true;const generation=++labGeneration;
 try{
  const r=await fetch('/api/lab-settings',{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error();const data=await r.json();if(generation!==labGeneration)return;if(!Array.isArray(data.groups)||!Number.isSafeInteger(data.revision))throw Error();
  const changed=!labSnapshot||labSnapshot.revision!==data.revision;labSnapshot=data;updateLabFilter();
  if(force||!labDirty&&(!labDraft||changed)){labDraft=structuredClone(data);labDirty=false;drawLabDraft();el('lab-result').textContent='الإعدادات المحفوظة جاهزة';}
  else if(labDirty&&labDraft.revision!==data.revision)el('lab-result').textContent='تغيرت الإعدادات في نافذة أخرى؛ أعد تحميل المحفوظ قبل الحفظ';
 }catch{if(generation!==labGeneration)return;labSnapshot=null;updateLabFilter();el('lab-result').textContent='تعذر قراءة إعدادات المعمل؛ لم تُستبدل الإعدادات الموجودة. تحقق من التخزين ثم أعد التحميل.';el('lab-save').disabled=true;}
 finally{labBusy=false;if(pageNow==='labs')refreshLabProfiles();}
}
el('lab-title').addEventListener('input',()=>{if(labDraft){labDraft.name=el('lab-title').value;markLabDirty();}});
el('lab-platform').addEventListener('change',()=>{if(labDraft){labDraft.platform=el('lab-platform').value;markLabDirty();}});
el('lab-add-group').addEventListener('click',()=>{if(!labDraft||labSaving||labDraft.groups.length>=20)return;labDraft.groups.push({id:crypto.randomUUID(),name:'',deviceIds:[]});markLabDirty();drawLabDraft();});
el('lab-reload').addEventListener('click',()=>{if(labDirty&&!confirm('تجاهل التعديلات غير المحفوظة وإعادة تحميل المحفوظ؟'))return;refreshLabSettings(true);});
el('lab-group-filter').addEventListener('change',()=>{
 if(broadcastBusy||broadcastSession||pauseBusy||pauseOwned||assistBusy||assistToken||powerBusy){el('lab-group-filter').value=labGroupId;return;}
 labGroupId=el('lab-group-filter').value;powerSelection.clear();assistDevice='';el('assist-device').value='';messageSelection.clear();fileSelection.clear();pauseSelection.clear();pauseRecipientsKey='';
 if(!broadcastBusy&&!broadcastSession)broadcastSelection.clear();
 messageRecipientsKey='';fileRecipientsKey='';broadcastRecipientsKey='';render();
});
el('lab-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!labDraft||!labDirty||labSaving)return;labSaving=true;labGeneration++;for(const node of el('lab-form').querySelectorAll('input,select,textarea,button'))node.disabled=true;
 try{
  const r=await fetch('/api/lab-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(labDraft),signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error(r.status===409?'تغيرت الإعدادات؛ أعد تحميل المحفوظ قبل الحفظ':r.status===400?'تحقق من الأسماء ومعرّفات الأجهزة: حتى20 مجموعة و40 جهازًا لكل مجموعة، دون أسماء أو معرّفات مكررة':'تعذر حفظ الإعدادات؛ بقي الملف السابق محفوظًا');
  const saved=await r.json();labSnapshot=saved;labDraft=structuredClone(saved);labDirty=false;clearProfileRecipients();drawLabDraft();updateLabFilter();el('lab-name').textContent=saved.name;el('lab-result').textContent='حُفظت إعدادات المعمل والمجموعات';
 }catch(error){el('lab-result').textContent=error.name==='TimeoutError'?'لم يصل تأكيد الحفظ؛ أعد تحميل المحفوظ قبل المحاولة مجددًا':error.message;}
 finally{labSaving=false;for(const node of el('lab-form').querySelectorAll('input,select,textarea,button'))node.disabled=false;drawLabDraft();updateProfileButtons();}
});

// M178: classroom overlay requests, bounded by a browser-owned ten-second lease.
const pauseSelection=new Set();let pauseRecipientsKey='',pauseSession=null,pauseOwned=false,pauseBusy=false,pauseLoading=false,pauseTouching=false,pauseGeneration=0;
function updatePauseButtons(){
 el('pause-start').disabled=pauseBusy||!!pauseSession||!pauseSelection.size;
 el('pause-stop').disabled=pauseBusy||!pauseSession;
 el('pause-duration').disabled=pauseBusy||!!pauseSession;el('pause-all').disabled=pauseBusy||!!pauseSession;
 for(const input of el('pause-recipients').querySelectorAll('input'))input.disabled=pauseBusy||!!pauseSession;
 el('lab-group-filter').disabled=broadcastBusy||!!broadcastSession||pauseBusy||pauseOwned||assistBusy||!!assistToken;
}
function renderPauseRecipients(){
 const available=groupRoster().filter(s=>s.online===true&&s.approved===true),ids=new Set(available.map(s=>s.id));for(const id of pauseSelection)if(!ids.has(id))pauseSelection.delete(id);
 const key=JSON.stringify(available.map(s=>s.id));if(key!==pauseRecipientsKey){pauseRecipientsKey=key;el('pause-recipients').replaceChildren(...available.map(s=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=s.id;input.checked=pauseSelection.has(s.id);input.addEventListener('change',()=>{if(input.checked)pauseSelection.add(s.id);else pauseSelection.delete(s.id);updatePauseButtons();});label.append(input,document.createTextNode(s.id));return label;}));if(!available.length)el('pause-recipients').textContent='لا توجد أجهزة متصلة ومعتمدة';}updatePauseButtons();
}
function renderPauseState(state){
 const labels={requested:'أُرسل الطلب؛ العرض غير مؤكد',displayed:'أكد تطبيق الطالب إظهار النافذة',released:'أنهى الطالب الحجب محليًا',stopped:'أوقف المعلم الطلب',expired:'انتهت المهلة أوالاتصال',revoked:'أُلغي اعتماد الجهاز'};
 el('pause-receipts').replaceChildren(...(state.recipients||[]).map(r=>{const line=document.createElement('p');line.textContent=r.id+' — '+(labels[r.state]||'غير معروف');return line;}));
}
async function pauseApi(action,body){const r=await fetch('/api/pause'+action,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(3500)});if(!r.ok)throw Error('Pause unavailable');return r.json();}
async function loadPauseState(){if(pauseLoading||pauseBusy)return;pauseLoading=true;const generation=pauseGeneration;try{const state=await pauseApi('');if(generation!==pauseGeneration)return;renderPauseState(state);if(!state.active){pauseSession=null;pauseOwned=false;}else{pauseSession=state.sessionId;if(!pauseOwned)el('pause-result').textContent='طلب نشط؛ يمكن إيقافه. التحديث يستمر من نافذة المعلم التي بدأته فقط.';}updatePauseButtons();}catch{if(generation===pauseGeneration)el('pause-result').textContent='تعذر تحديث الحالة؛ لا يوجد تأكيد حديث لعرض النافذة';}finally{pauseLoading=false;}}
async function stopPause(){
 const id=pauseSession;pauseGeneration++;pauseOwned=false;pauseSession=null;updatePauseButtons();if(!id)return;
 try{const state=await pauseApi('/stop',{sessionId:id});renderPauseState(state);el('pause-result').textContent='أُوقف طلب الحجب؛ يتحدث الطالب خلال ثوانٍ';}catch{el('pause-result').textContent='توقف التجديد محليًا؛ ينتهي الحجب عند انتهاء المهلة القصيرة تلقائيًا';}
}
el('pause-all').addEventListener('click',()=>{if(pauseBusy||pauseSession)return;for(const input of el('pause-recipients').querySelectorAll('input')){input.checked=true;pauseSelection.add(input.value);}updatePauseButtons();});
el('pause-start').addEventListener('click',async()=>{
 if(pauseBusy||pauseSession||!pauseSelection.size)return;pauseBusy=true;const generation=++pauseGeneration;updatePauseButtons();
 try{const state=await pauseApi('/start',{deviceIds:[...pauseSelection],seconds:Number(el('pause-duration').value)});if(generation!==pauseGeneration){await pauseApi('/stop',{sessionId:state.sessionId});return;}pauseSession=state.sessionId;pauseOwned=true;renderPauseState(state);el('pause-result').textContent='أُرسل طلب الحجب المؤقت؛ تابع تأكيد تطبيق الطالب أدناه';}
 catch{if(generation===pauseGeneration)el('pause-result').textContent='لم يتأكد بدء الحجب؛ راجع الحالة قبل إعادة المحاولة. الطلب غير المجدد ينتهي تلقائيًا';}
 finally{pauseBusy=false;updatePauseButtons();}
});
el('pause-stop').addEventListener('click',stopPause);
setInterval(async()=>{
 if(!pauseOwned||!pauseSession||pauseTouching||pageNow!=='lock')return;pauseTouching=true;const id=pauseSession,generation=pauseGeneration;
 try{const state=await pauseApi('/keepalive',{sessionId:id});if(generation!==pauseGeneration)return;renderPauseState(state);if(!state.active){pauseSession=null;pauseOwned=false;updatePauseButtons();}}
 catch{if(generation===pauseGeneration){pauseOwned=false;pauseSession=null;pauseGeneration++;el('pause-result').textContent='انتهى الطلب أوتعذر تأكيد الاتصال؛ توقف التجديد وينتهي الحجب تلقائيًا';updatePauseButtons();}}
 finally{pauseTouching=false;}
},2500);
window.addEventListener('pagehide',()=>{const id=pauseSession;pauseGeneration++;pauseOwned=false;if(id)navigator.sendBeacon('/api/pause/stop',JSON.stringify({sessionId:id}));});

// M179: named organization presets. Loading is explicit and never grants device trust.
let profileSnapshot=null,profileBusy=false,profileGeneration=0,profileSelected='';
function selectedProfile(){return profileSnapshot?.profiles.find(p=>p.id===profileSelected);}
function updateProfileButtons(){
 const blocked=profileBusy||labSaving,selected=!!selectedProfile();
 el('profile-name').disabled=blocked;el('profile-select').disabled=blocked;el('profile-refresh').disabled=blocked;
 el('profile-create').disabled=blocked||!labDraft||!profileSnapshot||profileSnapshot.profiles.length>=10||!el('profile-name').value.trim();
 el('profile-load').disabled=blocked||!selected;el('profile-replace').disabled=blocked||!selected||!labDraft;el('profile-delete').disabled=blocked||!selected;
}
function renderProfileOptions(){
 const options=[new Option('اختر ملف معمل محفوظًا','')];for(const p of profileSnapshot?.profiles||[])options.push(new Option(p.name,p.id));
 if(profileSelected&&!options.some(o=>o.value===profileSelected))options.push(new Option('الملف غير متاح — أعد الاختيار',profileSelected));
 el('profile-select').replaceChildren(...options);el('profile-select').value=profileSelected;updateProfileButtons();renderReferenceLabCards();
}
async function refreshLabProfiles(){
 if(profileBusy||labSaving)return;profileBusy=true;const generation=++profileGeneration;updateProfileButtons();
 try{const r=await fetch('/api/lab-profiles',{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error();const data=await r.json();if(generation!==profileGeneration)return;if(!Array.isArray(data.profiles)||!Number.isSafeInteger(data.revision))throw Error();profileSnapshot=data;renderProfileOptions();}
 catch{if(generation===profileGeneration){profileSnapshot=null;renderProfileOptions();el('profile-result').textContent='تعذر قراءة ملفات المعامل؛ لم تتغير إعدادات المعمل الحالي';}}
 finally{profileBusy=false;updateProfileButtons();}
}
function clearProfileRecipients(){
 labGroupId='';assistDevice='';el('assist-device').value='';messageSelection.clear();fileSelection.clear();pauseSelection.clear();
 if(!broadcastBusy&&!broadcastSession)broadcastSelection.clear();
 messageRecipientsKey='';fileRecipientsKey='';pauseRecipientsKey='';broadcastRecipientsKey='';
}
async function changeProfiles(profiles,success,selected){
 if(profileBusy||labSaving||!profileSnapshot)return;const revision=profileSnapshot.revision;profileBusy=true;profileGeneration++;updateProfileButtons();
 try{const r=await fetch('/api/lab-profiles',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,revision,profiles}),signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error(r.status===409?'تغيرت قائمة الملفات؛ حدّث القائمة قبل المحاولة':r.status===400?'تحقق من الأسماء والمجموعات؛ الأسماء يجب أن تكون مختلفة والحد 10 ملفات':'تعذر حفظ ملفات المعامل؛ بقي الملف السابق محفوظًا');
  const data=await r.json();profileSnapshot=data;profileSelected=selected;renderProfileOptions();el('profile-result').textContent=success;
 }catch(e){el('profile-result').textContent=e.name==='TimeoutError'?'لم يصل تأكيد الحفظ؛ حدّث القائمة قبل إعادة المحاولة':e.message;}
 finally{profileBusy=false;updateProfileButtons();}
}
el('profile-name').addEventListener('input',updateProfileButtons);
el('profile-name').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();if(!el('profile-create').disabled)el('profile-create').click();}});
el('profile-select').addEventListener('change',()=>{profileSelected=el('profile-select').value;updateProfileButtons();});
el('profile-refresh').addEventListener('click',refreshLabProfiles);
el('profile-create').addEventListener('click',()=>{
 if(profileBusy||labSaving||!labDraft||!profileSnapshot||profileSnapshot.profiles.length>=10)return;
 const name=el('profile-name').value.trim();if(!name)return;const profile={id:crypto.randomUUID(),name,platform:labDraft.platform,groups:structuredClone(labDraft.groups)};
 changeProfiles([...profileSnapshot.profiles,profile],'حُفظ ملف التنظيم الجديد؛ لم تتغير إعدادات المعمل الحالية',profile.id);
});
el('profile-load').addEventListener('click',()=>{
 const p=selectedProfile();if(profileBusy||labSaving||!p||!labDraft)return;
 if(labDirty&&!confirm('استبدال المسودة غير المحفوظة بملف «'+p.name+'»؟'))return;
 labDraft={version:1,revision:labDraft.revision,name:p.name,platform:p.platform,groups:structuredClone(p.groups)};markLabDirty();drawLabDraft();el('profile-result').textContent='حُمّل الملف إلى المسودة فقط؛ راجعها ثم اضغط حفظ إعدادات المعمل لتطبيقها';
});
el('profile-replace').addEventListener('click',()=>{
 const p=selectedProfile();if(profileBusy||labSaving||!p||!labDraft||!confirm('تحديث ملف «'+p.name+'» بالمجموعات ونوع الأجهزة من المسودة؟'))return;
 const updated={id:p.id,name:p.name,platform:labDraft.platform,groups:structuredClone(labDraft.groups)};
 changeProfiles(profileSnapshot.profiles.map(x=>x.id===p.id?updated:x),'حُدّث الملف المحفوظ؛ بقي اسم الملف كما هو',p.id);
});
el('profile-delete').addEventListener('click',()=>{
 const p=selectedProfile();if(profileBusy||labSaving||!p||!confirm('حذف ملف التنظيم «'+p.name+'»؟ تبقى إعدادات المعمل الحالية واعتماد الأجهزة.'))return;
 changeProfiles(profileSnapshot.profiles.filter(x=>x.id!==p.id),'حُذف الملف المحفوظ؛ لم تتغير إعدادات المعمل الحالي','');
});

// M180: limited, consented assistance. Tokens stay only in this browser's memory.
let assistDevice='',assistSession=null,assistToken=null,assistStatus='idle',assistBusy=false,assistLoading=false,assistTouching=false,assistCommandBusy=false,assistGeneration=0,assistFrameAt=0,assistFrameReady=false,assistDesktop=false,assistFrameKey='',assistImageGeneration=0;
function assistFresh(){const age=Date.now()-assistFrameAt;return assistFrameReady&&age>=0&&age<3000;}
function updateAssistanceButtons(){
 const active=!!assistToken&&assistStatus==='active'&&assistFresh()&&!assistBusy&&!assistCommandBusy;
 el('assist-start').disabled=assistBusy||!!assistSession||!assistDevice;el('assist-stop').disabled=!assistBusy&&!assistSession;el('assist-device').disabled=assistBusy||!!assistSession;
 for(const button of el('assist-actions').querySelectorAll('button'))button.disabled=!active;el('assist-send').disabled=!active||!el('assist-text').value.length;
 el('lab-group-filter').disabled=broadcastBusy||!!broadcastSession||pauseBusy||pauseOwned||assistBusy||!!assistToken;
 const desktop=active&&assistDesktop;for(const b of el('desktop-actions').querySelectorAll('button'))b.disabled=!desktop;
}
function renderAssistanceDevices(){const available=groupRoster().filter(s=>s.online&&s.approved&&s.assistanceSupported===true);const options=[new Option('اختر جهازًا مؤهلًا','')];for(const d of available)options.push(new Option(d.id,d.id));if(assistDevice&&!available.some(d=>d.id===assistDevice)){if(!assistSession)assistDevice='';else options.push(new Option(assistDevice+' — غير متصل حاليًا',assistDevice));}el('assist-device').replaceChildren(...options);el('assist-device').value=assistDevice;updateAssistanceButtons();}
async function assistApi(path,body){const r=await fetch('/api/assist'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(2500)});if(!r.ok)throw Error('Assistance unavailable');return r.json();}
function clearAssistFrame(){assistFrameReady=false;assistFrameAt=0;assistFrameKey='';assistImageGeneration++;el('assist-preview').removeAttribute('src');el('assist-preview').hidden=true;updateAssistanceButtons();}
async function loadAssistanceState(){
 if(assistLoading||assistBusy||pageNow!=='control')return;assistLoading=true;const generation=assistGeneration;
 try{const state=await assistApi('');if(generation!==assistGeneration)return;
  const labels={requested:'بانتظار موافقة الطالب ومشاركته للشاشة',active:'وافق الطالب؛ الأوامر متاحة مع شاشة حديثة',declined:'رفض الطالب الطلب',stopped:'أوقف المعلم المساعدة','student-stopped':'أوقف الطالب المساعدة',expired:'انتهت المهلة أوالاتصال',revoked:'أُلغي اعتماد الجهاز','clock-changed':'توقف الطلب بسبب تغير ساعة الخادم',idle:'لا توجد جلسة مساعدة نشطة'};
  assistDesktop=state.desktopControl===true;assistStatus=state.status;el('assist-result').textContent=labels[state.status]||'الحالة غير متاحة';
  if(['requested','active'].includes(state.status)){assistSession=state.sessionId;assistDevice=state.deviceId;if(!assistToken)el('assist-result').textContent+=' — التحكم متاح فقط من النافذة التي بدأت الطلب';}
  else{assistSession=null;assistToken=null;}
  if(state.lastReceipt)el('assist-receipt').textContent='الأمر '+state.lastReceipt.sequence+' — '+(state.lastReceipt.status==='submitted'?'أرسل تطبيق الطالب أحداث الإدخال إلى النظام؛ تحقق من الشاشة':'لم يتأكد إرسال الإدخال كاملًا؛ قد يكون جزئيًا. راجع الشاشة قبل المحاولة');
  if(assistDevice){const r=await fetch('/api/frames',{cache:'no-store',signal:AbortSignal.timeout(2000)});if(!r.ok)throw Error();const data=await r.json();if(generation!==assistGeneration)return;const f=data.frames.find(f=>f.id===assistDevice&&f.assistanceMonitor===true&&Number.isFinite(f.at)&&Date.now()-f.at>=0&&Date.now()-f.at<3000&&roster.some(d=>d.id===f.id&&d.online&&d.approved));
   if(f){const key=f.id+':'+f.at;if(key!==assistFrameKey){assistFrameKey=key;assistFrameReady=false;const imageGeneration=++assistImageGeneration,img=el('assist-preview');img.onload=()=>{if(imageGeneration===assistImageGeneration&&generation===assistGeneration){assistFrameReady=img.naturalWidth>0;assistFrameAt=f.at;img.hidden=!assistFrameReady;updateAssistanceButtons();}};img.onerror=()=>{if(imageGeneration===assistImageGeneration)clearAssistFrame();};img.src=f.jpeg;}el('assist-screen-state').textContent='لقطات متتابعة؛ الطالب يختار البرنامج الذي يستقبل النص. لا نقر على الصورة.';}else{clearAssistFrame();el('assist-screen-state').textContent='لا توجد مشاركة شاشة حديثة؛ الأوامر معطلة';}}
  else clearAssistFrame();renderAssistanceDevices();
 }catch{if(generation===assistGeneration){clearAssistFrame();el('assist-screen-state').textContent='تعذر تحديث الحالة أوالصورة؛ الأوامر معطلة';}}
 finally{assistLoading=false;}
}
el('assist-device').addEventListener('change',()=>{assistDevice=el('assist-device').value;clearAssistFrame();loadAssistanceState();});el('assist-text').addEventListener('input',updateAssistanceButtons);
el('assist-start').addEventListener('click',async()=>{
 if(assistBusy||assistSession||!assistDevice)return;assistBusy=true;const generation=++assistGeneration;updateAssistanceButtons();
 try{const state=await assistApi('/start',{deviceId:assistDevice});if(generation!==assistGeneration){await assistApi('/stop',{sessionId:state.sessionId});return;}assistSession=state.sessionId;assistToken=state.controlToken;assistDesktop=state.desktopControl===true;assistStatus=state.status;el('assist-result').textContent='أُرسل طلب الموافقة إلى الطالب؛ لا إدخال قبل موافقته';}
 catch{if(generation===assistGeneration)el('assist-result').textContent='لم يتأكد بدء المساعدة؛ راجع الحالة. الطلب غير المجدد ينتهي تلقائيًا';}
 finally{assistBusy=false;updateAssistanceButtons();}
});
async function stopAssistance(){const id=assistSession;assistGeneration++;assistSession=null;assistToken=null;assistStatus='stopped';clearAssistFrame();if(!id)return;try{await assistApi('/stop',{sessionId:id});el('assist-result').textContent='أوقفت المساعدة';}catch{el('assist-result').textContent='توقف التجديد محليًا؛ ينتهي الإدخال تلقائيًا عند انتهاء المهلة القصيرة';}}
el('assist-stop').addEventListener('click',stopAssistance);
async function sendAssistance(action){if(!assistToken||assistStatus!=='active'||!assistFresh()||assistCommandBusy)return;assistCommandBusy=true;updateAssistanceButtons();try{const sent=await assistApi('/command',{sessionId:assistSession,controlToken:assistToken,action});el('assist-receipt').textContent='الأمر '+sent.sequence+' بانتظار تقرير تطبيق الطالب؛ لا تعاود الإرسال تلقائيًا';}catch{el('assist-receipt').textContent='لم يتأكد الإرسال؛ تحقق من الشاشة والحالة قبل المحاولة';}finally{assistCommandBusy=false;updateAssistanceButtons();}}
for(const b of el('assist-actions').querySelectorAll('button'))b.addEventListener('click',()=>sendAssistance({type:'move',dx:Number(b.dataset.dx),dy:Number(b.dataset.dy)}));
el('assist-text-form').addEventListener('submit',e=>{e.preventDefault();const text=el('assist-text').value;if(!text.length||text.length>80||/[\x00-\x1f\x7f-\x9f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/.test(text)){el('assist-receipt').textContent='أدخل نصًا عاديًا دون أسطر أواختصارات';return;}sendAssistance({type:'text',text});});
setInterval(async()=>{if(!assistToken||!assistSession||assistTouching||pageNow!=='control')return;assistTouching=true;const generation=assistGeneration;try{await assistApi('/keepalive',{sessionId:assistSession,controlToken:assistToken});}catch{if(generation===assistGeneration){assistToken=null;clearAssistFrame();el('assist-result').textContent='انتهى الطلب أوفقد الاتصال؛ توقف التجديد';}}finally{assistTouching=false;}},1500);
setInterval(()=>{if(pageNow==='control')loadAssistanceState();},1000);setInterval(()=>{if(pageNow==='control'){if(!assistFresh()&&assistFrameReady)clearAssistFrame();updateAssistanceButtons();}},250);
window.addEventListener('pagehide',()=>{const id=assistSession;assistGeneration++;assistToken=null;if(id)navigator.sendBeacon('/api/assist/stop',JSON.stringify({sessionId:id}));});

// M181 desktop commands are available only with negotiated v2 capability and explicit consent.
for(const b of document.querySelectorAll('[data-go]'))b.addEventListener('click',()=>document.querySelector('nav [data-page="'+b.dataset.go+'"]').click());
for(const b of document.querySelectorAll('#desktop-actions [data-button]'))b.addEventListener('click',()=>{if(assistDesktop)sendAssistance({type:'click',button:b.dataset.button});});
for(const b of document.querySelectorAll('#desktop-actions [data-scroll]'))b.addEventListener('click',()=>{if(assistDesktop)sendAssistance({type:'scroll',steps:Number(b.dataset.scroll)});});
el('desktop-send-key').addEventListener('click',()=>{if(!assistDesktop)return;const modifiers=['primary','shift','alt'].filter(m=>el('desktop-'+m).checked);if(modifiers.length>2){el('assist-receipt').textContent='اختر مفتاحي تعديل كحد أقصى';return;}sendAssistance({type:'key',key:el('desktop-key').value,modifiers});});
el('desktop-lock').addEventListener('click',()=>{if(assistDesktop&&confirm('سيظهر تأكيد قفل الحساب على جهاز الطالب. فتح القفل يحتاج كلمة مرور الطالب. إرسال الطلب؟'))sendAssistance({type:'lock'});});

el('desktop-drag').addEventListener('click',()=>{const dx=Number(el('desktop-drag-x').value),dy=Number(el('desktop-drag-y').value);if(assistDesktop&&Number.isInteger(dx)&&Number.isInteger(dy)&&Math.abs(dx)<=500&&Math.abs(dy)<=500&&(dx||dy))sendAssistance({type:'drag',dx,dy});});

// M182 managed lab power. OS execution lives only in the private native controller.
let powerState={operations:[],wakeDevices:[]},powerSelection=new Set(),powerBusy=false,powerLoading=false,powerAt=-Infinity;
function powerDevices(){const all=new Map();for(const d of powerState.wakeDevices||[])all.set(d.id,{...d,online:false,approved:true,powerSupported:false});for(const d of roster)all.set(d.id,{...all.get(d.id),...d});const group=labGroupId?labSnapshot?.groups.find(g=>g.id===labGroupId):null;return [...all.values()].filter(d=>(!labGroupId||group?.deviceIds.includes(d.id))&&(d.wakeConfigured&&d.approved||d.online&&d.approved&&d.powerSupported)).sort((a,b)=>a.id.localeCompare(b.id));}
function updatePowerButtons(){const selected=powerDevices().filter(d=>powerSelection.has(d.id)),fresh=performance.now()-powerAt<5000&&!powerBusy&&!powerLoading;const online=fresh&&selected.length>0&&selected.every(d=>d.online&&d.approved&&d.powerSupported);for(const action of ['sleep','restart','shutdown'])el('power-'+action).disabled=!online;el('power-wake').disabled=!(fresh&&selected.length&&selected.every(d=>d.wakeConfigured));for(const id of ['power-select-online','power-select-wake','power-clear'])el(id).disabled=powerBusy||powerLoading;}
function renderPowerDevices(){if(pageNow!=='power')return;const devices=powerDevices(),rows=[];for(const d of devices){const label=document.createElement('label'),box=document.createElement('input'),name=document.createElement('span');box.type='checkbox';box.value=d.id;box.checked=powerSelection.has(d.id);box.disabled=powerBusy;box.addEventListener('change',()=>{box.checked?powerSelection.add(d.id):powerSelection.delete(d.id);updatePowerButtons();});name.textContent=d.id+' — '+(d.online?'متصل':'غير متصل حاليًا')+(d.wakeConfigured?' — عنوان الإيقاظ محفوظ':'');label.append(box,name);rows.push(label);}el('power-devices').replaceChildren(...rows);if(!rows.length)el('power-devices').textContent='لا توجد أجهزة مؤهلة. شغّل طالب M182 مرة واحدة على Ethernet وثبّت عنوان المعلم وبصمته ثم اعتمده.';updatePowerButtons();}
async function powerApi(path,body){const r=await fetch('/api/power'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('Power request unavailable');return r.json();}
async function loadPower(){if(powerLoading||powerBusy||pageNow!=='power'||performance.now()-powerAt<1500)return;powerLoading=true;updatePowerButtons();try{const s=await powerApi('');if(!Array.isArray(s.operations)||!Array.isArray(s.wakeDevices))throw Error();powerState=s;powerAt=performance.now();const nodes=[],labels={queued:'بانتظار تطبيق الطالب',received:'استلم التطبيق الأمر؛ لا توجد نتيجة نهائية بعد',submitted:'أُرسل الطلب إلى النظام؛ تحقق من الجهاز',rejected:'رفض النظام الطلب أو تعذّر تنفيذه',expired:'انتهت مهلة التسليم',revoked:'أُلغي اعتماد الجهاز','outcome-unknown':'استُلم الأمر ولم تتأكد النتيجة','clock-changed':'أُلغي بسبب تغير ساعة الخادم'},actions={shutdown:'إيقاف',restart:'إعادة تشغيل',sleep:'سكون'};for(const o of s.operations){const p=document.createElement('p');p.textContent=(actions[o.action]||'طلب طاقة')+' — '+o.recipients.map(x=>x.id+': '+(labels[x.state]||'غير مؤكدة')).join('، ');nodes.push(p);}el('power-history').replaceChildren(...nodes);}catch{powerAt=-Infinity;el('power-result').textContent='تعذر تحديث إدارة الطاقة؛ الأوامر معطلة حتى عودة الاتصال';}finally{powerLoading=false;renderPowerDevices();}}
for(const kind of ['online','wake'])el('power-select-'+kind).addEventListener('click',()=>{powerSelection=new Set(powerDevices().filter(d=>kind==='online'?d.online&&d.approved&&d.powerSupported:d.wakeConfigured).map(d=>d.id));renderPowerDevices();});el('power-clear').addEventListener('click',()=>{powerSelection.clear();renderPowerDevices();});
for(const action of ['wake','sleep','restart','shutdown'])el('power-'+action).addEventListener('click',async()=>{if(el('power-'+action).disabled||powerBusy)return;const ids=powerDevices().filter(d=>powerSelection.has(d.id)).map(d=>d.id);const names={wake:'تشغيل / إيقاظ',sleep:'سكون',restart:'إعادة تشغيل',shutdown:'إيقاف'};if(!confirm('تأكيد '+names[action]+' للأجهزة التالية:\n'+ids.join('، ')+'\nاحفظ العمل غير المحفوظ قبل الإيقاف أو إعادة التشغيل. متابعة؟'))return;powerBusy=true;updatePowerButtons();try{const result=await powerApi(action==='wake'?'/wake':'/start',{action,deviceIds:ids,confirmed:true});el('power-result').textContent=action==='wake'?result.results.map(x=>x.id+': '+(x.state==='wake-packet-sent'?'أُرسلت حزمة الإيقاظ؛ التشغيل غير مؤكد':'تعذر إرسال الإيقاظ')).join('، '):'أُرسل طلب '+names[action]+'؛ راقب تقارير الطالب وحالة اتصال الجهاز';}catch{el('power-result').textContent='لم يتأكد إرسال الطلب؛ راجع حالة الأجهزة قبل تكراره';}finally{powerBusy=false;powerAt=-Infinity;loadPower();}});
setInterval(()=>{if(pageNow==='power'){updatePowerButtons();loadPower();}},1000);

// M183 visual system shared by Windows and macOS teacher consoles.
let settingsTab='labs';
function createPlatformMark(platform){
 const mark=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');mark.setAttribute('viewBox','0 0 64 64');mark.setAttribute('fill','currentColor');path.setAttribute('d',platform==='macos'?'M40 5c-1 9-6 13-12 13 0-7 5-12 12-13ZM49 35c0-7 5-11 7-12-4-6-10-7-13-7-5 0-9 3-12 3s-7-3-11-3C10 16 5 25 6 35c1 12 7 25 14 25 4 0 6-3 11-3s7 3 11 3c7 0 13-12 15-18-5-2-8-5-8-7Z':'m3 10 25-4v24H3Zm29-5 29-4v29H32ZM3 34h25v24L3 54Zm29 0h29v29l-29-4Z');mark.append(path);return mark;
}
function updateReferenceHeader(){
 const online=roster.filter(x=>x.online).length,total=roster.length;
 el('lab-connected').textContent=lastStatusAt===0?'بانتظار الاتصال':`متصل (${online} / ${total})`;
 el('lab-dot').style.background=online?'#18c452':'#8794aa';
 const platform=labSnapshot?.platform||'windows';
 el('lab-platform-mark').replaceChildren(createPlatformMark(platform));
 el('view-return').hidden=pageNow==='home';
 el('lab-platform-mark').title=platform==='macos'?'Mac / iMac':platform==='mixed'?'Windows وMac':'Windows';
 const caption=document.querySelector('.application-bar>span>span');if(caption)caption.textContent='— '+(pageNow==='home'?'لوحة المعلم':labels[pageNow]||'لوحة المعلم');
 if(['home','screens'].includes(pageNow))el('section-title').textContent=(pageNow==='home'?'أجهزة الطلاب':'عرض الشاشات')+' ('+groupRoster().length+')';
 el('settings-current-lab').textContent=labSnapshot?.name||'بانتظار إعدادات المعلم';el('settings-approved-count').textContent='الأجهزة المعتمدة المتصلة: '+roster.filter(x=>x.approved&&x.online).length;
 renderReferenceLabCards();
}
function renderSettings(){
 el('labs-panel').hidden=settingsTab!=='labs';
 for(const p of document.querySelectorAll('[data-settings-panel]'))p.hidden=p.dataset.settingsPanel!==settingsTab;
 for(const b of document.querySelectorAll('.settings-menu button'))b.classList.toggle('active',b.dataset.settings===settingsTab);
 if(settingsTab==='labs')renderReferenceLabCards();
}
for(const button of document.querySelectorAll('[data-settings]'))button.addEventListener('click',()=>{settingsTab=button.dataset.settings;if(!['labs','settings'].includes(pageNow))document.querySelector('nav [data-page="settings"]').click();else{if(pageNow==='labs'&&settingsTab!=='labs'){pageNow='settings';document.body.dataset.page=pageNow;}renderSettings();updateReferenceHeader();}});
function renderReferenceLabCards(){
 const target=el('settings-lab-cards');if(!target)return;const nodes=[];
 const heading=document.createElement('h2');heading.textContent='إدارة المعامل';nodes.push(heading);
 const add=(name,platform,count,onEdit,onRemove)=>{const row=document.createElement('article');row.className='lab-reference-row';const mark=document.createElement('span');mark.className='lab-reference-platform';mark.append(createPlatformMark(platform));row.dataset.platform=platform;mark.setAttribute('aria-label',platform==='macos'?'Mac':'Windows');const text=document.createElement('div'),title=document.createElement('b'),detail=document.createElement('small');title.textContent=name;detail.textContent=count;text.append(title,detail);const edit=document.createElement('button');edit.type='button';edit.className='lab-row-edit';edit.append(referenceRowIcon('edit'));edit.setAttribute('aria-label','تعديل '+name);edit.addEventListener('click',onEdit);row.append(mark,text,edit);if(onRemove){const remove=document.createElement('button');remove.type='button';remove.className='lab-row-delete';remove.append(referenceRowIcon('delete'));remove.setAttribute('aria-label','حذف '+name);remove.addEventListener('click',onRemove);row.append(remove);}return row;};
 if(labSnapshot)nodes.push(add(labSnapshot.name,labSnapshot.platform,roster.length+' جهاز مسجل — المعمل الحالي',()=>{el('lab-editor-details').open=true;el('lab-title').focus();}));
 for(const p of profileSnapshot?.profiles||[])nodes.push(add(p.name,p.platform,p.groups.length+' مجموعة محفوظة',()=>{el('lab-editor-details').open=true;el('profile-select').value=p.id;el('profile-select').dispatchEvent(new Event('change'));el('profile-load').click();},()=>{el('profile-select').value=p.id;el('profile-select').dispatchEvent(new Event('change'));el('profile-delete').click();}));
 const addButton=document.createElement('button');addButton.type='button';addButton.className='new-lab-reference';addButton.textContent='＋ إضافة معمل جديد';addButton.addEventListener('click',()=>{el('lab-editor-details').open=true;el('profile-name').focus();});nodes.push(addButton);
 if(labSnapshot?.groups.length){const h=document.createElement('h3');h.textContent='مجموعات داخل المعمل';nodes.push(h);for(const g of labSnapshot.groups)nodes.push(add(g.name,labSnapshot.platform,g.deviceIds.length+' أجهزة',()=>{el('lab-editor-details').open=true;el('lab-groups').scrollIntoView({block:'nearest'});}));}
 target.replaceChildren(...nodes);
}
async function toggleConsoleFullscreen(target){try{if(document.fullscreenElement)await document.exitFullscreen();else await target.requestFullscreen();}catch{el('notice').hidden=false;el('notice').textContent='تعذر فتح ملء الشاشة؛ استخدم زر ملء الشاشة في المتصفح.';}}
el('console-fullscreen').addEventListener('click',()=>toggleConsoleFullscreen(document.documentElement));el('grid-fullscreen').addEventListener('click',()=>toggleConsoleFullscreen(el('workspace-panel')));

function referenceRowIcon(kind){const s=document.createElementNS('http://www.w3.org/2000/svg','svg'),p=document.createElementNS('http://www.w3.org/2000/svg','path');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.8');p.setAttribute('d',kind==='edit'?'m4 16 12-12 4 4L8 20H4Zm10-10 4 4':'M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7m4-7v7');s.append(p);return s;}
el('view-return').addEventListener('click',()=>document.querySelector('nav [data-page="home"]').click());
