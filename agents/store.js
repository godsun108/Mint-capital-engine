const KEY="mint.agent.company.v1";
export function initialState(){return {jobs:[],events:[],approvals:[],experiments:[],kills:{system:false,divisions:{},agents:{}},updatedAt:null};}
export function load(storage=globalThis.localStorage){if(!storage)return initialState();try{return {...initialState(),...JSON.parse(storage.getItem(KEY)||"{}")};}catch{return initialState();}}
export function save(state,storage=globalThis.localStorage){const next={...state,updatedAt:new Date().toISOString()};if(storage)storage.setItem(KEY,JSON.stringify(next));return next;}
export function appendEvent(state,event){if(!event?.event_id)throw new Error("event_id required");if(state.events.some(x=>x.event_id===event.event_id))return state;return {...state,events:[...state.events,event]};}
