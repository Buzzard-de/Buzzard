from buzzard_ai_complete.master_taxonomy_48_maximal.service import MasterTaxonomy48Service
from buzzard_ai_complete.smart_menu_48_maximal.service import SmartMenu48Service
from buzzard_ai_complete.smart_menu_48_maximal.smart_menu.engine import SmartMegaMenuEngine


def test_counts():
    assert SmartMegaMenuEngine().counts() == {
        "main_categories": 48,
        "subcategories": 796,
        "sub_subcategories": 6411,
        "total_nodes": 7255,
    }


def test_signal_counts():
    signals = SmartMegaMenuEngine().signal_counts()
    assert signals["subcategories_with_signals"] == 796
    assert signals["popular_entries"] >= 796 * 2
    assert signals["product_entries"] == 796 * 3


def test_integrity():
    assert SmartMegaMenuEngine().validate()


def test_signals_structure():
    signals = SmartMegaMenuEngine().get_signals("bz.01.01")
    assert len(signals["popular"]) == 3
    assert signals["brands"]
    assert len(signals["products"]) == 3
    assert {p["label"] for p in signals["products"]} == {"Bestseller", "Angebot", "Neu"}


def test_search():
    hits = SmartMegaMenuEngine().search("motor")
    assert hits


def test_service_health():
    health = SmartMenu48Service().health()
    assert health["status"] == "smart_menu_48_ready"
    assert health["merchandising_signals"] == "demo"
    assert health["live_activation"] is False
    assert health["BUZZARD_SALES_ENABLED"] == 0


def test_main_names_match_master_taxonomy():
    menu_names = [n["name"] for n in SmartMegaMenuEngine().main_categories()]
    master_names = [n["name"] for n in MasterTaxonomy48Service().list_main_categories()]
    assert menu_names == master_names


def test_demo_flow():
    demo = SmartMenu48Service().demo_flow()
    assert demo["integrity"] is True
    assert demo["sample_subcategory"]["signals"]["popular"]
