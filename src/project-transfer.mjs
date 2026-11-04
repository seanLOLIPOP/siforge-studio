import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {openVault} from './vault.mjs';
import {validateProject} from './model.mjs';
import {Database} from './database.mjs';

export const MAX_PROJECT_FILE_BYTES=128*1024*1024;

// Validate the complete file before changing the current project or writing a copy.
export function prepareProjectImport(contents,password){
 if(typeof contents!=='string'||Buffer.byteLength(contents)>MAX_PROJECT_FILE_BYTES)throw Error('Project files must be under 128 MB.');
 let loaded;
 try{loaded=openVault(contents,password);}catch(error){if(error instanceof SyntaxError)throw Error('Not a valid .siforge project file.');throw error;}
 try{validateProject(loaded.project);return {...loaded,database:new Database(loaded.project)};}
 catch(error){loaded.key.fill(0);throw error;}
}

export async function saveImportedProject(directory,contents,name){
 await fs.mkdir(directory,{recursive:true});
 const prefix=name.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,60)||'Project';
 for(let attempt=0;attempt<5;attempt++){
  const file=prefix+'-import-'+randomBytes(8).toString('hex')+'.siforge',destination=path.join(directory,file);
  let handle;
  try{handle=await fs.open(destination,'wx',0o600);}catch(error){if(error.code==='EEXIST')continue;throw error;}
  try{await handle.writeFile(contents,'utf8');await handle.close();return file;}
  catch(error){await handle.close().catch(()=>{});await fs.rm(destination,{force:true});throw error;}
 }
 throw Error('Could not create an imported project copy. Try again.');
}
