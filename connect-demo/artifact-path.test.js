import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {approvedArtifactPath} from './artifact-path.js';

test('artifact path accepts only real files inside deliverables',async t=>{
  const root=mkdtempSync(path.join(os.tmpdir(),'mint-artifact-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(path.join(root,'deliverables'));
  writeFileSync(path.join(root,'deliverables','valid.txt'),'safe');
  writeFileSync(path.join(root,'outside.txt'),'secret');
  symlinkSync(path.join(root,'outside.txt'),path.join(root,'deliverables','escape.txt'));
  assert.equal(await approvedArtifactPath(root,'deliverables/valid.txt'),path.join(root,'deliverables','valid.txt'));
  for(const input of ['outside.txt','deliverables/../outside.txt','deliverables/escape.txt','deliverables/missing.txt','deliverables']){
    assert.equal(await approvedArtifactPath(root,input),null,input);
  }
});
