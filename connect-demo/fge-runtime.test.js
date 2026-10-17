import test from 'node:test';import assert from 'node:assert/strict';import {decide,acquisitionGate} from './fge-runtime.js';
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
 const gate=acquisitionGate([{source:'organic',decision:decide({paid:1,fulfilled:0})}]);
 assert.equal(gate.allowed,false);assert.deepEqual(gate.incidentSources,['organic']);
});
test('autonomous promotion allows observed healthy funnel',()=>assert.equal(acquisitionGate([{source:'organic',decision:decide({visits:2})}]).allowed,true));
