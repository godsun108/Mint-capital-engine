import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleRequestError} from './request-error.js';
const source=readFileSync(new URL('./server.js',import.meta.url),'utf8');

function invoke(error,headersSent=false){
  const result={status:null,payload:null,ended:false};
  const response={headersSent,end(){result.ended=true;}};
  handleRequestError(error,response,(_res,status,payload)=>{result.status=status;result.payload=payload;});
  return result;
}
test('missing Stripe session returns 404 without throwing or leaking provider details',()=>{
  const result=invoke({type:'StripeInvalidRequestError',code:'resource_missing',message:'secret provider details'});
  assert.equal(result.status,404);
  assert.match(result.payload.error,/not found/);
  assert.doesNotMatch(JSON.stringify(result.payload),/secret provider details/);
});
test('other errors return sanitized 500',()=>{
  const result=invoke(new Error('private stack detail'));
  assert.equal(result.status,500);
  assert.equal(result.payload.error,'Unexpected server error.');
});
test('headers already sent: terminate response rather than write a second header',()=>{
  const result=invoke({type:'StripeInvalidRequestError',code:'resource_missing'},true);
  assert.equal(result.status,null);
  assert.equal(result.ended,true);
});
test('HTTP request boundary awaits async handlers and delegates errors',()=>{
  assert.ok(source.includes('return await verifyCheckout(decodeURIComponent(m[1]),res);'));
  assert.ok(source.includes('handleRequestError(e,res,send)'));
  for(const name of ['storefront','moneyState','commerceEvidence','fulfillmentEvidence','createConnectedAccount','accountStatus','onboardingLink','createProduct','checkout','verifyCheckout','fulfillCheckout','thinWebhook','acquisitionEvent']){
    assert.ok(source.includes('return await '+name+'('),name+' route must be awaited');
  }
});
