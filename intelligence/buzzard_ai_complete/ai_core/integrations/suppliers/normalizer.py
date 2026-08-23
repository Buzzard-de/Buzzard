from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.integrations.suppliers.security import sanitize_text


class SupplierNormalizer:
    """Normalize raw supplier records into canonical product dicts."""

    REQUIRED_FIELDS = ("sku", "name")

    def normalize_record(self, raw: dict[str, Any], *, supplier_id: str) -> dict[str, Any]:
        sku = sanitize_text(str(raw.get("sku") or raw.get("SKU") or raw.get("article_number") or ""))
        name = sanitize_text(str(raw.get("name") or raw.get("title") or raw.get("product_name") or ""))
        if not sku or not name:
            raise ValueError("supplier record missing required sku or name")

        category_raw = raw.get("category_id") or raw.get("category") or raw.get("cat_id")
        return {
            "sku": sku,
            "name": name,
            "supplier_id": supplier_id,
            "description": sanitize_text(str(raw.get("description") or ""), max_length=8192),
            "brand": sanitize_text(str(raw.get("brand") or ""), max_length=256),
            "price": self._parse_price(raw.get("price") or raw.get("net_price")),
            "currency": sanitize_text(str(raw.get("currency") or "EUR"), max_length=8),
            "stock_qty": self._parse_int(raw.get("stock_qty") or raw.get("stock") or raw.get("quantity")),
            "category_raw": sanitize_text(str(category_raw), max_length=64) if category_raw else None,
            "ean": sanitize_text(str(raw.get("ean") or raw.get("gtin") or ""), max_length=32) or None,
            "metadata": {
                k: sanitize_text(str(v), max_length=512)
                for k, v in raw.items()
                if k not in {"sku", "SKU", "name", "title", "description"}
            },
        }

    def normalize_batch(self, records: list[dict[str, Any]], *, supplier_id: str) -> tuple[list[dict[str, Any]], list[str]]:
        normalized: list[dict[str, Any]] = []
        errors: list[str] = []
        for index, record in enumerate(records):
            try:
                normalized.append(self.normalize_record(record, supplier_id=supplier_id))
            except ValueError as exc:
                errors.append(f"row {index}: {exc}")
        return normalized, errors

    @staticmethod
    def _parse_price(value: Any) -> float | None:
        if value is None or value == "":
            return None
        try:
            return round(float(str(value).replace(",", ".")), 4)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _parse_int(value: Any) -> int | None:
        if value is None or value == "":
            return None
        try:
            return int(float(str(value)))
        except (TypeError, ValueError):
            return None
