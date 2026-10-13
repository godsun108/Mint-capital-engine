// Read-only public storefront smoke test. Never creates checkouts or charges.
// Usage: MINT_COMMERCE_URL=https://example.com node automation/smoke-offers.mjs
const base=process.env.MINT_COMMERCE_URL;
if(!base || !/^https:\/\//.test(base)){console.error('Set MINT_COMMERCE_URL to an https origin');process.exit(2)}
const checks=[
 {name:'offers',path:'/offers'},
 {name:'AI campaign',path:'/offers?src=foundrytools_ai_workflow'},
 {name:'TypeScript campaign',path:'/offers?src=foundrytools_ts_starter'}
];
let failed=false;
for(const check of checks){
 try{
  const response=await fetch(new URL(check.path,base),{method:'GET',redirect:'follow',signal:AbortSignal.timeout(12000)});
  const type=response.headers.get('content-type')||'';
  const body=await response.text();
  const ok=response.ok&&type.includes('text/html')&&body.length>200;
  console.log(JSON.stringify({check:check.name,status:response.status,contentType:type,htmlBytes:body.length,ok}));
  if(!ok)failed=true;
 }catch(error){failed=true;console.error(JSON.stringify({check:check.name,ok:false,error:String(error)}))}
}
if(failed)process.exitCode=1;
