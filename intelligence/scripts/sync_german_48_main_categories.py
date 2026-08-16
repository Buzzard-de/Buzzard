#!/usr/bin/env python3
"""Synchronisiert die deutschen 48 Hauptkategorien in Taxonomie und Category Intelligence 47."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CANONICAL = REPO / "data/taxonomy/buzzard_master_48_main_categories_de.json"
CONFIG_PATH = (
    REPO
    / "intelligence/buzzard_ai_complete/category_intelligence_47_maximal/config/category_intelligence_47.production.json"
)
MANIFEST_PATH = REPO / "data/taxonomy/buzzard_47_category_intelligence_os.json"
TAXONOMY_PATH = REPO / "intelligence/buzzard_ai_complete/master_taxonomy_48_maximal/data/taxonomy.json"
MAIN_LIST_PATH = (
    REPO / "intelligence/buzzard_ai_complete/master_taxonomy_48_maximal/docs/48_MAIN_CATEGORIES.txt"
)
KFZ_CODE = "bz.01"


def load_canonical() -> dict:
    return json.loads(CANONICAL.read_text(encoding="utf-8"))


def research_categories(payload: dict) -> list[dict]:
    rows = []
    for item in payload["categories"]:
        if item.get("kfz_benchmark") or item["code"] == KFZ_CODE:
            continue
        rows.append(
            {
                "code": item["code"],
                "name": item["name"],
                "parent_id": None,
                "level": 1,
                "source": "master_taxonomy_48_de",
            }
        )
    return rows


def update_config(categories: list[dict]) -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    config["categories"] = categories
    config["category_count"] = len(categories)
    config["main_categories_json_path"] = "data/taxonomy/buzzard_master_48_main_categories_de.json"
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_main_list(payload: dict) -> None:
    lines = []
    for item in payload["categories"]:
        lines.append(f"{item['num']:02d}. {item['name']}")
    MAIN_LIST_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def update_taxonomy_l1(payload: dict) -> None:
    taxonomy = json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))
    by_code = {item["code"]: item for item in payload["categories"]}
    updated = 0
    for node in taxonomy.get("nodes", []):
        if node.get("level") != 1 or node.get("parent_id") is not None:
            continue
        item = by_code.get(node["id"])
        if not item:
            continue
        if node.get("name") != item["name"]:
            node["name"] = item["name"]
            updated += 1
        if node.get("slug") != item["slug"]:
            node["slug"] = item["slug"]
            updated += 1
    TAXONOMY_PATH.write_text(json.dumps(taxonomy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK: Taxonomie L1 aktualisiert ({updated} Feldänderungen)")


def update_manifest(categories: list[dict], payload: dict) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8")) if MANIFEST_PATH.is_file() else {}
    manifest["categories"] = categories
    manifest["target_categories"] = len(categories)
    manifest["scope"] = "47 Nicht-Kfz-Kategorien (Deutsche Master-Taxonomie 48)"
    manifest["main_categories_locale"] = payload.get("locale", "de")
    manifest["main_categories_json"] = "/taxonomy/buzzard_master_48_main_categories_de.json"
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_manifest = REPO / "public/taxonomy/buzzard_47_category_intelligence_os.json"
    public_manifest.parent.mkdir(parents=True, exist_ok=True)
    public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def copy_canonical_public() -> None:
    public_path = REPO / "public/taxonomy/buzzard_master_48_main_categories_de.json"
    public_path.parent.mkdir(parents=True, exist_ok=True)
    public_path.write_text(CANONICAL.read_text(encoding="utf-8"), encoding="utf-8")


def run_builds() -> None:
    for script_name in (
        "build_category_intelligence_47_max_final.py",
        "build_category_intelligence_47_max_single_final.py",
        "build_category_intelligence_47_final_max.py",
    ):
        script = REPO / "intelligence/scripts" / script_name
        if script.is_file():
            subprocess.run([sys.executable, str(script)], check=True)


def main() -> None:
    payload = load_canonical()
    categories = research_categories(payload)
    update_config(categories)
    update_main_list(payload)
    update_taxonomy_l1(payload)
    update_manifest(categories, payload)
    copy_canonical_public()
    run_builds()
    print(f"OK: {len(categories)} Recherche-Kategorien → {CONFIG_PATH}")
    print(f"OK: kanonisch → {CANONICAL}")


if __name__ == "__main__":
    main()
