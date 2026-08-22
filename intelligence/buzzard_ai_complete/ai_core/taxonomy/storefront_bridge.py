from __future__ import annotations

from typing import Any

from buzzard_ai_complete.ai_core.taxonomy.legacy_bridge import resolve_legacy_category_id
from buzzard_ai_complete.master_taxonomy.unification import TaxonomyUnificationService


class StorefrontTaxonomyBridge:
    """Bridge storefront cat-{nn} identifiers to canonical bz.{nn} taxonomy ids."""

    def __init__(self) -> None:
        self._unification = TaxonomyUnificationService()

    def resolve(self, legacy_id: str, *, legacy_system: str = "shop") -> dict[str, Any]:
        raw = legacy_id.strip()
        bz_id = resolve_legacy_category_id(raw)
        if bz_id:
            storefront_id = self._to_storefront_id(raw, bz_id)
            return {
                "legacy_id": raw,
                "storefront_id": storefront_id,
                "taxonomy_id": bz_id,
                "mapping_source": "legacy_bridge",
            }

        resolution = self._unification.resolve(raw, legacy_system)
        canonical = resolution.get("canonical_id")
        if canonical:
            return {
                "legacy_id": raw,
                "storefront_id": self._to_storefront_id(raw, canonical),
                "taxonomy_id": canonical,
                "mapping_source": resolution.get("resolution_type", "unification"),
            }

        return {
            "legacy_id": raw,
            "storefront_id": None,
            "taxonomy_id": None,
            "mapping_source": "unresolved",
        }

    def map_storefront_to_taxonomy(self, storefront_id: str) -> str | None:
        return self.resolve(storefront_id).get("taxonomy_id")

    def map_taxonomy_to_storefront(self, taxonomy_id: str) -> str | None:
        if not taxonomy_id.startswith("bz."):
            return None
        number = taxonomy_id.split(".", 1)[1]
        return f"cat-{number.zfill(2)}"

    @staticmethod
    def _to_storefront_id(raw: str, taxonomy_id: str) -> str:
        if raw.startswith("cat-"):
            return raw
        if taxonomy_id.startswith("bz."):
            return f"cat-{taxonomy_id.split('.', 1)[1].zfill(2)}"
        return raw
