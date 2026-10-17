import test from 'node:test';import assert from 'node:assert/strict';import {decide,acquisitionGate,publishingPolicy} from './fge-runtime.js';
test('cold traffic requests distribution',()=>assert.equal(decide({}).action,'increase_qualified_distribution'));
test('traffic without checkout targets offer/intent',()=>assert.equal(decide({visits:3}).state,'traffic'));
test('checkout without payment is not called revenue',()=>assert.equal(decide({visits:3,checkoutStarted:1}).state,'checkout'));
test('paid without fulfillment stops growth',()=>assert.equal(decide({paid:1,fulfilled:0}).state,'incident'));
test('paid and fulfilled identifies repeatable winner',()=>assert.equal(decide({paid:1,fulfilled:1}).state,'winner'));
test('impossible fulfillment evidence is error',()=>assert.equal(decide({paid:0,fulfilled:1}).state,'error'));

test('delivery incident decision takes precedence over checkout activity',()=>{
 assert.equal(decide({visits:20,checkoutStarted:4,paid:2,fulfilled:1}).action,'repair_fulfillment_before_growth');
});
test('inconsistent fulfillment evidence is an error even with traffic',()=>{
 assert.equal(decide({visits:20,paid:0,fulfilled:1}).action,'investigate_evidence_invariant');
});

test('autonomous promotion blocks absent funnel evidence',()=>assert.deepEqual(acquisitionGate([]),{allowed:false,reason:'missing_funnel_evidence'}));
test('autonomous promotion blocks invalid funnel evidence',()=>assert.equal(acquisitionGate([null]).reason,'invalid_funnel_evidence'));
test('autonomous promotion blocks unresolved customer incident',()=>{
 const gate=acquisitionGate([{source:'organic',funnel:{visits:1,checkoutStarted:1,paid:1,fulfilled:0},decision:decide({paid:1,fulfilled:0})}]);
 assert.equal(gate.allowed,false);assert.deepEqual(gate.incidentSources,['organic']);
});
test('autonomous promotion allows observed healthy funnel',()=>assert.equal(acquisitionGate([{source:'organic',funnel:{visits:2,checkoutStarted:0,paid:0,fulfilled:0},decision:decide({visits:2})}]).allowed,true));

test('publishing requires complete counters',()=>{
 const result=acquisitionGate([{source:'organic',funnel:{visits:2},decision:decide({visits:2})}]);
 assert.equal(result.reason,'incomplete_or_invalid_counts');
});
test('publishing rejects contradictory counters',()=>{
 const funnel={visits:1,checkoutStarted:2,paid:0,fulfilled:0};
 assert.equal(acquisitionGate([{source:'organic',funnel,decision:decide(funnel)}]).reason,'inconsistent_funnel_counts');
});

test('observe mode cannot publish',()=>assert.equal(publishingPolicy({autonomy:'observe',enabled:true}).reason,'observe_mode'));
test('publishing requires explicit enable',()=>assert.equal(publishingPolicy({autonomy:'execute',enabled:false}).reason,'publishing_disabled'));
test('one published post blocks more posts for 24 hours',()=>assert.equal(publishingPolicy({autonomy:'execute',enabled:true,at:100000000,queue:[{state:'published',publishedAt:new Date(99999000).toISOString()}]}).reason,'daily_post_limit'));
test('execute mode allows first daily post',()=>assert.equal(publishingPolicy({autonomy:'execute',enabled:true,queue:[]}).allowed,true));

test('publishing requires fulfillment verification',()=>{
 const previous=process.env.FGE_LIVE_FULFILLMENT_VERIFIED;
 delete process.env.FGE_LIVE_FULFILLMENT_VERIFIED;
 try{assert.equal(publishingPolicy({autonomy:'execute',enabled:true}).reason,'fulfillment_verification_required')}
 finally{if(previous===undefined)delete process.env.FGE_LIVE_FULFILLMENT_VERIFIED;else process.env.FGE_LIVE_FULFILLMENT_VERIFIED=previous}
});
