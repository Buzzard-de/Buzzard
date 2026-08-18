#!/usr/bin/env python3
"""Synchronisiert Shop-L1-Metadaten aus der deutschen Master-Taxonomie (48 Hauptkategorien)."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CANONICAL = REPO / "data/taxonomy/buzzard_master_48_main_categories_de.json"
MAPPING_PATH = REPO / "data/taxonomy/master_shop_l1_mapping.json"
SHOP_CATALOG_PATH = REPO / "data/buzzard_categories.json"
REPORT_PATH = REPO / "data/taxonomy/taxonomy_auto_sync_report.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def master_by_code(payload: dict) -> dict[str, dict]:
    return {item["code"]: item for item in payload["categories"]}


def find_shop_l1(catalog: dict, shop_id: str) -> dict | None:
    for node in catalog.get("categories", []):
        if node.get("id") == shop_id:
            return node
    return None


def build_report(
    *,
    updated: list[dict],
    skipped: list[dict],
    unmapped_master: list[dict],
    dry_run: bool,
) -> dict:
    return {
        "schema": "buzzard.taxonomy-auto-sync.shop.v1",
        "synced_at": _utc_now(),
        "dry_run": dry_run,
        "source": str(CANONICAL.relative_to(REPO)),
        "mapping": str(MAPPING_PATH.relative_to(REPO)),
        "shop_catalog": str(SHOP_CATALOG_PATH.relative_to(REPO)),
        "updated_count": len(updated),
        "skipped_count": len(skipped),
        "unmapped_master_count": len(unmapped_master),
        "updated": updated,
        "skipped": skipped,
        "unmapped_master": unmapped_master,
    }


def sync_shop(*, dry_run: bool = False) -> dict:
    master_payload = load_json(CANONICAL)
    mapping_payload = load_json(MAPPING_PATH)
    catalog = load_json(SHOP_CATALOG_PATH)
    master_map = master_by_code(master_payload)

    synced_at = _utc_now()
    updated: list[dict] = []
    skipped: list[dict] = []
    mapped_master_codes: set[str] = set()

    for entry in mapping_payload.get("mappings", []):
        shop_id = entry["shop_id"]
        master_code = entry["master_code"]
        sync_name = bool(entry.get("sync_name", False))
        shop_node = find_shop_l1(catalog, shop_id)
        master_item = master_map.get(master_code)

        if not shop_node:
            skipped.append({"shop_id": shop_id, "reason": "SHOP_NODE_NOT_FOUND"})
            continue
        if not master_item:
            skipped.append({"shop_id": shop_id, "master_code": master_code, "reason": "MASTER_NOT_FOUND"})
            continue

        mapped_master_codes.add(master_code)
        previous_name = shop_node.get("name")
        previous_master_code = shop_node.get("master_code")
        changes: list[str] = []

        if shop_node.get("master_code") != master_code:
            shop_node["master_code"] = master_code
            changes.append("master_code")
        if shop_node.get("master_slug") != master_item["slug"]:
            shop_node["master_slug"] = master_item["slug"]
            changes.append("master_slug")
        if shop_node.get("master_name") != master_item["name"]:
            shop_node["master_name"] = master_item["name"]
            changes.append("master_name")
        if shop_node.get("master_synced_at") != synced_at:
            shop_node["master_synced_at"] = synced_at
            changes.append("master_synced_at")

        if sync_name and previous_name != master_item["name"]:
            shop_node["name"] = master_item["name"]
            changes.append("name")

        if changes:
            updated.append(
                {
                    "shop_id": shop_id,
                    "master_code": master_code,
                    "changes": changes,
                    "name_before": previous_name,
                    "name_after": shop_node.get("name"),
                    "master_code_before": previous_master_code,
                }
            )
        else:
            skipped.append({"shop_id": shop_id, "master_code": master_code, "reason": "NO_CHANGES"})

    unmapped_master = [
        {"code": item["code"], "name": item["name"]}
        for item in master_payload["categories"]
        if item["code"] not in mapped_master_codes
    ]

    catalog["taxonomy_sync"] = {
        "schema": mapping_payload.get("schema"),
        "source": str(CANONICAL.relative_to(REPO)),
        "master_main_categories": master_payload.get("main_categories"),
        "shop_main_categories": len(catalog.get("categories", [])),
        "synced_at": synced_at,
        "mapped_master_codes": sorted(mapped_master_codes),
        "unmapped_master_codes": [row["code"] for row in unmapped_master],
    }

    report = build_report(
        updated=updated,
        skipped=skipped,
        unmapped_master=unmapped_master,
        dry_run=dry_run,
    )

    if not dry_run:
        SHOP_CATALOG_PATH.write_text(
            json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync shop L1 metadata from master taxonomy")
    parser.add_argument("--dry-run", action="store_true", help="Report only, do not write files")
    args = parser.parse_args()
    report = sync_shop(dry_run=args.dry_run)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["updated_count"]:
        print(f"OK: {report['updated_count']} Shop-L1-Kategorien aktualisiert")
    else:
        print("OK: Shop-Katalog bereits synchron")


if __name__ == "__main__":
    main()
