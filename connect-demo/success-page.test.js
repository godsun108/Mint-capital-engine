import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Source contract only: no Stripe requests, session creation, or charges.
const html=readFileSync(new URL('./public/success.html',import.meta.url),'utf8');
const server=readFileSync(new URL('./server.js',import.meta.url),'utf8');

test('success page does not call the intentionally disabled diagnostics route',()=>{
  assert.doesNotMatch(html,/fetch\s*\(\s*['"`]\/api\/checkout\//);
  assert.match(server,/Checkout diagnostics are unavailable on the public API/);
});

test('checkout reference stays private and is checked before using fulfillment route',()=>{
  assert.match(html,/<meta name="referrer" content="no-referrer">/);
  assert.match(html,/\^cs_\(\?:live\|test\)_\[A-Za-z0-9\]\+\$/);
  assert.match(html,/\/api\/fulfill\/['"]?\s*\+/);
  assert.match(server,/session\.payment_status!=='paid'\|\|session\.status!=='complete'/);
  assert.match(server,/isApprovedLivePurchase\(session,offer\)/);
});

test('customer-facing copy does not claim a payment based solely on the return URL',()=>{
  assert.match(html,/This page does not assert payment or delivery/);
  assert.match(html,/If payment is pending, the server will not release the file/);
});
