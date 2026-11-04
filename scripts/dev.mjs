import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {electronRuntime} from './runtime.mjs';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env={...process.env,SI_NODE:process.execPath};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(electronRuntime(),'electron.exe'),[source],{env,stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
