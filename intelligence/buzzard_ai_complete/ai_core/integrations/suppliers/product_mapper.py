from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.suppliers.security import sanitize_text
from buzzard_ai_complete.ai_core.taxonomy.storefront_bridge import StorefrontTaxonomyBridge


class ProductMapper:
    """Map normalized supplier products to AI Core product records."""

    def __init__(self, taxonomy_bridge: StorefrontTaxonomyBridge | None = None) -> None:
        self._taxonomy = taxonomy_bridge or StorefrontTaxonomyBridge()

    def map_product(self, normalized: dict[str, Any]) -> dict[str, Any]:
        category_raw = normalized.get("category_raw")
        taxonomy_id = None
        storefront_id = None
        if category_raw:
            mapping = self._taxonomy.resolve(category_raw)
            taxonomy_id = mapping.get("taxonomy_id")
            storefront_id = mapping.get("storefront_id")

        return {
            "sku": normalized["sku"],
            "name": normalized["name"],
            "supplier_id": normalized["supplier_id"],
            "description": normalized.get("description"),
            "brand": normalized.get("brand"),
            "price": normalized.get("price"),
            "currency": normalized.get("currency", "EUR"),
            "stock_qty": normalized.get("stock_qty"),
            "taxonomy_id": taxonomy_id,
            "storefront_category_id": storefront_id,
            "ean": normalized.get("ean"),
            "enrichment_status": "normalized",
            "metadata": normalized.get("metadata") or {},
        }

    def enrich_product(self, product: dict[str, Any], *, commerce_data: dict[str, Any] | None = None) -> dict[str, Any]:
        enriched = dict(product)
        enriched["enrichment_status"] = "enriched"
        if commerce_data and commerce_data.get("status") not in {"NO_DATA_AVAILABLE", "ERROR"}:
            enriched["commerce"] = {
                "status": commerce_data.get("status", "ok"),
                "sku": commerce_data.get("sku") or product.get("sku"),
            }
            if commerce_data.get("name"):
                enriched["name"] = sanitize_text(str(commerce_data["name"]))
        enriched["attributes"] = self._extract_attributes(enriched)
        return enriched

    @staticmethod
    def _extract_attributes(product: dict[str, Any]) -> dict[str, str]:
        attrs: dict[str, str] = {}
        if product.get("brand"):
            attrs["brand"] = str(product["brand"])
        if product.get("ean"):
            attrs["ean"] = str(product["ean"])
        if product.get("taxonomy_id"):
            attrs["taxonomy_id"] = str(product["taxonomy_id"])
        return attrs
