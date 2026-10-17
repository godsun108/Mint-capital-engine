# First customer: production checkout evidence — 2026-10-17

Status: checkout initiation verified; live settlement and customer delivery NOT verified.

## Owner's iPhone evidence
- Production /offers page renders all five digital offers with visible prices and purchase buttons.
- Stripe-hosted checkout opened for Practical AI Workflow Kit at $9, showing Apple Pay, Link, card and other payment methods.
- No payment made; no live fulfillment observed.

## Railway evidence
- Service mint-stripe-connect-v4 production latest deployment SUCCESS 2026-10-14T05:58:39Z.
- HTTP proxy logs include GET /offers 200 and POST /api/checkout 201 (at least two); proves server checkout creation responses, not payment completion.
- Variable names include STRIPE_SECRET_KEY, MINT_CHECKOUT_WEBHOOK_SECRET, MINT_STATE_DIR; variable presence alone does not prove validity.
- No Stripe charge, transfer, payout or delivered-download evidence established in this pass.
- Observed FGE runtime in observe mode with zero verified paid estimate; estimate is not an authoritative Stripe balance.

## Code review
- connect-demo/payment-webhook.js checks webhook signature, retrieves Stripe checkout session, verifies livemode/paid/complete, offer authorization, approved artifact, and writes durable READY_FOR_DOWNLOAD entitlement.
- Tests in connect-demo/payment-webhook.test.js cover paid/unpaid, duplicates, signature forgery, wrong amount, test mode and artifact boundary.
- Receipt customerDeliveryVerified=false; no claim of actual download.

## Remaining verification
1. Inspect endpoint behavior and artifacts for all five offers, including download access after payment.
2. Run a separate test-mode integration test using test credentials and simulated Stripe webhooks, without real charge or altering live money state.
3. Confirm real Stripe transactions, fees, payout status from authorized read-only Stripe account view. Never infer sales from checkout starts.
4. Check email receipt/download instructions and expired/reused links; verify failed and asynchronous payment scenarios.

No live purchase, paid ads, new product publication, brand changes or deployment was performed.
