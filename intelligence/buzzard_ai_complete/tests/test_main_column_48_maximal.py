from buzzard_ai_complete.main_column_48_maximal.main_column.engine import (
    MainColumnCategoryEngine,
)
from buzzard_ai_complete.main_column_48_maximal.service import MainColumn48Service
from buzzard_ai_complete.master_taxonomy_48_maximal.service import MasterTaxonomy48Service


def test_counts():
    assert MainColumnCategoryEngine().counts() == {
        "main_categories": 48,
        "subcategories": 796,
        "sub_subcategories": 6411,
        "total_nodes": 7255,
    }


def test_integrity():
    assert MainColumnCategoryEngine().validate()


def test_search():
    hits = MainColumnCategoryEngine().search("vinç")
    assert hits
    assert all("main" in hit and "sub" in hit and "leaf" in hit for hit in hits)


def test_tire_main_category():
    tire = MainColumnCategoryEngine().get_main("bz.44")
    assert tire is not None
    assert tire["name"] == "Heizung, Klima & Energie"
    assert len(tire["children"]) == 52


def test_service_health():
    health = MainColumn48Service().health()
    assert health["status"] == "main_column_48_ready"
    assert health["main_categories"] == 48
    assert health["live_activation"] is False
    assert health["BUZZARD_SALES_ENABLED"] == 0


def test_main_names_match_master_taxonomy():
    column_names = [n["name"] for n in MainColumnCategoryEngine().main_categories()]
    master_names = [n["name"] for n in MasterTaxonomy48Service().list_main_categories()]
    assert column_names == master_names


def test_demo_flow():
    demo = MainColumn48Service().demo_flow()
    assert demo["integrity"] is True
    assert demo["tire_category"]["subcategories"] == 52
    assert demo["search_vinç"]
