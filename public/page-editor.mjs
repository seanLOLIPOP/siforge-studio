import {esc,canvasStyles} from './render.mjs';

export function renderPageInspector(host){
 const {page,project,mobile,selection,checkpoint,changed}=host;
 const inspector=document.querySelector('#properties'),nav=page.navigation||{},style=canvasStyles(page,mobile);
 const field=(label,key,value)=>`<label>${label}<input data-page-prop="${key}" value="${esc(value??'')}"></label>`;
 inspector.innerHTML=`<div class="property-title">${selection==='$navigation'?'Header':'Canvas'} <span class="type-badge">${mobile?'MOBILE':'PAGE'}</span></div>
 <div class="property-actions"><button id="inspect-canvas">Canvas</button><button id="inspect-header">Header</button></div>
 ${selection==='$navigation'?`${field('Title','navigation.title',nav.title??project.name)}<label><input id="header-visible" type="checkbox" ${nav.hidden?'':'checked'}> Show header</label>${field('Background','navigation.background',nav.style?.background||'#ffffff')}${field('Text color','navigation.color',nav.style?.color||project.theme.text)}${field('Padding','navigation.padding',nav.style?.padding||'22px 6%')}${field('Gap','navigation.gap',nav.style?.gap||'24px')}`:
 `${field('Page background','background',page.background||project.theme.background)}${field('Content width','canvas.maxWidth',style.maxWidth)}${field('Minimum height','canvas.minHeight',style.minHeight||'0px')}${field('Padding','canvas.padding',style.padding)}${field('Gap','canvas.gap',style.gap)}<label>Direction<select data-page-prop="canvas.flexDirection"><option value="column" ${style.flexDirection==='column'?'selected':''}>Column</option><option value="row" ${style.flexDirection==='row'?'selected':''}>Row</option></select></label>${field('Align items','canvas.alignItems',style.alignItems||'stretch')}<div class="property-actions"><button id="canvas-full-width">Full width</button><button id="canvas-no-padding">No padding</button>${mobile?'<button id="reset-mobile-canvas">Reset mobile</button>':''}</div>`}`;
 const update=fn=>{checkpoint();fn();changed();};
 inspector.querySelectorAll('[data-page-prop]').forEach(input=>input.onchange=()=>{
  const [group,key]=input.dataset.pageProp.split('.'),value=input.value.trim();
  if(value.length>200)return;
  if(group==='canvas'&&window.CSS&&!CSS.supports(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value)){input.setCustomValidity('Enter a valid CSS value.');input.reportValidity();return;}
  input.setCustomValidity('');update(()=>{if(group==='canvas')(mobile?(page.mobileCanvas??={}):(page.canvas??={}))[key]=value;
   else if(group==='navigation'){page.navigation??={};if(key==='title')page.navigation.title=value;else(page.navigation.style??={})[key]=value;}
   else page[group]=value;});
 });
 inspector.querySelector('#inspect-canvas').onclick=()=>host.select('$canvas');inspector.querySelector('#inspect-header').onclick=()=>host.select('$navigation');
 const bind=(id,fn)=>{const button=inspector.querySelector('#'+id);if(button)button.onclick=()=>update(fn);};
 bind('canvas-full-width',()=>{(mobile?(page.mobileCanvas??={}):(page.canvas??={})).maxWidth='none';});
 bind('canvas-no-padding',()=>{(mobile?(page.mobileCanvas??={}):(page.canvas??={})).padding='0px';});
 bind('reset-mobile-canvas',()=>{delete page.mobileCanvas;});
 const visible=inspector.querySelector('#header-visible');if(visible)visible.onchange=()=>update(()=>{(page.navigation??={}).hidden=!visible.checked;});
}
