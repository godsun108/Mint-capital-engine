import path from 'node:path';
import {realpath,stat} from 'node:fs/promises';

export async function approvedArtifactPath(root,relativePath){
  if(typeof relativePath!=='string')return null;
  const base=path.resolve(root,'deliverables');
  const candidate=path.resolve(root,relativePath);
  if(!candidate.startsWith(base+path.sep))return null;
  try{
    const [actualBase,actualFile]=await Promise.all([realpath(base),realpath(candidate)]);
    if(!actualFile.startsWith(actualBase+path.sep))return null;
    if(!(await stat(actualFile)).isFile())return null;
    return actualFile;
  }catch{return null;}
}
