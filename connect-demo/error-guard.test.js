import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./server.js',import.meta.url),'utf8');

test('Stripe checkout verification is awaited inside the request try/catch',()=>{
  assert.match(source,/return await verifyCheckout\(decodeURIComponent\(m\[1\]\),res\);/);
});
test('Stripe resource_missing is converted to a controlled 404',()=>{
  assert.match(source,/e\?\.type==='StripeInvalidRequestError'&&e\?\.code==='resource_missing'/);
  assert.match(source,/send\(res,missingStripeResource\?404:500,/);
});
test('all asynchronous route dispatches are awaited',()=>{
  for(const name of ['storefront','moneyState','commerceEvidence','fulfillmentEvidence','createConnectedAccount','accountStatus','onboardingLink','createProduct','checkout','verifyCheckout','fulfillCheckout','thinWebhook','acquisitionEvent']){
    assert.match(source,new RegExp('return await '+name+'\\('),name+' route must be awaited');
  }
});
