import json

import pytest

from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.evidence import (
    CategoryIntelligence47EvidenceLayer,
)
from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.models import (
    BuzzNode,
    Category,
    Competitor,
    EvidenceIn,
    Feature,
    Finding,
    Node,
    ReviewIn,
)
from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.research import (
    CategoryIntelligence47ResearchLayer,
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


def test_service_final_100_single_file():
    service = CategoryIntelligence47Service()
    summary = service.final_100_single_file_summary()

    assert summary["console_html"] == "/taxonomy/buzzard_47_category_intelligence_os_final_100_single_file.html"
    assert summary["html_exists"] is True
    assert summary["finalization"]["software_scope_percent"] == 100
    assert summary["finalization"]["status"] in (
        "FINAL_SOFTWARE_SCOPE_LOCKED",
        "FINAL_MAX_ORCHESTRATION_LOCKED",
    )


def test_service_max_final_single_file():
    service = CategoryIntelligence47Service()
    summary = service.max_final_single_file_summary()

    assert summary["console_html"] == "/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html"
    assert summary["html_exists"] is True
    assert "modules" in summary["engine"]


def test_service_max_single_final_single_file():
    service = CategoryIntelligence47Service()
    summary = service.max_single_final_single_file_summary()

    assert summary["console_html"] == "/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html"
    assert summary["primary_console_html"] == "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html"
    assert summary["html_exists"] is True
    assert summary["finalization"]["software_scope_percent"] == 100


def test_service_demo_flow(tmp_path, monkeypatch):
    monkeypatch.setenv("BUZZARD_47_DB", str(tmp_path / "demo.db"))
    service = CategoryIntelligence47Service()
    demo = service.demo_flow()

    assert demo["health"]["target_categories"] == 47
    assert demo["category_count"] == 47
    assert demo["sample_category"] is not None
    assert demo["sample_analysis"]["competitors"] == 0


def test_evidence_verify_workflow(tmp_path):
    store = CategoryIntelligence47Store(tmp_path / "evidence.db")
    evidence = CategoryIntelligence47EvidenceLayer(store)
    store.import_categories([Category(code="bz.02", name="Haus & Wohnen", level=1)])
    category_id = store.list_categories()[0]["id"]
    competitor = store.add_competitor(
        Competitor(category_id=category_id, rank=1, name="Otto", domain="otto.de")
    )
    competitor_id = competitor["id"]

    added = evidence.add_evidence(
        EvidenceIn(
            competitor_id=competitor_id,
            category_id=category_id,
            evidence_type="website",
            url="https://www.otto.de",
            title="Otto homepage",
            confidence=0.9,
        )
    )
    assert added["status"] == "PENDING"

    with pytest.raises(PermissionError):
        evidence.verify_competitor(competitor_id)

    evidence.review_evidence(
        ReviewIn(evidence_id=added["evidence_id"], reviewer="qa", approved=True, note="ok")
    )
    verified = evidence.verify_competitor(competitor_id)
    assert verified["status"] == "VERIFIED"
    assert verified["approved_evidence"] == 1

    dashboard = evidence.verification_dashboard()
    assert dashboard["verified_competitors"] == 1
    assert dashboard["evidence_approved"] == 1


def test_research_matrix_import(tmp_path):
    store = CategoryIntelligence47Store(tmp_path / "research.db")
    store.import_categories([Category(code="bz.02", name="Haus & Wohnen", level=1)])
    matrix_path = tmp_path / "matrix.json"
    matrix_path.write_text(
        json.dumps(
            {
                "research_rows": [
                    {
                        "category_code": "bz.02",
                        "rank": 1,
                        "competitor": "Otto",
                        "domain": "otto.de",
                        "type": "MARKETPLACE",
                        "notes": "candidate",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    research = CategoryIntelligence47ResearchLayer(store, matrix_path)
    result = research.import_candidate_matrix()
    assert result["imported"] == 1
    competitors = store.list_competitors(store.list_categories()[0]["id"])
    assert competitors[0]["name"] == "Otto"
    assert competitors[0]["status"] == "CANDIDATE"


def test_service_final_max_single_file():
    service = CategoryIntelligence47Service()
    summary = service.final_max_single_file_summary()

    assert summary["console_html"] == "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html"
    assert "orchestration" in summary or summary.get("html_exists") is not None


def test_turkish_48_main_categories_config():
    service = CategoryIntelligence47Service()
    categories = service.category_definitions()
    assert len(categories) == 47
    assert categories[0]["code"] == "bz.02"
    assert categories[0]["name"] == "Bahçe & Bahçecilik"
    assert categories[-1]["code"] == "bz.48"
    assert categories[-1]["name"] == "Genel Ürünler & Marketplace"


def test_final_manifest():
    service = CategoryIntelligence47Service()
    manifest = service.load_final_manifest()
    summary = service.final_manifest_summary()

    assert manifest["name"] == "BUZZARD FINAL 47 CATEGORY INTELLIGENCE OS"
    assert manifest["version"] == "MAX-FINAL-1.0"
    assert manifest["scope"]["research_categories"] == 47
    assert manifest["scope"]["competitor_target"] == 940
    assert len(manifest["pipeline"]) == 11
    assert "content_hash" in manifest["evidence_fields"]
    assert summary["api_prefix"] == "/category-intelligence-47"
    assert summary["primary_console_html"] == "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html"
