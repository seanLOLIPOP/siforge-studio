import {_electron as electron} from './playwright.mjs';
import {electronRuntime} from './runtime.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openVault} from '../src/vault.mjs';

const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'si-project-ui-'));
const exportedFile=path.join(directory,'Portable project.siforge');
const password='portable project password';
const running=new Map();

async function launch(root){
 const env={...process.env,SI_NODE:process.execPath,SI_WORKSPACE_ROOT:root,SI_TEST_HIDDEN:'0'};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:process.env.SI_TEST_EXE||path.join(electronRuntime(),'electron.exe'),args:process.env.SI_TEST_EXE?[]:[source],env,timeout:30000});
 running.set(app,app.process().pid);
 const page=await app.firstWindow();page.setDefaultTimeout(15000);let token;
 page.on('request',request=>{if(request.url().includes('/studio/'))token=request.headers()['x-studio-token']||token;});
 const api=async(action,payload)=>{
  const response=await fetch(new URL('/studio/'+action,page.url()),{method:payload===undefined?'GET':'POST',headers:{'X-Studio-Token':token,'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});
  const result=await response.json();assert.equal(response.status,200,result.error);return result;
 };
 return {app,page,api};
}
async function create(page,name){
 await page.locator('#project-template').selectOption('starter');await page.locator('#project-name').fill(name);
 await page.locator('#project-password').fill(password);
 await page.locator('#password-confirm').fill(password);
 await page.locator('#unlock-button').click();
 await page.locator('#studio').waitFor({state:'visible'});
 await page.frameLocator('#canvas').locator('h1').waitFor();
}
async function close(app){
 await Promise.all([app.waitForEvent('close',{timeout:15000}),app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close())]);
 running.delete(app);
}
async function startImport(page,fromGate=false){
 if(fromGate)await page.locator('#gate-import-project').click();
 else {await page.locator('#project-actions summary').click();await page.locator('#import-project').click();}
 await page.locator('#modal-title').filter({hasText:'Import project'}).waitFor();
}
async function website(origin,route,body){
 const response=await fetch(origin+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json();assert.equal(response.status,200,result.error);return {result,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}

try{
 const original=await launch(path.join(directory,'original'));
 await create(original.page,'Transfer proof');
 const status=await original.api('status');
 const account=await website(status.preview,'signup',{email:'transfer@example.com',password:'transfer account password'});
 const row=await fetch(status.preview+'/api/flows/create-task',{method:'POST',headers:{'Content-Type':'application/json',Cookie:account.cookie},body:JSON.stringify({title:'Moved project record',details:'Preserve accounts and ownership'})});assert.equal(row.status,200);
 await original.page.locator('[data-view="code"]').click();
 await original.page.locator('#code-editor').fill('<p class="transfer-proof">Editable after import</p>');
 await original.app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},exportedFile);
 await original.page.locator('#project-actions summary').click();await original.page.locator('#export-project').click();
 await original.page.locator('#toast').filter({hasText:'Project exported.'}).waitFor();
 const exported=await fs.readFile(exportedFile,'utf8'),decoded=openVault(exported,password).project;
 assert.ok(!exported.includes('Moved project record'));assert.equal(decoded.tables[0].rows[0].title,'Moved project record');assert.ok(decoded.users[0].hash);
 await original.app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});
 assert.deepEqual(await original.page.evaluate(()=>window.desktop.exportProject('Transfer proof')),{canceled:true});
 await close(original.app);

 const target=await launch(path.join(directory,'target'));
 await create(target.page,'Keep me');
 await target.app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},exportedFile);
 await startImport(target.page);await target.page.locator('#modal-body [name="password"]').fill('wrong project password');await target.page.locator('#modal-confirm').click();
 await target.page.locator('#toast').filter({hasText:'Incorrect password'}).waitFor();assert.equal((await target.api('status')).name,'Keep me');assert.equal((await target.api('projects')).files.length,1);
 await startImport(target.page);await target.page.locator('#modal-body [name="password"]').fill(password);await target.page.locator('#modal-confirm').click();
 await target.page.locator('#project-title').filter({hasText:'Transfer proof'}).waitFor();
 await target.page.locator('[data-view="data"]').click();await target.page.locator('#data-table').getByText('Moved project record',{exact:true}).waitFor();await target.page.locator('#accounts-list').getByText('transfer@example.com',{exact:false}).waitFor();
 await target.page.locator('[data-view="code"]').click();assert.match(await target.page.locator('#code-editor').inputValue(),/Editable after import/);
 const targetStatus=await target.api('status'),login=await website(targetStatus.preview,'login',{email:'transfer@example.com',password:'transfer account password'});
 const records=await fetch(targetStatus.preview+'/api/records/tasks',{headers:{Cookie:login.cookie}});assert.equal((await records.json()).rows[0].title,'Moved project record');
 await startImport(target.page);await target.page.locator('#modal .modal-actions [value="cancel"]').click();await target.page.locator('#modal').waitFor({state:'hidden'});assert.equal((await target.api('projects')).files.length,2);
 await target.page.locator('#lock').click();await target.page.locator('#gate').waitFor({state:'visible'});
 await startImport(target.page,true);await target.page.locator('#modal-body [name="password"]').fill(password);await target.page.locator('#modal-confirm').click();await target.page.locator('#studio').waitFor({state:'visible'});assert.equal((await target.api('projects')).files.length,3);
 assert.equal(await fs.readFile(exportedFile,'utf8'),exported);
 await target.app.evaluate(({dialog})=>{dialog.showOpenDialog=async()=>({canceled:true,filePaths:[]});});assert.deepEqual(await target.page.evaluate(()=>window.desktop.chooseProject()),{canceled:true});
 await target.page.frameLocator('#canvas').locator('h1').waitFor();await target.page.locator('#project-actions summary').click();
 await fs.mkdir(path.join(source,'artifacts'),{recursive:true});await target.page.screenshot({path:path.join(source,'artifacts','project-transfer-v1.png')});
 await target.page.locator('#project-actions summary').click();await close(target.app);
 console.log('Project transfer desktop passed: native save/open pickers, encrypted export, canceled dialogs, wrong-password preservation, import into another workspace, account login and owned records, editable code, gate import, and duplicate-copy safety.');
}finally{
 for(const pid of running.values())spawnSync('taskkill',['/pid',String(pid),'/t','/f']);
 await fs.rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:300}).catch(()=>{});
}
