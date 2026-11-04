import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
let entry;
try{entry=require.resolve('playwright-core');}catch{entry=require.resolve('../../si-forge-studio/node_modules/playwright-core');}
const module=await import(pathToFileURL(entry).href);
export const _electron=module._electron||module.default?._electron;
