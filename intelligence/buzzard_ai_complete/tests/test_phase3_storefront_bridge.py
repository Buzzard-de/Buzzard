"""Phase 3 Wave 2 storefront taxonomy bridge tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.taxonomy.storefront_bridge import StorefrontTaxonomyBridge


def test_cat_to_bz_mapping():
    bridge = StorefrontTaxonomyBridge()
    result = bridge.resolve("cat-01")
    assert result["taxonomy_id"] == "bz.01"
    assert result["storefront_id"] == "cat-01"


def test_bz_to_storefront_mapping():
    bridge = StorefrontTaxonomyBridge()
    assert bridge.map_taxonomy_to_storefront("bz.15") == "cat-15"


def test_legacy_c01_alias():
    bridge = StorefrontTaxonomyBridge()
    result = bridge.resolve("c01")
    assert result["taxonomy_id"] == "bz.01"
