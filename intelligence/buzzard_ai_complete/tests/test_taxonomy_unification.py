from buzzard_ai_complete.master_taxonomy.unification import TaxonomyUnificationService


def test_canonical_integrity():
    service = TaxonomyUnificationService()
    data = service.load_canonical()
    nodes = data["nodes"]
    assert data["master_root_count"] == 43
    roots = [node for node in nodes if node["level"] == 1]
    assert len(roots) == 43
    ids = {node["id"] for node in nodes}
    assert len(ids) == len(nodes)
    assert len({node["slug"] for node in nodes}) == len(nodes)
    assert all(node["parent_id"] is None or node["parent_id"] in ids for node in nodes)


def test_resolve_shop_cat_id():
    service = TaxonomyUnificationService()
    result = service.resolve("cat-01", "shop")
    assert result["resolved"] is True
    assert result["canonical_id"] == "bz.01"


def test_resolve_intelligence_id():
    service = TaxonomyUnificationService()
    result = service.resolve("01", "intelligence")
    assert result["resolved"] is True
    assert result["canonical_id"] == "bz.01"


def test_shop_41_maps_to_bz_43():
    service = TaxonomyUnificationService()
    result = service.resolve("cat-41", "shop")
    assert result["resolved"] is True
    assert result["canonical_id"] == "bz.43"
