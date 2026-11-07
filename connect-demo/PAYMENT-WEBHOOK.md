# Checkout payment webhook

Owner: MINT operator. Endpoint: POST /webhooks/stripe/payments.
Register only checkout.session.completed and checkout.session.async_payment_succeeded
for this platform account. Configure its signing secret as MINT_CHECKOUT_WEBHOOK_SECRET
in Railway; never commit it. The existing /webhooks/stripe thin account-event handler
uses a different secret and remains separate.

The handler verifies the raw request signature with Stripe's SDK, re-retrieves the
session, requires complete + paid, checks mode, mandate, price and currency against
the active catalog, and verifies the artifact exists. Physical orders are blocked.
Atomic per-session records under MINT_STATE_DIR/payment-entitlements survive restart.
Duplicate notifications do not create duplicate records. No email, purchase, payout,
or physical order is triggered. No customer PII is stored in the entitlement.

READY_FOR_DOWNLOAD is payment/readiness evidence, not download or revenue settlement
evidence. The existing success-page download still verifies payment independently.
Customers who never return to the success page still need a recovery/delivery channel;
this change does not establish emailed delivery or prove an unattended customer download.
Catalog price changes after checkout can require manual reconciliation.

Health webhookConfigured reports presence of the payment signing secret only;
it does not prove Stripe registration or successful real event delivery.
Invalid signatures receive 400. Oversize requests receive 413. Processing or storage
failures receive 500 so Stripe can retry. Monitor MINT_PAYMENT_WEBHOOK_FAILED in Railway
and Stripe endpoint delivery failures. Stripe manages bounded event retries; exhausted
attempts require operator review and replay after correction.

Validation: node --test connect-demo/payment-webhook.test.js
Tests use local signed fixtures and a mocked Stripe read, not real paid transactions.
Production acceptance requires successful delivery of a real Stripe-originated event
and separate evidence of a customer download. Never manufacture a live payment event.
Rollback: disable the Stripe endpoint first, revert the code, preserve entitlement files.

## Settlement evidence ledger (2026-11-07)
`settlement-evidence.js` closes the loop between Stripe PAID and MINT SETTLED:
- Every paid session seen by /api/money-state records a durable, atomic,
  privacy-light row under MINT_STATE_DIR/settlement-evidence.json
  (idempotent per session; duplicate/stale notifications are no-ops; refunds terminal).
- PAID != SETTLED is enforced in code: balance-transaction availability records
  as PAID_PROVIDER_AVAILABLE with settled=false forever until an independent
  destination-cash evidence ref (bank line / transfer record / operator attestation)
  confirms settlement via confirmSettlement().
- /api/money-state now embeds a mint.settlement.evidence.v1 projection, and
  automation/observe-commerce.js consumes it — settledNetUsd counts only
  independently confirmed destination-cash evidence. USD-only: non-USD
  denominations never invent a USD number.
- This makes the North Star proof event (first independently verified settled
  dollar) recordable the moment a real sale settles.
Validation: node --test connect-demo/settlement-evidence.test.js
