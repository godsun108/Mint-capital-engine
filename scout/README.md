# SCOUT v0.1

SCOUT is MINT's public opportunity discovery layer.

Current live adapter:
- Grants.gov public opportunity search

Every discovered item enters MINT as **CANDIDATE_ONLY**. Discovery does not imply eligibility, award probability, profitability, or recommendation.

The browser shows unreviewed candidates and requires **REVIEW → QUEUE** before creating a MINT opportunity. Imported candidates begin with zero gross value and zero probability rather than fabricated economics.

The scheduled GitHub Action refreshes the public feed every six hours. Additional adapters should be added only when their access terms and data semantics are understood.
