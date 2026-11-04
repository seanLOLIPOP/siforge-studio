export const shadowPresets=[['none','None'],['soft','Soft'],['hard','Hard'],['inset','Inset'],['glow','Glow'],['raised','Raised'],['3d','3D extrusion'],['long','Long shadow']];
export function shadowDefaults(target='box',preset='none'){
 const base={preset,source:target==='text'?'text':'background',color:'#5263e8',opacity:.3,x:0,y:8,blur:24,spread:0,depth:8};
 if(target==='text')Object.assign(base,{x:2,y:3,blur:6});
 if(preset==='hard')Object.assign(base,{x:6,y:6,blur:0,opacity:.65});
 if(preset==='inset')Object.assign(base,{x:0,y:4,blur:12});
 if(preset==='glow')Object.assign(base,{x:0,y:0,blur:20,opacity:.7});
 if(preset==='raised')Object.assign(base,{x:6,y:6,blur:16,opacity:.35});
 if(preset==='3d')Object.assign(base,{x:8,y:8,blur:0,depth:8,opacity:.85});
 if(preset==='long')Object.assign(base,{x:32,y:32,blur:0,depth:24,opacity:.55});
 return base;
}
export function validateEffects(effects){
 if(effects===undefined)return;if(!effects||typeof effects!=='object'||Array.isArray(effects)||Object.keys(effects).some(k=>!['box','text'].includes(k)))throw Error('Invalid shadow settings.');
 for(const [target,s]of Object.entries(effects)){
  if(!s||!shadowPresets.some(([key])=>key===s.preset)||(target==='text'&&['inset','raised'].includes(s.preset))||!['background','text','accent','custom'].includes(s.source)||!/^#[0-9a-f]{6}$/i.test(s.color))throw Error('Invalid shadow type or color.');
  for(const [key,min,max]of [['x',-100,100],['y',-100,100],['blur',0,200],['spread',-100,100],['opacity',0,1],['depth',1,32]])if(typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]<min||s[key]>max||(key==='depth'&&!Number.isInteger(s[key])))throw Error('Invalid shadow strength, size or depth.');
 }
}
const round=n=>Math.round(n*100)/100;
function colorValue(value,fallback){return typeof value==='string'&&/^(#[0-9a-f]{3,8}|rgba?\([\d.,%\s/]+\)|hsla?\([\d.,%\s/deg]+\)|[a-z]+)$/i.test(value)&&value!=='transparent'?value:fallback;}
export function shadowCSS(settings,target='box',context={}){
 if(!settings||settings.preset==='none')return 'none';const s={...shadowDefaults(target),...settings};
 let base=s.source==='text'?'currentColor':s.source==='accent'?colorValue(context.accent,'#5263e8'):s.source==='custom'?s.color:colorValue(context.background,context.accent||'#5263e8');
 if(s.source!=='custom'&&s.preset!=='glow')base=`color-mix(in srgb, ${base} 70%, black)`;
 const color=`color-mix(in srgb, ${base} ${round(s.opacity*100)}%, transparent)`;
 const layer=(x,y,blur=s.blur,spread=s.spread,c=color,inset=false)=>`${inset&&target==='box'?'inset ':''}${round(x)}px ${round(y)}px ${round(blur)}px${target==='box'?' '+round(spread)+'px':''} ${c}`;
 if(['3d','long'].includes(s.preset))return Array.from({length:s.depth},(_,i)=>layer(s.x*(i+1)/s.depth,s.y*(i+1)/s.depth,s.blur)).join(', ');
 if(s.preset==='glow')return [layer(s.x,s.y,s.blur/2),layer(s.x,s.y,s.blur)].join(', ');
 if(s.preset==='raised')return [layer(s.x,s.y),layer(-s.x,-s.y,s.blur,s.spread,'color-mix(in srgb, white 65%, transparent)')].join(', ');
 return layer(s.x,s.y,s.blur,s.spread,color,s.preset==='inset');
}
export function effectStyles(effects,context={}){const result={};if(effects?.box)result.boxShadow=shadowCSS(effects.box,'box',context);if(effects?.text)result.textShadow=shadowCSS(effects.text,'text',context);return result;}
