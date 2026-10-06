const API=process.env.PRINTFUL_API_BASE||"https://api.printful.com";
if(!process.env.PRINTFUL_TOKEN) throw Error("PRINTFUL_TOKEN required");
const r=await fetch(API+"/stores",{headers:{Authorization:`Bearer ${process.env.PRINTFUL_TOKEN}`,Accept:"application/json"}});
const txt=await r.text(); let d; try{d=JSON.parse(txt)}catch{d={raw:txt.slice(0,1000)}}
if(!r.ok){console.error(JSON.stringify({status:r.status,response:d},null,2));throw Error(`Printful store discovery failed HTTP ${r.status}`)}
const stores=Array.isArray(d.result)?d.result:(Array.isArray(d.data)?d.data:[]);
console.log(JSON.stringify({count:stores.length,stores:stores.map(x=>({id:x.id,name:x.name,type:x.type}))},null,2));
