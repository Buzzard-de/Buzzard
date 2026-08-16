import json
from unittest.mock import patch

from buzzard_ai_complete.intelligence_pipeline.orchestrator import IntelligencePipelineOrchestrator


def test_pipeline_health():
    health = IntelligencePipelineOrchestrator().health()
    assert health["service"] == "intelligence-pipeline"
    assert health["status"] == "ready"
    assert health["stages"] == 12
    assert "kfz_automotive" in health["domains"]


def test_pipeline_stages():
    orchestrator = IntelligencePipelineOrchestrator()
    assert orchestrator.PIPELINE_STAGES[0] == "public_sources"
    assert orchestrator.PIPELINE_STAGES[-1] == "buzzard_master_taxonomy"
    assert len(orchestrator.INTELLIGENCE_LAYERS) == 7


@patch("live_connectors.public_fetch.PublicFetcher.fetch")
def test_pipeline_run_kfz_automotive(mock_fetch):
    mock_fetch.return_value = {
        "url": "https://example.test/",
        "status_code": 200,
        "bytes": 1024,
    }
    result = IntelligencePipelineOrchestrator().run(domain="kfz_automotive")

    assert result["domain"] == "kfz_automotive"
    assert len(result["stages"]) == 12
    assert result["results"]["public_sources"]["count"] == 7
    assert result["results"]["parser_normalizer"]["l3_count"] == 412
    assert result["results"]["canonical_category_resolver"]["resolved_count"] == 43
    assert result["results"]["opportunity_engine"]["count"] == 43
    assert result["results"]["human_approval"]["required"] is True
    assert result["results"]["buzzard_master_taxonomy"]["shop_root_id"] == "cat-05"
    assert result["results"]["buzzard_master_taxonomy"]["console_html"] == (
        "/taxonomy/buzzard_intelligence_os_maximum_single_file.html"
    )
    assert result["results"]["buzzard_master_taxonomy"]["manifest_path"] == (
        "/taxonomy/buzzard_intelligence_os_maximum_manifest.json"
    )
    assert result["results"]["buzzard_master_taxonomy"]["business_manifest_path"] == (
        "/taxonomy/buzzard_master_business_os_maximum_manifest.json"
    )
    assert result["results"]["buzzard_master_taxonomy"]["business_console_html"] == (
        "/taxonomy/buzzard_master_business_os_final_100_single_file.html"
    )
    assert result["results"]["buzzard_master_taxonomy"]["business_console_maximum_html"] == (
        "/taxonomy/buzzard_master_business_os_maximum_single_file.html"
    )


def test_pipeline_config_loads():
    orchestrator = IntelligencePipelineOrchestrator()
    config = orchestrator.config
    assert config["name"] == "Buzzard Intelligence Pipeline"
    assert config["rules"]["sales_enabled"] is False
    domain = config["domains"]["kfz_automotive"]
    assert len(domain["competitor_sources"]) == 8
    assert json.loads(json.dumps(domain)) == domain
