import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function electronRuntime(){
 const candidates=[process.env.SI_ELECTRON_RUNTIME,path.join(source,'node_modules','electron','dist'),path.resolve(source,'..','si-forge-studio','node_modules','electron','dist')].filter(Boolean);
 const found=candidates.find(p=>fs.existsSync(path.join(p,'electron.exe')));
 if(!found)throw Error('Electron runtime missing. Run npm install, or set SI_ELECTRON_RUNTIME to a Windows Electron runtime folder.');
 return found;
}
