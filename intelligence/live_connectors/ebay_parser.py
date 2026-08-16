"""eBay Browse API — Suchergebnisse in Preisangebote umwandeln."""

from __future__ import annotations

from typing import Any


def _float_value(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _shipping_cost(item: dict[str, Any]) -> float:
    options = item.get("shippingOptions") or []
    if not options:
        return 0.0
    cost = options[0].get("shippingCost") or {}
    return _float_value(cost.get("value"), 0.0)


def parse_search_offers(
    payload: dict[str, Any],
    *,
    product_key: str,
    title: str,
    observed_at: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Wandelt eBay itemSummaries in SellerOffer-kompatible Dicts um."""
    rows = []
    for item in (payload.get("itemSummaries") or [])[:limit]:
        seller = (item.get("seller") or {}).get("username") or "ebay_seller"
        price = _float_value((item.get("price") or {}).get("value"))
        shipping = _shipping_cost(item)
        rows.append(
            {
                "seller_id": f"ebay:{seller}",
                "seller_name": f"eBay — {seller}",
                "product_key": product_key,
                "title": item.get("title") or title,
                "price": price,
                "shipping_price": shipping,
                "currency": (item.get("price") or {}).get("currency", "EUR"),
                "url": item.get("itemWebUrl"),
                "observed_at": observed_at,
                "source": "eBay Browse API",
                "item_id": item.get("itemId"),
            }
        )
    return rows


def search_to_seller_offers(client, query: str, product_key: str, title: str, observed_at: str, limit: int = 5):
    from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.models import (
        SellerOffer,
        SourceEvidence,
    )

    payload = client.search(query, limit=limit)
    parsed = parse_search_offers(
        payload,
        product_key=product_key,
        title=title,
        observed_at=observed_at,
        limit=limit,
    )
    offers = []
    for row in parsed:
        offers.append(
            SellerOffer(
                seller_id=row["seller_id"],
                seller_name=row["seller_name"],
                product_key=row["product_key"],
                title=row["title"],
                price=row["price"],
                shipping_price=row["shipping_price"],
                currency=row.get("currency", "EUR"),
                url=row.get("url"),
                observed_at=observed_at,
                evidence=[
                    SourceEvidence(
                        source_id=row.get("item_id") or product_key,
                        url=row.get("url") or "",
                        observed_at=observed_at,
                        source_type="ebay_browse_api",
                        title=row["title"],
                        confidence=0.85,
                        claim=f"eBay DE Suche: {query}",
                    )
                ],
            )
        )
    return offers, payload
