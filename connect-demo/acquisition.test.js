import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import vm from 'node:vm';

test('portfolio emits one sourced page view and checkout retains selected offer',async()=>{
  const html=readFileSync(new URL('./public/offers.html',import.meta.url),'utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for(const [query,expected] of [['?src=foundrytools_ai_workflow','foundrytools_ai_workflow'],['?src=%3Cbad%3E','portfolio']]){
    const calls=[];let click;
    const button={dataset:{offer:'ai-workflow-kit-004'},nextElementSibling:{},addEventListener:(_,fn)=>{click=fn;}};
    const location={search:query};
    vm.runInNewContext(script,{URLSearchParams,location,document:{querySelectorAll:()=>[button]},fetch:async(url,opts)=>{
      calls.push({url,...JSON.parse(opts.body)});
      return {ok:true,json:async()=>({url:'https://checkout.stripe.com/test-placeholder'})};
    }});
    assert.deepEqual(calls,[{url:'/api/acquisition/event',event:'VISITED',source:expected,offerId:'portfolio'}]);
    await click();
    assert.equal(calls[1].productId,'ai-workflow-kit-004');
    assert.equal(calls[1].source,expected);
    assert.equal(calls[2].offerId,'ai-workflow-kit-004');
    assert.equal(calls[2].event,'CHECKOUT_STARTED');
  }
});

test('portfolio visits persist without admitting portfolio checkout or unknown products',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'mint-acquisition-'));
  const port=14329;
  const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),STRIPE_SECRET_KEY:'',FGE_ENABLED:'false',MINT_STATE_DIR:dir},stdio:['ignore','pipe','pipe']});
  try{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Server start timeout')),10000);
      child.stdout.on('data',data=>{if(String(data).includes('listening')){clearTimeout(timer);resolve();}});
      child.once('error',reject);
    });
    const post=(event,offerId)=>fetch(`http://127.0.0.1:${port}/api/acquisition/event`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,offerId,source:'qa_local'})});
    assert.equal((await post('VISITED','portfolio')).status,202);
    assert.equal((await post('CHECKOUT_STARTED','portfolio')).status,403);
    assert.equal((await post('VISITED','made-up-product')).status,403);
    const state=await (await fetch(`http://127.0.0.1:${port}/api/acquisition/state`)).json();
    assert.equal(state.sources.qa_local.VISITED,1);
    assert.equal(state.offers.portfolio.VISITED,1);
    const saved=JSON.parse(readFileSync(path.join(dir,'acquisition-aggregates.json'),'utf8'));
    assert.equal(saved.counters['portfolio|qa_local|VISITED'],1);
  }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));rmSync(dir,{recursive:true,force:true});}
});
