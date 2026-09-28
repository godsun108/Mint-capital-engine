# Agent Control Plane v0.1

## Non-negotiables
1. Human authority owns money movement, contracts, certifications, production launch, outbound messaging and permission changes.
2. No agent may grant itself capabilities or raise its own budget.
3. Revenue means settled revenue; forecasts and pipeline are separate fields.
4. Every material claim must retain evidence/provenance.
5. Every external side effect must be idempotent and auditable.
6. Kill switches operate at task, agent, division and system level.
7. Secrets are never placed in prompts, logs, public repositories or Portal browser state.
8. FORGE may propose better workflows but cannot weaken these controls.

## Work order state machine
PROPOSED -> RESEARCHING -> READY_FOR_REVIEW -> APPROVED -> EXECUTING -> VERIFYING -> COMPLETE

Any state may enter BLOCKED or HALTED. Consequential actions insert an explicit WAITING_FOR_HUMAN_APPROVAL state.

## Economic experiment record
Each experiment records hypothesis, customer/problem, offer, acquisition channel, upfront budget, time budget, success/failure threshold, settled revenue, total cost, evidence and postmortem.

The objective is not activity. The objective is repeatable useful value that produces lawful settled net cash.
