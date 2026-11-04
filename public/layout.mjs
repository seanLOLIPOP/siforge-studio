export const MIN_SIZE=24;
const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
export const round=value=>Math.round(value*10)/10;
export const angle=value=>round(((finite(value)+180)%360+360)%360-180);
export function rotatePoint(x,y,degrees){const r=degrees*Math.PI/180;return {x:x*Math.cos(r)-y*Math.sin(r),y:x*Math.sin(r)+y*Math.cos(r)};}
export function layoutFor(element,mobile=false){
 const raw=(mobile?element.mobileLayout:element.layout)||{};
 return {mode:raw.mode==='free'?'free':'flow',x:Math.max(0,finite(raw.x)),y:Math.max(0,finite(raw.y)),width:raw.width===undefined?null:Math.max(MIN_SIZE,finite(raw.width,MIN_SIZE)),height:raw.height===undefined?null:Math.max(MIN_SIZE,finite(raw.height,MIN_SIZE)),rotation:angle(raw.rotation),z:Math.max(0,Math.round(finite(raw.z)))};
}
export function rotatedBounds(rect){
 const r=finite(rect.rotation)*Math.PI/180,w=Math.abs(Math.cos(r))*rect.width+Math.abs(Math.sin(r))*rect.height,h=Math.abs(Math.sin(r))*rect.width+Math.abs(Math.cos(r))*rect.height;
 return {x:rect.x+(rect.width-w)/2,y:rect.y+(rect.height-h)/2,width:w,height:h};
}
function margins(element){
 const defaults={heading:['12px','0px','20px','0px'],text:['15px','0px','15px','0px'],input:['16px','0px','16px','0px']};
 const values=String(element.style?.margin||'').trim().split(/\s+/).filter(Boolean),base=values.length?[values[0],values[1]||values[0],values[2]||values[0],values[3]||values[1]||values[0]]:defaults[element.type]||['0px','0px','0px','0px'];
 return ['Top','Right','Bottom','Left'].map((side,i)=>element.style?.['margin'+side]||base[i]);
}
export function layoutStyle(element,mobile=false){
 const l=layoutFor(element,mobile),hasLayout=!!element.layout||!!element.mobileLayout;
 if(!hasLayout)return {};
 const result={position:l.mode==='free'?'absolute':'relative',left:l.mode==='free'?l.x+'px':'auto',top:l.mode==='free'?l.y+'px':'auto',rotate:l.rotation+'deg',zIndex:l.z||'auto',boxSizing:'border-box',maxWidth:'100%'};
 if(l.width!==null)result.width=l.width+'px';else if(mobile&&element.layout?.width!==undefined)result.width='auto';
 if(l.height!==null)result.height=l.height+'px';else if(mobile&&element.layout?.height!==undefined)result.height='auto';
 if(l.mode==='free')result.margin='0px';
 else {
  const base=margins(element),bounds=rotatedBounds({x:0,y:0,width:l.width||0,height:l.height||0,rotation:l.rotation}),dx=Math.max(0,(bounds.width-(l.width||0))/2),dy=Math.max(0,(bounds.height-(l.height||0))/2);
  ['Top','Right','Bottom','Left'].forEach((side,i)=>{result['margin'+side]=`calc(${base[i]} + ${round(i%2?dx:dy)}px)`;});
 }
 return result;
}
export function freeExtent(elements,mobile=false){
 let bottom=0;for(const e of elements){const l=layoutFor(e,mobile);if(l.mode==='free'){const b=rotatedBounds({...l,width:l.width||200,height:l.height||80});bottom=Math.max(bottom,b.y+b.height+24);}}
 return Math.ceil(bottom);
}
export function anchors(rect,axis){const start=axis==='x'?rect.x:rect.y,size=axis==='x'?rect.width:rect.height;return [start,start+size/2,start+size];}
function nearest(values,targets,tolerance){let best=null;for(const value of values)for(const target of targets){const delta=target-value;if(Math.abs(delta)<=tolerance&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,value:target};}return best;}
export function snapMove(rect,peers,{grid=false,guides=true,gridSize=8,tolerance=6}={}){
 const result={...rect},lines=[];if(grid){result.x=Math.round(result.x/gridSize)*gridSize;result.y=Math.round(result.y/gridSize)*gridSize;}
 if(guides)for(const axis of ['x','y']){const box=rotatedBounds(result),hit=nearest(anchors(box,axis),peers.flatMap(p=>anchors(rotatedBounds(p),axis)),tolerance);if(hit){result[axis]+=hit.delta;lines.push({axis,value:hit.value});}}
 result.x=round(Math.max(0,result.x));result.y=round(Math.max(0,result.y));return {rect:result,lines};
}
export function resizeRect(start,handle,dx,dy,{grid=false,guides=true,gridSize=8,peers=[],lockAspect=false}={}){
 const sx=handle.includes('w')?-1:handle.includes('e')?1:0,sy=handle.includes('n')?-1:handle.includes('s')?1:0;
 let w=Math.max(MIN_SIZE,start.width+sx*dx),h=Math.max(MIN_SIZE,start.height+sy*dy);
 if(grid){if(sx)w=Math.max(MIN_SIZE,Math.round(w/gridSize)*gridSize);if(sy)h=Math.max(MIN_SIZE,Math.round(h/gridSize)*gridSize);}
 const lines=[];
 if(guides&&Math.abs(start.rotation||0)<.01){
  if(sx){const edge=sx>0?start.x+w:start.x+start.width-w,hit=nearest([edge],peers.flatMap(p=>anchors(rotatedBounds(p),'x')),6);if(hit){w=Math.max(MIN_SIZE,w+sx*hit.delta);lines.push({axis:'x',value:hit.value});}}
  if(sy){const edge=sy>0?start.y+h:start.y+start.height-h,hit=nearest([edge],peers.flatMap(p=>anchors(rotatedBounds(p),'y')),6);if(hit){h=Math.max(MIN_SIZE,h+sy*hit.delta);lines.push({axis:'y',value:hit.value});}}
 }
 if(lockAspect){const ratio=start.width/start.height;if(!sx)w=h*ratio;else if(!sy)h=w/ratio;else if(Math.abs(w-start.width)/start.width>=Math.abs(h-start.height)/start.height)h=w/ratio;else w=h*ratio;}
 const shift=rotatePoint(sx*(w-start.width)/2,sy*(h-start.height)/2,start.rotation||0);
 return {rect:{...start,x:round(start.x+start.width/2+shift.x-w/2),y:round(start.y+start.height/2+shift.y-h/2),width:round(w),height:round(h)},lines};
}
function locate(elements,id,parent=null){for(const e of elements){if(e.id===id)return {element:e,list:elements,parent};const found=locate(e.children||[],id,e);if(found)return found;}return null;}
function contains(element,id){return element.id===id||(element.children||[]).some(child=>contains(child,id));}
const positionKeys=['position','left','top','width','height','rotate','transform','zIndex'];
function normalizedLayout(values){
 const result={mode:values.mode==='free'?'free':'flow'};
 for(const key of ['x','y','width','height','rotation','z'])if(values[key]!==undefined){if(typeof values[key]!=='number'||!Number.isFinite(values[key]))throw Error('Position values must be finite numbers.');let n=values[key];if(key==='rotation')n=angle(n);else if(key==='z')n=Math.round(Math.max(0,Math.min(10000,n)));else n=Math.min(100000,Math.max(key==='width'||key==='height'?MIN_SIZE:0,n));result[key]=round(n);}
 return result;
}
export function applyCanvasCommand(elements,command){
 const next=structuredClone(elements),source=locate(next,command.id);if(!source)return {changed:false,elements,selected:command.id};
 const before=JSON.stringify(next),mobile=command.device==='mobile',key=mobile?'mobileLayout':'layout';let selected=source.element.id;
 let destination=source.list;
 if(Object.hasOwn(command,'parentId')){
  const parent=command.parentId?locate(next,command.parentId)?.element:null;
  if(command.parentId&&(!parent||!['container','form'].includes(parent.type)||contains(source.element,parent.id)))return {changed:false,elements,selected};
  destination=parent?parent.children:next;
 }
 const e=source.element;
 switch(command.op){
  case 'geometry':{
   const layout=normalizedLayout(command.layout||{});
   if(destination!==source.list){source.list.splice(source.list.indexOf(e),1);destination.push(e);}
   e[key]=layout;if(mobile&&e.mobileStyle)for(const property of positionKeys)delete e.mobileStyle[property];break;
  }
  case 'reorder':{
   if(command.beforeId===e.id&&destination===source.list)break;
   source.list.splice(source.list.indexOf(e),1);let index=command.beforeId?destination.findIndex(item=>item.id===command.beforeId):-1;
   destination.splice(index<0?destination.length:index,0,e);break;
  }
  case 'step':{
   const siblings=source.list.filter(item=>layoutFor(item,mobile).mode==='flow'),index=siblings.indexOf(e),other=siblings[index+(command.direction<0?-1:1)];
   if(other){const a=source.list.indexOf(e),b=source.list.indexOf(other);[source.list[a],source.list[b]]=[source.list[b],source.list[a]];}break;
  }
  case 'duplicate':{
   const copy=structuredClone(e);const renew=item=>{item.id=crypto.randomUUID();for(const child of item.children||[])renew(child);};renew(copy);
   for(const k of ['layout','mobileLayout'])if(copy[k]?.mode==='free'){copy[k].x=round((copy[k].x||0)+16);copy[k].y=round((copy[k].y||0)+16);copy[k].z=(copy[k].z||0)+1;}
   source.list.splice(source.list.indexOf(e)+1,0,copy);selected=copy.id;break;
  }
  case 'stack':{
   if(layoutFor(e,mobile).mode!=='free')break;
   const ordered=source.list.map((item,i)=>({item,z:layoutFor(item,mobile).z||i+1})).sort((a,b)=>a.z-b.z),index=ordered.findIndex(entry=>entry.item===e),target=Math.max(0,Math.min(ordered.length-1,index+(command.direction<0?-1:1)));
   if(index!==target){const [entry]=ordered.splice(index,1);ordered.splice(target,0,entry);ordered.forEach(({item},i)=>{item[key]={...(item[key]||{mode:layoutFor(item,mobile).mode}),z:i+1};});}break;
  }
  case 'delete':source.list.splice(source.list.indexOf(e),1);selected=null;break;
  case 'reset-mobile':delete e.mobileLayout;if(e.mobileStyle)for(const property of positionKeys)delete e.mobileStyle[property];break;
  default:return {changed:false,elements,selected};
 }
 return {changed:before!==JSON.stringify(next),elements:next,selected};
}
