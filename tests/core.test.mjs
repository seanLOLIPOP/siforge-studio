import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {derive,seal,openVault} from '../src/vault.mjs';
import {starter,validateProject} from '../src/model.mjs';
import {Database} from '../src/database.mjs';
import {runFlow} from '../src/flows.mjs';
import {createStudio} from '../src/server.mjs';

test('authenticated encryption protects all project contents and rejects corruption / wrong passwords',()=>{
 const salt=randomBytes(16),password='correct horse battery',key=derive(password,salt),p=starter('Secret project');p.pages[0].js='window.secret="backend-source-marker"';p.tables[0].rows=[{title:'private row'}];
 const text=seal(p,key,salt);assert.ok(!text.includes('Secret project'));assert.ok(!text.includes('private row'));assert.ok(!text.includes('backend-source-marker'));assert.deepEqual(openVault(text,password).project,p);assert.throws(()=>openVault(text,'incorrect password'),/Incorrect/);
 const envelope=JSON.parse(text);const data=Buffer.from(envelope.data,'base64');data[0]^=1;envelope.data=data.toString('base64');assert.throws(()=>openVault(JSON.stringify(envelope),password),/Incorrect/);assert.throws(()=>derive('short',salt),/10/);
});

test('schemas reject invalid SQL identifiers and duplicate paths',()=>{
 const p=starter();p.tables[0].name='tasks";DROP';assert.throws(()=>validateProject(p));const q=starter();q.pages[1].path='/';assert.throws(()=>validateProject(q),/unique/);
});

test('connected graph evaluates code, branches, validates fields and caps cycles',()=>{
 const p=starter(),db=new Database(p),flow=p.flows[0];assert.throws(()=>runFlow(flow,{title:''},db,{id:'a'}),/title/);
 flow.nodes.splice(1,0,{id:'code',type:'code',config:{code:'input.title = input.title.toUpperCase(); return input;'},next:'validate'});flow.nodes[0].next='code';const result=runFlow(flow,{title:'hello'},db,{id:'a'});assert.equal(result.data.title,'HELLO');assert.equal(db.list('tasks','b').length,0);
 flow.nodes[1].config.code='while(true) {}';assert.throws(()=>runFlow(flow,{title:'test'},db,{id:'a'}),/timed out/);flow.nodes[0].next='request';assert.throws(()=>runFlow(flow,{},db,{id:'a'}),/100 steps/);db.close();
});

test('full lifecycle: auth isolation, database persistence, flow rollback, lock, and portable encrypted reopen',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'siforge-core-')),studio=await createStudio({root});
 const call=async(action,data,token=studio.token)=>{const r=await fetch(studio.editorOrigin+'/studio/'+action,{method:data?'POST':'GET',headers:{'X-Studio-Token':token,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:r.status,...await r.json()};};
 const site=async(route,data,cookie='')=>{const r=await fetch(studio.siteOrigin+'/api/'+route,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Cookie:cookie},body:data?JSON.stringify(data):undefined});return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],...await r.json()};};
 try{
  assert.equal((await call('status',undefined,'wrong')).status,403);
  const forged=await fetch(studio.editorOrigin+'/studio/status',{headers:{'X-Studio-Token':studio.token,Origin:'https://evil.example'}});assert.equal(forged.status,403);
  const created=await call('create',{name:'Portable test',password:'my private password'});assert.equal(created.status,200);const file=created.file;
  assert.equal((await site('records/tasks')).status,401);
  const a=await site('signup',{email:'alice@example.com',password:'alice secure password'});assert.equal(a.status,200);const b=await site('signup',{email:'bob@example.com',password:'bob secure password'});assert.equal(b.status,200);
  assert.equal((await site('login',{email:'alice@example.com',password:'bad password long'})).status,401);
  const saved=await site('flows/create-task',{title:'Alice private task',details:'Confidential'},a.cookie);assert.equal(saved.status,200);assert.equal(saved.data.owner,a.user.id);
  assert.equal((await site('records/tasks',undefined,b.cookie)).rows.length,0);assert.equal((await site('records/tasks',undefined,a.cookie)).rows.length,1);
  const project=(await call('project')).project;assert.equal(project.users[0].hash,undefined);assert.equal(project.tables[0].rows.length,0);
  project.pages[0].elements[0].children[1].text='Changed heading';project.flows[0].nodes.find(n=>n.id==='insert').next='broken';project.flows[0].nodes.push({id:'broken',type:'code',x:10,y:10,next:'response',config:{code:'throw new Error("rollback me")'}});
  assert.equal((await call('save',{project})).status,200);assert.equal((await site('flows/create-task',{title:'Must roll back'},a.cookie)).status,400);assert.equal((await site('records/tasks',undefined,a.cookie)).rows.length,1);
  const disk=await fs.readFile(path.join(root,'projects',file),'utf8');assert.ok(!disk.includes('Alice'));const decoded=openVault(disk,'my private password').project;assert.equal(decoded.tables[0].rows.length,1);assert.ok(decoded.users[0].hash);assert.ok(!JSON.stringify(decoded).includes('alice secure password'));
  await call('lock',{});assert.equal((await fetch(studio.siteOrigin)).status,423);assert.equal((await call('unlock',{file,password:'wrong password here'})).status,400);
  const reopened=await call('unlock',{file,password:'my private password'});assert.equal(reopened.project.pages[0].elements[0].children[1].text,'Changed heading');assert.equal((await call('data')).tables[0].rows.length,1);assert.equal((await site('me',undefined,a.cookie)).user,null);
  const login=await site('login',{email:'alice@example.com',password:'alice secure password'});assert.equal(login.status,200);assert.equal((await site('records/tasks',undefined,login.cookie)).rows.length,1);
  await call('password',{password:'a completely new password'});await call('lock',{});assert.equal((await call('unlock',{file,password:'my private password'})).status,400);assert.equal((await call('unlock',{file,password:'a completely new password'})).status,200);
  assert.deepEqual((await fs.readdir(path.join(root,'projects'))),[file]);
 }finally{await studio.close();await fs.rm(root,{recursive:true,force:true});}
});
