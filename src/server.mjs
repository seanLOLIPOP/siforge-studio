import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {starter,blankPage,validateProject} from './model.mjs';
import {derive,seal,openVault,atomicWrite} from './vault.mjs';
import {Database} from './database.mjs';
import {exportWebsite} from './export.mjs';
import {MAX_PROJECT_FILE_BYTES,prepareProjectImport,saveImportedProject} from './project-transfer.mjs';
import {runFlow} from './flows.mjs';
import {renderPage,esc} from '../public/render.mjs';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clone=v=>JSON.parse(JSON.stringify(v));
export async function createStudio({root=path.join(source,'workspace'),token=randomBytes(32).toString('hex'),siteOnly=false,onExport}={}){
 await fs.mkdir(path.join(root,'projects'),{recursive:true});
 let active=null,db=null,queue=Promise.resolve();const sessions=new Map(),attempts=new Map(),logs=[];
 const log=(kind,message,trace=[])=>{logs.unshift({time:new Date().toISOString(),kind,message,trace});logs.splice(100);};
 function required(){if(!active)throw Object.assign(Error('Unlock a project first.'),{status:423});return active;}
 function fileFor(file){if(typeof file!=='string'||!/^[-a-zA-Z0-9_ .]+\.siforge$/.test(file)||file.length>160)throw Error('Invalid project filename.');return path.join(root,'projects',file);}
 function status(){return {unlocked:!!active,file:active?.file,name:active?.project.name,siteOnly,preview:siteOrigin};}
 async function persist(){required();db.snapshot();active.project.updatedAt=new Date().toISOString();await atomicWrite(fileFor(active.file),seal(active.project,active.key,active.salt));}
 async function lock(){if(active){await persist();active.key.fill(0);db.close();db=null;active=null;sessions.clear();logs.length=0;}}
 function publicProject(){const p=clone(required().project);p.users=p.users.map(u=>({id:u.id,email:u.email,createdAt:u.createdAt}));for(const t of p.tables)t.rows=[];return p;}
 function user(req){const sid=(req.headers.cookie||'').match(/(?:^|;\s*)si_session=([a-f0-9]+)/)?.[1],s=sessions.get(sid);if(!s||s.expires<Date.now()){if(sid)sessions.delete(sid);throw Object.assign(Error('Sign in to access your records.'),{status:401});}return required().project.users.find(u=>u.id===s.id);}
 function limit(key){const now=Date.now();const a=attempts.get(key);if(a&&a.until>now&&a.count>=10)throw Object.assign(Error('Too many attempts. Try again in one minute.'),{status:429});if(!a||a.until<now)attempts.set(key,{count:1,until:now+60000});else a.count++;}
 function establish(u,res){const sid=randomBytes(32).toString('hex');sessions.set(sid,{id:u.id,expires:Date.now()+8*60*60*1000});res.setHeader('Set-Cookie',`si_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);return {user:{id:u.id,email:u.email}};}
 async function body(req,maxBytes=20*1024*1024){let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>maxBytes)throw Error('Request is too large.');chunks.push(chunk);}return chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};}
 const json=(res,data,code=200)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 function security(req,res,origin){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');if(req.headers.host!==new URL(origin).host)throw Object.assign(Error('Invalid host.'),{status:403});if(req.headers.origin&&req.headers.origin!==origin&&!(req.method==='GET'&&req.headers.origin==='null'&&['/canvas.js','/layout.mjs'].includes(new URL(req.url,origin).pathname)))throw Object.assign(Error('Cross-origin request rejected.'),{status:403});}
 async function studioAPI(req,res,url){
  if(req.headers['x-studio-token']!==token)throw Object.assign(Error('Studio authorization required.'),{status:403});
  const action=url.pathname.slice('/studio/'.length),b=req.method==='POST'?await body(req,action==='import-project'?MAX_PROJECT_FILE_BYTES+16384:20*1024*1024):{};
  if(action==='status')return status();
  if(action==='projects')return {files:(await fs.readdir(path.join(root,'projects'))).filter(f=>f.endsWith('.siforge'))};
  if(action==='import-project'){
   if(siteOnly)throw Object.assign(Error('Import projects in SI FORGE STUDIO.'),{status:403});
   if(req.method!=='POST')throw Object.assign(Error('Use POST to import a project.'),{status:405});
   limit('unlock');const imported=prepareProjectImport(b.contents,b.password);let file;
   try{file=await saveImportedProject(path.join(root,'projects'),b.contents,imported.project.name);await lock();}
   catch(error){imported.database.close();imported.key.fill(0);if(file)await fs.rm(fileFor(file),{force:true});throw error;}
   active={project:imported.project,key:imported.key,salt:imported.salt,file};db=imported.database;sessions.clear();logs.length=0;
   return {...status(),project:publicProject()};
  }
  if(action==='create'){
   if(siteOnly)throw Error('Create projects in SI FORGE STUDIO.');if(active)throw Error('Lock your current project first.');
   const project=starter(String(b.name||'My workspace').trim());if(b.template==='blank')project.pages=[blankPage()];validateProject(project);const file=project.name.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,60)+'-'+randomBytes(3).toString('hex')+'.siforge';
   const salt=randomBytes(16),key=derive(b.password,salt);active={project,file,key,salt};db=new Database(project);await persist();return {...status(),project:publicProject()};
  }
  if(action==='unlock'){
   if(active)throw Error('Lock your current project first.');limit('unlock');const loaded=openVault(await fs.readFile(fileFor(b.file),'utf8'),b.password);try{validateProject(loaded.project);const nextDB=new Database(loaded.project);active={...loaded,file:b.file};db=nextDB;}catch(e){loaded.key.fill(0);throw e;}return {...status(),project:publicProject()};
  }
  if(action==='lock'){await lock();return status();}
  required();
  if(action==='project')return {project:publicProject(),...status()};
  if(action==='export-project'){
   if(siteOnly)throw Object.assign(Error('Export projects from the editor.'),{status:403});
   if(req.method!=='POST')throw Object.assign(Error('Use POST to export a project.'),{status:405});
   await persist();return {filename:active.project.name.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,60)+'.siforge',contents:await fs.readFile(fileFor(active.file),'utf8')};
  }
  if(action==='save'){
   if(siteOnly)throw Error('Editing is disabled in website mode.');const incoming=clone(b.project);incoming.users=active.project.users;for(const table of incoming.tables||[]){table.rows=active.project.tables.find(t=>t.name===table.name)?.rows||[];}
   db.snapshot();for(const table of incoming.tables||[])table.rows=active.project.tables.find(t=>t.name===table.name)?.rows||[];
   validateProject(incoming);const nextDB=new Database(incoming);const old=active.project,oldDB=db;active.project=incoming;db=nextDB;
   try{await persist();oldDB.close();}catch(e){db.close();active.project=old;db=oldDB;throw e;}return {saved:true,updatedAt:incoming.updatedAt};
  }
  if(action==='data')return {tables:active.project.tables.map(t=>({name:t.name,columns:t.columns,rows:db.list(t.name)})),users:publicProject().users};
  if(action==='insert'){const row=db.insert(b.table,b.data,b.owner||'studio');await persist();return {row};}
  if(action==='delete'){db.remove(b.table,b.id);await persist();return {ok:true};}
  if(action==='test-flow'){const flow=active.project.flows.find(f=>f.id===b.id);if(!flow)throw Error('Flow not found.');return execute(flow,b.input||{},{id:'studio',email:'studio@local'});}
  if(action==='logs')return {logs};
  if(action==='password'){const salt=randomBytes(16),key=derive(b.password,salt),oldKey=active.key,oldSalt=active.salt;active.key=key;active.salt=salt;try{await persist();oldKey.fill(0);}catch(e){active.key=oldKey;active.salt=oldSalt;key.fill(0);throw e;}return {ok:true};}
  if(action==='export'){if(siteOnly)throw Error('Export from the editor.');await persist();if(!onExport)throw Error('Use the desktop app to export a runnable website.');return await onExport({file:fileFor(active.file),name:active.project.name,root});}
  throw Object.assign(Error('Studio operation not found.'),{status:404});
 }
 async function execute(flow,input,u){db.db.exec('BEGIN');try{const result=runFlow(flow,input,db,u);await persist();db.db.exec('COMMIT');log('success',flow.name,result.trace);return result;}catch(e){try{db.db.exec('ROLLBACK');}catch{}db.snapshot();log('error',e.message,e.trace);throw e;}}
 async function websiteAPI(req,res,url){
  required();const route=url.pathname.slice(5),b=req.method==='POST'?await body(req):{};
  if(route==='me'){try{const u=user(req);return {user:{id:u.id,email:u.email}};}catch{return {user:null};}}
  if(['signup','login'].includes(route)&&req.method==='POST'){
   limit('auth');const email=String(b.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Enter a valid email.');if(typeof b.password!=='string'||b.password.length<10||b.password.length>200)throw Error('Use a password between 10 and 200 characters.');
   const existing=active.project.users.find(u=>u.email===email);
   if(route==='signup'){if(existing)throw Error('An account already exists for this email.');const salt=randomBytes(16).toString('hex');const u={id:randomUUID(),email,salt,hash:scryptSync(b.password,salt,32).toString('hex'),createdAt:new Date().toISOString()};active.project.users.push(u);await persist();return establish(u,res);}
   const expected=existing?Buffer.from(existing.hash,'hex'):randomBytes(32),actual=scryptSync(b.password,existing?.salt||'dummy-salt',32);if(!existing||!timingSafeEqual(actual,expected))throw Object.assign(Error('Email or password is incorrect.'),{status:401});return establish(existing,res);
  }
  if(route==='logout'&&req.method==='POST'){const sid=(req.headers.cookie||'').match(/si_session=([a-f0-9]+)/)?.[1];sessions.delete(sid);res.setHeader('Set-Cookie','si_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return {ok:true};}
  const u=user(req);
  if(route.startsWith('records/')){const table=decodeURIComponent(route.slice(8));if(req.method==='GET'){const t=db.table(table);return {rows:db.list(table,u.id),columns:[...t.columns,'created_at']};}if(req.method==='POST'){const row=db.insert(table,b,u.id);await persist();return {ok:true,row};}}
  if(route.startsWith('flows/')){const flow=active.project.flows.find(f=>f.path===route.slice(6)&&f.method===req.method);if(!flow)throw Error('No matching flow.');return execute(flow,req.method==='GET'?Object.fromEntries(url.searchParams):b,u);}
  throw Object.assign(Error('Endpoint not found.'),{status:404});
 }
 const editor=http.createServer((req,res)=>{queue=queue.then(async()=>{try{security(req,res,editorOrigin);const url=new URL(req.url,editorOrigin);if(url.pathname.startsWith('/studio/')){if(!['GET','POST'].includes(req.method))throw Error('Unsupported method.');json(res,await studioAPI(req,res,url));return;}const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/render.mjs':'render.mjs','/canvas.js':'canvas.js','/layout.mjs':'layout.mjs','/designer.mjs':'designer.mjs','/page-editor.mjs':'page-editor.mjs'};const file=files[url.pathname];if(req.headers.origin==='null'&&['/canvas.js','/layout.mjs'].includes(url.pathname))res.setHeader('Access-Control-Allow-Origin','null');if(!file){res.writeHead(404);res.end();return;}res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-src http://127.0.0.1:* about:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'");res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'text/javascript');res.end(await fs.readFile(path.join(source,'public',file)));}catch(e){json(res,{error:e.message,trace:e.trace},e.status||400);}}).catch(console.error);});
 const site=http.createServer((req,res)=>{queue=queue.then(async()=>{try{security(req,res,siteOrigin);const url=new URL(req.url,siteOrigin);if(url.pathname==='/site.js'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile(path.join(source,'public','site.js')));return;}if(url.pathname.startsWith('/api/')){json(res,await websiteAPI(req,res,url));return;}if(!active){res.writeHead(423,{'Content-Type':'text/html'});res.end('<body style="font:18px system-ui;padding:70px;background:#f6f7fb"><h1>Project locked</h1><p>Unlock the project in SI FORGE STUDIO to run this website.</p></body>');return;}const page=active.project.pages.find(p=>p.path===url.pathname);if(!page){res.writeHead(404,{'Content-Type':'text/html'});res.end('<h1>Page not found</h1>');return;}res.setHeader('Content-Type','text/html');res.end(renderPage(active.project,page));}catch(e){json(res,{error:e.message},e.status||400);}}).catch(console.error);});
 await new Promise(resolve=>editor.listen(0,'127.0.0.1',resolve));const editorOrigin=`http://127.0.0.1:${editor.address().port}`;
 await new Promise(resolve=>site.listen(0,'127.0.0.1',resolve));const siteOrigin=`http://127.0.0.1:${site.address().port}`;
 return {editorOrigin,siteOrigin,token,root,close:async()=>{await queue;await lock();await Promise.all([new Promise(r=>editor.close(r)),new Promise(r=>site.close(r))]);}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const studio=await createStudio({root:process.env.SI_ROOT,token:process.env.SI_TOKEN,siteOnly:process.env.SI_SITE_ONLY==='1',onExport:exportWebsite});console.log(JSON.stringify({url:studio.editorOrigin+'/#'+studio.token,preview:studio.siteOrigin}));for(const sig of ['SIGTERM','SIGINT'])process.on(sig,async()=>{await studio.close();process.exit();});}
