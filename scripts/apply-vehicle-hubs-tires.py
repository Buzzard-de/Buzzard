#!/usr/bin/env python3
"""Restructure automotive L2 into vehicle hubs and add Lastik ve jant (cat-54)."""
from __future__ import annotations

import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data/buzzard_categories.json"
TREE_PATH = ROOT / "data/i18n/category-tree.json"
MAINS_PATH = ROOT / "data/i18n/category-mains.json"
REDIRECTS_PATH = ROOT / "data/category_legacy_redirects.json"

VEHICLES = [
    {"suffix": "21", "slug": "pkw", "keep_ids": True},
    {"suffix": "22", "slug": "transporter", "keep_ids": False},
    {"suffix": "23", "slug": "lkw", "keep_ids": False},
    {"suffix": "24", "slug": "bus", "keep_ids": False},
    {"suffix": "25", "slug": "motorrad", "keep_ids": False},
    {"suffix": "26", "slug": "traktor", "keep_ids": False},
    {"suffix": "27", "slug": "baumaschinen", "keep_ids": False},
]

VEHICLE_LABELS = {
    "pkw": {
        "de": "Pkw / Auto",
        "en": "Car",
        "tr": "Araba",
        "ar": "سيارة",
        "fr": "Voiture",
        "nl": "Auto",
        "bg": "Лек автомобил",
        "hr": "Automobil",
        "el": "Αυτοκίνητο",
        "cs": "Osobní auto",
        "da": "Personbil",
        "et": "Sõiduauto",
        "fi": "Henkilöauto",
        "hu": "Személyautó",
        "it": "Auto",
        "lv": "Vieglā automašīna",
        "lt": "Lengvasis automobilis",
        "lb": "Auto",
        "mt": "Karozza",
        "pl": "Samochód",
        "pt": "Carro",
        "ro": "Autoturism",
        "sk": "Osobné auto",
        "sl": "Osebni avto",
        "es": "Coche",
        "ca": "Cotxe",
        "eu": "Autoa",
        "gl": "Coche",
        "sv": "Personbil",
        "ga": "Gluaisteán",
    },
    "transporter": {
        "de": "Transporter / Van",
        "en": "Van",
        "tr": "Minibüs / Van",
        "ar": "فان",
        "fr": "Utilitaire",
        "nl": "Bestelwagen",
        "bg": "Ван",
        "hr": "Kombi",
        "el": "Van",
        "cs": "Dodávka",
        "da": "Varebil",
        "et": "Kaubaauto",
        "fi": "Pakettiauto",
        "hu": "Kisteherautó",
        "it": "Furgone",
        "lv": "Furgons",
        "lt": "Furgonas",
        "lb": "Transporter",
        "mt": "Van",
        "pl": "Van",
        "pt": "Carrinha",
        "ro": "Duba",
        "sk": "Dodávka",
        "sl": "Kombi",
        "es": "Furgoneta",
        "ca": "Furgoneta",
        "eu": "Furgoneta",
        "gl": "Furgoneta",
        "sv": "Skåpbil",
        "ga": "Veain",
    },
    "lkw": {
        "de": "Lkw / Laster",
        "en": "Truck",
        "tr": "Kamyon",
        "ar": "شاحنة",
        "fr": "Camion",
        "nl": "Vrachtwagen",
        "bg": "Камион",
        "hr": "Kamion",
        "el": "Φορτηγό",
        "cs": "Nákladní auto",
        "da": "Lastbil",
        "et": "Veoauto",
        "fi": "Kuorma-auto",
        "hu": "Teherautó",
        "it": "Camion",
        "lv": "Kravas auto",
        "lt": "Sunkvežimis",
        "lb": "Camion",
        "mt": "Trakk",
        "pl": "Ciężarówka",
        "pt": "Camião",
        "ro": "Camion",
        "sk": "Nákladné auto",
        "sl": "Tovornjak",
        "es": "Camión",
        "ca": "Camió",
        "eu": "Kamioia",
        "gl": "Camión",
        "sv": "Lastbil",
        "ga": "Trucail",
    },
    "bus": {
        "de": "Bus",
        "en": "Bus",
        "tr": "Otobüs",
        "ar": "حافلة",
        "fr": "Bus",
        "nl": "Bus",
        "bg": "Автобус",
        "hr": "Autobus",
        "el": "Λεωφορείο",
        "cs": "Autobus",
        "da": "Bus",
        "et": "Buss",
        "fi": "Bussi",
        "hu": "Busz",
        "it": "Autobus",
        "lv": "Autobuss",
        "lt": "Autobusas",
        "lb": "Bus",
        "mt": "Xarabank",
        "pl": "Autobus",
        "pt": "Autocarro",
        "ro": "Autobuz",
        "sk": "Autobus",
        "sl": "Avtobus",
        "es": "Autobús",
        "ca": "Autobús",
        "eu": "Autobusa",
        "gl": "Autobús",
        "sv": "Buss",
        "ga": "Bus",
    },
    "motorrad": {
        "de": "Motorrad",
        "en": "Motorcycle",
        "tr": "Motosiklet",
        "ar": "دراجة نارية",
        "fr": "Moto",
        "nl": "Motorfiets",
        "bg": "Мотоциклет",
        "hr": "Motocikl",
        "el": "Μοτοσικλέτα",
        "cs": "Motocykl",
        "da": "Motorcykel",
        "et": "Mootorratas",
        "fi": "Moottoripyörä",
        "hu": "Motorkerékpár",
        "it": "Moto",
        "lv": "Motocikls",
        "lt": "Motociklas",
        "lb": "Motorrad",
        "mt": "Mutur",
        "pl": "Motocykl",
        "pt": "Motociclo",
        "ro": "Motocicletă",
        "sk": "Motocykel",
        "sl": "Motor",
        "es": "Moto",
        "ca": "Moto",
        "eu": "Motozikleta",
        "gl": "Moto",
        "sv": "Motorcykel",
        "ga": "Gluaisrothar",
    },
    "traktor": {
        "de": "Traktor",
        "en": "Tractor",
        "tr": "Traktör",
        "ar": "جرار",
        "fr": "Tracteur",
        "nl": "Tractor",
        "bg": "Трактор",
        "hr": "Traktor",
        "el": "Τρακτέρ",
        "cs": "Traktor",
        "da": "Traktor",
        "et": "Traktor",
        "fi": "Traktori",
        "hu": "Traktor",
        "it": "Trattore",
        "lv": "Traktors",
        "lt": "Traktorius",
        "lb": "Trakter",
        "mt": "Trattur",
        "pl": "Ciągnik",
        "pt": "Trator",
        "ro": "Tractor",
        "sk": "Traktor",
        "sl": "Traktor",
        "es": "Tractor",
        "ca": "Tractor",
        "eu": "Traktorea",
        "gl": "Tractor",
        "sv": "Traktor",
        "ga": "Tarracóir",
    },
    "baumaschinen": {
        "de": "Baumaschinen & sonstige",
        "en": "Construction & other",
        "tr": "İş makineleri ve diğer",
        "ar": "معدات البناء وغيرها",
        "fr": "Engins & autres",
        "nl": "Bouwmachines & overig",
        "bg": "Строителни машини",
        "hr": "Građevinski strojevi",
        "el": "Μηχανήματα έργου",
        "cs": "Stavební stroje",
        "da": "Entreprenørmaskiner",
        "et": "Ehitusmasinad",
        "fi": "Työkoneet",
        "hu": "Építőgépek",
        "it": "Macchine da cantiere",
        "lv": "Būvtehnika",
        "lt": "Statybinė technika",
        "lb": "Baumaschinnen",
        "mt": "Makkinarju tal-kostruzzjoni",
        "pl": "Maszyny budowlane",
        "pt": "Máquinas de construção",
        "ro": "Utilaje de construcții",
        "sk": "Stavebné stroje",
        "sl": "Gradbeni stroji",
        "es": "Maquinaria y otros",
        "ca": "Maquinària i altres",
        "eu": "Obra makinak",
        "gl": "Maquinaria e outros",
        "sv": "Entreprenadmaskiner",
        "ga": "Innealra tógála",
    },
}

TIRE_L1 = {
    "de": "Reifen und Felgen",
    "en": "Tires and rims",
    "tr": "Lastik ve jant",
    "ar": "إطارات وجنوط",
    "fr": "Pneus et jantes",
    "nl": "Banden en velgen",
    "bg": "Гуми и джанти",
    "hr": "Gume i felge",
    "el": "Ελαστικά και ζάντες",
    "cs": "Pneumatiky a kola",
    "da": "Dæk og fælge",
    "et": "Rehvid ja veljed",
    "fi": "Renkaat ja vanteet",
    "hu": "Gumiabroncs és felni",
    "it": "Pneumatici e cerchi",
    "lv": "Riepas un diski",
    "lt": "Padangos ir ratlankiai",
    "lb": "Pneuen a Felgen",
    "mt": "Tajers u rims",
    "pl": "Opony i felgi",
    "pt": "Pneus e jantes",
    "ro": "Anvelope și jante",
    "sk": "Pneumatiky a disky",
    "sl": "Pnevmatike in platišča",
    "es": "Neumáticos y llantas",
    "ca": "Pneumàtics i llantes",
    "eu": "Pneumatikoak eta llantak",
    "gl": "Pneumáticos e llantas",
    "sv": "Däck och fälgar",
    "ga": "Boinn agus rims",
}

KIND_LABELS = {
    "reifen": {
        "de": "Reifen",
        "en": "Tires",
        "tr": "Lastik",
        "ar": "إطارات",
        "fr": "Pneus",
        "nl": "Banden",
        "bg": "Гуми",
        "hr": "Gume",
        "el": "Ελαστικά",
        "cs": "Pneumatiky",
        "da": "Dæk",
        "et": "Rehvid",
        "fi": "Renkaat",
        "hu": "Gumiabroncs",
        "it": "Pneumatici",
        "lv": "Riepas",
        "lt": "Padangos",
        "lb": "Pneuen",
        "mt": "Tajers",
        "pl": "Opony",
        "pt": "Pneus",
        "ro": "Anvelope",
        "sk": "Pneumatiky",
        "sl": "Pnevmatike",
        "es": "Neumáticos",
        "ca": "Pneumàtics",
        "eu": "Pneumatikoak",
        "gl": "Pneumáticos",
        "sv": "Däck",
        "ga": "Boinn",
    },
    "felgen": {
        "de": "Felgen",
        "en": "Rims",
        "tr": "Jant",
        "ar": "جنوط",
        "fr": "Jantes",
        "nl": "Velgen",
        "bg": "Джанти",
        "hr": "Felge",
        "el": "Ζάντες",
        "cs": "Disky",
        "da": "Fælge",
        "et": "Veljed",
        "fi": "Vanteet",
        "hu": "Felni",
        "it": "Cerchi",
        "lv": "Diski",
        "lt": "Ratlankiai",
        "lb": "Felgen",
        "mt": "Rims",
        "pl": "Felgi",
        "pt": "Jantes",
        "ro": "Jante",
        "sk": "Disky",
        "sl": "Platišča",
        "es": "Llantas",
        "ca": "Llantes",
        "eu": "Llantak",
        "gl": "Llantas",
        "sv": "Fälgar",
        "ga": "Rims",
    },
}

ID_MAP: dict[str, str] = {}
NEW_LABELS: dict[str, dict[str, str]] = {}
REDIRECTS: list[dict] = []


def with_slash(url: str) -> str:
    return url if url.endswith("/") else f"{url}/"


def insert_segment(url: str, after: str, segment: str) -> str:
    prefix = f"/kategorie/{after}"
    if url.startswith(prefix):
        rest = url[len(prefix) :]
        if rest.startswith(f"/{segment}/") or rest == f"/{segment}":
            return url
        return f"{prefix}/{segment}{rest}"
    return url


def bump_levels_and_urls(node: dict, after: str, segment: str) -> None:
    node["level"] = int(node.get("level", 2)) + 1
    if node.get("url"):
        node["url"] = insert_segment(node["url"], after, segment)
    for child in node.get("children") or []:
        bump_levels_and_urls(child, after, segment)


def rewrite_clone(node: dict, hub_id: str, vehicle_slug: str) -> None:
    old_id = node["id"]
    new_id = hub_id + old_id[len("cat-05") :]
    ID_MAP[new_id] = old_id
    node["id"] = new_id
    node["level"] = int(node.get("level", 2)) + 1
    if node.get("url"):
        node["url"] = insert_segment(node["url"], "automotive", vehicle_slug)
    node.pop("legacy_slug_path", None)
    node.pop("legacy_url", None)
    for child in node.get("children") or []:
        rewrite_clone(child, hub_id, vehicle_slug)


def collect_redirects(node: dict, new_url: str) -> None:
    old = node.get("url")
    if old and with_slash(old) != with_slash(new_url):
        REDIRECTS.append(
            {
                "from": with_slash(old),
                "to": with_slash(new_url),
                "permanent": True,
                "note": "Automotive vehicle-hub URL",
            }
        )
    for child in node.get("children") or []:
        # child urls rewritten later; skip here
        pass


def walk_collect_old_urls(node: dict, bucket: list[tuple[str, str]]) -> None:
    bucket.append((node["id"], node.get("url", "")))
    for child in node.get("children") or []:
        walk_collect_old_urls(child, bucket)


def remap_urls_by_id(node: dict, old_by_id: dict[str, str]) -> None:
    old = old_by_id.get(node["id"])
    new = node.get("url", "")
    if old and new and with_slash(old) != with_slash(new):
        REDIRECTS.append(
            {
                "from": with_slash(old),
                "to": with_slash(new),
                "permanent": True,
                "note": "Automotive vehicle-hub URL",
            }
        )
    for child in node.get("children") or []:
        remap_urls_by_id(child, old_by_id)


def make_node(cid: str, order: int, name: str, slug: str, url: str, level: int, children: list) -> dict:
    return {
        "id": cid,
        "menu_order": order,
        "name": name,
        "slug": slug,
        "url": url,
        "level": level,
        "children": children,
    }


def strip_legacy(node: dict) -> dict:
    n = copy.deepcopy(node)
    n.pop("legacy_slug_path", None)
    n.pop("legacy_url", None)
    n["children"] = [strip_legacy(c) for c in n.get("children") or []]
    return n


def retarget_tire_leaf(node: dict, new_id: str, new_url: str, level: int) -> dict:
    leaf = strip_legacy(node)
    ID_MAP[new_id] = node["id"]
    leaf["id"] = new_id
    leaf["url"] = new_url
    leaf["level"] = level
    leaf["children"] = []
    return leaf


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    tree = json.loads(TREE_PATH.read_text(encoding="utf-8"))
    mains = json.loads(MAINS_PATH.read_text(encoding="utf-8"))
    existing_redirects = json.loads(REDIRECTS_PATH.read_text(encoding="utf-8"))

    auto = next(c for c in catalog["categories"] if c["id"] == "cat-05")
    old_parts = list(auto["children"])
    tire_src = next(p for p in old_parts if p["id"] == "cat-05-05")
    part_groups = [p for p in old_parts if p["id"] != "cat-05-05"]

    old_auto_urls: list[tuple[str, str]] = []
    walk_collect_old_urls(auto, old_auto_urls)
    old_by_id = dict(old_auto_urls)

    hubs = []
    for index, veh in enumerate(VEHICLES, start=1):
        hub_id = f"cat-05-{veh['suffix']}"
        slug = veh["slug"]
        labels = VEHICLE_LABELS[slug]
        NEW_LABELS[hub_id] = labels
        children = []
        if veh["keep_ids"]:
            for part in part_groups:
                bumped = copy.deepcopy(part)
                bump_levels_and_urls(bumped, "automotive", slug)
                children.append(bumped)
        else:
            for part in part_groups:
                cloned = copy.deepcopy(part)
                rewrite_clone(cloned, hub_id, slug)
                children.append(cloned)
        hub = make_node(
            hub_id,
            index,
            labels["de"],
            slug,
            f"/kategorie/automotive/{slug}",
            2,
            children,
        )
        hubs.append(hub)

    auto["children"] = hubs

    tire_children_src = {c["id"]: c for c in tire_src["children"]}
    reifen_ids = ["cat-05-05-01", "cat-05-05-02", "cat-05-05-03", "cat-05-05-06"]
    felgen_ids = ["cat-05-05-04", "cat-05-05-05"]

    tire_hubs = []
    for index, veh in enumerate(VEHICLES, start=1):
        hub_id = f"cat-54-{index:02d}"
        slug = veh["slug"]
        NEW_LABELS[hub_id] = VEHICLE_LABELS[slug]
        reifen_id = f"{hub_id}-01"
        felgen_id = f"{hub_id}-02"
        NEW_LABELS[reifen_id] = KIND_LABELS["reifen"]
        NEW_LABELS[felgen_id] = KIND_LABELS["felgen"]
        reifen_children = []
        for order, src_id in enumerate(reifen_ids, start=1):
            src = tire_children_src[src_id]
            new_id = f"{reifen_id}-{order:02d}"
            url = f"/kategorie/reifen-und-felgen/{slug}/reifen/{src['slug']}"
            reifen_children.append(retarget_tire_leaf(src, new_id, url, 4))
        felgen_children = []
        for order, src_id in enumerate(felgen_ids, start=1):
            src = tire_children_src[src_id]
            new_id = f"{felgen_id}-{order:02d}"
            url = f"/kategorie/reifen-und-felgen/{slug}/felgen/{src['slug']}"
            felgen_children.append(retarget_tire_leaf(src, new_id, url, 4))
        reifen = make_node(
            reifen_id,
            1,
            KIND_LABELS["reifen"]["de"],
            "reifen",
            f"/kategorie/reifen-und-felgen/{slug}/reifen",
            3,
            reifen_children,
        )
        felgen = make_node(
            felgen_id,
            2,
            KIND_LABELS["felgen"]["de"],
            "felgen",
            f"/kategorie/reifen-und-felgen/{slug}/felgen",
            3,
            felgen_children,
        )
        hub = make_node(
            hub_id,
            index,
            VEHICLE_LABELS[slug]["de"],
            slug,
            f"/kategorie/reifen-und-felgen/{slug}",
            2,
            [reifen, felgen],
        )
        tire_hubs.append(hub)

    cat54 = {
        "id": "cat-54",
        "menu_order": 54,
        "name": TIRE_L1["de"],
        "slug": "reifen-und-felgen",
        "url": "/kategorie/reifen-und-felgen",
        "level": 1,
        "children": tire_hubs,
        "legacy_name": "Lastik ve jant",
        "legacy_slug": "lastik-ve-jant",
        "legacy_slug_path": "lastik-ve-jant",
        "legacy_url": "/kategori/lastik-ve-jant",
        "master_code": "bz.01",
        "master_slug": "reifen-und-felgen",
        "master_name": "Reifen und Felgen",
        "master_synced_at": "2026-10-18T19:00:00+00:00",
    }
    NEW_LABELS["cat-54"] = TIRE_L1
    catalog["categories"].append(cat54)

    catalog["main_category_count"] = len(catalog["categories"])
    catalog["rules"]["desktop_left_column"] = (
        f"show all {catalog['main_category_count']} main categories in menu order; never replace with demo categories"
    )
    catalog["rules"]["master_taxonomy_shop_l1"] = catalog["main_category_count"]
    if "taxonomy_sync" in catalog:
        catalog["taxonomy_sync"]["shop_main_categories"] = catalog["main_category_count"]

    remap_urls_by_id(auto, old_by_id)
    REDIRECTS.append(
        {
            "from": "/kategorie/automotive/reifen-und-felgen/",
            "to": "/kategorie/reifen-und-felgen/pkw/",
            "permanent": True,
            "note": "Tires moved to dedicated L1",
        }
    )
    for src in tire_src["children"]:
        kind = "felgen" if src["id"] in felgen_ids else "reifen"
        REDIRECTS.append(
            {
                "from": with_slash(src["url"]),
                "to": with_slash(f"/kategorie/reifen-und-felgen/pkw/{kind}/{src['slug']}"),
                "permanent": True,
                "note": "Tires/rims vehicle hub",
            }
        )

    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for new_id, labels in NEW_LABELS.items():
        tree[new_id] = labels
    for new_id, source_id in ID_MAP.items():
        if new_id not in tree and source_id in tree:
            tree[new_id] = copy.deepcopy(tree[source_id])
        elif new_id in tree and source_id in tree:
            # keep explicit labels for hubs; copy missing locales from source
            for loc, val in tree[source_id].items():
                tree[new_id].setdefault(loc, val)

    TREE_PATH.write_text(json.dumps(tree, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    mains["cat-54"] = TIRE_L1
    MAINS_PATH.write_text(json.dumps(mains, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    seen = {(r["from"], r["to"]) for r in existing_redirects}
    for rule in REDIRECTS:
        key = (rule["from"], rule["to"])
        if key not in seen:
            existing_redirects.append(rule)
            seen.add(key)
    REDIRECTS_PATH.write_text(json.dumps(existing_redirects, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        "L1",
        catalog["main_category_count"],
        "auto L2",
        len(auto["children"]),
        "tire L2",
        len(cat54["children"]),
        "redirects added",
        len(REDIRECTS),
        "i18n new",
        len(NEW_LABELS),
        "cloned",
        len(ID_MAP),
    )


if __name__ == "__main__":
    main()
