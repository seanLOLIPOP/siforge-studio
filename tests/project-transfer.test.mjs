import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createStudio} from '../src/server.mjs';
import {openVault,seal} from '../src/vault.mjs';

function client(studio){
 return async(action,payload,token=studio.token)=>{
  const response=await fetch(studio.editorOrigin+'/studio/'+action,{method:payload===undefined?'GET':'POST',headers:{'X-Studio-Token':token,'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});
  return {status:response.status,...await response.json()};
 };
}
async function website(studio,route,payload,cookie=''){
 const response=await fetch(studio.siteOrigin+'/api/'+route,{method:payload===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:payload===undefined?undefined:JSON.stringify(payload)});
 return {status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0],...await response.json()};
}

test('project export/import preserves the complete encrypted project, accounts and records without overwriting copies',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'si-transfer-'));
 const source=await createStudio({root:path.join(root,'source')}),target=await createStudio({root:path.join(root,'target')}),a=client(source),b=client(target);
 const password='transfer project password';
 try{
  const created=await a('create',{name:'Transfer sample',password});assert.equal(created.status,200);
  const project=created.project;project.pages[0].html='<p>Portable custom markup</p>';project.pages[1].js='console.log("portable code")';project.pages[0].css='.sample {color: purple}';project.pages[0].elements[0].children[1].mobileStyle={fontSize:'25px'};
  project.pages[0].elements.push({id:'embedded-image',type:'image',text:'Embedded asset',style:{},children:[],src:'data:image/png;base64,aGVsbG8='});
  project.blocks=[{id:'saved-block',name:'Saved heading',element:structuredClone(project.pages[0].elements[0].children[1])}];
  assert.equal((await a('save',{project})).status,200);
  const account=await website(source,'signup',{email:'transfer@example.com',password:'account transfer password'});assert.equal(account.status,200);
  assert.equal((await website(source,'flows/create-task',{title:'Encrypted transfer record',details:'Preserve ownership'},account.cookie)).status,200);
  assert.equal((await a('export-project')).status,405);
  const exported=await a('export-project',{});assert.equal(exported.status,200);assert.equal(exported.filename,'Transfer-sample.siforge');
  assert.ok(!exported.contents.includes('transfer@example.com'));assert.ok(!exported.contents.includes('Encrypted transfer record'));assert.ok(!exported.contents.includes('portable code'));
  const expected=openVault(exported.contents,password).project;assert.equal(expected.tables[0].rows.length,1);assert.ok(expected.users[0].hash);
  const kept=await b('create',{name:'Keep me',password:'keep this project safe'});const keptPath=path.join(root,'target','projects',kept.file),keptBytes=await fs.readFile(keptPath,'utf8');
  const filesBefore=await b('projects');
  assert.equal((await b('import-project',{contents:exported.contents,password},'wrong-token')).status,403);
  for(const contents of ['not JSON',JSON.stringify({format:'OTHER'}),JSON.stringify({...JSON.parse(exported.contents),tag:Buffer.alloc(16).toString('base64')})]){
   assert.equal((await b('import-project',{contents,password})).status,400);
  }
  assert.equal((await b('import-project',{contents:exported.contents,password:'wrong project password'})).status,400);
  const invalid=structuredClone(expected);invalid.tables[0].rows.push({...invalid.tables[0].rows[0]});const loaded=openVault(exported.contents,password);
  assert.equal((await b('import-project',{contents:seal(invalid,loaded.key,loaded.salt),password})).status,400);
  assert.deepEqual((await b('projects')).files,filesBefore.files);assert.equal((await b('status')).file,kept.file);assert.equal(await fs.readFile(keptPath,'utf8'),keptBytes);
  const imported=await b('import-project',{contents:exported.contents,password});assert.equal(imported.status,200);assert.equal(imported.project.name,expected.name);assert.notEqual(imported.file,kept.file);
  assert.deepEqual(imported.project.pages,expected.pages);assert.deepEqual(imported.project.flows,expected.flows);assert.deepEqual(imported.project.blocks,expected.blocks);assert.equal(imported.project.users[0].hash,undefined);
  const data=await b('data');assert.equal(data.tables[0].rows[0].title,'Encrypted transfer record');assert.equal(data.tables[0].rows[0].owner,account.user.id);assert.equal(data.users[0].email,'transfer@example.com');
  const login=await website(target,'login',{email:'transfer@example.com',password:'account transfer password'});assert.equal(login.status,200);assert.equal((await website(target,'records/tasks',undefined,login.cookie)).rows.length,1);
  const reexported=await b('export-project',{}),decoded=openVault(reexported.contents,password).project;assert.deepEqual(decoded.users,expected.users);assert.deepEqual(decoded.tables,expected.tables);
  await b('lock',{});const duplicate=await b('import-project',{contents:exported.contents,password});assert.equal(duplicate.status,200);assert.notEqual(duplicate.file,imported.file);assert.equal((await b('projects')).files.length,3);const keptBefore=openVault(keptBytes,'keep this project safe').project,keptAfter=openVault(await fs.readFile(keptPath,'utf8'),'keep this project safe').project;delete keptBefore.updatedAt;delete keptAfter.updatedAt;assert.deepEqual(keptAfter,keptBefore);
  assert.equal((await b('unlock',{file:kept.file,password:'keep this project safe'})).status,400); // Current copy stays open.
  await b('lock',{});assert.equal((await b('unlock',{file:imported.file,password})).status,200);
 }finally{await source.close();await target.close();await fs.rm(root,{recursive:true,force:true});}
});

test('website-only mode cannot import or export editable projects',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'si-site-transfer-')),studio=await createStudio({root,siteOnly:true}),call=client(studio);
 try{assert.equal((await call('import-project',{contents:'{}',password:'some password here'})).status,403);assert.equal((await call('export-project',{})).status,423);}
 finally{await studio.close();await fs.rm(root,{recursive:true,force:true});}
});
