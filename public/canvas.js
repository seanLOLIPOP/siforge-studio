import {rotatePoint,snapMove,resizeRect,round,angle} from './layout.mjs';

let selected=null,gesture=null,options={grid:false,guides:true,gridSize:8,device:'desktop'};
const send=data=>parent.postMessage(data,'*');
const model=id=>[...document.querySelectorAll('[data-element]')].find(el=>el.dataset.element===id);
const root=()=>document.querySelector('[data-sf-root]');
const parentOf=el=>el.parentElement.closest('[data-element],[data-sf-root]')||root();
const layout=el=>JSON.parse(el.dataset.layout)[options.device==='mobile'?'mobile':'desktop'];
function parentAngle(el){let result=0;for(let p=el;p&&p!==document.body;p=p.parentElement)result+=parseFloat(getComputedStyle(p).rotate)||0;return result;}
function world(point,p){const r=p.getBoundingClientRect(),a=parentAngle(p),origin=rotatePoint(-p.offsetWidth/2,-p.offsetHeight/2,a),offset=rotatePoint(point.x+p.clientLeft-p.scrollLeft,point.y+p.clientTop-p.scrollTop,a);return {x:r.left+r.width/2+origin.x+offset.x,y:r.top+r.height/2+origin.y+offset.y};}
function local(point,p){const origin=world({x:0,y:0},p);return rotatePoint(point.x-origin.x,point.y-origin.y,-parentAngle(p));}
function geometry(el){
 const p=parentOf(el),r=el.getBoundingClientRect(),center=local({x:r.left+r.width/2,y:r.top+r.height/2},p),l=layout(el);
 return {mode:l.mode,x:round(center.x-el.offsetWidth/2),y:round(center.y-el.offsetHeight/2),width:el.offsetWidth,height:el.offsetHeight,rotation:parseFloat(getComputedStyle(el).rotate)||0,z:l.z};
}
function siblings(el,p=parentOf(el)){return [...p.querySelectorAll('[data-element]')].filter(item=>item!==el&&parentOf(item)===p);}
function peers(el,p){return [{x:0,y:0,width:p.clientWidth,height:p.clientHeight,rotation:0},...siblings(el,p).map(geometry)];}
function command(op,values={}){if(selected)send({type:'canvas-command',command:{op,id:selected,device:options.device,...values}});}

const style=document.createElement('style');style.textContent=`
 #sf-designer{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:11px system-ui;color:#5263e8}#sf-designer [hidden]{display:none!important}
 #sf-box{position:absolute;box-sizing:border-box;border:1.5px solid #6575ea;transform-origin:center;pointer-events:none}
 .sf-handle{position:absolute;box-sizing:border-box;width:10px;height:10px;border:1px solid #6575ea;background:white;border-radius:2px;pointer-events:auto;padding:0;min-height:0}
 .sf-handle[data-handle=nw]{left:-5px;top:-5px;cursor:nwse-resize}.sf-handle[data-handle=n]{left:calc(50% - 5px);top:-5px;cursor:ns-resize}.sf-handle[data-handle=ne]{right:-5px;top:-5px;cursor:nesw-resize}
 .sf-handle[data-handle=w]{left:-5px;top:calc(50% - 5px);cursor:ew-resize}.sf-handle[data-handle=e]{right:-5px;top:calc(50% - 5px);cursor:ew-resize}
 .sf-handle[data-handle=sw]{left:-5px;bottom:-5px;cursor:nesw-resize}.sf-handle[data-handle=s]{left:calc(50% - 5px);bottom:-5px;cursor:ns-resize}.sf-handle[data-handle=se]{right:-5px;bottom:-5px;cursor:nwse-resize}
 #sf-rotate{left:calc(50% - 5px);top:-25px;border-radius:50%;cursor:grab}#sf-rotate:before{content:'';position:absolute;height:15px;width:1px;left:4px;top:8px;background:#6575ea;pointer-events:none}
 #sf-toolbar{position:absolute;display:flex;gap:1px;padding:3px;background:white;border:1px solid #dce1f6;border-radius:6px;box-shadow:0 2px 8px #283c6b12;pointer-events:auto;white-space:nowrap}
 #sf-toolbar button{font:11px system-ui;background:white;color:#65739b;border:0;border-radius:3px;padding:5px 8px;min-height:0;cursor:pointer}#sf-toolbar button:hover{background:#eef1ff}#sf-toolbar button:disabled{opacity:.35;cursor:default}
 #sf-grid{position:absolute;background-image:radial-gradient(#7184c43b 1px,transparent 1px);transform-origin:top left;pointer-events:none}
 #sf-lines{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
 #sf-drop{position:absolute;border-top:3px solid #6575ea;transform-origin:top left;pointer-events:none}#sf-ghost{position:absolute;border:1px dashed #6575ea;background:#6575ea12;pointer-events:none}
 #sf-parent{position:absolute;border:2px solid #4da78b;box-sizing:border-box;pointer-events:none}
 #sf-label{position:absolute;background:#5263e8;color:white;padding:4px 7px;border-radius:4px;font:10px system-ui;white-space:nowrap}
 [data-element]{touch-action:none}[data-element]:hover{outline:none!important}
`;document.head.append(style);
const hud=document.createElement('div');hud.id='sf-designer';hud.dataset.sfUi='true';hud.innerHTML=`<div id="sf-grid" hidden></div><svg id="sf-lines"></svg><div id="sf-parent" hidden></div><div id="sf-ghost" hidden></div><div id="sf-drop" hidden></div><div id="sf-box" hidden>${['nw','n','ne','w','e','sw','s','se'].map(handle=>`<button class="sf-handle" data-handle="${handle}" aria-label="Resize ${handle}" title="Resize"></button>`).join('')}<button id="sf-rotate" class="sf-handle" data-handle="rotate" aria-label="Rotate" title="Rotate · Shift snaps to 15°"></button></div><div id="sf-toolbar" hidden><button data-action="move" title="Move · Alt changes container" aria-label="Move element">↕ Move</button><button data-action="duplicate" aria-label="Duplicate element" title="Duplicate · Ctrl+D">⧉</button><button data-action="forward" aria-label="Bring forward" title="Bring forward">↑</button><button data-action="back" aria-label="Send backward" title="Send backward">↓</button></div><div id="sf-label" hidden></div>`;document.body.append(hud);
const $=id=>hud.querySelector('#sf-'+id);
function placeRect(node,r){Object.assign(node.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});}
function grid(p){const node=$('grid');node.hidden=!options.grid;if(node.hidden)return;const origin=world({x:0,y:0},p);Object.assign(node.style,{left:origin.x+'px',top:origin.y+'px',width:p.clientWidth+'px',height:p.clientHeight+'px',backgroundSize:options.gridSize+'px '+options.gridSize+'px',transform:`rotate(${parentAngle(p)}deg)`});}
function refresh(){
 const el=model(selected);if(!el){$('box').hidden=$('toolbar').hidden=true;grid(root());return;}
 const r=el.getBoundingClientRect(),g=geometry(el),p=parentOf(el);grid(p);
 $('box').hidden=false;Object.assign($('box').style,{left:(r.left+r.width/2-el.offsetWidth/2)+'px',top:(r.top+r.height/2-el.offsetHeight/2)+'px',width:el.offsetWidth+'px',height:el.offsetHeight+'px',transform:`rotate(${parentAngle(p)+g.rotation}deg)`});
 $('toolbar').hidden=!!gesture;Object.assign($('toolbar').style,{left:Math.max(5,Math.min(innerWidth-205,r.left))+'px',top:Math.max(5,r.top-57)+'px'});
 hud.querySelector('[data-action=forward]').disabled=g.mode!=='free';hud.querySelector('[data-action=back]').disabled=g.mode!=='free';
}
function report(){const el=model(selected);if(el)send({type:'canvas-geometry',id:selected,device:options.device,geometry:geometry(el)});}
function select(id){selected=id||null;refresh();const el=model(selected);send({type:'select',id:selected,geometry:el?geometry(el):null});}
function lines(items,p){$('lines').innerHTML=items.map(line=>{const a=world({x:line.axis==='x'?line.value:0,y:line.axis==='y'?line.value:0},p),b=world({x:line.axis==='x'?line.value:p.clientWidth,y:line.axis==='y'?line.value:p.clientHeight},p);return `<path d="M${a.x} ${a.y} L${b.x} ${b.y}" stroke="#dc80b4" stroke-width="1"/>`;}).join('');}
function clearGestureUi(){for(const name of ['drop','ghost','parent','label'])$(name).hidden=true;$('lines').innerHTML='';}
function start(event,kind,handle=''){
 const el=model(selected);if(!el||event.button!==0)return;event.preventDefault();event.stopPropagation();
 const p=parentOf(el),point={x:event.clientX,y:event.clientY},g=geometry(el),r=el.getBoundingClientRect(),center={x:r.left+r.width/2,y:r.top+r.height/2};
 gesture={kind,handle,el,p,start:g,initialPoint:point,localStart:local(point,p),center,initialAngle:Math.atan2(point.y-center.y,point.x-center.x)*180/Math.PI,savedStyle:el.getAttribute('style'),moved:false,current:g,beforeId:null,targetParent:p};
 refresh();send({type:'canvas-gesture-start',cursor:kind==='rotate'?'crosshair':kind==='resize'?(handle==='n'||handle==='s'?'ns-resize':handle==='e'||handle==='w'?'ew-resize':handle==='ne'||handle==='sw'?'nesw-resize':'nwse-resize'):'grabbing'});
}
function eligibleParent(point,el){
 const hit=document.elementsFromPoint(point.x,point.y).find(node=>node!==el&&!el.contains(node)&&!node.closest('[data-sf-ui]'));
 let target=hit?.closest('[data-kind="container"],[data-kind="form"]');
 while(target&&(target===el||el.contains(target)))target=parentOf(target).closest('[data-kind="container"],[data-kind="form"]');
 return target||root();
}
function flowTarget(point,el,p){
 const items=siblings(el,p).filter(item=>layout(item).mode==='flow'),horizontal=getComputedStyle(p).display==='flex'&&getComputedStyle(p).flexDirection==='row';
 let nearest=null,distance=Infinity;for(const item of items){const r=item.getBoundingClientRect(),d=Math.hypot(point.x-r.left-r.width/2,point.y-r.top-r.height/2);if(d<distance){nearest=item;distance=d;}}
 if(!nearest){$('drop').hidden=true;return null;}
 const r=nearest.getBoundingClientRect(),after=horizontal?point.x>r.left+r.width/2:point.y>r.top+r.height/2,index=items.indexOf(nearest),before=after?items[index+1]:nearest;
 $('drop').hidden=false;Object.assign($('drop').style,{left:(horizontal?(after?r.right:r.left):r.left)+'px',top:(horizontal?r.top:(after?r.bottom:r.top))+'px',width:(horizontal?r.height:r.width)+'px',transform:horizontal?'rotate(90deg)':'none'});
 return before?.dataset.element||null;
}
function preview(g){
 const el=gesture.el,values={width:g.width+'px',height:g.height+'px',rotate:g.rotation+'deg'};
 if(g.mode==='free')Object.assign(values,{position:'absolute',left:g.x+'px',top:g.y+'px',margin:'0px'});
 for(const [key,value] of Object.entries(values))el.style.setProperty(key,value,'important');refresh();
}
function move(event){
 if(!gesture)return;const t=gesture,point={x:event.clientX,y:event.clientY};
 if(!t.moved&&Math.hypot(point.x-t.initialPoint.x,point.y-t.initialPoint.y)<3)return;t.moved=true;
 const config={...options,grid:options.grid&&!event.ctrlKey,guides:options.guides&&!event.ctrlKey,peers:peers(t.el,t.p)},current=local(point,t.p),dx=current.x-t.localStart.x,dy=current.y-t.localStart.y;
 clearGestureUi();
 if(t.kind==='move'&&t.start.mode==='flow'){
  const target=event.altKey?eligibleParent(point,t.el):t.p;t.targetParent=target;t.beforeId=flowTarget(point,t.el,target);
  const r=t.el.getBoundingClientRect();$('ghost').hidden=false;placeRect($('ghost'),{left:point.x-(t.initialPoint.x-r.left),top:point.y-(t.initialPoint.y-r.top),width:r.width,height:r.height});
  if(event.altKey&&target!==t.p){$('parent').hidden=false;placeRect($('parent'),target.getBoundingClientRect());}
 }else if(t.kind==='move'){
  const snapped=snapMove({...t.start,x:t.start.x+dx,y:t.start.y+dy},config.peers,config);t.current=snapped.rect;preview(t.current);lines(snapped.lines,t.p);
  t.targetParent=event.altKey?eligibleParent(point,t.el):t.p;if(t.targetParent!==t.p){$('parent').hidden=false;placeRect($('parent'),t.targetParent.getBoundingClientRect());}
 }else if(t.kind==='resize'){
  const delta=rotatePoint(dx,dy,-t.start.rotation),resized=resizeRect(t.start,t.handle,delta.x,delta.y,{...config,lockAspect:event.shiftKey});t.current=resized.rect;preview(t.current);lines(resized.lines,t.p);
 }else if(t.kind==='rotate'){
  const center=world({x:t.start.x+t.start.width/2,y:t.start.y+t.start.height/2},t.p);let value=t.start.rotation+Math.atan2(point.y-center.y,point.x-center.x)*180/Math.PI-t.initialAngle;if(event.shiftKey)value=Math.round(value/15)*15;t.current={...t.start,rotation:angle(value)};preview(t.current);
 }
 $('label').hidden=false;$('label').textContent=t.kind==='rotate'?t.current.rotation+'°':t.kind==='move'&&t.start.mode==='flow'?'Reorder':`${Math.round(t.current.x)}, ${Math.round(t.current.y)} · ${Math.round(t.current.width)} × ${Math.round(t.current.height)}`;Object.assign($('label').style,{left:Math.min(innerWidth-180,Math.max(4,point.x+15))+'px',top:Math.max(4,Math.min(innerHeight-25,point.y+16))+'px'});
 if(point.y>innerHeight-22)scrollBy(0,12);else if(point.y<22)scrollBy(0,-12);
}
function finish(cancel=false){
 if(!gesture)return;const t=gesture;gesture=null;t.el.setAttribute('style',t.savedStyle||'');clearGestureUi();refresh();send({type:'canvas-gesture-end'});
 if(cancel||!t.moved)return;
 if(t.kind==='move'&&t.start.mode==='flow')command('reorder',{parentId:t.targetParent.dataset.element||null,beforeId:t.beforeId});
 else {
  const values={layout:t.current};
  if(t.kind==='move'&&t.targetParent!==t.p){const center=world({x:t.current.x+t.current.width/2,y:t.current.y+t.current.height/2},t.p),point=local(center,t.targetParent);values.layout={...t.current,x:point.x-t.current.width/2,y:point.y-t.current.height/2,rotation:angle(t.current.rotation+parentAngle(t.p)-parentAngle(t.targetParent))};values.parentId=t.targetParent.dataset.element||null;}
  command('geometry',values);
 }
}
function action(name,values={}){
 const el=model(selected);if(!el)return;const g=geometry(el);
 if(name==='set-mode')command('geometry',{layout:{...g,mode:values.mode==='free'?'free':'flow'}});
 else if(name==='set-geometry')command('geometry',{layout:{...g,...values}});
 else if(name==='duplicate'||name==='delete'||name==='reset-mobile')command(name);
 else if(name==='forward'||name==='back')command('stack',{direction:name==='forward'?1:-1});
}
function key(event){
 if(gesture){if(event.key==='Escape')finish(true);return;}
 const k=event.key.toLowerCase();
 if(event.ctrlKey||event.metaKey){if(['s','z','y'].includes(k)){event.preventDefault?.();send({type:'designer-shortcut',action:k==='s'?'save':k==='y'||event.shiftKey?'redo':'undo'});}else if(k==='d'){event.preventDefault?.();action('duplicate');}return;}
 if(!selected)return;
 if(['Delete','Backspace'].includes(event.key)){event.preventDefault?.();action('delete');}
 else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
  event.preventDefault?.();const el=model(selected),g=geometry(el),step=event.shiftKey?10:1;
  if(g.mode==='flow')command('step',{direction:['ArrowLeft','ArrowUp'].includes(event.key)?-1:1});
  else command('geometry',{layout:{...g,x:g.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:g.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)}});
 }
}
hud.querySelectorAll('[data-handle]').forEach(handle=>handle.addEventListener('pointerdown',event=>start(event,handle.dataset.handle==='rotate'?'rotate':'resize',handle.dataset.handle)));
hud.querySelectorAll('[data-action]').forEach(button=>{button.addEventListener('pointerdown',event=>{if(button.dataset.action==='move')start(event,'move');else{event.preventDefault();event.stopPropagation();}});button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(button.dataset.action!=='move')action(button.dataset.action);});});
addEventListener('pointerdown',event=>{if(event.target.closest('[data-sf-ui]'))return;const el=event.target.closest('[data-element]');select(el?.dataset.element);if(el)start(event,'move');else event.preventDefault();});
addEventListener('pointermove',move);addEventListener('pointerup',()=>finish());addEventListener('pointercancel',()=>finish(true));
addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
addEventListener('keydown',key);addEventListener('scroll',refresh,{passive:true});addEventListener('resize',()=>{refresh();report();});
addEventListener('dragover',event=>event.preventDefault());addEventListener('drop',event=>{event.preventDefault();send({type:'drop',target:event.target.closest('[data-element]')?.dataset.element});});
addEventListener('message',event=>{
 if(event.source!==parent)return;const data=event.data;
 if(data.type==='highlight'){selected=data.id||null;options={...options,...data.options};options.gridSize=Math.max(1,Math.min(128,Number(options.gridSize)||8));refresh();report();}
 else if(data.type==='designer-action')action(data.action,data.values);
 else if(data.type==='designer-key')key(data.event);
 else if(data.type==='gesture-pointer'){if(data.phase==='move')move(data.event);else if(data.phase==='up')finish();else finish(true);}
 else if(data.type==='drop-at'){const el=document.elementFromPoint(data.x,data.y);send({type:'drop',target:el?.closest('[data-element]')?.dataset.element});}
});
window.siCanvasReady=true;refresh();
