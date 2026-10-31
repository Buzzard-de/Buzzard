"""Buzzard AI Core taxonomy package."""

from buzzard_ai_complete.ai_core.taxonomy.legacy_bridge import resolve_legacy_category_id
from buzzard_ai_complete.ai_core.taxonomy.loader import TaxonomyDocument, TaxonomyNode, load_taxonomy
from buzzard_ai_complete.ai_core.taxonomy.registry import TaxonomyRegistry

__all__ = [
    "TaxonomyDocument",
    "TaxonomyNode",
    "TaxonomyRegistry",
    "load_taxonomy",
    "resolve_legacy_category_id",
]
