#!/usr/bin/env python3
"""Erweitert den Shop-Katalog um fehlende Master-L1-Kategorien (41 → 48)."""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CANONICAL = REPO / "data/taxonomy/buzzard_master_48_main_categories_de.json"
MAPPING_PATH = REPO / "data/taxonomy/master_shop_l1_mapping.json"
SHOP_CATALOG_PATH = REPO / "data/buzzard_categories.json"

# 7 fehlende Master-L1 (48 Master − 41 Shop) — priorisiert nach Master-Nummer
EXPAND_MASTER_CODES = [
    "bz.08",  # Heimtextilien
    "bz.20",  # Schmuck & Uhren
    "bz.22",  # Körperpflege
    "bz.24",  # Apotheke & Medizinprodukte
    "bz.26",  # Getränke
    "bz.28",  # Kinder & Schule
    "bz.33",  # Musik & Musikinstrumente
]

L3_NAMES = ["Standard", "Premium", "Sets & Sparpakete"]

SCAFFOLD_L2: dict[str, list[str]] = {
    "bz.08": [
        "Bettwäsche",
        "Handtücher & Badtextilien",
        "Gardinen & Vorhänge",
        "Teppiche & Läufer",
    ],
    "bz.20": [
        "Uhren",
        "Ringe",
        "Ketten & Anhänger",
        "Ohrschmuck",
    ],
    "bz.22": [
        "Haarpflege",
        "Zahnpflege",
        "Rasur & Enthaarung",
        "Deodorants & Körperhygiene",
    ],
    "bz.24": [
        "Medizinprodukte",
        "Erste Hilfe",
        "Nahrungsergänzung",
        "Pflegehilfsmittel",
    ],
    "bz.26": [
        "Wasser",
        "Säfte & Softdrinks",
        "Kaffee & Tee",
        "Wein & Spirituosen",
    ],
    "bz.28": [
        "Schulbedarf",
        "Lernspiele",
        "Schulrucksäcke",
        "Kinderaccessoires",
    ],
    "bz.33": [
        "Gitarren & Bässe",
        "Tasteninstrumente",
        "Schlagzeug & Percussion",
        "Musikzubehör",
    ],
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def slugify(value: str) -> str:
    replacements = {
        "ä": "ae",
        "ö": "oe",
        "ü": "ue",
        "Ä": "Ae",
        "Ö": "Oe",
        "Ü": "Ue",
        "ß": "ss",
    }
    slug = value
    for src, dst in replacements.items():
        slug = slug.replace(src, dst)
    slug = slug.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def mapped_master_codes(mapping_payload: dict) -> set[str]:
    return {entry["master_code"] for entry in mapping_payload.get("mappings", [])}


def next_shop_numbers(catalog: dict, count: int) -> list[int]:
    existing = []
    for node in catalog.get("categories", []):
        match = re.match(r"cat-(\d+)$", node.get("id", ""))
        if match:
            existing.append(int(match.group(1)))
    start = max(existing, default=0) + 1
    return list(range(start, start + count))


def build_l3_nodes(shop_id: str, l2_slug: str, l2_url: str) -> list[dict]:
    children = []
    for index, name in enumerate(L3_NAMES, start=1):
        slug = slugify(name)
        children.append(
            {
                "id": f"{shop_id}-{index:02d}",
                "menu_order": index,
                "name": name,
                "slug": slug,
                "url": f"{l2_url}/{slug}",
                "level": 3,
                "children": [],
            }
        )
    return children


def build_l2_nodes(shop_num: int, master_slug: str, master_url: str, l2_names: list[str]) -> list[dict]:
    children = []
    for index, name in enumerate(l2_names, start=1):
        shop_l2_id = f"cat-{shop_num:02d}-{index:02d}"
        slug = slugify(name)
        url = f"{master_url}/{slug}"
        children.append(
            {
                "id": shop_l2_id,
                "menu_order": index,
                "name": name,
                "slug": slug,
                "url": url,
                "level": 2,
                "children": build_l3_nodes(shop_l2_id, slug, url),
            }
        )
    return children


def build_shop_l1(shop_num: int, master_item: dict) -> dict:
    slug = master_item["slug"]
    url = f"/kategorie/{slug}"
    l2_names = SCAFFOLD_L2.get(master_item["code"], ["Sortiment", "Zubehör", "Sets"])
    return {
        "id": f"cat-{shop_num:02d}",
        "menu_order": shop_num,
        "name": master_item["name"],
        "slug": slug,
        "url": url,
        "level": 1,
        "master_code": master_item["code"],
        "master_slug": slug,
        "master_name": master_item["name"],
        "children": build_l2_nodes(shop_num, slug, url, l2_names),
    }


def expand_shop_to_48(*, dry_run: bool = False) -> dict:
    master_payload = load_json(CANONICAL)
    mapping_payload = load_json(MAPPING_PATH)
    catalog = load_json(SHOP_CATALOG_PATH)
    master_map = {item["code"]: item for item in master_payload["categories"]}

    mapped = mapped_master_codes(mapping_payload)
    pending_codes = [code for code in EXPAND_MASTER_CODES if code not in mapped]
    missing_in_master = [code for code in pending_codes if code not in master_map]

    if missing_in_master:
        raise SystemExit(f"Master codes not found: {', '.join(missing_in_master)}")

    existing_ids = {node["id"] for node in catalog.get("categories", [])}
    shop_numbers = next_shop_numbers(catalog, len(pending_codes))
    added: list[dict] = []

    for shop_num, master_code in zip(shop_numbers, pending_codes, strict=True):
        shop_id = f"cat-{shop_num:02d}"
        if shop_id in existing_ids:
            continue
        master_item = master_map[master_code]
        node = build_shop_l1(shop_num, master_item)
        catalog["categories"].append(node)
        mapping_payload["mappings"].append(
            {
                "shop_id": shop_id,
                "master_code": master_code,
                "sync_name": True,
                "note": "Auto-expanded from master taxonomy 48",
            }
        )
        added.append(
            {
                "shop_id": shop_id,
                "master_code": master_code,
                "name": master_item["name"],
                "slug": master_item["slug"],
                "l2_count": len(node["children"]),
            }
        )

    catalog["main_category_count"] = len(catalog["categories"])
    catalog.setdefault("rules", {})
    catalog["rules"]["desktop_left_column"] = (
        f"show all {catalog['main_category_count']} main categories in menu order; "
        "never replace with demo categories"
    )
    catalog["rules"]["master_taxonomy_l1"] = 48

    still_unmapped = [
        {"code": item["code"], "name": item["name"]}
        for item in master_payload["categories"]
        if item["code"] not in mapped_master_codes(mapping_payload)
    ]

    report = {
        "schema": "buzzard.taxonomy-expand-shop-48.v1",
        "dry_run": dry_run,
        "added_count": len(added),
        "added": added,
        "shop_main_categories": catalog["main_category_count"],
        "still_unmapped_count": len(still_unmapped),
        "still_unmapped": still_unmapped,
    }

    if not dry_run and added:
        SHOP_CATALOG_PATH.write_text(
            json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        MAPPING_PATH.write_text(
            json.dumps(mapping_payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    return report


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Expand shop catalog with 7 missing master L1 categories")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    report = expand_shop_to_48(dry_run=args.dry_run)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"OK: {report['added_count']} neue Shop-L1-Kategorien (gesamt {report['shop_main_categories']})")


if __name__ == "__main__":
    main()
