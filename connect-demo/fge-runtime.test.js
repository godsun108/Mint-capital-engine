import test from 'node:test';import assert from 'node:assert/strict';import {decide} from './fge-runtime.js';
test('cold traffic requests distribution',()=>assert.equal(decide({}).action,'increase_qualified_distribution'));
test('traffic without checkout targets offer/intent',()=>assert.equal(decide({visits:3}).state,'traffic'));
test('checkout without payment is not called revenue',()=>assert.equal(decide({visits:3,checkoutStarted:1}).state,'checkout'));
test('paid without fulfillment stops growth',()=>assert.equal(decide({paid:1,fulfilled:0}).state,'incident'));
test('paid and fulfilled identifies repeatable winner',()=>assert.equal(decide({paid:1,fulfilled:1}).state,'winner'));
test('impossible fulfillment evidence is error',()=>assert.equal(decide({paid:0,fulfilled:1}).state,'error'));
