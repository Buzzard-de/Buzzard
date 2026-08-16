from pathlib import Path

from buzzard_ai_complete.operations.de_ecom_intel_scan import (
    OPERATION_CODE,
    PUBLIC_PRICE_BENCHMARKS,
    export_de_ecom_intel_scan,
    run_de_ecom_intel_scan,
)


from buzzard_ai_complete.operations.de_ecom_intel_scan import (
    OPERATION_CODE,
    PUBLIC_PRICE_BENCHMARKS,
    export_de_ecom_intel_scan,
    run_de_ecom_intel_scan,
)


def test_de_ecom_intel_scan_structure(tmp_path):
    result = run_de_ecom_intel_scan(auto_export=True, export_base=tmp_path / "scans")
    assert result["operation"] == OPERATION_CODE
    assert result["sprache"] == "de"
    assert result["category_intelligence_43"]["prioritaets_kategorien_gescannt"] == 6
    assert result["category_intelligence_43"]["council_findings"] == 6
    assert len(result["preisbenchmark"]["products"]) == len(PUBLIC_PRICE_BENCHMARKS)
    assert result["live_connectors"]["connector_count"] == 4
    assert "google_ads" in result
    assert "preis_quelle" in result
    assert result["preis_quelle"]["modus"] in {"multi_live", "ebay_live", "amazon_live", "oeffentliche_benchmarks"}
    assert len(result["hinweise"]) >= 2
    assert "export" in result
    assert (tmp_path / "scans" / "latest" / "scan.json").is_file()


def test_de_ecom_intel_export_creates_folder(tmp_path):
    export = export_de_ecom_intel_scan(
        output_dir=tmp_path / "export",
        run_scan=True,
        create_zip=True,
    )
    export_dir = tmp_path / "export"
    assert export_dir.is_dir()
    assert (export_dir / "scan.json").is_file()
    assert (export_dir / "bericht.md").is_file()
    assert (export_dir / "README.md").is_file()
    assert (export_dir / "category_intelligence_43").is_dir()
    assert export["zip"] and Path(export["zip"]).is_file()
