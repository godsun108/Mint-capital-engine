# MINT Fleet Commerce Channels

MINT is designed to operate multiple truthful product brands, storefronts, and permitted marketplace channels from one governed catalog.

## Channel classes

### OWNED_WEB
MINT-controlled storefront or landing site.
May be autonomously built/published at zero spend when covered by an existing mandate.

### DIGITAL_MARKETPLACE
Third-party marketplace for digital goods.
Before activation, verify current seller terms, fees, automated-listing rules, prohibited products, payout requirements, and required owner attestations.

### PHYSICAL_MARKETPLACE
Third-party marketplace for physical goods.
Before activation, verify seller terms, listing rules, fees, returns, shipping/service requirements, taxes, payout requirements, and identity/business attestations.

### PRINT_ON_DEMAND
A supplier produces/ships after a customer order.
Supplier terms, unit economics, quality, returns, intellectual-property rights, and payment obligations must be verified before live activation.

### SUPPLIER_FULFILLED
Supplier ships a physical product after purchase.
Do not represent inventory, delivery times, origin, quality, certifications, or availability without evidence.

### STOCKED_PHYSICAL
MINT/owner holds inventory and fulfills orders.
Inventory purchase, storage/shipping spend, and supplier commitments remain approval-gated unless a later mandate explicitly authorizes them.

## Required product declarations
Each live offer must declare:
- product type
- mandate
- price/currency
- fulfillment kind
- permitted channels
- truthful description
- active status

Physical offers additionally require:
- inventory model
- unit landed cost evidence
- shipping responsibility
- return/refund policy
- fulfillment SLA evidence
- supplier/producer status
- applicable product/regulatory constraints
- margin estimate that separates projected from realized economics

## Fail-closed rule
A channel adapter may publish/list an offer only when the offer explicitly permits that channel and the adapter has verified that all required fields and permissions exist.

## Multi-brand rule
Brands and sites may target different customer jobs, but they share the same underlying truth ledger. MINT must not manufacture independent fake identities, reviews, customer counts, scarcity, inventory, or sales histories for different brands.

## Marketplace rule
Marketplace participation is conditional on current official terms. Enrollment, identity/business attestations, binding seller agreements, paid listing fees, inventory purchases, and other consequential commitments stop for required owner approval.

## Physical order truth ladder
DISCOVERED -> LISTED -> ORDER_CREATED -> PAYMENT_VERIFIED -> FULFILLMENT_ACCEPTED -> SHIPPED -> DELIVERED -> RETURN_WINDOW_CLOSED -> NET_REALIZED

Do not call an order delivered before carrier/supplier evidence. Do not call gross order value profit.
