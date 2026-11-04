import {applyCanvasCommand,layoutFor} from './layout.mjs';

export function createDesigner(host){
 const $=selector=>document.querySelector(selector),geometry=new Map();
 const options={grid:false,guides:true,gridSize:8};let shield=null;
 const device=()=>host.frame().classList.contains('mobile')?'mobile':'desktop';
 const post=data=>host.frame().contentWindow?.postMessage(data,'*');
 function find(id,elements=host.getPage()?.elements||[]){for(const e of elements){if(e.id===id)return e;const child=find(id,e.children||[]);if(child)return child;}return null;}
 function sync(){const e=find(host.getSelected());$('#layout-mode').disabled=!e;if(e)$('#layout-mode').value=layoutFor(e,device()==='mobile').mode;}
 function highlight(id=host.getSelected()){sync();post({type:'highlight',id,options:{...options,device:device()}});}
 function pointer(event){const r=host.frame().getBoundingClientRect();return {clientX:event.clientX-r.left,clientY:event.clientY-r.top,shiftKey:event.shiftKey,altKey:event.altKey,ctrlKey:event.ctrlKey};}
 function removeShield(){shield?.remove();shield=null;}
 function cancel(){if(shield){post({type:'gesture-pointer',phase:'cancel'});removeShield();}}
 function begin(cursor){
  removeShield();shield=document.createElement('div');shield.id='canvas-gesture-shield';shield.style.cssText='position:fixed;inset:0;z-index:10000;touch-action:none;user-select:none;cursor:'+(cursor||'grabbing');document.body.append(shield);
  shield.onpointermove=event=>{event.preventDefault();post({type:'gesture-pointer',phase:'move',event:pointer(event)});};
  shield.onpointerup=event=>{event.preventDefault();post({type:'gesture-pointer',phase:'move',event:pointer(event)});post({type:'gesture-pointer',phase:'up'});removeShield();};
  shield.onpointercancel=cancel;
 }
 function updateInputs(){
  const g=geometry.get(host.getSelected()+':'+device());if(!g)return;
  for(const input of document.querySelectorAll('[data-geometry]'))if(document.activeElement!==input)input.value=Math.round((g[input.dataset.geometry]||0)*10)/10;
 }
 function decorateInspector(e){
  sync();if(!e)return;const mobile=device()==='mobile',l=layoutFor(e,mobile),g=geometry.get(e.id+':'+device())||l;
  const fields=[['X','x'],['Y','y'],['Width','width'],['Height','height'],['Rotation °','rotation']].map(([label,key])=>`<label>${label}<input data-geometry="${key}" type="number" step="${key==='rotation'?1:.1}" ${['x','y'].includes(key)&&l.mode!=='free'?'disabled':''} ${['width','height'].includes(key)?'min="24"':''} value="${Number(g[key])||0}"></label>`).join('');
  const controls=document.createElement('section');controls.className='position-controls';controls.innerHTML=`<div class="property-section">${mobile?'MOBILE POSITION':'POSITION'}</div><div class="property-grid">${fields}</div><div class="property-actions"><button data-stack="forward" ${l.mode!=='free'?'disabled':''}>Bring forward</button><button data-stack="back" ${l.mode!=='free'?'disabled':''}>Send backward</button>${mobile?'<button id="reset-mobile-layout">Reset mobile layout</button>':''}</div>`;
  const reference=$('#properties .property-section');if(reference)reference.before(controls);else $('#properties').append(controls);
  if($('#duplicate-element'))$('#duplicate-element').onclick=()=>post({type:'designer-action',action:'duplicate'});
  for(const id of ['move-up','move-down'])if($('#'+id))$('#'+id).disabled=l.mode==='free';
  controls.querySelectorAll('[data-geometry]').forEach(input=>input.onchange=()=>{const value=Number(input.value);if(Number.isFinite(value))post({type:'designer-action',action:'set-geometry',values:{[input.dataset.geometry]:value}});});
  controls.querySelectorAll('[data-stack]').forEach(button=>button.onclick=()=>post({type:'designer-action',action:button.dataset.stack}));
  if($('#reset-mobile-layout'))$('#reset-mobile-layout').onclick=()=>post({type:'designer-action',action:'reset-mobile'});
 }
 $('#layout-mode').onchange=event=>post({type:'designer-action',action:'set-mode',values:{mode:event.target.value}});
 $('#snap-grid').onchange=event=>{options.grid=event.target.checked;$('#grid-size').disabled=!options.grid;highlight();};
 $('#snap-guides').onchange=event=>{options.guides=event.target.checked;highlight();};
 $('#grid-size').onchange=event=>{options.gridSize=Math.max(1,Math.min(128,Number(event.target.value)||8));event.target.value=options.gridSize;highlight();};
 addEventListener('message',event=>{
  if(event.source!==host.frame().contentWindow||!host.isActive())return;const data=event.data;
  if(data.type==='select'&&data.geometry)geometry.set(data.id+':'+device(),data.geometry);
  else if(data.type==='canvas-geometry'){if(data.device&&data.device!==device())return;geometry.set(data.id+':'+device(),data.geometry);if(data.id===host.getSelected())updateInputs();}
  else if(data.type==='canvas-gesture-start')begin(data.cursor);
  else if(data.type==='canvas-gesture-end')removeShield();
  else if(data.type==='canvas-command'){
   if(data.command.device!==device())return;
   try{const result=applyCanvasCommand(host.getPage().elements,data.command);if(result.changed){host.checkpoint();host.getPage().elements=result.elements;host.setSelected(result.selected);host.commit();}}
   catch(error){host.error(error.message);}
  }else if(data.type==='designer-shortcut')host.shortcut(data.action);
 });
 addEventListener('keydown',event=>{
  if(shield){if(event.key==='Escape')cancel();if(!['Shift','Alt','Control','Meta'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}return;}
  if(!host.isActive()||!host.getSelected()||event.target.closest('input,textarea,select,dialog')||event.target.isContentEditable)return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete','Backspace'].includes(event.key)||((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d')){event.preventDefault();post({type:'designer-key',event:{key:event.key,ctrlKey:event.ctrlKey,metaKey:event.metaKey,shiftKey:event.shiftKey}});}
 },true);
 return {highlight,decorateInspector,cancel};
}
