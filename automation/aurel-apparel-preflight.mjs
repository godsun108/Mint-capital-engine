import fs from 'node:fs';
const p='connect-demo/aurel-apparel-pilot.json';
const x=JSON.parse(fs.readFileSync(p,'utf8'));
if(x.schema!=='mint.apparel.pilot.v1'||x.candidates.length!==5)throw Error('pilot schema/count');
if(new Set(x.candidates.map(v=>v.id)).size!==5)throw Error('duplicate candidate');
if(!x.preserved_assets.some(v=>v.includes('Orbital Garden')))throw Error('original asset protection missing');
for(const v of x.candidates){if(v.publication!=='BLOCKED'||v.supplier!==null||v.variant_id!==null||v.fiber_composition_verified||v.artwork_file!==null)throw Error('unverified candidate promoted: '+v.id);}
if(!x.controls.no_spend||!x.controls.no_publish||!x.controls.owner_approval_required)throw Error('owner controls missing');
console.log('AUREL APPAREL PREFLIGHT PASS: 5 candidates, 0 supplier-qualified, 0 published, 0 spend');
