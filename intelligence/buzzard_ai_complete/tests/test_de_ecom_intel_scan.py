from buzzard_ai_complete.operations.de_ecom_intel_scan import (
    OPERATION_CODE,
    PUBLIC_PRICE_BENCHMARKS,
    run_de_ecom_intel_scan,
)


def test_de_ecom_intel_scan_structure():
    result = run_de_ecom_intel_scan()
    assert result["operation"] == OPERATION_CODE
    assert result["sprache"] == "de"
    assert result["category_intelligence_43"]["prioritaets_kategorien_gescannt"] == 6
    assert len(result["preisbenchmark"]["products"]) == len(PUBLIC_PRICE_BENCHMARKS)
    assert result["live_connectors"]["connector_count"] == 4
    assert "google_ads" in result
    assert "preis_quelle" in result
    assert result["preis_quelle"]["modus"] in {"multi_live", "ebay_live", "amazon_live", "oeffentliche_benchmarks"}
    assert len(result["hinweise"]) >= 2
