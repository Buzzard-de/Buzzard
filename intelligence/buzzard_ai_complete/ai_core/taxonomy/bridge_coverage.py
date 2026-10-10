from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.ai_core.workers.category.bridge import get_category_intelligence_agent


def audit_legacy_bridge_coverage(registry: TaxonomyRegistry | None = None) -> dict[str, Any]:
    """Audit which L1 categories have a legacy intelligence agent available."""
    registry = registry or TaxonomyRegistry()
    covered: list[str] = []
    missing: list[str] = []
    for node in registry.list_main_categories():
        agent = get_category_intelligence_agent(node.id, node.name)
        if agent is not None:
            covered.append(node.id)
        else:
            missing.append(node.id)
    total = registry.main_category_count()
    return {
        "total_l1": total,
        "covered_count": len(covered),
        "missing_count": len(missing),
        "covered": covered,
        "missing": missing,
        "coverage_ratio": round(len(covered) / total, 4) if total else 0.0,
    }
