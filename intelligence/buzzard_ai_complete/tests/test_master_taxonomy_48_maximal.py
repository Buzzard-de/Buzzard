from buzzard_ai_complete.master_taxonomy_48_maximal.master_taxonomy.engine import (
    BuzzardMasterTaxonomy,
)
from buzzard_ai_complete.master_taxonomy_48_maximal.service import MasterTaxonomy48Service


def test_counts():
    assert BuzzardMasterTaxonomy().counts() == {
        "main_categories": 48,
        "subcategories": 796,
        "sub_subcategories": 6411,
        "total_nodes": 7255,
    }


def test_integrity():
    assert BuzzardMasterTaxonomy().validate()


def test_new_categories():
    taxonomy = BuzzardMasterTaxonomy()
    for name in [
        "Heizung, Klima & Energie",
        "Pool, Spa & Wellness-Ausstattung",
        "Saisonale & Festtagsartikel",
        "Luxus, Sammlerstücke & Wertvolles",
        "Allgemeine Produkte & Marktplatz",
    ]:
        assert taxonomy.search(name)


def test_tire_children():
    assert len(BuzzardMasterTaxonomy().children("bz.44")) == 52


def test_service_health():
    health = MasterTaxonomy48Service().health()
    assert health["status"] == "master_taxonomy_48_ready"
    assert health["main_categories"] == 48
    assert health["total_nodes"] == 7255
    assert health["live_activation"] is False
    assert health["BUZZARD_SALES_ENABLED"] == 0


def test_service_counts_json():
    counts = MasterTaxonomy48Service().load_counts()
    assert counts["legacy_43"]["main_categories"] == 43
    assert counts["new_5"]["main_categories"] == 5


def test_demo_flow():
    demo = MasterTaxonomy48Service().demo_flow()
    assert demo["integrity"] is True
    assert demo["tire_children"] == 52
    assert all(demo["new_five_categories"].values())
