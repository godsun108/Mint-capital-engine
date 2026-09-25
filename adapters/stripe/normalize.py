#!/usr/bin/env python3
"""Normalize approved Stripe observations into MINT settlement-validation input.

This script performs no network calls and contains no credentials.
"""
import json, sys
MAP = {
    "requires_payment_method": "AWAITING_PAYMENT",
    "requires_confirmation": "AWAITING_PAYMENT",
    "requires_action": "AWAITING_PAYMENT",
    "processing": "AWAITING_PAYMENT",
    "succeeded": "PAID",
    "paid": "PAID",
    "available": "AVAILABLE",
    "settled": "SETTLED",
    "refunded": "REFUNDED",
    "disputed": "DISPUTED",
}
def normalize(x):
    raw=str(x.get("status","")).lower()
    status=MAP.get(raw, str(x.get("status","")).upper())
    return {
        "external_id": x.get("external_id") or x.get("id"),
        "provider": "stripe",
        "amount_usd": x.get("amount_usd","0.00"),
        "status": status,
        "observed_at": x.get("observed_at"),
        "mint_job_id": x.get("mint_job_id"),
        "mint_opportunity_id": x.get("mint_opportunity_id"),
        "evidence": x.get("evidence","stripe_observation")
    }
if __name__=="__main__":
    data=json.load(sys.stdin)
    print(json.dumps({"events":[normalize(x) for x in data.get("events",[])]},indent=2))
