const {app,BrowserWindow,ipcMain,shell,dialog}=require('electron');
const path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process'),{randomBytes}=require('node:crypto');
const source=path.resolve(__dirname,'..');
const installRoot=app.isPackaged?path.dirname(process.execPath):path.resolve(source,'workspace');
const root=process.env.SI_WORKSPACE_ROOT||installRoot;
fs.mkdirSync(root,{recursive:true});
app.setPath('userData',path.join(root,'.studio-data'));
app.setPath('sessionData',path.join(root,'.studio-cache'));
app.commandLine.appendSwitch('disk-cache-size','1');
app.enableSandbox();
const siteOnly=fs.existsSync(path.join(installRoot,'site-mode.json'));
let win,child,allowClose=false,origin,siteOrigin;
if(!app.requestSingleInstanceLock())app.quit();else {
 app.on('second-instance',()=>{if(win){win.restore();win.focus();}});
 app.whenReady().then(async()=>{
  const node=app.isPackaged?path.join(installRoot,'runtime','node.exe'):(process.env.SI_NODE||'node');
  if(node!=='node'&&!fs.existsSync(node))throw Error('Bundled Node runtime is missing. Keep the complete app folder together.');
  const token=randomBytes(32).toString('hex');child=spawn(node,[path.join(source,'src','server.mjs')],{cwd:root,windowsHide:true,env:{...process.env,SI_ROOT:root,SI_TOKEN:token,SI_SITE_ONLY:siteOnly?'1':'0',SI_APP_ROOT:root,SI_SOURCE:source,SI_ELECTRON_ROOT:app.isPackaged?installRoot:(fs.existsSync(path.join(source,'node_modules','electron','dist'))?path.join(source,'node_modules','electron','dist'):path.resolve(source,'..','si-forge-studio','node_modules','electron','dist')),SI_NODE:node},stdio:['ignore','pipe','pipe']});
  const info=await new Promise((resolve,reject)=>{let data='';const timer=setTimeout(()=>reject(Error('Local backend did not start within 20 seconds.')),20000);child.stdout.on('data',chunk=>{data+=chunk;for(const line of data.split('\n'))try{const value=JSON.parse(line);if(value.url){clearTimeout(timer);resolve(value);}}catch{}});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Local backend exited: '+code));});});
  origin=new URL(info.url).origin;siteOrigin=info.preview;
  win=new BrowserWindow({width:1500,height:960,minWidth:1050,minHeight:720,title:'SI FORGE STUDIO',backgroundColor:'#f7f8fc',show:process.env.SI_TEST_HIDDEN!=='1',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,additionalArguments:['--studio-origin='+origin]}});
  const trusted=event=>{if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||new URL(event.senderFrame.url).origin!==origin)throw Error('Desktop access denied.');};
  ipcMain.handle('open-website',async(event,url)=>{trusted(event);if(new URL(url).origin!==siteOrigin)throw Error('Only the local website can be opened.');await shell.openExternal(url);});
  ipcMain.handle('close-ready',async event=>{trusted(event);const r=await fetch(origin+'/studio/lock',{method:'POST',headers:{'X-Studio-Token':token,'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error('Could not save and lock the project.');allowClose=true;win.close();});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{const target=new URL(url).origin;if(target!==origin&&!(siteOnly&&target===siteOrigin))event.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  win.on('close',event=>{if(!allowClose){event.preventDefault();if(siteOnly){fetch(origin+'/studio/lock',{method:'POST',headers:{'X-Studio-Token':token,'Content-Type':'application/json'},body:'{}'}).then(r=>{if(!r.ok)throw Error('Could not save project.');allowClose=true;win.close();}).catch(e=>dialog.showErrorBox('Save failed',e.message));}else win.webContents.send('before-close');}});
  child.on('exit',()=>{if(win&&!win.isDestroyed()&&!allowClose){dialog.showErrorBox('Local backend stopped','Restart SI FORGE STUDIO to reopen your saved encrypted project.');allowClose=true;win.close();}});
  await win.loadURL(info.url);
 }).catch(error=>{dialog.showErrorBox('SI FORGE STUDIO could not start',error.message);allowClose=true;app.quit();});
 app.on('window-all-closed',()=>{allowClose=true;app.quit();});
 app.on('before-quit',()=>{allowClose=true;});
 app.on('will-quit',()=>{child?.kill();});
}
