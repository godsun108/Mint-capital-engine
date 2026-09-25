# Finish MINT

MINT is considered operational—not merely architected—when all of these are true:

1. A real lawful offer/receivable exists in `systems/catalog.json`.
2. A human has approved its price, description, delivery/refund obligations and external publication.
3. An authorized payment adapter has created a real payment object.
4. At least one real payment is observed and reconciled.
5. Settlement is independently supported and enters the settled-cash ledger.
6. Reconciliation is repeatable without secrets in git.
7. At least one CREATE route and one CLAIM route can be run end-to-end.
8. Dashboard exposes route state, payment state, and settled USD without conflating expected/paid/settled money.

## Immediate critical path

**A. Connect payment rail.** Stripe is the first target.

**B. Approve first offer.** Choose a real thing that can actually be delivered. Do not invent a customer or demand.

**C. First-dollar test.** Prepare -> approve -> publish/send -> collect -> verify settlement -> reconcile.

**D. Repeatability.** Convert the successful path into a reusable job template.

## Money doctrine

MINT can reduce search, preparation, follow-up and reconciliation labor. It cannot guarantee sales, grants, refunds, credit, or profit. Its job is to maximize legitimate attempts and make the path from opportunity to spendable USD measurable.
