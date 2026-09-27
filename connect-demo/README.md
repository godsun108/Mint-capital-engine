# MINT Stripe Connect sample

A deliberately small Node.js sample for a Connect platform that owns pricing/fee collection.

## What is implemented

- One `stripeClient` is used for every Stripe request.
- V2 connected-account creation with only the requested fields: display name, contact email, US identity, Express dashboard, platform fee/loss responsibility, and recipient transfer capability.
- V2 Account Links onboarding.
- Onboarding status is retrieved directly from the Accounts API with recipient configuration + requirements included.
- Platform-level Products with a default Price.
- Product -> connected-account mapping in Stripe product metadata.
- Storefront listing platform products and V2 connected accounts.
- Hosted Checkout destination charges with a configurable application fee.
- V2 thin-event webhook parsing + event retrieval and handlers for requirements/capability changes.

## Install

Requires Node 20+.

```bash
cd connect-demo
npm install
```

The package pins `stripe@22.6.2`, the latest stable stripe-node release when this sample was created. Do not manually set `apiVersion`; the SDK selects its pinned Stripe API version.

## Configure

Do not put secrets in Git.

Set these environment variables in your shell/deployment secret store:

```bash
export STRIPE_SECRET_KEY="sk_test_..."       # REQUIRED
export STRIPE_WEBHOOK_SECRET="whsec_..."     # REQUIRED for webhook verification
export APP_URL="http://localhost:4242"
export APPLICATION_FEE_BPS="1000"            # 10%
```

Helpful failures are returned when required values are absent. Start with Stripe test/sandbox credentials.

## Run

```bash
npm start
```

Open `http://localhost:4242`.

Flow:
1. Create a connected account for an application user.
2. Select it and click **Onboard to collect payments**.
3. Complete Stripe-hosted onboarding.
4. Refresh status until the transfer capability is active.
5. Create a platform Product mapped to that connected account.
6. Buy it from the storefront through hosted Checkout.

## Demo persistence

MINT currently has no application database. The sample therefore uses an in-memory `Map` for the illustrative user -> account mapping; it resets when the process restarts.

The product -> connected-account mapping is stored in Stripe Product metadata. In production, persist both mappings in your database and treat Stripe as the payment source of truth.

## Thin-event webhook

Create a Stripe event destination in Dashboard under Developers -> Webhooks:
- events from **Connected accounts**
- payload style **Thin**
- subscribe to the V2 account requirements event and recipient capability-status event.

Local CLI example:

```bash
stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' --forward-thin-to localhost:4242/webhooks/stripe
```

Copy the CLI's `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.

The handler calls `stripeClient.parseThinEvent(...)`, then retrieves the full V2 event with `stripeClient.v2.core.events.retrieve(thinEvent.id)`. It does not trust a thin notification as a full resource snapshot.

## Production notes

This is a sample, not a complete commerce platform. Before live money:
- add authentication and authorization to every seller/admin endpoint;
- replace the in-memory user mapping with a durable DB;
- validate that the authenticated user owns the connected account they modify;
- add idempotency around create/checkout operations;
- implement server-side paid-order + fulfillment records;
- listen for Checkout/payment/refund/dispute events in addition to account requirements;
- add taxes, shipping/digital-delivery rules, refunds, terms and support appropriate to the product;
- use HTTPS for public callback/webhook URLs;
- test the entire flow with Stripe test/sandbox data before live mode.
