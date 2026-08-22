from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any

from buzzard_ai_complete.ai_core.taxonomy.legacy_bridge import resolve_legacy_category_id
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.agent import (
    CategoryIntelligenceAgent,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.models import (
    SellerOffer,
)


def _normalize_offers(offers: list[Any]) -> list[SellerOffer]:
    """Adapt API/orchestrator dict payloads to SellerOffer objects."""
    normalized: list[SellerOffer] = []
    for idx, offer in enumerate(offers):
        if isinstance(offer, SellerOffer):
            normalized.append(offer)
            continue
        if not isinstance(offer, dict):
            continue
        price = offer.get("price")
        if price is None:
            continue
        normalized.append(
            SellerOffer(
                seller_id=str(offer.get("seller_id", f"seller-{idx}")),
                seller_name=str(offer.get("seller_name", offer.get("seller", f"Seller {idx}"))),
                product_key=str(offer.get("product_key", offer.get("sku", offer.get("title", f"item-{idx}")))),
                title=str(offer.get("title", offer.get("name", f"Item {idx}"))),
                price=float(price),
                currency=str(offer.get("currency", "EUR")),
                shipping_price=offer.get("shipping_price"),
                observed_at=offer.get("observed_at"),
            )
        )
    return normalized


def map_taxonomy_to_legacy_category_id(taxonomy_node_id: str) -> str:
    """Map bz.XX to CXX legacy agent id when available."""
    if taxonomy_node_id.startswith("bz."):
        suffix = taxonomy_node_id.split(".", 1)[1]
        return f"C{suffix}"
    return taxonomy_node_id


def get_category_intelligence_agent(
    taxonomy_node_id: str,
    category_name: str,
) -> CategoryIntelligenceAgent | None:
    legacy_id = map_taxonomy_to_legacy_category_id(taxonomy_node_id)
    try:
        return CategoryIntelligenceAgent(legacy_id, category_name)
    except Exception:
        return None


def analyze_category(
    taxonomy_node_id: str,
    category_name: str,
    payload: dict[str, Any],
    registry: TaxonomyRegistry | None = None,
) -> dict[str, Any]:
    registry = registry or TaxonomyRegistry()
    node = registry.get_node(taxonomy_node_id)
    if node is None:
        resolved = resolve_legacy_category_id(taxonomy_node_id)
        if resolved:
            node = registry.get_node(resolved)
    if node is None:
        return {
            "status": "NO_DATA_AVAILABLE",
            "taxonomy_node_id": taxonomy_node_id,
            "message": "taxonomy node not found in master taxonomy",
        }

    offers = _normalize_offers(list(payload.get("offers") or []))
    buzzard_taxonomy = payload.get("buzzard_taxonomy") or []
    observed_taxonomy = payload.get("observed_taxonomy") or []

    if not offers and not observed_taxonomy:
        return {
            "status": "NO_DATA_AVAILABLE",
            "taxonomy_node_id": node.id,
            "category_name": node.name,
            "message": "no offers or observed taxonomy supplied; scan deferred",
        }

    agent = get_category_intelligence_agent(node.id, node.name)
    if agent is None:
        return {
            "status": "NO_DATA_AVAILABLE",
            "taxonomy_node_id": node.id,
            "category_name": node.name,
            "message": "category intelligence agent unavailable for node",
        }

    report = agent.analyze(
        offers=offers,
        buzzard_taxonomy=buzzard_taxonomy,
        observed_taxonomy=observed_taxonomy,
        period=str(payload.get("period", "current")),
    )
    report_data = asdict(report) if is_dataclass(report) else report
    return {
        "status": "ok",
        "taxonomy_node_id": node.id,
        "category_name": node.name,
        "report": report_data,
    }
