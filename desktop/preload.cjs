const {contextBridge,ipcRenderer}=require('electron');
const origin=process.argv.find(a=>a.startsWith('--studio-origin='))?.slice('--studio-origin='.length);
if(location.origin===origin&&window===window.top)contextBridge.exposeInMainWorld('desktop',{
 openWebsite:url=>ipcRenderer.invoke('open-website',url),
 onBeforeClose:callback=>ipcRenderer.on('before-close',()=>callback()),
 closeReady:()=>ipcRenderer.invoke('close-ready')
});
