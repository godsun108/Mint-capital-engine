// Zero-cost Bluesky/AT Protocol provider adapter.
// Credentials belong only in the deployment secret store. Never persist them in FGE state.
const SERVICE=process.env.BLUESKY_SERVICE||'https://bsky.social';
function configured(){return Boolean(process.env.BLUESKY_HANDLE&&process.env.BLUESKY_APP_PASSWORD)}
async function json(url,options){const r=await fetch(url,options);const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error('Bluesky provider request failed: '+r.status+' '+(data.message||data.error||''));return data}
export async function dispatchBluesky(job){
 if(!configured())return {ok:false,state:'blocked',reason:'provider_not_configured'};
 if(process.env.FGE_OWNED_PUBLISH_ENABLED!=='true')return {ok:false,state:'blocked',reason:'external_publish_disabled'};
 if(job?.brand!=='foundry'||job?.channel!=='bluesky'||!job?.payload?.text)return {ok:false,state:'blocked',reason:'route_not_authorized'};
 const session=await json(SERVICE+'/xrpc/com.atproto.server.createSession',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:process.env.BLUESKY_HANDLE,password:process.env.BLUESKY_APP_PASSWORD})});
 const out=await json(SERVICE+'/xrpc/com.atproto.repo.createRecord',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+session.accessJwt},body:JSON.stringify({repo:session.did,collection:'app.bsky.feed.post',record:{$type:'app.bsky.feed.post',text:job.payload.text,createdAt:new Date().toISOString()}})});
 return {ok:true,state:'published',provider:'bluesky',externalId:out.uri,cid:out.cid,publishedAt:new Date().toISOString()};
}
export function blueskyConfigured(){return configured()}
