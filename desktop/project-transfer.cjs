const fs=require('node:fs/promises'),path=require('node:path'),{randomBytes}=require('node:crypto');
const MAX_BYTES=128*1024*1024;

module.exports=function registerProjectTransfer({ipcMain,dialog,win,trusted,origin,token,root,siteOnly}){
 const selections=new Map();
 const guard=event=>{trusted(event);if(siteOnly)throw Error('Project transfer is available in SI FORGE STUDIO.');};
 async function post(action,payload){
  const response=await fetch(origin+'/studio/'+action,{method:'POST',headers:{'X-Studio-Token':token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Project transfer failed.');return result;
 }
 ipcMain.handle('choose-project',async event=>{
  guard(event);selections.clear();
  const result=await dialog.showOpenDialog(win,{title:'Import project',properties:['openFile'],filters:[{name:'SI FORGE project',extensions:['siforge']}]});
  if(result.canceled||!result.filePaths.length)return {canceled:true};
  const file=result.filePaths[0],stat=await fs.stat(file);
  if(!stat.isFile()||path.extname(file).toLowerCase()!=='.siforge')throw Error('Choose a .siforge project file.');
  if(stat.size>MAX_BYTES)throw Error('Project files must be under 128 MB.');
  const id=randomBytes(24).toString('hex');selections.set(id,file);return {id,name:path.basename(file)};
 });
 ipcMain.handle('cancel-project-import',async(event,id)=>{guard(event);selections.delete(id);});
 ipcMain.handle('import-project',async(event,{id,password}={})=>{
  guard(event);const file=selections.get(id);if(!file)throw Error('Choose the project file again.');selections.delete(id);
  const handle=await fs.open(file,'r');let contents;
  try{const stat=await handle.stat();if(!stat.isFile()||stat.size>MAX_BYTES)throw Error('Project files must be under 128 MB.');contents=await handle.readFile('utf8');}finally{await handle.close();}
  if(Buffer.byteLength(contents)>MAX_BYTES)throw Error('Project files must be under 128 MB.');
  return post('import-project',{contents,password});
 });
 ipcMain.handle('export-project',async(event,name)=>{
  guard(event);const folder=path.join(root,'exports');await fs.mkdir(folder,{recursive:true});
  const filename=(String(name||'Project').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,60)||'Project')+'.siforge';
  const result=await dialog.showSaveDialog(win,{title:'Export project',defaultPath:path.join(folder,filename),filters:[{name:'SI FORGE project',extensions:['siforge']}]});
  if(result.canceled||!result.filePath)return {canceled:true};
  let destination=result.filePath;if(!destination.toLowerCase().endsWith('.siforge'))destination+='.siforge';
  const relative=path.relative(path.join(root,'projects'),destination);
  if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Export outside the app’s projects folder.');
  const exported=await post('export-project',{}),temporary=destination+'.'+randomBytes(8).toString('hex')+'.tmp';
  try{await fs.writeFile(temporary,exported.contents,{flag:'wx',mode:0o600});await fs.rename(temporary,destination);}
  finally{await fs.rm(temporary,{force:true});}
  return {path:destination};
 });
};
