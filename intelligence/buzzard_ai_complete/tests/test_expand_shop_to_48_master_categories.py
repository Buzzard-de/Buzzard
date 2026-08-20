import json
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPTS.parent))

from scripts.expand_shop_to_48_master_categories import (  # noqa: E402
    expand_shop_to_48,
    pending_master_codes,
    slugify,
)


def test_slugify_german():
    assert slugify("Bettwäsche") == "bettwaesche"
    assert slugify("Sets & Sparpakete") == "sets-sparpakete"


def test_pending_master_codes_lists_unmapped_only():
    master = {
        "categories": [
            {"code": "bz.01", "name": "A", "slug": "a"},
            {"code": "bz.02", "name": "B", "slug": "b"},
            {"code": "bz.03", "name": "C", "slug": "c"},
        ]
    }
    pending = pending_master_codes(master, {"bz.01", "bz.03"})
    assert pending == ["bz.02"]


def test_expand_adds_all_pending_categories(tmp_path, monkeypatch):
    repo = tmp_path
    master = {
        "main_categories": 48,
        "categories": [
            {"num": i, "code": f"bz.{i:02d}", "name": f"Master {i:02d}", "slug": f"master-{i:02d}"}
            for i in range(1, 49)
        ],
    }
    mapping = {
        "schema": "buzzard.master-shop-l1-mapping.v1",
        "mappings": [
            {"shop_id": f"cat-{i:02d}", "master_code": f"bz.{i:02d}", "sync_name": True}
            for i in range(1, 46)
        ],
    }
    catalog = {
        "main_category_count": 45,
        "categories": [
            {
                "id": f"cat-{i:02d}",
                "menu_order": i,
                "name": f"Cat {i}",
                "slug": f"cat-{i}",
                "url": f"/kategorie/cat-{i}",
                "level": 1,
                "children": [],
            }
            for i in range(1, 46)
        ],
    }

    canonical = repo / "data/taxonomy/buzzard_master_48_main_categories_de.json"
    mapping_path = repo / "data/taxonomy/master_shop_l1_mapping.json"
    shop_path = repo / "data/buzzard_categories.json"
    for path in (canonical, mapping_path, shop_path):
        path.parent.mkdir(parents=True, exist_ok=True)
    canonical.write_text(json.dumps(master), encoding="utf-8")
    mapping_path.write_text(json.dumps(mapping), encoding="utf-8")
    shop_path.write_text(json.dumps(catalog), encoding="utf-8")

    import scripts.expand_shop_to_48_master_categories as module

    monkeypatch.setattr(module, "REPO", repo)
    monkeypatch.setattr(module, "CANONICAL", canonical)
    monkeypatch.setattr(module, "MAPPING_PATH", mapping_path)
    monkeypatch.setattr(module, "SHOP_CATALOG_PATH", shop_path)

    report = expand_shop_to_48(dry_run=False)
    updated_catalog = json.loads(shop_path.read_text(encoding="utf-8"))
    updated_mapping = json.loads(mapping_path.read_text(encoding="utf-8"))

    assert report["added_count"] == 3
    assert report["complete"] is True
    assert updated_catalog["main_category_count"] == 48
    assert len(updated_mapping["mappings"]) == 48
