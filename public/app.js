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
const labels={home:'الرئيسية',screens:'عرض الشاشات',broadcast:'مشاركة الشاشة',control:'التحكم عن بُعد',lock:'قفل الأجهزة',files:'توزيع الملفات',messages:'الرسائل',labs:'إدارة المعمل',monitor:'مراقبة الأجهزة',enrollment:'اعتماد الأجهزة'};
const el=id=>document.getElementById(id);
let deviceView='grid',refreshBusy=false,previewUnavailable=false;
const plannedPages=new Set(['control','lock','files','labs']);
function updatePageNotice(){
 const notice=el('notice');
 notice.hidden=true;
 if(pageNow==='enrollment'){notice.hidden=false;notice.textContent='راجع الجهاز قبل اعتماده؛ لم يتم بعد إثبات امتلاك مفتاح Windows CNG. اعتماد المعمل لا يفعّل التحكم عن بُعد.';}
 else if(pageNow==='screens'){notice.hidden=false;notice.textContent=previewUnavailable?'تعذر تحديث صور الشاشات؛ أُزيلت الصور السابقة. ستُعاد المحاولة تلقائيًا.':'تظهر لقطات الشاشة عند مشاركة الطالب وموافقته فقط. نقل المعمل عبر TLS؛ التحقق الكامل من هوية كل جهاز لم يكتمل.';}
 else if(plannedPages.has(pageNow)){notice.hidden=false;notice.textContent='هذه الوظيفة قيد التطوير وغير متاحة في هذه النسخة.';}
}
function render(){
 const custom=pageNow==='monitor'||pageNow==='enrollment';
 el('view-toolbar').hidden=custom||plannedPages.has(pageNow)||pageNow==='messages';
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
 const filtered=roster.filter(s=>s.id.toLowerCase().includes(q));
 el('visible-count').textContent=`عرض ${filtered.length} من ${roster.length} جهاز`;
 el('empty-state').hidden=filtered.length>0;
 el('empty-state').textContent=lastStatusAt===0?'بيانات الأجهزة غير متاحة حاليًا':roster.length===0?'لا توجد أجهزة مسجلة بعد. شغّل تطبيق الطالب واتصل بالمعلم، ثم راجع صفحة اعتماد الأجهزة.':'لا توجد أجهزة تطابق البحث';
 el('devices').replaceChildren(...filtered.map(s=>{
  const c=document.createElement('article');c.className='device'+(s.online?'':' offline');
  const screen=document.createElement('div');screen.className='screen';
  const name=document.createElement('b');name.textContent=s.id;
  const detail=document.createElement('small');detail.textContent=[s.ip,s.platform||s.os].filter(Boolean).join(' · ');
  const status=document.createElement('small');status.className='device-status';
  const dot=document.createElement('span');dot.className='dot';
  status.append(dot,document.createTextNode(s.online?' متصل':' غير متصل'));
  if(pageNow==='screens'&&s.online&&frames.has(s.id)){
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
  frames.clear();previewUnavailable=false;
  if(pageNow==='screens'){
   try{
    const fr=await fetch('/api/frames',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!fr.ok)throw new Error('HTTP '+fr.status);
    const d=await fr.json();if(!Array.isArray(d.frames))throw new Error('Invalid frames');
    if(pageNow==='screens')frames=new Map(d.frames.filter(x=>roster.some(s=>s.id===x.id&&s.online===true&&s.approved===true)&&typeof x.jpeg==='string'&&x.jpeg.startsWith('data:image/jpeg;base64,')&&Number.isFinite(x.at)&&Date.now()-x.at>=0&&Date.now()-x.at<5000).map(x=>[x.id,x.jpeg]));
   }catch{frames.clear();previewUnavailable=true;}
  }
  el('total').textContent=roster.length;el('online').textContent=roster.filter(x=>x.online).length;el('offline').textContent=roster.filter(x=>!x.online).length;
  el('lab-name').textContent=data.lab?.name||'المعمل';
  el('mode').textContent=data.mode==='demo'?'وضع العرض التجريبي':data.mode==='live'?'أجهزة حقيقية على الشبكة':'الاتصال غير مهيأ';
  el('mode').dataset.mode=data.mode;updatePageNotice();render();updateLargeScreen();if(pageNow==='messages')loadMessageHistory();if(pageNow==='broadcast')loadBroadcastState();
 }catch(e){
  monitorInterrupted=true;previousMonitorSnapshot=null;lastStatusAt=0;roster=[];frames.clear();
  el('total').textContent='—';el('online').textContent='—';el('offline').textContent='—';
  el('mode').textContent='تعذر الاتصال بالخادم';el('mode').dataset.mode='error';el('lab-name').textContent='المعمل — البيانات غير متاحة';
  render();updateLargeScreen();el('notice').hidden=false;el('notice').textContent='تعذر تحميل الأجهزة؛ تحقق من تشغيل تطبيق المعلم. ستُعاد المحاولة تلقائيًا.';
 }finally{refreshBusy=false;}
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('nav button').forEach(x=>{x.classList.remove('active');x.removeAttribute('aria-current');});
 b.classList.add('active');b.setAttribute('aria-current','page');if(pageNow==='broadcast'&&b.dataset.page!=='broadcast')stopBroadcast();pageNow=b.dataset.page;
 el('page-title').textContent=labels[pageNow];el('section-title').textContent=pageNow==='home'?'أجهزة الطلاب':labels[pageNow];
 frames.clear();if(el('screen-dialog').open)el('screen-dialog').close();
 updatePageNotice();el('monitor-panel').hidden=pageNow!=='monitor';render();
 if(pageNow==='enrollment')loadEnrollment();else refresh();
}));
for(const view of ['grid','list'])el('view-'+view).addEventListener('click',()=>{
 deviceView=view;for(const option of ['grid','list'])el('view-'+option).setAttribute('aria-pressed',String(option===view));render();
});
el('card-size').addEventListener('input',()=>el('devices').style.setProperty('--card-size',el('card-size').value+'px'));
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
 const available=roster.filter(s=>s.online===true&&s.approved===true);
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
 el('broadcast-start').disabled=broadcastBusy||!!broadcastSession||!broadcastSelection.size;
 el('broadcast-stop').disabled=!broadcastBusy&&!broadcastSession;
 for(const input of el('broadcast-recipients').querySelectorAll('input'))input.disabled=broadcastBusy||!!broadcastSession;
}
function renderBroadcastRecipients(){
 const available=roster.filter(s=>s.online===true&&s.approved===true),ids=new Set(available.map(s=>s.id));
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
