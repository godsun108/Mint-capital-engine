// Planner artifact preflight: read-only; never initiates checkout or charges.
// Usage: node connect-demo/tests/planner-artifact-preflight.mjs /path/to/foundry-lead-followup-planner-qa-v02.zip
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const file=process.argv[2];
if(!file){console.error('Usage: node connect-demo/tests/planner-artifact-preflight.mjs <zip-path>');process.exit(2);}
const bytes=await readFile(file);
const digest=createHash('sha256').update(bytes).digest('hex');
const expected='a56783d08dcbbc6ac621e681be8ec834a235ea71b29bf9a3033070fa71ac5c56';
assert.equal(digest,expected,'Planner ZIP checksum mismatch. Do not activate offer.');
assert.ok(bytes.subarray(0,4).equals(Buffer.from([0x50,0x4b,0x03,0x04])),'Not a ZIP local-file header');
console.log(JSON.stringify({ok:true,sha256:digest,bytes:bytes.length,mode:'artifact-check-only',checkout:'NOT_TESTED',delivery:'NOT_TESTED'}));
