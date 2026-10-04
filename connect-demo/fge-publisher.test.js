import test from 'node:test';import assert from 'node:assert/strict';import {produceCandidates,renderCandidate} from './fge-publisher.js';
test('publisher creates Foundry Bluesky drafts',()=>{const q=produceCandidates();assert.ok(q.length>=4);assert.ok(q.every(x=>x.state==='draft'&&x.brand==='foundry'&&x.channel==='bluesky'))});
test('publisher does not duplicate used template',()=>{const q=produceCandidates({existing:[{template:'health'}]});assert.equal(q.some(x=>x.key==='health'),false)});
test('rendered posts fit Bluesky',()=>{for(const x of produceCandidates())assert.ok(renderCandidate(x).length<=300)});
