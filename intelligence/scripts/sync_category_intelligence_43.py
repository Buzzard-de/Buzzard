#!/usr/bin/env python3
"""Synchronisiert Category Intelligence 43 mit data/buzzard_categories.json."""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "data" / "buzzard_categories.json"
CONFIG_PATH = (
    REPO_ROOT
    / "intelligence"
    / "buzzard_ai_complete"
    / "category_intelligence_43_maximal"
    / "config"
    / "category_intelligence.production.json"
)

EXTRA_CATEGORIES = [
    {
        "category_id": "CATEGORY_42",
        "buzzard_id": "meta-42",
        "name": "Marktplatz-Integration",
    },
    {
        "category_id": "CATEGORY_43",
        "buzzard_id": "meta-43",
        "name": "Lieferanten-Intelligence",
    },
]


def build_categories() -> list[dict[str, str]]:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    rows = []
    for index, category in enumerate(catalog["categories"], start=1):
        rows.append(
            {
                "category_id": f"CATEGORY_{index:02d}",
                "buzzard_id": category["id"],
                "name": category["name"],
            }
        )
    rows.extend(EXTRA_CATEGORIES)
    return rows


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    categories = build_categories()
    config["agent_count"] = len(categories)
    config["categories"] = categories
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK: {len(config['categories'])} Kategorien → {CONFIG_PATH}")


if __name__ == "__main__":
    main()
