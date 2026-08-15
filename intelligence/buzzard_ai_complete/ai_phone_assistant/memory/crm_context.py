VERIFIED_LEVELS = {"phone_verified", "customer_authenticated", "order_authenticated"}


def build_agent_context(memory, customer_id, verification_level):
    if verification_level not in VERIFIED_LEVELS:
        return {"verified": False, "memory": [], "recent_calls": []}
    return {
        "verified": True,
        "memory": memory.approved_facts(customer_id),
        "recent_calls": memory.recent_calls(customer_id),
    }
