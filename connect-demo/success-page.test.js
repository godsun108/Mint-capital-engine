import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('./public/success.html',import.meta.url),'utf8');
const script=html.split('<script>')[1]?.split('</script>')[0];
assert.ok(script,'Success page inline script exists');

async function simulate({session='cs_live_ABC123',status=200,size=8,error='Denied'}={}){
  let handler,fetchCalls=[],clicks=0,revokes=0;
  const state={textContent:''};
  const btn={hidden:true,disabled:false,addEventListener:(name,fn)=>{assert.equal(name,'click');handler=fn}};
  const anchor={click(){clicks++},remove(){}};
  const response={
    ok:status>=200&&status<300,status,
    async json(){return {error}},
    async blob(){return {size}},
    headers:{get(){return 'attachment; filename="purchase.zip"'}}
  };
  const context={
    location:{search:session===null?'':'?session_id='+encodeURIComponent(session)},
    URLSearchParams,
    document:{getElementById:id=>id==='state'?state:btn,createElement:()=>anchor,body:{appendChild(){}}},
    fetch:async(url,options)=>{fetchCalls.push({url,options});return response},
    URL:{createObjectURL:()=> 'blob:mock',revokeObjectURL:()=>{revokes++}},
    setTimeout:fn=>fn()
  };
  vm.runInNewContext(script,context,{timeout:1000});
  if(handler)await handler();
  return {state,btn,fetchCalls,clicks,revokes,hasHandler:!!handler,anchor};
}
test('paid response downloads only through fulfillment endpoint',async()=>{
  const x=await simulate();
  assert.equal(x.fetchCalls.length,1);
  assert.equal(x.fetchCalls[0].url,'/api/fulfill/cs_live_ABC123');
  assert.equal(x.fetchCalls[0].options.cache,'no-store');
  assert.equal(x.clicks,1);assert.equal(x.revokes,1);
  assert.equal(x.anchor.download,'purchase.zip');
  assert.equal(x.btn.disabled,false);
});
test('pending payment never triggers download',async()=>{
  const x=await simulate({status:402});
  assert.equal(x.clicks,0);assert.match(x.state.textContent,/pending/i);assert.equal(x.btn.disabled,false);
});
test('server rejection never triggers download',async()=>{
  const x=await simulate({status:403});
  assert.equal(x.clicks,0);assert.match(x.state.textContent,/Denied/);
});
test('empty artifact never triggers download',async()=>{
  const x=await simulate({size:0});
  assert.equal(x.clicks,0);assert.match(x.state.textContent,/empty/i);
});
for(const session of [null,'invalid','cs_live_BAD/path','cs_live_','cs_live_ABC-123']){
  test('invalid session blocked: '+String(session),async()=>{
    const x=await simulate({session});
    assert.equal(x.hasHandler,false);assert.equal(x.fetchCalls.length,0);
    assert.equal(x.btn.hidden,true);
  });
}
