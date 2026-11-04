// Native presentation adapter. Website rendering and the shared editing engine remain browser code.
export function installNative(host){
 if(!window.chrome?.webview||window!==top)return;
 const nodes=new Map(),keys=new WeakMap();let next=0,timer,revision=0,last='';
 const key=el=>{
  if(!keys.has(el)){
   let value=el.id?'#'+el.id:'';const scope=el.closest('#properties,#navbar-properties,#modal-body,#layers,#pages,#components,#saved-blocks,#navbar-view,#design-view')?.id||'root';
   if(!value)for(const attr of ['data-prop','data-check','data-geometry','data-shadow','data-shadow-target','data-add','data-layer','data-page','data-edit-page','data-nav-field','data-nav-select','data-nav-zone','data-nav-preset','data-nav-device','data-nav-page','data-block','data-remove-block','data-child-delete','data-child-move','data-stack','data-code','name'])if(el.hasAttribute(attr)){value='@'+scope+':'+attr+'='+el.getAttribute(attr);break;}
   if(!value&&el.classList.contains('shadow-sample'))value='@'+scope+':shadow-preview';keys.set(el,value||'n'+(++next));
  }
  const value=keys.get(el);nodes.set(value,el);return value;
 };
 const hidden=el=>el.hidden||el.closest('[hidden]')||el.closest('script,style,svg,iframe');
 const label=el=>[...el.childNodes].filter(c=>c.nodeType===3).map(c=>c.textContent).join(' ').trim();
 function describe(el){
  if(el.nodeType===3){const text=el.textContent.trim();return text?{kind:'text',text}:null;}
  if(el.nodeType!==1||hidden(el))return null;
  const tag=el.tagName.toLowerCase(),id=key(el),text=(el.textContent||'').trim();
  const common={id,disabled:!!el.disabled||!!el.closest('[inert]'),active:el.classList.contains('active'),stable:el.id||el.getAttribute('data-prop')||el.getAttribute('data-nav-field')||el.getAttribute('data-shadow')||el.getAttribute('data-geometry')||id};
  if(tag==='input'||tag==='textarea'||tag==='select')return {...common,inputType:el.type,kind:tag==='select'?'select':el.type==='checkbox'?'check':el.type==='password'?'password':el.type==='file'?'file':el.type==='color'?'color':tag==='textarea'?'editor':'input',hint:el.value?.startsWith('data:image/')?'Embedded image. Enter a URL or upload a file to replace it.':'',value:el.type==='password'||el.value?.startsWith('data:image/')?'':el.value,checked:el.checked,min:el.min,max:el.max,options:tag==='select'?[...el.options].map(o=>({value:o.value,text:o.textContent})):null};
  if(tag==='button'||tag==='summary'||el.hasAttribute('data-layer'))return {...common,kind:'button',text,drag:el.hasAttribute('data-add')||el.hasAttribute('data-layer')||el.hasAttribute('data-nav-select'),drop:el.hasAttribute('data-layer')||el.hasAttribute('data-nav-select')};
  if(tag==='table')return {...common,kind:'table',columns:[...el.querySelectorAll('thead th')].map(th=>th.textContent),rows:[...el.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(td=>td.querySelector('button')?describe(td.querySelector('button')):{kind:'text',text:td.textContent}))};
  if(el.classList.contains('shadow-sample'))return {...common,kind:'shadow',value:el.parentElement.siShadowPreview};
  if(el.classList.contains('property-section')||el.classList.contains('panel-heading'))return {...common,kind:'heading',text:label(el),children:[...el.children].map(describe).filter(Boolean)};
  if(tag==='details')return {...common,kind:'expander',text:el.querySelector('summary')?.textContent||'',open:el.open,children:[...el.childNodes].filter(c=>c.tagName!=='SUMMARY').map(describe).filter(Boolean)};
  if(tag==='pre')return {...common,kind:'output',text};
  if(tag==='label')return {...common,kind:'label',text:label(el),children:[...el.children].map(describe).filter(Boolean)};
  if(el.classList.contains('page-item'))return {...common,kind:'row',text:label(el),children:[...el.children].map(describe).filter(Boolean)};
  return {...common,kind:el.classList.contains('property-actions')||el.classList.contains('tabs')||el.classList.contains('code-tabs')||el.classList.contains('designer-tools')||el.classList.contains('section-toolbar')||el.classList.contains('title-controls')?'row':'group',drop:el.hasAttribute('data-nav-zone'),text:'',children:[...el.childNodes].map(describe).filter(Boolean)};
 }
 const region=selector=>{const el=document.querySelector(selector);return el?describe(el):null;};
 function push(){
  clearTimeout(timer);nodes.forEach((el,id)=>{if(!el.isConnected)nodes.delete(id);});
  const unlocked=!document.querySelector('#studio').hidden,view=host.view(),graph=unlocked&&view==='backend'?host.graph():null,dialog=document.querySelector('#modal');
  const state={kind:'state',unlocked,view,busy:!document.querySelector('#transfer-progress').hidden,status:document.querySelector('#save-state').textContent,message:document.querySelector('#status-message').textContent,title:document.querySelector('#project-title').textContent,gate:unlocked?null:region('.gate-card'),modal:dialog.open?{title:document.querySelector('#modal-title').textContent,body:region('#modal-body'),actions:region('.modal-actions')}:null,gesture:!!document.querySelector('#canvas-gesture-shield'),expanded:document.querySelector('#navbar-view').classList.contains('nav-expanded'),graph:view==='backend'?graph:null};
  if(unlocked){
   state.tools=region(view==='design'?'.designer-tools':view==='navbar'?'#navbar-view>.section-toolbar':view==='backend'?'#backend-view>.section-toolbar':view==='data'?'#data-view>.section-toolbar':view==='code'?'#code-view>.section-toolbar':'.title-controls');
   if(view==='design'){state.left=region('.library');state.right=region('#properties');state.device=region('.title-controls');}
   if(view==='navbar'){state.left=region('.navbar-library');state.right=region('#navbar-properties');}
   if(view==='backend'){state.right=region('#node-properties');state.bottom=region('.console');}
   if(view==='data'){state.center=region('#data-view');}
   if(view==='code'){state.center=region('#code-view');}
   if(view==='settings'){state.center=region('#settings-view');}
  }
  const data=JSON.stringify(state);if(data!==last){last=data;window.chrome.webview.postMessage(state);revision++;}
 }
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(push,65);};
 const style=document.createElement('style');style.id='native-presentation';style.textContent=`
 html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:white!important}#gate,.topbar,.rail,.workspace-title,.statusbar,#toast,.canvas-bar,.canvas-footer,.designer-tools,.library,.inspector,.navbar-library,.navbar-properties,#navbar-view>.section-toolbar,#nav-preview-run,#nav-preview-fit,#nav-expand,.nav-preview-bar,#backend-view,#data-view,#code-view,#settings-view{display:none!important}
 #studio,.workspace,.main,#design-view,.canvas-area,.canvas-scroll,#navbar-view,.navbar-workspace,.navbar-preview-column,#nav-preview-area,#nav-preview-sizer{width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;display:block!important;max-width:none!important;overflow:hidden!important}#design-view[hidden],#navbar-view[hidden],#studio[hidden]{display:none!important}#canvas{display:block!important;width:100%!important;height:100%!important;min-height:0!important;border:0!important;max-width:none!important}#canvas.mobile{width:390px!important;max-width:100%!important;margin:auto!important}#nav-preview-area{overflow:auto!important}#nav-preview{transform:none!important;max-width:none!important}.nav-presets{display:none!important}
 `;document.head.append(style);
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
 const execute=async action=>{
  if(!document.querySelector('#transfer-progress').hidden)throw Error('Wait for the project transfer to finish.');
  const el=nodes.get(action.id)||document.querySelector(action.selector||':not(*)');
  if(action.type==='click'){if(!el||el.disabled)throw Error('This control is unavailable.');if(el.type==='submit'&&el.form&&!el.form.checkValidity())throw Error(el.form.querySelector(':invalid')?.validationMessage||'Complete the required fields.');el.click();}
  if(action.type==='change'){
   if(!el)throw Error('This field is unavailable.');if(el.type==='checkbox')el.checked=!!action.value;else el.value=action.value;
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  if(action.type==='upload'){
   if(!el)throw Error('This upload control is unavailable.');const data=Uint8Array.from(atob(action.base64),c=>c.charCodeAt(0));const transfer=new DataTransfer();transfer.items.add(new File([data],action.name,{type:action.mime}));el.files=transfer.files;el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  if(action.type==='view')host.showView(action.view);
  if(action.type==='graph')host.graphAction(action);
  if(action.type==='dropCanvas'){
   const source=nodes.get(action.from);host.setDrag(source?.dataset.add||null,source?.dataset.layer||null);const frame=document.querySelector('#canvas'),r=frame.getBoundingClientRect();if(action.x>=r.left&&action.x<=r.right&&action.y>=r.top&&action.y<=r.bottom)frame.contentWindow.postMessage({type:'drop-at',x:action.x-r.left,y:action.y-r.top},'*');
  }
  if(action.type==='drop'){
   const source=nodes.get(action.from),dest=nodes.get(action.to);if(source&&dest){const dataTransfer=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{dataTransfer,bubbles:false}));dest.dispatchEvent(new DragEvent('drop',{dataTransfer,bubbles:false,cancelable:true}));}
  }
  if(action.type==='pointer')document.querySelector('#canvas').contentWindow.postMessage({type:'gesture-pointer',phase:action.phase,event:action.event},'*');
  if(action.type==='key')document.querySelector('#canvas').contentWindow.postMessage({type:'designer-key',event:action.event},'*');
  if(action.type==='cancelModal'){document.querySelector('#modal').returnValue='cancel';document.querySelector('#modal').close();}
  schedule();
 };
 window.siNative={key:selector=>{const el=document.querySelector(selector);return el?key(el):null;},execute,push,revision:()=>revision};
 window.addEventListener('message',event=>{if(['select','canvas-geometry'].includes(event.data?.type))schedule();});window.addEventListener('resize',schedule);document.addEventListener('input',schedule);document.addEventListener('change',schedule);
 setTimeout(push,0);
}
