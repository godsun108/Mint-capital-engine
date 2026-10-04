import {renderCandidate} from './fge-publisher.js';
const VALID_SOURCE=/^[a-z0-9_-]{1,48}$/;
export function prepareDistribution(queue=[]){
 return queue.map((job,index)=>{
  if(job.state!=='draft')return job;
  if(job.brand!=='foundry'||job.channel!=='bluesky')return {...job,state:'blocked',blockedReason:'route_not_authorized'};
  if(!VALID_SOURCE.test(job.sourceTag||''))return {...job,state:'blocked',blockedReason:'invalid_source_tag'};
  try{return {...job,state:'ready',payload:{text:renderCandidate(job),network:'bluesky'},readyAt:new Date().toISOString(),sequence:index+1}}
  catch(e){return {...job,state:'blocked',blockedReason:'validation_failed'}};
 });
}
export function nextReady(queue=[]){return queue.find(x=>x.state==='ready')||null}
