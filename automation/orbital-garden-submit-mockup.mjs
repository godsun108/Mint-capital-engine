import fs from "node:fs";
const API=process.env.PRINTFUL_API_BASE||"https://api.printful.com";
if(!process.env.PRINTFUL_TOKEN) throw Error("PRINTFUL_TOKEN required");\nif(!process.env.PRINTFUL_STORE_ID) throw Error("PRINTFUL_STORE_ID required by /v2/mockup-tasks; configure repository secret before retry");
const req=JSON.parse(fs.readFileSync("connect-demo/exports/physical/orbital-garden-mockup-request.json","utf8"));
if(req.status!=="PINNED_ART_VALIDATED_NOT_SUBMITTED"||req.guards?.orders!==false||req.guards?.spend!==false) throw Error("safety contract failed");
const body=req.payload;
const r=await fetch(API+"/v2/mockup-tasks",{method:"POST",headers:{Authorization:`Bearer ${process.env.PRINTFUL_TOKEN}`,"Content-Type":"application/json",Accept:"application/json",...(process.env.PRINTFUL_STORE_ID?{"X-PF-Store-Id":process.env.PRINTFUL_STORE_ID}:{})},body:JSON.stringify(body)});
const txt=await r.text(); let data; try{data=JSON.parse(txt)}catch{data={raw:txt.slice(0,1000)}}
const out={schema:"mint.orbital-garden.mockup-submission.v1",observedAt:new Date().toISOString(),httpStatus:r.status,ok:r.ok,request:{productId:274,variantIds:[9039],styleIds:[16394],artSha256:req.artwork.sha256,sourceCommit:req.artwork.sourceCommit},response:data,orders:false,spend:false,productPublished:false};
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});fs.writeFileSync("connect-demo/exports/physical/orbital-garden-mockup-submission.json",JSON.stringify(out,null,2)+"\n");
if(!r.ok) throw Error(`Printful mockup submission failed HTTP ${r.status}`);
console.log("ORBITAL GARDEN MOCKUP TASK SUBMITTED: external render task created; no order/product publication/spend");
