import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyCanvasCommand,layoutFor,layoutStyle,freeExtent,snapMove,resizeRect,rotatePoint} from '../public/layout.mjs';
import {starter,validateProject} from '../src/model.mjs';
import {renderPage} from '../public/render.mjs';
const element=(id,type='text',children=[])=>({id,type,text:id,children,style:{}});
const close=(a,b)=>assert.ok(Math.abs(a-b)<.11,`${a} != ${b}`);

test('desktop free positioning stacks on mobile unless explicitly overridden',()=>{
 const e=element('free');e.layout={mode:'free',x:90,y:120,width:300,height:70,rotation:25,z:3};
 assert.equal(layoutStyle(e).position,'absolute');assert.equal(layoutStyle(e).left,'90px');assert.equal(layoutFor(e,true).mode,'flow');assert.equal(layoutStyle(e,true).position,'relative');assert.equal(layoutStyle(e,true).height,'auto');assert.equal(layoutStyle(e,true).rotate,'0deg');
 e.mobileLayout={mode:'free',x:8,y:16,width:200,height:40,rotation:0};assert.equal(layoutStyle(e,true).left,'8px');
 assert.ok(freeExtent([e])>=190);assert.equal(freeExtent([e],true),80);
});
test('snapping supports edges, centers, independent toggles and grid steps',()=>{
 const r={x:43,y:37,width:20,height:20,rotation:0},peer={x:80,y:50,width:40,height:40,rotation:0};
 const grid=snapMove(r,[peer],{grid:true,guides:false,gridSize:16});assert.equal(grid.rect.x,48);assert.equal(grid.rect.y,32);assert.equal(grid.lines.length,0);
 const guides=snapMove({...r,x:61,y:49},[peer],{grid:false,guides:true});assert.equal(guides.rect.x,60);assert.equal(guides.rect.y,50);assert.equal(guides.lines.length,2);
 assert.equal(snapMove(r,[peer],{grid:false,guides:false}).rect.x,43);
});
test('rotated resizing keeps the opposite corner fixed and supports aspect locking',()=>{
 const start={x:200,y:170,width:160,height:90,rotation:35};
 const fixed=r=>{const p=rotatePoint(-r.width/2,-r.height/2,r.rotation);return {x:r.x+r.width/2+p.x,y:r.y+r.height/2+p.y};};
 const resized=resizeRect(start,'se',45,20,{guides:false}).rect;close(fixed(start).x,fixed(resized).x);close(fixed(start).y,fixed(resized).y);
 const locked=resizeRect(start,'se',80,10,{guides:false,lockAspect:true}).rect;close(locked.width/locked.height,start.width/start.height);
 assert.ok(resizeRect(start,'nw',1000,1000,{guides:false}).rect.width>=24);
});
test('layout commands reorder, reparent without cycles, duplicate unique IDs and preserve desktop overrides',()=>{
 const original=[element('a','container',[element('one'),element('two')]),element('b','container',[element('three')])];
 let result=applyCanvasCommand(original,{op:'reorder',id:'one',beforeId:null});assert.deepEqual(result.elements[0].children.map(e=>e.id),['two','one']);assert.equal(original[0].children[0].id,'one');
 result=applyCanvasCommand(original,{op:'geometry',id:'one',parentId:'b',layout:{mode:'free',x:24,y:32,width:90,height:40,rotation:0}});assert.equal(result.elements[0].children.length,1);assert.equal(result.elements[1].children[1].id,'one');
 assert.equal(applyCanvasCommand(original,{op:'reorder',id:'a',parentId:'one'}).changed,false);
 const duplicate=applyCanvasCommand(result.elements,{op:'duplicate',id:'one'});assert.notEqual(duplicate.selected,'one');assert.equal(duplicate.elements[1].children[2].layout.x,40);
 const mobile=applyCanvasCommand(result.elements,{op:'geometry',id:'one',device:'mobile',layout:{mode:'free',x:8,y:16,width:80,height:30}});assert.equal(mobile.elements[1].children[1].layout.x,24);assert.equal(mobile.elements[1].children[1].mobileLayout.x,8);
 const reset=applyCanvasCommand(mobile.elements,{op:'reset-mobile',id:'one',device:'mobile'});assert.equal(reset.elements[1].children[1].mobileLayout,undefined);
 assert.throws(()=>applyCanvasCommand(original,{op:'geometry',id:'one',layout:{mode:'free',x:NaN}}),/finite/);
});
test('stacking stays within sibling containers and runtime output uses saved positions',()=>{
 const a=element('first'),b=element('second');a.layout={mode:'free',x:30,y:40,width:160,height:90,rotation:15,z:1};b.layout={mode:'free',x:50,y:60,width:160,height:90,rotation:0,z:2};
 const stacked=applyCanvasCommand([element('parent','container',[a,b])],{op:'stack',id:'first',direction:1});assert.ok(stacked.elements[0].children[0].layout.z>stacked.elements[0].children[1].layout.z);
 const p=starter();p.pages[0].elements=stacked.elements;validateProject(p);const html=renderPage(p,p.pages[0]);assert.match(html,/left:30px/);assert.match(html,/rotate:15deg/);assert.match(html,/position:relative !important/);assert.match(html,/min-height:max/);
 p.pages[0].elements[0].children[0].layout.x=Infinity;assert.throws(()=>validateProject(p),/position/);
});
