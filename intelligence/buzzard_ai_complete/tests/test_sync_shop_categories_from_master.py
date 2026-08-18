import json
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS.parent))

from scripts.sync_shop_categories_from_master import (  # noqa: E402
    find_shop_l1,
    master_by_code,
    sync_shop,
)


def test_master_by_code_indexes_categories():
    payload = {
        "categories": [
            {"code": "bz.01", "name": "Automotive & Kfz", "slug": "automotive-kfz"},
            {"code": "bz.18", "name": "Schuhe", "slug": "schuhe"},
        ]
    }
    indexed = master_by_code(payload)
    assert indexed["bz.01"]["name"] == "Automotive & Kfz"
    assert indexed["bz.18"]["slug"] == "schuhe"


def test_find_shop_l1_returns_root_node():
    catalog = {"categories": [{"id": "cat-05", "name": "Automotive"}, {"id": "cat-06", "name": "Haustier"}]}
    node = find_shop_l1(catalog, "cat-05")
    assert node is not None
    assert node["name"] == "Automotive"
    assert find_shop_l1(catalog, "cat-99") is None


def test_sync_shop_dry_run_reports_without_writing(tmp_path, monkeypatch):
    repo = tmp_path
    master = {
        "main_categories": 48,
        "categories": [
            {"num": 1, "code": "bz.01", "name": "Automotive & Kfz", "slug": "automotive-kfz"},
            {"num": 18, "code": "bz.18", "name": "Schuhe", "slug": "schuhe"},
        ],
    }
    mapping = {
        "schema": "buzzard.master-shop-l1-mapping.v1",
        "mappings": [
            {"shop_id": "cat-05", "master_code": "bz.01", "sync_name": True},
            {"shop_id": "cat-15", "master_code": "bz.18", "sync_name": True},
        ],
    }
    catalog = {
        "categories": [
            {"id": "cat-05", "name": "Automotive", "slug": "automotive", "url": "/kategorie/automotive"},
            {"id": "cat-15", "name": "Schuhe", "slug": "schuhe", "url": "/kategorie/schuhe"},
        ]
    }

    canonical = repo / "data/taxonomy/buzzard_master_48_main_categories_de.json"
    mapping_path = repo / "data/taxonomy/master_shop_l1_mapping.json"
    shop_path = repo / "data/buzzard_categories.json"
    report_path = repo / "data/taxonomy/taxonomy_auto_sync_report.json"
    for path in (canonical, mapping_path, shop_path):
        path.parent.mkdir(parents=True, exist_ok=True)
    canonical.write_text(json.dumps(master), encoding="utf-8")
    mapping_path.write_text(json.dumps(mapping), encoding="utf-8")
    shop_path.write_text(json.dumps(catalog), encoding="utf-8")

    import scripts.sync_shop_categories_from_master as module

    monkeypatch.setattr(module, "REPO", repo)
    monkeypatch.setattr(module, "CANONICAL", canonical)
    monkeypatch.setattr(module, "MAPPING_PATH", mapping_path)
    monkeypatch.setattr(module, "SHOP_CATALOG_PATH", shop_path)
    monkeypatch.setattr(module, "REPORT_PATH", report_path)

    before = shop_path.read_text(encoding="utf-8")
    report = sync_shop(dry_run=True)
    after = shop_path.read_text(encoding="utf-8")

    assert before == after
    assert report["dry_run"] is True
    assert report["updated_count"] == 2
    renamed = [row for row in report["updated"] if "name" in row["changes"]]
    assert len(renamed) == 1
    assert renamed[0]["shop_id"] == "cat-05"
    assert renamed[0]["name_after"] == "Automotive & Kfz"
    assert report["unmapped_master_count"] == 0
