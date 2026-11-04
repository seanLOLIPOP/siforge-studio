import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {electronRuntime} from './runtime.mjs';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=electronRuntime();
const dest=path.join(source,'release','SI FORGE STUDIO');
await fs.mkdir(dest,{recursive:true});
for(const entry of await fs.readdir(runtime,{withFileTypes:true})){if(entry.name==='resources'){await fs.mkdir(path.join(dest,'resources'),{recursive:true});continue;}await fs.cp(path.join(runtime,entry.name),path.join(dest,entry.name),{recursive:entry.isDirectory()});}
const app=path.join(dest,'resources','app');await fs.mkdir(app,{recursive:true});
for(const folder of ['src','public','desktop','licenses'])await fs.cp(path.join(source,folder),path.join(app,folder),{recursive:true});
await fs.copyFile(path.join(source,'package.json'),path.join(app,'package.json'));
await fs.mkdir(path.join(dest,'runtime'),{recursive:true});await fs.copyFile(process.execPath,path.join(dest,'runtime','node.exe'));
await fs.copyFile(path.join(source,'licenses','NODE-LICENSE.txt'),path.join(dest,'runtime','NODE-LICENSE.txt'));
await fs.rename(path.join(dest,'electron.exe'),path.join(dest,'SI FORGE STUDIO.exe'));
await fs.copyFile(path.join(source,'README.md'),path.join(dest,'README.md'));
await fs.copyFile(path.join(source,'VALIDATION.md'),path.join(dest,'VALIDATION.md'));
console.log(dest);
