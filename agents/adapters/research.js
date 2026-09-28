export function createResearchAdapter({search,fetch}={}){
 if(typeof search!=="function") throw new Error("research search provider required");
 return {
  async search(query,{limit=10}={}){
   const rows=await search(query,{limit});
   return (rows||[]).map(normalizeSource).filter(x=>x.url&&x.title);
  },
  async fetch(url){
   if(typeof fetch!=="function") throw new Error("research fetch provider unavailable");
   return fetch(url);
  }
 };
}
function normalizeSource(x){
 return {title:String(x.title||""),url:String(x.url||""),publishedAt:x.publishedAt||null,excerpt:String(x.excerpt||""),provider:x.provider||"unknown"};
}
export function evidenceFromSource(source,claim){
 if(!source?.url)throw new Error("source url required");
 return {type:"external_source",claim,url:source.url,title:source.title||source.url,retrievedAt:new Date().toISOString()};
}
