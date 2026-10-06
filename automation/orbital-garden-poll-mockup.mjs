import fs from "node:fs";
const API=process.env.PRINTFUL_API_BASE||"https://api.printful.com";
if(!process.env.PRINTFUL_TOKEN||!process.env.PRINTFUL_STORE_ID) throw Error("Printful credentials required");
const taskId=process.env.PRINTFUL_MOCKUP_TASK_ID;
if(!taskId) throw Error("PRINTFUL_MOCKUP_TASK_ID required");
const h={Authorization:`Bearer ${process.env.PRINTFUL_TOKEN}`,Accept:"application/json","X-PF-Store-Id":process.env.PRINTFUL_STORE_ID};
const r=await fetch(API+`/v2/mockup-tasks?id=${encodeURIComponent(taskId)}`,{headers:h});
const txt=await r.text();let data;try{data=JSON.parse(txt)}catch{data={raw:txt.slice(0,2000)}}
const out={schema:"mint.orbital-garden.mockup-result.v1",observedAt:new Date().toISOString(),taskId,httpStatus:r.status,ok:r.ok,response:data,orders:false,spend:false};
fs.mkdirSync("connect-demo/exports/physical",{recursive:true});fs.writeFileSync("connect-demo/exports/physical/orbital-garden-mockup-result.json",JSON.stringify(out,null,2)+"\n");
if(!r.ok) throw Error(`Printful mockup poll failed HTTP ${r.status}`);
const body=data?.data?.[0]||data?.result?.data?.[0]||data?.result||data;
const mockups=body?.catalog_variant_mockups?.flatMap(v=>v.mockups||[])||body?.mockups||[];
const urls=mockups.map(m=>m.mockup_url||m.url).filter(Boolean);
console.log("ORBITAL GARDEN MOCKUP RESULT POLLED:",JSON.stringify({taskId,status:body?.status||data?.status||"unknown",failureReasons:body?.failure_reasons||[],renderCount:urls.length,renderUrls:urls,orders:false,spend:false}));
console.log("No order/product publication/spend.");
