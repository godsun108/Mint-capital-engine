# Payment-to-download validation gate (2026-10-17)

Scope: Existing MINT business/developer offers only. Research and read-only audit; no real charge, deploy, paid spend or checkout mutation.

## Observed
- Owner's iPhone screenshot: Stripe-hosted live checkout for Practical AI Workflow Kit at $9, payment methods rendered.
- Railway HTTP logs: POST /api/checkout 201, GET /offers 200.
- Source payment-webhook.test.js contains synthetic Stripe SDK event/signature tests, including paid/unpaid, mode, idempotency and artifact constraints. Tests were inspected, **not executed in this pass**.
- Production STRIPE_SECRET_KEY is live-mode according to owner checkout; do NOT switch it to test key or fire fake events against production.
- In server.js, live checkout success_url routes to /success?session_id=..., and fulfillCheckout() checks Stripe session paid/complete and catalog mandate before streaming file. No confirmed paid checkout or downloaded bytes.
- Webhook entitlement creation and GET /api/fulfill/:sessionId are separate paths; fulfillment route checks Stripe directly and does not require webhook entitlement. Thus webhook completion is not a prerequisite for GET download. Assess intended reliability/security before changing.
- GET /api/fulfill/:sessionId uses possession of the session ID as the download locator. Review whether session ID leakage, repeat downloads and URL logging are acceptable. Do not log or publish session IDs.
- No independent customer email delivery mechanism verified in this pass. A success page link is not equivalent to email delivery.

## Safe test plan (staging only)
1. Use a completely separate local/staging process with sk_test and test webhook signing secret; never modify live Railway secrets.
2. Run npm test in connect-demo and capture test output/commit SHA.
3. Validate all five catalog artifact paths actually exist in the deploy build, are downloadable only after verified test payment, and match expected filenames/MIME types.
4. Mock or test-mode simulate completed, unpaid, async-paid, duplicate and tampered events; assert no real money movement and no test event grants a live entitlement.
5. Exercise success page /success?session_id=... to /api/fulfill/:sessionId, inspect mobile response and byte integrity; ensure failures explain next steps.
6. Verify webhook destination configuration and delivery attempts in Stripe TEST dashboard or authorized read-only Stripe integration.
7. Only after green staging evidence, request owner approval before any production changes.

## Current verdict
Checkout creation: PASS (observed). Payment success: NOT TESTED. Artifact streaming end-to-end: NOT TESTED. Customer receipt: NOT TESTED. Settled proceeds: NOT VERIFIED.

No test-mode transaction was initiated; synthetic test coverage has not been executed in this pass.
