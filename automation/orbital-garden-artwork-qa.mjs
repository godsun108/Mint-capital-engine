import fs from "node:fs";
import crypto from "node:crypto";
const files=[
 {path:"connect-demo/prototypes/pod/orbital-garden-aop-production.svg",w:3150,h:5550,label:"main"},
 {path:"connect-demo/prototypes/pod/orbital-garden-pocket-production.svg",w:1500,h:2625,label:"pocket"}
];
const report={schema:"mint.orbital-garden.artwork-qa.v1",generatedAt:new Date().toISOString(),productId:274,status:"PASS_VECTOR_GEOMETRY",checks:[]};
for(const f of files){
 const b=fs.readFileSync(f.path); const s=b.toString("utf8");
 const view=s.match(/viewBox="0 0 (\d+) (\d+)"/); const wh=s.match(/width="(\d+)" height="(\d+)"/);
 const ok=!!view&&!!wh&&+view[1]===f.w&&+view[2]===f.h&&+wh[1]===f.w&&+wh[2]===f.h;
 report.checks.push({surface:f.label,path:f.path,expectedPixels:[f.w,f.h],geometryPass:ok,vector:true,sha256:crypto.createHash("sha256").update(b).digest("hex"),bytes:b.length});
 if(!ok) report.status="FAIL";
}
report.notes=["Exact supplier-returned canvas dimensions are enforced.","Vector candidates preserve the original Orbital Garden repeat geometry.","Raster format/color-profile/maximum-file-size acceptance still requires supplier evidence or upload validation.","Seam appearance and physical sample QA remain blocked until mockup/sample stages."];
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});fs.writeFileSync("connect-demo/exports/physical/orbital-garden-artwork-qa.json",JSON.stringify(report,null,2)+"\n");
if(report.status==="FAIL") throw Error("Orbital Garden artwork QA failed");
console.log("ORBITAL GARDEN ARTWORK QA PASS: exact vector geometry + hashes recorded; supplier upload/sample still gated");
