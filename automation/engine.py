#!/usr/bin/env python3
"""Build bounded MINT autonomy queues. Performs no external actions.\n\nSchema v4 binds catalog items to mandates by mandate_id.\n"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(path):
    return json.loads((ROOT / path).read_text())

def main():
    mandates = {
        m["id"]: m
        for m in load("automation/mandates.json").get("mandates", [])
        if m.get("enabled")
    }
    offers = load("systems/catalog.json").get("items", [])
    agents = load("automation/agents.json").get("agents", [])
    resources = load("automation/resources.json").get("resources", [])
    fleet = load("automation/revenue_fleet.json")

    items = []
    for offer in offers:
        mandate = mandates.get(offer.get("mandate_id"))
        if not mandate:
            items.append({
                "offer_id": offer.get("id"),
                "mandate_id": offer.get("mandate_id"),
                "state": "BOUNDARY_STOP",
                "reason": "NO_ENABLED_MANDATE",
                "publish_permitted": False,
                "fulfill_permitted": False,
                "live_payment_permitted": False,
                "external_action_performed": False,
            })
            continue

        price = float(offer.get("price_usd", 0))
        inside = float(mandate.get("min_price_usd", 0)) <= price <= float(mandate.get("max_price_usd", 0))
        test_only = not (
            mandate.get("live_payment", {}).get("enabled", False)
            and offer.get("live_payment_enabled", False)
        )
        items.append({
            "offer_id": offer.get("id"),
            "mandate_id": mandate.get("id"),
            "state": "READY_FOR_TEST_ADAPTER" if inside and test_only else ("READY_FOR_ADAPTER" if inside else "BOUNDARY_STOP"),
            "publish_permitted": bool(mandate.get("auto_publish")) and inside,
            "fulfill_permitted": bool(mandate.get("auto_fulfill")) and inside,
            "live_payment_permitted": inside and not test_only,
            "external_action_performed": False,
        })

    active_resources = [r["id"] for r in resources if r.get("available")]
    portfolio = [{
        "agent_id": a["id"],
        "class": a["class"],
        "state": a["state"],
        "objective": a["objective"],
        "resources_available": active_resources,
        "external_action_performed": False,
    } for a in agents]

    lanes = [{
        "lane_id": lane["id"],
        "model": lane["model"],
        "agents": lane["agents"],
        "state": "DISCOVER_AND_VERIFY",
        "automation_target": lane["automation_target"],
        "external_action_performed": False,
    } for lane in fleet.get("lanes", [])]

    output = {
        "schema": "mint.autonomy.queue.v4",
        "objective": fleet["objective"],
        "truth_unit": fleet["truth_unit"],
        "offers": items,
        "portfolio": portfolio,
        "revenue_lanes": lanes,
    }
    (ROOT / "automation" / "queue.json").write_text(json.dumps(output, indent=2) + "\n")

if __name__ == "__main__":
    main()
