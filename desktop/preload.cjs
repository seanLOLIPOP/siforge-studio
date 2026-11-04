const {contextBridge,ipcRenderer}=require('electron');
const origin=process.argv.find(a=>a.startsWith('--studio-origin='))?.slice('--studio-origin='.length);
if(location.origin===origin&&window===window.top)contextBridge.exposeInMainWorld('desktop',{
 openWebsite:url=>ipcRenderer.invoke('open-website',url),
 chooseProject:()=>ipcRenderer.invoke('choose-project'),
 cancelProjectImport:id=>ipcRenderer.invoke('cancel-project-import',id),
 importProject:selection=>ipcRenderer.invoke('import-project',selection),
 exportProject:name=>ipcRenderer.invoke('export-project',name),
 onBeforeClose:callback=>ipcRenderer.on('before-close',()=>callback()),
 closeReady:()=>ipcRenderer.invoke('close-ready')
});
