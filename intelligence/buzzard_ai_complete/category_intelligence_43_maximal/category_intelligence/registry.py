from .agent import CategoryIntelligenceAgent

def build_43_agents(category_definitions, shared_memory=None, event_bus=None):
    """
    category_definitions must contain at least 43 shop/meta entries:
    {"category_id": "...", "name": "..."}.
    This deliberately uses the canonical Buzzard taxonomy instead of hardcoding
    potentially stale category names in the intelligence layer.
    """
    if len(category_definitions) < 43:
        raise ValueError(f"EXPECTED_AT_LEAST_43_CATEGORIES_GOT_{len(category_definitions)}")
    agents = {}
    for item in category_definitions:
        cid = item["category_id"]
        agents[cid] = CategoryIntelligenceAgent(
            cid, item["name"], shared_memory=shared_memory, event_bus=event_bus
        )
    return agents
