"""Amazon Creators API — Suchergebnisse in Preisangebote umwandeln."""

from __future__ import annotations

from typing import Any


def _float_value(value: Any, default: float = 0.0) -> float:
    try:
        return float(str(value).replace(",", ".").replace("€", "").strip())
    except (TypeError, ValueError):
        return default


def _extract_title(item: dict[str, Any]) -> str:
    for path in (
        ("itemInfo", "title", "displayValue"),
        ("title",),
        ("ItemInfo", "Title", "DisplayValue"),
    ):
        node: Any = item
        for key in path:
            if not isinstance(node, dict):
                node = None
                break
            node = node.get(key)
        if isinstance(node, str) and node.strip():
            return node.strip()
    return "Amazon Produkt"


def _extract_price(item: dict[str, Any]) -> float:
    listings = (
        (item.get("offers") or {}).get("listings")
        or (item.get("Offers") or {}).get("Listings")
        or []
    )
    if listings:
        price = listings[0].get("price") or listings[0].get("Price") or {}
        amount = price.get("amount") or price.get("displayAmount") or price.get("value")
        if amount is not None:
            return _float_value(amount)
    for key in ("price", "lowestPrice", "buyingPrice"):
        if key in item:
            return _float_value(item[key])
    return 0.0


def _extract_url(item: dict[str, Any]) -> str:
    return (
        item.get("detailPageURL")
        or item.get("DetailPageURL")
        or item.get("url")
        or ""
    )


def _extract_asin(item: dict[str, Any]) -> str:
    return item.get("asin") or item.get("ASIN") or "unknown"


def parse_search_items(
    payload: dict[str, Any],
    *,
    product_key: str,
    title: str,
    observed_at: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    items = (
        (payload.get("searchResult") or {}).get("items")
        or (payload.get("SearchResult") or {}).get("Items")
        or payload.get("items")
        or []
    )
    rows = []
    for item in items[:limit]:
        asin = _extract_asin(item)
        item_title = _extract_title(item) or title
        price = _extract_price(item)
        rows.append(
            {
                "seller_id": f"amazon:{asin}",
                "seller_name": "Amazon.de",
                "product_key": product_key,
                "title": item_title,
                "price": price,
                "shipping_price": 0.0,
                "currency": "EUR",
                "url": _extract_url(item),
                "observed_at": observed_at,
                "source": "Amazon Creators API",
                "asin": asin,
            }
        )
    return rows


def search_to_seller_offers(client, query: str, product_key: str, title: str, observed_at: str, limit: int = 5):
    from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.models import (
        SellerOffer,
        SourceEvidence,
    )

    payload = client.search(query)
    parsed = parse_search_items(
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
                        source_id=row.get("asin") or product_key,
                        url=row.get("url") or "",
                        observed_at=observed_at,
                        source_type="amazon_creators_api",
                        title=row["title"],
                        confidence=0.85,
                        claim=f"Amazon DE Suche: {query}",
                    )
                ],
            )
        )
    return offers, payload
