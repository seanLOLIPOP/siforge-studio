import {_electron as electron} from './playwright.mjs';
import {electronRuntime} from './runtime.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'si-designer-'));
const env={...process.env,SI_NODE:process.execPath,SI_WORKSPACE_ROOT:directory,SI_TEST_HIDDEN:'0'};delete env.ELECTRON_RUN_AS_NODE;
const application=await electron.launch({executablePath:process.env.SI_TEST_EXE||path.join(electronRuntime(),'electron.exe'),args:process.env.SI_TEST_EXE?[]:[source],env,timeout:30000}),pid=application.process().pid;
let page,token;
const item=(id,type,text,style={},children=[])=>({id,type,text,style,children});
function locate(id,elements){for(const e of elements){if(e.id===id)return e;const result=locate(id,e.children||[]);if(result)return result;}return null;}
async function api(action,body){const response=await fetch(new URL('/studio/'+action,page.url()),{method:body?'POST':'GET',headers:{'X-Studio-Token':token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const value=await response.json();assert.equal(response.status,200,value.error);return value;}
async function saved(){await page.waitForFunction(()=>document.querySelector('#save-state').textContent!=='All changes saved');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='All changes saved');return (await api('project')).project;}
async function select(id){await page.locator(`[data-layer="${id}"]`).click();await page.frameLocator('#canvas').locator('#sf-box').waitFor();}
async function drag(locator,dx,dy,{alt=false,shift=false,beforeUp}={}){
 const r=await locator.boundingBox();if(alt)await page.keyboard.down('Alt');if(shift)await page.keyboard.down('Shift');
 await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.locator('#canvas-gesture-shield').waitFor();await page.mouse.move(r.x+r.width/2+dx,r.y+r.height/2+dy,{steps:12});
 if(beforeUp)await beforeUp();await page.mouse.up();if(alt)await page.keyboard.up('Alt');if(shift)await page.keyboard.up('Shift');
}
try{
 page=await application.firstWindow();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')console.error(message.text());});
 page.on('request',request=>{if(request.url().includes('/studio/'))token=request.headers()['x-studio-token']||token;});
 await page.locator('#project-name').fill('Designer proof');await page.locator('#project-password').fill('designer test password');await page.locator('#password-confirm').fill('designer test password');await page.locator('#unlock-button').click();await page.locator('#studio').waitFor({state:'visible'});
 let p=(await api('project')).project;
 const leaf={width:'180px',height:'40px',margin:'0px',background:'#eef1ff',padding:'8px'};
 p.pages=[{...p.pages[0],elements:[item('stage','container','',{padding:'24px',height:'360px',display:'flex',flexDirection:'column',gap:'12px',background:'#ffffff',borderRadius:'12px'},[item('a','text','Alpha',leaf),item('b','text','Beta',leaf),item('c','text','Gamma',leaf)]),item('target','container','',{padding:'24px',height:'180px',display:'flex',flexDirection:'column',gap:'12px',background:'#eaf5ef',borderRadius:'12px'},[item('d','text','Target container',{margin:'0px'})])]}];
 await api('save',{project:p});await page.goto(new URL('/?designer-test=1#'+token,page.url()).href);await page.locator('#studio').waitFor({state:'visible'});
 const frame=page.frameLocator('#canvas');await frame.locator('[data-element="a"]').waitFor();await select('a');
 assert.equal(await page.locator('#layout-mode').inputValue(),'flow');
 // Flow dragging reorders within the existing parent without assigning absolute positions.
 await drag(frame.locator('[data-element="a"]'),0,120);p=await saved();assert.deepEqual(locate('stage',p.pages[0].elements).children.map(e=>e.id),['b','c','a']);assert.equal(locate('a',p.pages[0].elements).layout,undefined);
 await page.locator('#layout-mode').selectOption('free');p=await saved();assert.equal(locate('a',p.pages[0].elements).layout.mode,'free');const initial=locate('a',p.pages[0].elements).layout;
 // Guides appear while moving along the sibling column; Escape cancels the whole gesture.
 await frame.locator('#sf-box').waitFor();await drag(frame.locator('[data-element="a"]'),2,30,{beforeUp:async()=>{await frame.locator('#sf-lines path').first().waitFor({state:'attached'});await page.keyboard.press('Escape');}});
 assert.equal((await api('project')).project.pages[0].elements[0].children[2].layout.y,initial.y);
 await page.locator('#snap-grid').check();await page.locator('#grid-size').fill('8');await page.locator('#grid-size').press('Tab');await page.locator('#snap-guides').uncheck();
 await drag(frame.locator('[data-element="a"]'),29,19);p=await saved();let g=locate('a',p.pages[0].elements).layout;assert.equal(g.x%8,0);assert.equal(g.y%8,0);assert.ok(g.x>initial.x);
 await frame.locator('#sf-box').waitFor();const width=g.width,height=g.height;await drag(frame.locator('[data-handle="se"]'),32,16);p=await saved();g=locate('a',p.pages[0].elements).layout;assert.ok(g.width>width);assert.ok(g.height>height);
 // Rotate with a handle and Shift snapping, then resize in the rotated local axes.
 await frame.locator('#sf-box').waitFor();let box=await frame.locator('[data-element="a"]').boundingBox(),knob=await frame.locator('#sf-rotate').boundingBox();
 const cx=box.x+box.width/2,cy=box.y+box.height/2,radius=cy-(knob.y+knob.height/2);
 await drag(frame.locator('#sf-rotate'),cx+radius-(knob.x+knob.width/2),cy-(knob.y+knob.height/2),{shift:true});p=await saved();g=locate('a',p.pages[0].elements).layout;assert.ok(Math.abs(g.rotation-90)<1);
 const rotatedWidth=g.width;await frame.locator('#sf-box').waitFor();await drag(frame.locator('[data-handle="se"]'),-16,32);p=await saved();assert.ok(locate('a',p.pages[0].elements).layout.width>rotatedWidth);
 // Duplicate gets distinct IDs and an offset. Layer ordering can move the copy behind its sibling.
 await page.keyboard.press('Control+d');p=await saved();let siblings=locate('stage',p.pages[0].elements).children,copy=siblings.find(e=>!['a','b','c'].includes(e.id));assert.ok(copy);assert.notEqual(copy.id,'a');assert.equal(copy.layout.x,locate('a',p.pages[0].elements).layout.x+16);
 await page.locator('[data-stack="back"]').click();p=await saved();assert.ok(locate(copy.id,p.pages[0].elements).layout.z<locate('a',p.pages[0].elements).layout.z);
 await page.locator('#undo').click();await saved();await page.locator('#redo').click();p=await saved();assert.ok(locate(copy.id,p.pages[0].elements));
 await select('a');const x=locate('a',p.pages[0].elements).layout.x;await page.keyboard.press('Shift+ArrowRight');p=await saved();assert.equal(locate('a',p.pages[0].elements).layout.x,x+10);
 // Alt drag reparents a free-positioned element; ordinary movement has kept its parent.
 await frame.locator('[data-element="a"]').evaluate(el=>el.scrollIntoView({block:'center'}));await select('a');
 box=await frame.locator('[data-element="a"]').boundingBox();let target=await frame.locator('[data-element="target"]').boundingBox();
 await drag(frame.locator('[data-element="a"]'),target.x+140-(box.x+box.width/2),target.y+55-(box.y+box.height/2),{alt:true});p=await saved();assert.ok(locate('target',p.pages[0].elements).children.some(e=>e.id==='a'));
 const desktop={...locate('a',p.pages[0].elements).layout};
 // Mobile automatically stacks, then accepts a separate free-position override and resets it.
 await page.locator('#mobile').click();await page.waitForFunction(()=>document.querySelector('#canvas').getBoundingClientRect().width<=391);await select('a');assert.equal(await page.locator('#layout-mode').inputValue(),'flow');assert.equal(await frame.locator('[data-element="a"]').evaluate(el=>getComputedStyle(el).position),'relative');
 await page.locator('#layout-mode').selectOption('free');await saved();await page.locator('[data-geometry="x"]').fill('12');await page.locator('[data-geometry="x"]').press('Tab');p=await saved();assert.equal(locate('a',p.pages[0].elements).mobileLayout.x,12);assert.deepEqual(locate('a',p.pages[0].elements).layout,desktop);
 await page.locator('#reset-mobile-layout').click();p=await saved();assert.equal(locate('a',p.pages[0].elements).mobileLayout,undefined);assert.deepEqual(locate('a',p.pages[0].elements).layout,desktop);
 await page.locator('#desktop').click();await page.waitForFunction(()=>document.querySelector('#canvas').getBoundingClientRect().width>600);await select('a');await frame.locator('[data-element="a"]').evaluate(el=>el.scrollIntoView({block:'center'}));await page.locator('#snap-guides').check();
 await fs.mkdir(path.join(source,'artifacts'),{recursive:true});await page.screenshot({path:path.join(source,'artifacts','designer-v1.png')});
 // The running website uses the same coordinates and mobile stacking as the editor.
 const status=await api('status'),sitePromise=application.waitForEvent('window');await application.evaluate(({BrowserWindow},url)=>{const win=new BrowserWindow({width:1200,height:850,show:true,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});globalThis.designerSiteWindow=win;win.loadURL(url);},status.preview);const website=await sitePromise;await website.locator('[data-element="a"]').waitFor();
 const actual=await website.locator('[data-element="a"]').evaluate(el=>({x:el.offsetLeft,y:el.offsetTop,width:el.offsetWidth,height:el.offsetHeight,rotation:parseFloat(getComputedStyle(el).rotate)}));for(const key of ['x','y','width','height','rotation'])assert.ok(Math.abs(actual[key]-desktop[key])<1.1,`${key}: ${actual[key]} != ${desktop[key]}`);
 await application.evaluate(()=>globalThis.designerSiteWindow.setContentSize(390,800));await website.waitForFunction(()=>innerWidth===390);assert.equal(await website.locator('[data-element="a"]').evaluate(el=>getComputedStyle(el).position),'relative');assert.equal(await website.locator('[data-element="a"]').evaluate(el=>getComputedStyle(el).rotate),'0deg');
 const ar=await website.locator('[data-element="a"]').boundingBox(),dr=await website.locator('[data-element="d"]').boundingBox();assert.ok(ar.y>=dr.y+dr.height);await website.close();
 await page.locator('#lock').click();await page.locator('#project-password').fill('designer test password');await page.locator('#unlock-button').click();await page.locator('#studio').waitFor({state:'visible'});const reopened=(await api('project')).project;assert.deepEqual(locate('a',reopened.pages[0].elements).layout,desktop);assert.deepEqual(errors,[]);
 console.log('Designer integration passed: flow reorder, free movement, guide cancellation, grid snapping, resize, rotation and rotated resize, duplicate, stacking, undo/redo, keyboard nudge, Alt reparent, automatic mobile stacking/override/reset, runtime parity and encrypted reopen.');
 await Promise.all([application.waitForEvent('close',{timeout:10000}),application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close())]);
}catch(error){console.error('DESIGNER FAILURE',error);if(page&&!page.isClosed())await page.screenshot({path:path.join(source,'designer-failure.png')}).catch(()=>{});throw error;}
finally{spawnSync('taskkill',['/pid',String(pid),'/t','/f']);await fs.rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:200}).catch(()=>{});}


