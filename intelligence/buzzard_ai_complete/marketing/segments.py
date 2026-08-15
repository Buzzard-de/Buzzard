def choose_audience(customer_segment, consent=True):
    if not consent:
        return {"allowed": False, "segment": None, "reason": "marketing_consent_missing"}
    return {"allowed": True, "segment": customer_segment}
