def validate_marketing_data(consent, purpose):
    if purpose in {"CUSTOM_AUDIENCE", "RETARGETING", "PROFILING"} and not consent:
        return {"allowed": False, "reason": "consent_required"}
    return {"allowed": True}
