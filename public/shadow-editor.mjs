import {shadowDefaults,shadowPresets,validateEffects,effectStyles} from './shadows.mjs';
const selected=new Map();
export function mountShadowEditor(host,effects,options={}){
 let target=selected.get(options.scope)||'box';
 const root=document.createElement('section');root.className='shadow-editor';host.append(root);
 function render(){
  const value=effects?.[target]||shadowDefaults(target,target==='box'&&options.legacyShadow?'soft':'none');
  root.innerHTML=`<div class="property-section">SHADOW GENERATOR</div><div class="property-grid"><label>Apply to<select data-shadow-target><option value="box" ${target==='box'?'selected':''}>Element</option><option value="text" ${target==='text'?'selected':''}>Text</option></select></label><label>Style<select data-shadow="preset">${shadowPresets.filter(([key])=>target==='box'||!['inset','raised'].includes(key)).map(([key,label])=>`<option value="${key}" ${value.preset===key?'selected':''}>${label}</option>`).join('')}</select></label></div>${value.preset==='none'?'':`<div class="shadow-sample" aria-label="Shadow preview"><span>Aa</span></div><label>Color follows<select data-shadow="source">${[['background','Background'],['text','Text color'],['accent','Theme accent'],['custom','Custom color']].map(([key,label])=>`<option value="${key}" ${value.source===key?'selected':''}>${label}</option>`).join('')}</select></label>${value.source==='custom'?`<label>Shadow color<input data-shadow="color" type="color" value="${value.color}"></label>`:''}<div class="property-grid">${[['x','Horizontal',-100,100],['y','Vertical',-100,100],['blur','Blur',0,200],...(target==='box'?[['spread','Spread',-100,100]]:[]),['opacity','Strength %',0,100],...(['3d','long'].includes(value.preset)?[['depth','3D layers',1,32]]:[])].map(([key,label,min,max])=>`<label>${label}<input data-shadow="${key}" type="number" min="${min}" max="${max}" step="1" value="${key==='opacity'?Math.round(value.opacity*100):value[key]}"></label>`).join('')}</div>`}${options.reset?'<button data-shadow-reset>Reset mobile shadows</button>':''}`;
  root.siShadowPreview={target,value,background:options.background,color:options.color,accent:options.accent};const preview=root.querySelector('.shadow-sample span');if(preview){Object.assign(preview.style,{background:options.background||'#ffffff',color:options.color||'#24283c'},effectStyles({[target]:value},{background:options.background,accent:options.accent}));}
  root.querySelector('[data-shadow-target]').onchange=event=>{target=event.target.value;selected.set(options.scope,target);render();};
  root.querySelectorAll('[data-shadow]').forEach(input=>input.onchange=()=>{
   if(!input.reportValidity())return;const key=input.dataset.shadow;let next={...value};
   if(key==='preset')next={...shadowDefaults(target,input.value),source:value.source,color:value.color};
   else next[key]=input.type==='number'?Number(input.value)/(key==='opacity'?100:1):input.value;
   const result={...effects,[target]:next};try{validateEffects(result);options.onChange(result);}catch(error){options.error?.(error.message);}
  });
  if(options.reset)root.querySelector('[data-shadow-reset]').onclick=options.reset;
 }
 render();return root;
}
