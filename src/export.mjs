import fs from 'node:fs/promises';
import path from 'node:path';
export async function exportWebsite({file,name,root}){
 const dest=path.join(root,'exports',name.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,45)+'-'+new Date().toISOString().replace(/[:.]/g,'-'));
 const runtime=process.env.SI_ELECTRON_ROOT,node=process.env.SI_NODE,source=process.env.SI_SOURCE;
 if(!runtime||!node||!source)throw Error('Export requires the bundled desktop runtime.');
 await fs.mkdir(dest,{recursive:true});
 for(const entry of await fs.readdir(runtime,{withFileTypes:true})){
  if(['projects','exports','.studio-data','.studio-cache','runtime','site-mode.json'].includes(entry.name))continue;
  if(entry.name==='resources'){await fs.mkdir(path.join(dest,'resources'),{recursive:true});continue;}
  await fs.cp(path.join(runtime,entry.name),path.join(dest,entry.name),{recursive:entry.isDirectory()});
 }
 const app=path.join(dest,'resources','app');await fs.mkdir(app,{recursive:true});
 for(const folder of ['src','public','desktop','licenses'])await fs.cp(path.join(source,folder),path.join(app,folder),{recursive:true});
 await fs.copyFile(path.join(source,'package.json'),path.join(app,'package.json'));
 await fs.mkdir(path.join(dest,'runtime'),{recursive:true});await fs.copyFile(node,path.join(dest,'runtime','node.exe'));
 await fs.copyFile(path.join(source,'licenses','NODE-LICENSE.txt'),path.join(dest,'runtime','NODE-LICENSE.txt'));
 await fs.mkdir(path.join(dest,'projects'),{recursive:true});await fs.copyFile(file,path.join(dest,'projects',path.basename(file)));
 await fs.writeFile(path.join(dest,'site-mode.json'),JSON.stringify({version:1}));
 const executables=(await fs.readdir(dest)).filter(n=>n.toLowerCase().endsWith('.exe')&&!n.includes('crashpad'));
 const exe=executables.find(n=>n==='electron.exe')||executables.find(n=>n.includes('STUDIO'))||executables.find(n=>n.includes('Studio'));
 if(!exe)throw Error('Electron runtime executable not found.');await fs.rename(path.join(dest,exe),path.join(dest,'SI FORGE Website.exe'));
 await fs.writeFile(path.join(dest,'READ ME.txt'),'SI FORGE Website — portable local website\r\n\r\nOpen SI FORGE Website.exe and enter your project password.\r\nKeep this whole folder together. No installation or internet is needed.\r\nThis is a local website, not public hosting.\r\nThe encrypted project includes the database and accounts at export time.\r\nChanges in this exported copy do not update the Studio original.\r\nThere is no password recovery.\r\n');
 return {path:dest};
}
