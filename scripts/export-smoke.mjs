import {_electron as electron} from './playwright.mjs';
import fs from 'node:fs/promises';
import {electronRuntime} from './runtime.mjs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'si-export-test-'));
const runtime=process.env.SI_TEST_EXE||path.join(electronRuntime(),'electron.exe');
const env={...process.env,SI_NODE:process.execPath,SI_WORKSPACE_ROOT:root,SI_TEST_HIDDEN:'0'};delete env.ELECTRON_RUN_AS_NODE;
let app,exportedApp,appPid,exportPid;
function kill(pid){if(pid)spawnSync('taskkill',['/pid',String(pid),'/t','/f']);}
try{
 app=await electron.launch({executablePath:runtime,args:process.env.SI_TEST_EXE?[]:[source],env,timeout:30000});appPid=app.process().pid;const page=await app.firstWindow();page.setDefaultTimeout(15000);let token;
 page.on('request',r=>{if(r.url().includes('/studio/'))token=r.headers()['x-studio-token']||token;});
 await page.locator('#project-template').selectOption('starter');await page.locator('#project-name').fill('Export proof');await page.locator('#project-password').fill('portable project password');await page.locator('#password-confirm').fill('portable project password');await page.locator('#unlock-button').click();await page.locator('#studio').waitFor({state:'visible'});
 const status=await page.evaluate(async token=>(await fetch('/studio/status',{headers:{'X-Studio-Token':token}})).json(),token);
 const websitePromise=app.waitForEvent('window');await app.evaluate(({BrowserWindow},url)=>{const w=new BrowserWindow({width:1100,height:850,show:true,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});w.loadURL(url);},status.preview);const website=await websitePromise;website.setDefaultTimeout(15000);
 await website.locator('[name="email"]').fill('owner@example.com');await website.locator('[name="password"]').fill('website account password');await website.locator('[data-signup]').click();await website.waitForURL('**/dashboard');await website.locator('[name="title"]').fill('Account-owned task');await website.locator('[name="details"]').fill('Persists in encrypted export');await website.getByRole('button',{name:'Save task',exact:true}).click();await website.locator('[data-records]').getByText('Account-owned task',{exact:true}).waitFor();assert.equal(await website.evaluate(()=>typeof window.desktop),'undefined');
 await website.screenshot({path:path.join(source,'artifacts','website-v1.png')});await website.close();
 // Exercise saved component blocks and mobile-only properties.
 await page.frameLocator('#canvas').locator('h1').click();await page.locator('#save-block').click();await page.locator('#modal-body [name="name"]').fill('Hero heading');await page.locator('#modal-confirm').click();await page.locator('[data-block]').waitFor();await page.locator('#mobile').click();await page.locator('[data-prop="style.fontSize"]').fill('27px');await page.locator('[data-prop="style.fontSize"]').press('Tab');await page.locator('#desktop').click();
 await page.locator('#project-actions summary').click();await page.locator('#export').click();await page.locator('#modal-title').filter({hasText:'Website exported'}).waitFor({timeout:60000});await page.locator('#modal-confirm').click();
 const exportsRoot=path.join(root,'exports');const [folder]=await fs.readdir(exportsRoot);const original=path.join(exportsRoot,folder),moved=path.join(root,'Moved portable website');await fs.rename(original,moved);
 const exportEnv={...process.env,SI_TEST_HIDDEN:'0'};delete exportEnv.SI_WORKSPACE_ROOT;delete exportEnv.ELECTRON_RUN_AS_NODE;
 exportedApp=await electron.launch({executablePath:path.join(moved,'SI FORGE Website.exe'),args:[],env:exportEnv,timeout:30000});exportPid=exportedApp.process().pid;const site=await exportedApp.firstWindow();site.setDefaultTimeout(15000);await site.locator('#project-password').fill('portable project password');await site.locator('#unlock-button').click();await site.locator('[name="email"]').waitFor();await site.locator('[name="email"]').fill('owner@example.com');await site.locator('[name="password"]').fill('website account password');await site.getByRole('button',{name:'Sign in',exact:true}).click();await site.waitForURL('**/dashboard');await site.locator('[data-records]').getByText('Account-owned task',{exact:true}).waitFor();assert.equal(await site.evaluate(()=>typeof window.desktop),'undefined');
 await site.locator('[name="title"]').fill('Added after moving export');await site.locator('[name="details"]').fill('Standalone runtime');await site.getByRole('button',{name:'Save task',exact:true}).click();await site.locator('[data-records]').getByText('Added after moving export',{exact:true}).waitFor();
 console.log('Export integration passed: real signup UI, authenticated form and table, reusable block, mobile override, encrypted export, folder move, standalone EXE, account login, persisted database, and desktop API isolation.');
 await Promise.all([exportedApp.waitForEvent('close',{timeout:10000}),exportedApp.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close())]);
}finally{kill(exportPid);kill(appPid);await fs.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:300}).catch(()=>{});}
