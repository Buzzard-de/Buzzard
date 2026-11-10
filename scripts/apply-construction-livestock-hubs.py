#!/usr/bin/env python3
"""Add construction-machine and livestock L1 hubs (cat-55, cat-56)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data/buzzard_categories.json"
TREE_PATH = ROOT / "data/i18n/category-tree.json"
MAINS_PATH = ROOT / "data/i18n/category-mains.json"

LOCALES = [
    "de", "en", "tr", "ar", "fr", "nl", "bg", "hr", "el", "cs", "da", "et", "fi",
    "hu", "it", "lv", "lt", "lb", "mt", "pl", "pt", "ro", "sk", "sl", "es", "ca",
    "eu", "gl", "sv", "ga",
]

NEW_LABELS: dict[str, dict[str, str]] = {}


def pack(de: str, en: str, tr: str, **more: str) -> dict[str, str]:
    row = {loc: en for loc in LOCALES}
    row.update({"de": de, "en": en, "tr": tr, **more})
    return row


def node(cid: str, order: int, labels: dict[str, str], slug: str, url: str, level: int, children: list) -> dict:
    NEW_LABELS[cid] = labels
    return {
        "id": cid,
        "menu_order": order,
        "name": labels["de"],
        "slug": slug,
        "url": url,
        "level": level,
        "children": children,
    }


def leaves(parent_id: str, parent_url: str, items: list[tuple[str, dict[str, str], str]]) -> list:
    out = []
    for i, (suffix, labels, slug) in enumerate(items, start=1):
        cid = f"{parent_id}-{suffix}"
        out.append(node(cid, i, labels, slug, f"{parent_url}/{slug}", 4, []))
    return out


CONSTRUCTION_L1 = pack(
    "Baumaschinen und Ersatzteile",
    "Construction machines and spare parts",
    "İnşaat makineleri ve yedek parçaları",
    ar="معدات البناء وقطع الغيار",
    fr="Engins de chantier et pièces",
    nl="Bouwmachines en onderdelen",
    it="Macchine da cantiere e ricambi",
    es="Maquinaria de construcción y recambios",
    pl="Maszyny budowlane i części",
)

LIVESTOCK_L1 = pack(
    "Nutztierhaltung & Viehzucht",
    "Livestock and animal husbandry",
    "Hayvancılık",
    ar="تربية المواشي",
    fr="Élevage",
    nl="Veehouderij",
    it="Allevamento",
    es="Ganadería",
    pl="Hodowla zwierząt",
)

MACHINES = [
    ("01", "bagger", pack("Bagger / Hydraulikbagger", "Excavator", "Ekskavatör", fr="Pelleteuse", it="Escavatore", es="Excavadora", pl="Koparka")),
    ("02", "mini-bagger", pack("Minibagger", "Mini excavator", "Mini ekskavatör", fr="Mini-pelle", it="Mini escavatore", es="Mini excavadora")),
    ("03", "radlader", pack("Radlader / Schaufel", "Wheel loader", "Kepçe / Yükleyici", fr="Chargeuse", it="Pala gommata", es="Cargadora")),
    ("04", "backhoe", pack("Baggerlader", "Backhoe loader", "Kazıcı yükleyici", fr="Pelle rétro", it="Terna", es="Retroexcavadora")),
    ("05", "walze", pack("Walze / Verdichter", "Roller / compactor", "Silindir / Kompaktör", fr="Rouleau compacteur", it="Rullo", es="Compactadora")),
    ("06", "planierraupe", pack("Planierraupe", "Bulldozer", "Dozer", fr="Bulldozer", it="Bulldozer", es="Bulldozer")),
    ("07", "grader", pack("Grader", "Grader", "Greyder", fr="Niveleuse", it="Grader", es="Motoniveladora")),
    ("08", "kran", pack("Kran", "Crane", "Vinç", fr="Grue", it="Gru", es="Grúa", pl="Żuraw")),
    ("09", "kipper", pack("Muldenkipper", "Dump truck", "Damper", fr="Tombereau", it="Dumper", es="Dumper")),
    ("10", "stapler", pack("Stapler & Teleskoplader", "Forklift & telehandler", "Forklift ve teleskopik yükleyici", fr="Chariot & télescopique", it="Carrello e sollevatore", es="Carretilla y telescópica")),
    ("11", "betontechnik", pack("Betonpumpe & Mischer", "Concrete pump & mixer", "Beton pompası ve mikser", fr="Pompe à béton", it="Pompa calcestruzzo", es="Bomba de hormigón")),
]

MACHINE_PARTS = [
    ("01", "motor-und-antrieb", pack("Motor & Antrieb", "Engine & drivetrain", "Motor ve aktarma", fr="Moteur", it="Motore", es="Motor"),
     [
        ("01", pack("Motor komplett", "Complete engine", "Komple motor"), "motor-komplett"),
        ("02", pack("Kraftstoffsystem", "Fuel system", "Yakıt sistemi"), "kraftstoffsystem"),
        ("03", pack("Kühlung", "Cooling", "Soğutma"), "kuehlung"),
        ("04", pack("Getriebe", "Transmission", "Şanzıman"), "getriebe"),
     ]),
    ("02", "hydraulik", pack("Hydraulik", "Hydraulics", "Hidrolik", fr="Hydraulique", it="Idraulica", es="Hidráulica"),
     [
        ("01", pack("Hydraulikpumpe", "Hydraulic pump", "Hidrolik pompa"), "hydraulikpumpe"),
        ("02", pack("Zylinder", "Cylinders", "Silindirler"), "zylinder"),
        ("03", pack("Schläuche & Armaturen", "Hoses & fittings", "Hortum ve rakor"), "schlaeuche"),
        ("04", pack("Ventile", "Valves", "Valfler"), "ventile"),
     ]),
    ("03", "fahrwerk", pack("Fahrwerk & Kette", "Undercarriage", "Yürüyüş aksamı", fr="Train de roulement", it="Carro", es="Tren de rodaje"),
     [
        ("01", pack("Ketten & Glieder", "Tracks", "Palet"), "ketten"),
        ("02", pack("Laufrollen", "Track rollers", "Alt makaralar"), "laufrollen"),
        ("03", pack("Antriebsräder", "Sprockets", "Tahrik dişlisi"), "antriebsraeder"),
        ("04", pack("Reifen für Baumaschinen", "Machine tires", "İş makinesi lastiği"), "reifen"),
     ]),
    ("04", "filter-und-fluessigkeiten", pack("Filter & Flüssigkeiten", "Filters & fluids", "Filtre ve sıvılar", fr="Filtres", it="Filtri", es="Filtros"),
     [
        ("01", pack("Ölfilter", "Oil filter", "Yağ filtresi"), "oelfilter"),
        ("02", pack("Kraftstofffilter", "Fuel filter", "Yakıt filtresi"), "kraftstofffilter"),
        ("03", pack("Hydraulikfilter", "Hydraulic filter", "Hidrolik filtre"), "hydraulikfilter"),
        ("04", pack("Öle & Fette", "Oils & greases", "Yağ ve gres"), "oele"),
     ]),
    ("05", "elektrik", pack("Elektrik", "Electrics", "Elektrik", fr="Électricité", it="Elettrico", es="Eléctrico"),
     [
        ("01", pack("Starter & Lichtmaschine", "Starter & alternator", "Marş ve alternatör"), "starter"),
        ("02", pack("Batterie", "Battery", "Akü"), "batterie"),
        ("03", pack("Sensoren", "Sensors", "Sensörler"), "sensoren"),
        ("04", pack("Kabel & Relais", "Cables & relays", "Kablo ve röle"), "kabel"),
     ]),
    ("06", "kabine", pack("Kabine & Bedienung", "Cabin & controls", "Kabin ve kumanda", fr="Cabine", it="Cabina", es="Cabina"),
     [
        ("01", pack("Sitze", "Seats", "Koltuk"), "sitze"),
        ("02", pack("Hebel & Joystick", "Levers & joysticks", "Kol ve joystick"), "hebel"),
        ("03", pack("Scheiben & Spiegel", "Glass & mirrors", "Cam ve ayna"), "scheiben"),
        ("04", pack("Klimaanlage", "Air conditioning", "Klima"), "klima"),
     ]),
    ("07", "verschleissteile", pack("Verschleißteile", "Wear parts", "Aşınma parçaları", fr="Pièces d'usure", it="Parti di usura", es="Desgaste"),
     [
        ("01", pack("Zähne & Adapter", "Teeth & adapters", "Diş ve adaptör"), "zaehne"),
        ("02", pack("Schneiden", "Cutting edges", "Kesici uçlar"), "schneiden"),
        ("03", pack("Buchsen & Bolzen", "Bushings & pins", "Burç ve pim"), "buchsen"),
        ("04", pack("Dichtungen", "Seals", "Contalar"), "dichtungen"),
     ]),
    ("08", "anbaugeraete", pack("Anbaugeräte", "Attachments", "Ataşmanlar", fr="Accessoires", it="Attrezzature", es="Implementos"),
     [
        ("01", pack("Schaufel / Löffel", "Bucket", "Kepçe"), "schaufel"),
        ("02", pack("Hydraulikhammer", "Hydraulic breaker", "Hidrolik kırıcı"), "hydraulikhammer"),
        ("03", pack("Greifer", "Grapple", "Tutucu"), "greifer"),
        ("04", pack("Gabeln", "Forks", "Çatal"), "gabeln"),
     ]),
]

ANIMALS = [
    ("01", "rinder", pack("Rinder / Milchvieh", "Cattle", "İnek / Sığır", fr="Bovins", it="Bovini", es="Vacuno", pl="Bydło")),
    ("02", "schafe", pack("Schafe", "Sheep", "Koyun", fr="Moutons", it="Ovini", es="Ovejas", pl="Owce")),
    ("03", "ziegen", pack("Ziegen", "Goats", "Keçi", fr="Chèvres", it="Capre", es="Cabras", pl="Kozy")),
    ("04", "gefluegel", pack("Geflügel / Hühnerhaltung", "Poultry", "Tavukçuluk", fr="Volailles", it="Avicoli", es="Avicultura", pl="Drób")),
    ("05", "imkerei", pack("Imkerei", "Beekeeping", "Arıcılık", fr="Apiculture", it="Apicoltura", es="Apicultura", pl="Pszczelarstwo")),
    ("06", "pferde", pack("Pferdehaltung", "Horses", "Atçılık", fr="Équitation / chevaux", it="Equini", es="Équidos", pl="Konie")),
    ("07", "schweine", pack("Schweinehaltung", "Pigs", "Domuz yetiştiriciliği", fr="Porcs", it="Suini", es="Porcino", pl="Świnie")),
]

ANIMAL_PARTS = [
    ("01", "stall-und-haltung", pack("Stall & Haltung", "Housing", "Barınak ve bakım", fr="Bâtiment", it="Stalla", es="Alojamiento"),
     [
        ("01", pack("Stallausstattung", "Housing equipment", "Ahır ekipmanı"), "stallausstattung"),
        ("02", pack("Liege- & Ruheflächen", "Bedding & rest areas", "Yataklık"), "liegeflaechen"),
        ("03", pack("Tränken", "Drinkers", "Suluklar"), "traenken"),
        ("04", pack("Lüftung", "Ventilation", "Havalandırma"), "lueftung"),
     ]),
    ("02", "fuetterung", pack("Fütterung", "Feeding", "Yemleme", fr="Alimentation", it="Alimentazione", es="Alimentación"),
     [
        ("01", pack("Futter", "Feed", "Yem"), "futter"),
        ("02", pack("Tröge & Spender", "Troughs & dispensers", "Yemlik"), "troege"),
        ("03", pack("Misch- & Dosiertechnik", "Mixers & dosing", "Karıştırıcı"), "mischer"),
        ("04", pack("Mineralfutter", "Mineral feed", "Mineral yem"), "mineralfutter"),
     ]),
    ("03", "gesundheit", pack("Gesundheit & Pflege", "Health & care", "Sağlık ve bakım", fr="Santé", it="Salute", es="Salud"),
     [
        ("01", pack("Hygiene", "Hygiene", "Hijyen"), "hygiene"),
        ("02", pack("Pflege", "Grooming", "Bakım"), "pflege"),
        ("03", pack("Klauen- & Hufpflege", "Hoof care", "Tırnak bakımı"), "klauenpflege"),
        ("04", pack("Erste Hilfe", "First aid", "İlk yardım"), "erste-hilfe"),
     ]),
    ("04", "zucht", pack("Zucht", "Breeding", "Damızlık / üreme", fr="Élevage", it="Riproduzione", es="Reproducción"),
     [
        ("01", pack("Kennzeichnung", "Identification", "Küpe ve işaretleme"), "kennzeichnung"),
        ("02", pack("Waagen", "Scales", "Tartı"), "waagen"),
        ("03", pack("Abferkel- & Aufzucht", "Rearing", "Büyütme"), "aufzucht"),
        ("04", pack("Zuchtzubehör", "Breeding accessories", "Damızlık aksesuar"), "zuchtzubehoer"),
     ]),
    ("05", "ausruestung", pack("Ausrüstung", "Equipment", "Ekipman", fr="Équipement", it="Attrezzatura", es="Equipamiento"),
     [
        ("01", pack("Melk- & Milchtechnik", "Milking equipment", "Süt sağım"), "melktechnik"),
        ("02", pack("Transport", "Transport", "Taşıma"), "transport"),
        ("03", pack("Werkzeuge", "Tools", "Aletler"), "werkzeuge"),
        ("04", pack("Schutzkleidung", "Protective clothing", "Koruyucu giysi"), "schutzkleidung"),
     ]),
    ("06", "zaun-und-weide", pack("Zaun & Weide", "Fence & pasture", "Çit ve mera", fr="Clôture", it="Recinzione", es="Cercado"),
     [
        ("01", pack("Weidezaun", "Pasture fence", "Mera çiti"), "weidezaun"),
        ("02", pack("Tore", "Gates", "Kapılar"), "tore"),
        ("03", pack("Weidetränken", "Pasture drinkers", "Mera suluğu"), "weidetraenken"),
        ("04", pack("Unterstand", "Shelter", "Sığınak"), "unterstand"),
     ]),
]


def build_machine(prefix: str, root_url: str, suffix: str, slug: str, labels: dict) -> dict:
    hub_id = f"{prefix}-{suffix}"
    hub_url = f"{root_url}/{slug}"
    children = []
    for part_suffix, part_slug, part_labels, leaf_items in MACHINE_PARTS:
        part_id = f"{hub_id}-{part_suffix}"
        part_url = f"{hub_url}/{part_slug}"
        children.append(node(part_id, int(part_suffix), part_labels, part_slug, part_url, 3, leaves(part_id, part_url, leaf_items)))
    return node(hub_id, int(suffix), labels, slug, hub_url, 2, children)


def build_animal(prefix: str, root_url: str, suffix: str, slug: str, labels: dict) -> dict:
    hub_id = f"{prefix}-{suffix}"
    hub_url = f"{root_url}/{slug}"
    children = []
    for part_suffix, part_slug, part_labels, leaf_items in ANIMAL_PARTS:
        part_id = f"{hub_id}-{part_suffix}"
        part_url = f"{hub_url}/{part_slug}"
        children.append(node(part_id, int(part_suffix), part_labels, part_slug, part_url, 3, leaves(part_id, part_url, leaf_items)))
    return node(hub_id, int(suffix), labels, slug, hub_url, 2, children)


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    tree = json.loads(TREE_PATH.read_text(encoding="utf-8"))
    mains = json.loads(MAINS_PATH.read_text(encoding="utf-8"))

    existing = {c["id"] for c in catalog["categories"]}
    if "cat-55" in existing or "cat-56" in existing:
        raise SystemExit("cat-55/cat-56 already exist")

    cat55 = node(
        "cat-55",
        55,
        CONSTRUCTION_L1,
        "baumaschinen-und-ersatzteile",
        "/kategorie/baumaschinen-und-ersatzteile",
        1,
        [build_machine("cat-55", "/kategorie/baumaschinen-und-ersatzteile", suffix, slug, labels) for suffix, slug, labels in MACHINES],
    )
    cat55["legacy_name"] = "İnşaat makineleri ve yedek parçaları"
    cat55["master_slug"] = "baumaschinen-und-ersatzteile"
    cat55["master_name"] = CONSTRUCTION_L1["de"]

    cat56 = node(
        "cat-56",
        56,
        LIVESTOCK_L1,
        "nutztierhaltung",
        "/kategorie/nutztierhaltung",
        1,
        [build_animal("cat-56", "/kategorie/nutztierhaltung", suffix, slug, labels) for suffix, slug, labels in ANIMALS],
    )
    cat56["legacy_name"] = "Hayvancılık"
    cat56["master_slug"] = "nutztierhaltung"
    cat56["master_name"] = LIVESTOCK_L1["de"]

    catalog["categories"].extend([cat55, cat56])
    catalog["main_category_count"] = len(catalog["categories"])
    catalog["rules"]["desktop_left_column"] = (
        f"show all {catalog['main_category_count']} main categories in menu order; never replace with demo categories"
    )
    catalog["rules"]["master_taxonomy_shop_l1"] = catalog["main_category_count"]
    if "taxonomy_sync" in catalog:
        catalog["taxonomy_sync"]["shop_main_categories"] = catalog["main_category_count"]

    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tree.update(NEW_LABELS)
    TREE_PATH.write_text(json.dumps(tree, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    mains["cat-55"] = CONSTRUCTION_L1
    mains["cat-56"] = LIVESTOCK_L1
    MAINS_PATH.write_text(json.dumps(mains, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("L1", catalog["main_category_count"], "labels", len(NEW_LABELS), "machines", len(cat55["children"]), "animals", len(cat56["children"]))


if __name__ == "__main__":
    main()
