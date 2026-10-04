# Earth Chain → MINT intake contract v0.1

Canonical producer: EDGE `earth_chain/export.py` generates `earth_chain/outputs/mint_candidates.json`.
This is a **documented handoff, not a live wired ingestion**. The file is a JSON object with `schema: earth-chain.mint.v0.1` and `items` array.

Accept only explicitly consented ask/bid records; de-duplicate by `external_id`. Treat all as `discovered_unreviewed`, with `expected_cash_usd=0` and `settled_cash_usd=0`. Evidence URLs require review; never automatically contact a counterparty, execute a contract, move money, or claim settlement. Do not infer economic value from quoted commodity prices.

Next integration: adapt the existing MINT opportunity import to this contract, with validation and human promotion.
