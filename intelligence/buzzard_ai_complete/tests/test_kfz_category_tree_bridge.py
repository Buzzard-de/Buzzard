from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService


def test_kfz_tree_loaded():
    service = AutomotiveTaxonomyService()
    summary = service.kfz_summary()
    assert summary["main_category_count"] == 43
    assert summary["subcategory_count"] == 454
    assert summary["shop_automotive_root_id"] == "cat-05"


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
