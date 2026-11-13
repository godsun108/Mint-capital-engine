export function parseCsvLine(line){
 const out=[];let cell="",quoted=false;
 for(let i=0;i<line.length;i++){
  const ch=line[i];
  if(ch==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===","&&!quoted){out.push(cell);cell="";}else cell+=ch;
 }
 if(quoted)throw new Error("Unclosed quoted CSV field");
 out.push(cell);return out;
}
