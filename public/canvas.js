window.siCanvasReady=true;
addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const el=e.target.closest('[data-element]');parent.postMessage({type:'select',id:el?.dataset.element},'*');});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();parent.postMessage({type:'drop',target:e.target.closest('[data-element]')?.dataset.element},'*');});
addEventListener('message',e=>{if(e.source!==parent||e.data.type!=='highlight')return;document.querySelectorAll('[data-element]').forEach(el=>{el.style.outline=el.dataset.element===e.data.id?'2px solid #6979ed':'';el.style.outlineOffset=el.dataset.element===e.data.id?'3px':'';});});
addEventListener('message',e=>{if(e.source!==parent||e.data.type!=='drop-at')return;parent.postMessage({type:'drop',target:document.elementFromPoint(e.data.x,e.data.y)?.closest('[data-element]')?.dataset.element},'*');});
