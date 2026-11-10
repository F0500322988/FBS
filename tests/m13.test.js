'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('M13 enrollment UI and limitations are visible',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 assert.match(html,/data-page="enrollment"/);
 assert.match(js,/api\/enrollment\//);
 assert.match(js,/يُعتمد جهاز الطالب المهيأ لهذا المعمل تلقائيًا/);
});
