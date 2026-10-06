import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root=process.cwd();
const source=path.join(root,'products','foundry-express-ts');
const out=path.join(root,'connect-demo','deliverables','foundry-express-ts');
const stage=path.join(out,'package');
const zip=path.join(out,'foundry-express-ts-starter.zip');

await mkdir(out,{recursive:true});
await rm(stage,{recursive:true,force:true});
await mkdir(stage,{recursive:true});
for(const name of ['README.md','package.json','tsconfig.json','.env.example']) await cp(path.join(source,name),path.join(stage,name));
await cp(path.join(source,'src'),path.join(stage,'src'),{recursive:true});
await rm(zip,{force:true});

const py=spawnSync('python3',['-c',`import shutil; shutil.make_archive(r"${zip.slice(0,-4)}","zip",r"${stage}")`],{stdio:'inherit'});
if(py.status!==0) throw new Error('ZIP build failed');
await writeFile(path.join(out,'PACKAGE.md'),'# Customer artifact\n\nGenerated from `products/foundry-express-ts/` by `automation/build-foundry-package.mjs`. Upload `foundry-express-ts-starter.zip` to the marketplace listing.\n');
console.log(zip);
