#!/usr/bin/env python3
"""Verknüpft KFZ Master Tree V1 mit Shop cat-05 und Automotive Taxonomy."""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
KFZ_TREE_PATH = REPO_ROOT / "data" / "taxonomy" / "buzzard_master_kfz_category_tree_v1.json"
KFZ_OS_PATH = REPO_ROOT / "data" / "taxonomy" / "buzzard_master_kfz_intelligence_os.json"
SHOP_CATALOG_PATH = REPO_ROOT / "data" / "buzzard_categories.json"
BRIDGE_PATH = REPO_ROOT / "data" / "taxonomy" / "kfz_shop_bridge.json"
AUTOMOTIVE_CONFIG_PATH = (
    REPO_ROOT
    / "intelligence"
    / "buzzard_ai_complete"
    / "automotive_taxonomy_maximal"
    / "config"
    / "automotive_taxonomy.production.json"
)

# KFZ main id (01-43) → shop L2 under cat-05
KFZ_TO_SHOP_L2: dict[str, str] = {
    "01": "cat-05-11",
    "02": "cat-05-11",
    "03": "cat-05-11",
    "04": "cat-05-11",
    "05": "cat-05-11",
    "06": "cat-05-11",
    "07": "cat-05-02",
    "08": "cat-05-01",
    "09": "cat-05-03",
    "10": "cat-05-11",
    "11": "cat-05-11",
    "12": "cat-05-11",
    "13": "cat-05-11",
    "14": "cat-05-11",
    "15": "cat-05-11",
    "16": "cat-05-05",
    "17": "cat-05-05",
    "18": "cat-05-11",
    "19": "cat-05-04",
    "20": "cat-05-04",
    "21": "cat-05-06",
    "22": "cat-05-07",
    "23": "cat-05-11",
    "24": "cat-05-11",
    "25": "cat-05-10",
    "26": "cat-05-10",
    "27": "cat-05-07",
    "28": "cat-05-09",
    "29": "cat-05-11",
    "30": "cat-05-11",
    "31": "cat-05-11",
    "32": "cat-05-09",
    "33": "cat-05-10",
    "34": "cat-05-09",
    "35": "cat-05-08",
    "36": "cat-05-12",
    "37": "cat-05-11",
    "38": "cat-05-11",
    "39": "cat-05-11",
    "40": "cat-05-11",
    "41": "cat-05-12",
    "42": "cat-05-12",
    "43": "cat-05-12",
}

NAME_DE: dict[str, str] = {
    "01": "Motor",
    "02": "Motorsteuerung & Sensoren",
    "03": "Kraftstoffsystem",
    "04": "Turbo & Ladeluft",
    "05": "Kühlsystem",
    "06": "Motorriemen & Steuerkette",
    "07": "Filter",
    "08": "Öle & technische Flüssigkeiten",
    "09": "Bremsanlage",
    "10": "Kupplung",
    "11": "Getriebe",
    "12": "Antriebswellen & Antrieb",
    "13": "Lenkung",
    "14": "Fahrwerk & Chassis",
    "15": "Radaufhängung & Radnaben",
    "16": "Reifen",
    "17": "Felgen",
    "18": "Auspuff & Abgas",
    "19": "Elektrik & Ladesystem",
    "20": "Zündung & Glühkerzen",
    "21": "Beleuchtung",
    "22": "Scheiben & Wischer",
    "23": "Klimaanlage",
    "24": "Heizung & Belüftung",
    "25": "Karosserie",
    "26": "Spiegel & Sichtsysteme",
    "27": "Scheiben & Fenstermechanik",
    "28": "Innenraum",
    "29": "Schloss & Zentralverriegelung",
    "30": "Sicherheitssysteme",
    "31": "Elektronik & Komfort",
    "32": "Multimedia & Navigation",
    "33": "Anhänger & Kupplungssysteme",
    "34": "Auto-Zubehör",
    "35": "Autopflege & Reinigung",
    "36": "Werkzeuge & Werkstattausrüstung",
    "37": "Reparatursets & Montageteile",
    "38": "Befestigung & Kleinteile",
    "39": "Tuning & Performance",
    "40": "Nutzfahrzeuge & Spezial-KFZ",
    "41": "Industrie & CNC",
    "42": "Baumaschinen & Ersatzteile",
    "43": "Landwirtschaft & Agrartechnik",
}


def _slugify(value: str) -> str:
    table = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosucgiosu")
    slug = value.translate(table).lower()
    out = []
    for ch in slug:
        if ch.isalnum():
            out.append(ch)
        elif out and out[-1] != "-":
            out.append("-")
    return "".join(out).strip("-")


def _find_shop_node(catalog: dict, node_id: str) -> dict | None:
    def walk(nodes: list[dict]) -> dict | None:
        for node in nodes:
            if node["id"] == node_id:
                return node
            if node.get("children"):
                found = walk(node["children"])
                if found:
                    return found
        return None

    return walk(catalog.get("categories", []))


def _load_taxonomy_source() -> tuple[dict, str]:
    if KFZ_OS_PATH.exists():
        os_data = json.loads(KFZ_OS_PATH.read_text(encoding="utf-8"))
        return os_data, "buzzard_master_kfz_intelligence_os.json"
    kfz = json.loads(KFZ_TREE_PATH.read_text(encoding="utf-8"))
    return kfz, "buzzard_master_kfz_category_tree_v1.json"


def _taxonomy_mains(source: dict) -> list[dict]:
    if "taxonomy" in source:
        return source["taxonomy"]
    return source.get("categories", [])


def build_bridge() -> dict:
    source, source_file = _load_taxonomy_source()
    catalog = json.loads(SHOP_CATALOG_PATH.read_text(encoding="utf-8"))
    automotive = _find_shop_node(catalog, "cat-05")
    if not automotive:
        raise SystemExit("cat-05 Automotive not found in buzzard_categories.json")

    coverage = source.get("coverage", {})
    competitors = source.get("competitors", [])
    mains = []
    total_l3 = 0

    for main in _taxonomy_mains(source):
        main_id = main["id"]
        shop_l2_id = KFZ_TO_SHOP_L2.get(main_id, "cat-05-11")
        shop_l2 = _find_shop_node(catalog, shop_l2_id)
        subcategories = []
        l3_count = 0
        for sub in main.get("subcategories", []):
            children = [
                {
                    "kfz_id": child["id"],
                    "kfz_name": child["name"],
                    "slug": _slugify(child["name"]),
                }
                for child in sub.get("children", [])
            ]
            l3_count += len(children)
            subcategories.append(
                {
                    "kfz_id": sub["id"],
                    "kfz_name": sub["name"],
                    "slug": _slugify(sub["name"]),
                    "children": children,
                }
            )
        total_l3 += l3_count
        main_coverage = coverage.get(main_id, {})
        active_competitors = [key for key, value in main_coverage.items() if value]
        mains.append(
            {
                "kfz_id": main_id,
                "kfz_name": main["name"],
                "name_de": NAME_DE.get(main_id, main["name"]),
                "slug": f"{main_id}-{_slugify(NAME_DE.get(main_id, main['name']))}",
                "shop_root_id": "cat-05",
                "shop_l2_id": shop_l2_id,
                "shop_l2_name": shop_l2["name"] if shop_l2 else None,
                "shop_l2_slug": shop_l2["slug"] if shop_l2 else None,
                "subcategory_count": len(subcategories),
                "l3_count": l3_count,
                "competitor_coverage": main_coverage,
                "active_competitors": active_competitors,
                "subcategories": subcategories,
            }
        )

    return {
        "version": "1.1",
        "shop_automotive_root_id": "cat-05",
        "kfz_tree_path": f"data/taxonomy/{source_file}",
        "kfz_intelligence_os_path": "data/taxonomy/buzzard_master_kfz_intelligence_os.json",
        "main_category_count": len(mains),
        "subcategory_count": sum(item["subcategory_count"] for item in mains),
        "l3_count": total_l3,
        "competitors": competitors,
        "url_prefix": "/kategorie/automotive/kfz",
        "mains": mains,
    }


def update_automotive_config() -> None:
    config = json.loads(AUTOMOTIVE_CONFIG_PATH.read_text(encoding="utf-8"))
    config["kfz_category_tree_path"] = "data/taxonomy/buzzard_master_kfz_category_tree_v1.json"
    config["kfz_intelligence_os_path"] = "data/taxonomy/buzzard_master_kfz_intelligence_os.json"
    config["kfz_intelligence_os_html_path"] = "data/taxonomy/buzzard_master_kfz_intelligence_os.html"
    config["intelligence_os_all_in_one_html_path"] = "data/taxonomy/buzzard_intelligence_os_all_in_one.html"
    config["intelligence_os_all_in_one_json_path"] = "data/taxonomy/buzzard_intelligence_os_all_in_one.json"
    config["intelligence_os_maximum_manifest_path"] = "data/taxonomy/buzzard_intelligence_os_maximum_manifest.json"
    config["intelligence_os_maximum_single_file_html_path"] = "data/taxonomy/buzzard_intelligence_os_maximum_single_file.html"
    config["kfz_shop_bridge_path"] = "data/taxonomy/kfz_shop_bridge.json"
    config["shop_automotive_root_id"] = "cat-05"
    AUTOMOTIVE_CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    bridge = build_bridge()
    BRIDGE_PATH.write_text(json.dumps(bridge, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    update_automotive_config()
    print(
        f"OK: {bridge['main_category_count']} KFZ-Hauptkategorien, "
        f"{bridge['subcategory_count']} Unterkategorien, "
        f"{bridge.get('l3_count', 0)} L3-Knoten → {BRIDGE_PATH}"
    )


if __name__ == "__main__":
    main()
