'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {check}=require('../M76-Package-Check');

function prepare(root){
 const result=[];
 for(const role of ['Teacher','Student']){
  const base=path.join(root,role);
  if(!check(base,role).passed)throw Error(role+' package is incomplete');
  const files=[],directories=new Set();
  function visit(relative){
   for(const entry of fs.readdirSync(path.join(base,relative),{withFileTypes:true})){
    if(/[\r\n"$<>:|?*\\]/.test(entry.name)||/[. ]$/.test(entry.name)||entry.name==='.'||entry.name==='..')throw Error('Unsafe Windows payload filename');
    const name=path.posix.join(relative,entry.name);
    const absolute=path.join(base,name);
    const stat=fs.lstatSync(absolute);
    if(stat.isSymbolicLink())throw Error('Payload symlinks are not supported');
    if(stat.isDirectory()){directories.add(name);visit(name);}
    else if(stat.isFile())files.push({path:name,size:stat.size,sha256:crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')});
    else throw Error('Payload must contain regular files only');
   }
  }
  visit('');
  // Only supported payload roots are installed; nothing else enters the package.
  for(const file of files)if(!file.path.startsWith(role+'/')&&!file.path.startsWith('Runtime/')&&!(role==='Student'&&file.path==='Configure-Student.ps1'))throw Error('Unexpected payload file: '+file.path);
  const lines=['; Generated from the exact packaged file list. No recursive deletion.'];
  files.forEach((file,index)=>{
   const target='$INSTDIR\\'+file.path.replaceAll('/','\\');
   lines.push(`IfFileExists "${target}" 0 removed_${index}`, 'ClearErrors',`Delete "${target}"`,`IfErrors 0 removed_${index}`,
    'MessageBox MB_ICONSTOP "تعذر حذف ملف من ملفات البرنامج. أغلق المعلم والطالب ثم أعد محاولة الإزالة."','SetErrorLevel 3','Abort',`removed_${index}:`);
  });
  for(const directory of [...directories].sort((a,b)=>b.split('/').length-a.split('/').length))lines.push(`RMDir "$INSTDIR\\${directory.replaceAll('/','\\')}"`);
  fs.writeFileSync(path.join(root,'delete-'+role+'.nsh'),'\ufeff'+lines.join('\r\n')+'\r\n');
  const manifest={role,version:'0.179.0-preview',files};
  fs.writeFileSync(path.join(root,'payload-'+role+'.json'),JSON.stringify(manifest,null,2)+'\n');result.push({role,files:files.length});
 }
 return result;
}
if(require.main===module){if(process.argv.length!==3)throw Error('Usage: node prepare-manifests.js <stage-root>');console.log(JSON.stringify(prepare(path.resolve(process.argv[2]))));}
module.exports={prepare};
