from buzzard_ai_complete.master_taxonomy_clean_maximal.service import MasterTaxonomyCleanService


def test_manifest_modules():
    manifest = MasterTaxonomyCleanService().load_manifest()
    assert manifest["package"] == "BUZZARD_MASTER_TAXONOMY_CLEAN"
    assert set(manifest["modules"]) == {"automotive_tires", "agriculture", "livestock"}
    assert manifest["live_activation"] is False


def test_sales_defaults():
    defaults = MasterTaxonomyCleanService().load_sales_defaults()
    assert defaults["BUZZARD_SALES_ENABLED"] == 0
    assert defaults["live_activation"] is False
    assert defaults["require_source_for_fitment"] is True


def test_unified_health():
    health = MasterTaxonomyCleanService().health()
    assert health["status"] == "master_taxonomy_clean_ready"
    assert health["live_activation"] is False
    assert "automotive_tires" in health["domains"]
    assert "agriculture" in health["domains"]
    assert "livestock" in health["domains"]
    assert health["domains"]["automotive_tires"]["status"] == "maximal_automotive_taxonomy_ready"
    assert health["domains"]["agriculture"]["status"] == "maximal_agriculture_ready"
    assert health["domains"]["livestock"]["status"] == "maximal_livestock_ready"


def test_demo_flow():
    demo = MasterTaxonomyCleanService().demo_flow()
    assert demo["automotive_tires"]["tires_vehicle_types"] == 12
    assert demo["agriculture"]["branches"] >= 9
    assert demo["livestock"]["branches"] >= 9
