import test from 'node:test';
import assert from 'node:assert/strict';
import {linkFacets,dispatchBluesky} from './fge-bluesky.js';

test('tracked campaign link receives AT Protocol link facet',()=>{
 const text='Try https://example.com/offers?src=fge_bluesky_health';
 const facets=linkFacets(text);
 assert.equal(facets.length,1);
 assert.deepEqual(facets[0].index,{byteStart:4,byteEnd:Buffer.byteLength(text,'utf8')});
 assert.equal(facets[0].features[0].uri,'https://example.com/offers?src=fge_bluesky_health');
});

test('facets use UTF-8 byte offsets after emoji and omit trailing punctuation',()=>{
 const prefix='🦾💚 Visit ';
 const facets=linkFacets(prefix+'https://example.com/guide.');
 assert.equal(facets[0].index.byteStart,Buffer.byteLength(prefix,'utf8'));
 assert.equal(facets[0].features[0].uri,'https://example.com/guide');
 assert.equal(facets[0].index.byteEnd,Buffer.byteLength(prefix+'https://example.com/guide','utf8'));
});

test('native publisher remains closed without credentials',async()=>{
 const oldHandle=process.env.BLUESKY_HANDLE,oldPassword=process.env.BLUESKY_APP_PASSWORD;
 try{
  delete process.env.BLUESKY_HANDLE;delete process.env.BLUESKY_APP_PASSWORD;
  const result=await dispatchBluesky({brand:'foundry',channel:'bluesky',payload:{text:'Hello'}});
  assert.equal(result.reason,'provider_not_configured');
 }finally{
  if(oldHandle===undefined)delete process.env.BLUESKY_HANDLE;else process.env.BLUESKY_HANDLE=oldHandle;
  if(oldPassword===undefined)delete process.env.BLUESKY_APP_PASSWORD;else process.env.BLUESKY_APP_PASSWORD=oldPassword;
 }
});
