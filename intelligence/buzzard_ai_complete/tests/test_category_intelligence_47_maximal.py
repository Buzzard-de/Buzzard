import json

from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.models import (
    BuzzNode,
    Category,
    Competitor,
    Feature,
    Finding,
    Node,
)
from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.store import (
    CategoryIntelligence47Store,
    norm,
)
from buzzard_ai_complete.category_intelligence_47_maximal.service import CategoryIntelligence47Service


def test_norm_skips_automotive_names():
    assert norm("Automotive KFZ") == "automotive kfz"


def test_store_import_skips_automotive(tmp_path):
    store = CategoryIntelligence47Store(tmp_path / "test.db")
    result = store.import_categories(
        [
            Category(code="bz.01", name="Automotive", level=1),
            Category(code="bz.02", name="Haus & Wohnen", level=1),
        ]
    )
    categories = store.list_categories()
    assert result["added"] == 1
    assert len(categories) == 1
    assert categories[0]["name"] == "Haus & Wohnen"


def test_store_analysis_and_competitor_flow(tmp_path):
    store = CategoryIntelligence47Store(tmp_path / "test.db")
    store.import_categories([Category(code="bz.02", name="Haus & Wohnen", level=1)])
    category_id = store.list_categories()[0]["id"]
    competitor_one = store.add_competitor(
        Competitor(category_id=category_id, rank=1, name="Otto", domain="otto.de", verified=True)
    )
    competitor_two = store.add_competitor(
        Competitor(category_id=category_id, rank=2, name="Amazon", domain="amazon.de", verified=True)
    )
    for competitor_id in (competitor_one["id"], competitor_two["id"]):
        store.add_node(
            Node(
                competitor_id=competitor_id,
                path="Wohnen > Textilien",
                verified=True,
                confidence=0.9,
            )
        )
    store.add_buzzard_node(BuzzNode(category_id=category_id, path="Wohnen > Möbel"))
    store.add_feature(Feature(competitor_id=competitor_one["id"], feature="free_shipping", present=True))
    store.add_finding(
        Finding(
            category_id=category_id,
            kind="taxonomy_gap",
            path="Wohnen > Textilien",
            title="Missing branch",
            score=80,
        )
    )

    analysis = store.analyze(category_id)
    summary = store.summary()

    assert analysis["competitors"] == 2
    assert analysis["coverage_pct"] == 10.0
    assert len(analysis["buzzard_missing_candidates"]) == 1
    assert summary["categories"] == 1
    assert summary["findings"] == 1


def test_service_health_and_manifest():
    service = CategoryIntelligence47Service()
    health = service.health()
    manifest = service.load_manifest()

    assert health["status"] == "category_intelligence_47_ready"
    assert health["target_categories"] == 47
    assert manifest["target_categories"] == 47
    assert len(manifest["categories"]) == 47
    assert manifest["console_html"] == "/taxonomy/buzzard_47_category_intelligence_os.html"


def test_service_demo_flow(tmp_path, monkeypatch):
    monkeypatch.setenv("BUZZARD_47_DB", str(tmp_path / "demo.db"))
    service = CategoryIntelligence47Service()
    demo = service.demo_flow()

    assert demo["health"]["target_categories"] == 47
    assert demo["category_count"] == 47
    assert demo["sample_category"] is not None
    assert demo["sample_analysis"]["competitors"] == 0
