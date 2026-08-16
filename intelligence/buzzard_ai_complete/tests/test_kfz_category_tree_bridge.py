from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService


def test_kfz_tree_loaded():
    service = AutomotiveTaxonomyService()
    summary = service.kfz_summary()
    assert summary["main_category_count"] == 43
    assert summary["subcategory_count"] == 454
    assert summary["shop_automotive_root_id"] == "cat-05"


def test_kfz_intelligence_os_loaded():
    service = AutomotiveTaxonomyService()
    summary = service.kfz_intelligence_summary()
    assert summary["main_category_count"] == 43
    assert summary["l3_count"] == 412
    assert summary["competitor_count"] == 8


def test_kfz_taxonomy_main_with_l3():
    service = AutomotiveTaxonomyService()
    main = service.kfz_taxonomy_main("01")
    assert main is not None
    assert main["name"] == "Motor"
    assert any(sub.get("children") for sub in main.get("subcategories", []))


def test_kfz_coverage():
    service = AutomotiveTaxonomyService()
    coverage = service.kfz_coverage("09")
    assert coverage.get("autodoc") == 1
    assert coverage.get("kfzteile24") == 1


def test_kfz_main_lookup():
    service = AutomotiveTaxonomyService()
    main = service.kfz_main("09")
    assert main is not None
    assert main["name_de"] == "Bremsanlage"
    assert main["shop_l2_id"] == "cat-05-03"


def test_kfz_shop_bridge():
    service = AutomotiveTaxonomyService()
    bridge = service.shop_bridge_for_kfz("16")
    assert bridge is not None
    assert bridge["shop_l2_slug"] == "reifen-und-felgen"


def test_intelligence_os_all_in_one_loaded():
    service = AutomotiveTaxonomyService()
    summary = service.intelligence_os_all_in_one_summary()
    assert summary["version"] == "2.0-all-in-one"
    assert summary["main_category_count"] == 43
    assert summary["l3_count"] == 412
    assert summary["competitor_count"] == 8
    assert summary["module_count"] == 12
    assert summary["demo_finding_count"] == 5
    assert summary["governance"]["human_approval_required"] is True
    data = service.load_intelligence_os_all_in_one()
    assert data["scoring_weights"]["demand"] == 0.2
    assert len(data["demo_findings"]) == 5


def test_intelligence_os_maximum_manifest_loaded():
    service = AutomotiveTaxonomyService()
    summary = service.intelligence_os_maximum_manifest_summary()
    assert summary["manifest"] == "maximum"
    assert summary["main_category_count"] == 43
    assert summary["agent_count"] == 43
    assert summary["agents_ready"] == 43
    assert summary["service_count"] == 24
    assert summary["schema_count"] == 3
    manifest = service.load_intelligence_os_maximum_manifest()
    assert manifest["agents"][0]["id"] == "CAT-01"
    assert "Source Registry" in manifest["services"]
    assert manifest["runtime_defaults"]["public_sources_only"] is True
