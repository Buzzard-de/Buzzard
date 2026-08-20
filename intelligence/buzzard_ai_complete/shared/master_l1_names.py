"""Kanonische deutsche L1-Namen aus buzzard_master_48_main_categories_de.json."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CANONICAL_PATH = REPO_ROOT / "data" / "taxonomy" / "buzzard_master_48_main_categories_de.json"


@lru_cache(maxsize=1)
def load_master_l1_by_code() -> dict[str, dict[str, str]]:
    payload = json.loads(CANONICAL_PATH.read_text(encoding="utf-8"))
    return {
        item["code"]: {"name": item["name"], "slug": item["slug"]}
        for item in payload["categories"]
    }


def overlay_main_category(node: dict) -> dict:
    canonical = load_master_l1_by_code().get(node["id"])
    if not canonical:
        return node
    return {**node, "name": canonical["name"], "slug": canonical["slug"]}
