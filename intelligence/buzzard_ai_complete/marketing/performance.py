from buzzard_ai_complete.marketing.models import Performance


def evaluate(p: Performance, target_roas=3.0):
    return {
        "campaign_id": p.campaign_id,
        "roas": p.roas,
        "conversion_rate": p.conversion_rate,
        "status": "ABOVE_TARGET" if p.roas >= target_roas else "BELOW_TARGET",
    }
