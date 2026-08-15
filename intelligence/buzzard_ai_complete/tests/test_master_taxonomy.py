from buzzard_ai_complete.master_taxonomy.service import TAXONOMY_JSON


def test_taxonomy_integrity():
    import json

    data = json.loads(TAXONOMY_JSON.read_text(encoding="utf-8"))
    nodes = data["nodes"]
    assert data["master_category_count"] == 43
    assert len([node for node in nodes if node["level"] == 1]) == 43
    assert len({node["id"] for node in nodes}) == len(nodes)
    assert len({node["slug"] for node in nodes}) == len(nodes)
    ids = {node["id"] for node in nodes}
    for node in nodes:
        if node["parent_id"]:
            assert node["parent_id"] in ids


def test_taxonomy_service_search_and_path():
    from buzzard_ai_complete.master_taxonomy.service import MasterTaxonomyService

    service = MasterTaxonomyService()
    snapshot = service.snapshot()
    assert snapshot["master_category_count"] == 43
    assert snapshot["total_nodes"] == 1198
    results = service.search("motor")
    assert results
    path = service.path("01.01.01")
    assert path[0]["id"] == "01"
    assert path[-1]["id"] == "01.01.01"
