#!/usr/bin/env python3
"""Synchronisiert Category Intelligence 47 mit Master Taxonomy 48 (ohne Automotive)."""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TAXONOMY_PATH = (
    REPO_ROOT
    / "intelligence"
    / "buzzard_ai_complete"
    / "master_taxonomy_48_maximal"
    / "data"
    / "taxonomy.json"
)
CONFIG_PATH = (
    REPO_ROOT
    / "intelligence"
    / "buzzard_ai_complete"
    / "category_intelligence_47_maximal"
    / "config"
    / "category_intelligence_47.production.json"
)
MANIFEST_PATH = REPO_ROOT / "data" / "taxonomy" / "buzzard_47_category_intelligence_os.json"
EXCLUDED_CODES = {"bz.01", "01"}
EXCLUDED_SLUGS = {"automotive", "kfz", "otomotiv-kfz"}


def build_categories() -> list[dict]:
    taxonomy = json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))
    rows = []
    for node in taxonomy.get("nodes", []):
        if node.get("level") != 1 or node.get("parent_id") is not None:
            continue
        slug = (node.get("slug") or "").split("/")[0].lower()
        name = node.get("name", "")
        code = node.get("id", "")
        if code in EXCLUDED_CODES or slug in EXCLUDED_SLUGS or name.lower() in {"automotive", "kfz", "otomotiv & kfz"}:
            continue
        rows.append(
            {
                "code": node["id"],
                "name": name,
                "parent_id": None,
                "level": 1,
                "source": "master_taxonomy_48",
            }
        )
    return rows


def main() -> None:
    categories = build_categories()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    config["category_count"] = len(categories)
    config["categories"] = categories
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    manifest = {
        "name": "Buzzard 47 Category Intelligence OS",
        "version": config.get("version", "1.0"),
        "scope": "47 non-Kfz categories",
        "target_categories": len(categories),
        "target_competitors": config.get("target_competitors", 940),
        "competitors_per_category": 20,
        "evidence_required": True,
        "console_html": "/taxonomy/buzzard_47_category_intelligence_os.html",
        "api_prefix": "/category-intelligence-47",
        "categories": categories,
    }
    if MANIFEST_PATH.is_file():
        existing = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        for key in (
            "primary_console_html",
            "final_max_console_html",
            "final_manifest_json",
            "research_matrix_json",
            "engine",
            "orchestration",
            "finalization",
            "pipeline",
            "scope_detail",
            "verification_policy_text",
            "evidence_fields",
            "taxonomy_depth",
            "outputs",
            "research_basis",
        ):
            if key in existing:
                manifest[key] = existing[key]
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_manifest = REPO_ROOT / "public" / "taxonomy" / "buzzard_47_category_intelligence_os.json"
    public_manifest.parent.mkdir(parents=True, exist_ok=True)
    public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK: {len(categories)} Kategorien → {CONFIG_PATH}")
    print(f"OK: manifest → {MANIFEST_PATH}")

    build_script = REPO_ROOT / "intelligence" / "scripts" / "build_category_intelligence_47_final_100.py"
    if build_script.is_file():
        import subprocess
        import sys

        subprocess.run([sys.executable, str(build_script)], check=True)


if __name__ == "__main__":
    main()
