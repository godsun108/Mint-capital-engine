# First-sale alert and settlement verification gate

## Verified repository facts (2026-10-09)

- `systems/catalog.json` declares Foundry Express TypeScript Starter at USD 9 with `status: LIVE` and `live_payment_enabled: true`. This is configuration, **not** proof of a functioning live checkout or a sale.
- `automation/watchtower.js` checks storefront/API reachability only. It explicitly disclaims payment, fulfillment, and settlement proof.
- `.github/workflows/watchtower.yml` runs every six hours and exits nonzero on failed reachability. It has **no customer-payment notification action**.
- `.github/workflows/commerce-shift.yml` produces a read-only artifact and is not a real-time purchase alert.
- `.github/workflows/fulfillment-qa.yml` uses **test** Checkout sessions. Passing it does not prove production payment or first-sale notification.
- `adapters/stripe/README.md` correctly separates PAID from SETTLED.

## Required end-to-end gate (do not mark complete from green CI)

1. Identify the **production** Stripe account and live price/payment link used by the public storefront. Verify that checkout reaches that account; do not paste secrets into issues, PRs, logs, or Git.
2. Inspect Railway's deployed Stripe webhook route, configured endpoint, subscribed event types, signature verification, and event-delivery history. Never accept unsigned client claims of payment.
3. Establish a durable, idempotent event ledger keyed by Stripe event ID and checkout/payment object ID. Distinguish test/live mode, amount, currency, product, paid state, fulfillment state, payout state, and destination-account settlement.
4. Notify an approved destination only on **verified live payment**; use a different clearly labeled test channel/event for dry runs. Never place buyer PII or webhook secrets in public GitHub artifacts.
5. Exercise Stripe test mode: paid checkout -> verified webhook -> single alert -> fulfillment; replay same event -> **no duplicate alert or delivery**; unpaid checkout -> neither alert nor fulfillment.
6. Exercise a signed test event with an invalid signature and a wrong product/amount: both must be rejected.
7. Independently verify live checkout configuration, then confirm actual first live sale from Stripe's authoritative event history. Only mark SETTLED with payout/bank evidence; never fabricate a purchase to make the dashboard green.
8. Record alert receipt time, webhook delivery evidence, fulfillment evidence, and reconciliation result without disclosing private customer information.

## First-pass alert failure taxonomy

- **Not observed**: No authoritative live payment event has been established; an absent alert may be correct.
- **Event not delivered**: Stripe event exists but delivery failed/missing; inspect endpoint registration, network and retries.
- **Event rejected**: Signature, mode, schema or amount validation failed; inspect sanitized logs.
- **Alert not configured**: Event processed but no configured notification destination/transport.
- **Alert failed**: Notification attempted but provider rejected/timed out; retry with idempotency and bounded backoff.
- **Alert delivered**: Provider acknowledged; confirm recipient receipt separately.
- **Settled**: Independent destination-account evidence exists; separate from alert status.

## Release acceptance

Do not claim the first-sale alert is fixed until an actual test event reaches the intended destination exactly once, unpaid/invalid events are rejected, and the production route is confirmed against the Stripe dashboard. A verified live sale is a separate milestone.
