# Stripe adapter — MINT v0.7

This adapter defines the first live payment-rail boundary for MINT.

## Objective
Move legitimate CREATE/COLLECT jobs through:

READY -> AWAITING_APPROVAL -> EXECUTING -> AWAITING_PAYMENT -> PAID -> SETTLED

The adapter never treats a product, price, payment link, invoice, checkout session, or customer payment as settled cash.

## External write boundary
Creating Stripe products, prices, payment links, invoices, refunds, or other external objects requires explicit human authorization. MINT may prepare a request before approval.

No Stripe secret, API key, webhook signing secret, customer PII, or bank credential belongs in this public repository.

## Metadata
Where Stripe supports metadata, attach:
- mint_job_id
- mint_opportunity_id
- mint_system
- mint_schema = mint.stripe.v1

## Reconciliation
Normalize provider observations into the event schema documented in EVENT_SCHEMA.json. Customer-payment confirmation may produce PAID. Only independent confirmation that funds are available in the destination cash account may produce SETTLED.

Stripe availability/payout state can be evidence for reconciliation, but MINT must not silently equate a successful charge with destination-account settlement.
