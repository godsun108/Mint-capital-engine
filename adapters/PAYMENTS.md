# PAYMENT RAIL ADAPTER CONTRACT

MINT needs a real payment processor adapter to turn CREATE/COLLECT work into collectable USD.

## Required capabilities
- create or reference a legitimate product/service
- create a payment link or invoice
- preserve a MINT job/opportunity ID as metadata where supported
- observe payment state
- observe refunds/disputes
- observe payout/availability state where supported
- reconcile processor events to MINT cash events

## Truth boundary
`PAID` means the processor reports customer payment.  
`SETTLED` means funds are confirmed available in the destination cash account.

MINT must never mark an invoice/payment intent as revenue merely because it was created or sent.

## Stripe target
Stripe Payment Links and Invoicing are suitable first adapters. Credentials and secrets must never be committed to this public repository. A connected/authorized integration or deployment secret store is required before live writes.

Creating products, prices, links, invoices, refunds or other external financial objects is consequential and remains authorization-controlled.
