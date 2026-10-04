const DEFAULT_URL=process.env.FGE_PRODUCT_URL||'https://mint-stripe-connect-v4-production.up.railway.app/';
const templates=[
 {key:'health',text:'A health route is boring right up until you need to know whether your API is alive. Foundry’s Express + TypeScript starter includes one alongside strict TS, env setup & scripts. $9, one-time.'},
 {key:'strict',text:'Strict TypeScript helps surface mismatched assumptions while you build. Foundry’s $9 Express + TS starter starts strict, with the basic server setup already mapped.'},
 {key:'preflight',text:'Before deploying a small API: where does config come from, what runs in dev, what builds, what starts production, and how do you check it is alive? Our $9 starter organizes those basics.'},
 {key:'transparent',text:'Foundry builds small, practical builder resources. The Express + TypeScript starter is a one-time $9 digital resource—not hosted SaaS and not a promise of technical or commercial results.'}
];
export function produceCandidates({existing=[]}={}){
 const used=new Set(existing.map(x=>x.template||x.key));
 return templates.filter(x=>!used.has(x.key)).map(x=>({...x,template:x.key,brand:'foundry',channel:'bluesky',sourceTag:'fge_bluesky_'+x.key,url:DEFAULT_URL+'?src=fge_bluesky_'+x.key,state:'draft'}));
}
export function renderCandidate(x){const text=x.text+' '+x.url;if(text.length>300)throw new Error('Bluesky candidate exceeds 300 characters');return text}
