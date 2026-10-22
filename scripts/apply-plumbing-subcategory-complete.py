#!/usr/bin/env python3
"""Complete Wasser, Heizung & Sanitär (cat-23) L2/L3 hubs."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data/buzzard_categories.json"
TREE_PATH = ROOT / "data/i18n/category-tree.json"
REDIRECTS_PATH = ROOT / "data/category_legacy_redirects.json"
LOCALES = [
    "de", "en", "tr", "ar", "fr", "nl", "bg", "hr", "el", "cs", "da", "et", "fi",
    "hu", "it", "lv", "lt", "lb", "mt", "pl", "pt", "ro", "sk", "sl", "es", "ca",
    "eu", "gl", "sv", "ga",
]
NEW_LABELS: dict[str, dict[str, str]] = {}
REDIRECTS: list[dict] = []


def pack(de, en, tr, **more):
    row = {loc: en for loc in LOCALES}
    row.update({"de": de, "en": en, "tr": tr, **more})
    return row


def node(cid, order, labels, slug, url, level, children, **extra):
    NEW_LABELS[cid] = labels
    out = {"id": cid, "menu_order": order, "name": labels["de"], "slug": slug, "url": url, "level": level, "children": children}
    out.update(extra)
    return out


def l3(parent_id, parent_url, suffix, labels, slug, **extra):
    return node(f"{parent_id}-{suffix}", int(suffix), labels, slug, f"{parent_url}/{slug}", 3, [], **extra)


def remember_redirect(old_url, new_url):
    old = old_url if old_url.endswith("/") else old_url + "/"
    new = new_url if new_url.endswith("/") else new_url + "/"
    if old != new:
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Plumbing placeholder L3 replaced with a real product group"})


TANK = [
    ("01", pack("Hauswassertanks", "House tanks", "Ev su deposu", ar="خزانات منزلية", fr="Citernes maison", it="Serbatoi casa", es="Depósitos casa"), "hauswassertanks"),
    ("02", pack("Zisternen", "Cisterns", "Sarnıç", ar="صهاريج", fr="Citerne", it="Cisterne", es="Cisternas"), "zisternen"),
    ("03", pack("IBC-Anschluss", "IBC fittings", "IBC bağlantı", ar="وصلات IBC", fr="Raccords IBC", it="Raccordi IBC", es="Racores IBC"), "ibc-anschluss"),
    ("04", pack("Schwimmerventile", "Float valves", "Şamandıra", ar="عوامات", fr="Flotteurs", it="Galleggianti", es="Flotadores"), "schwimmerventile"),
]
PUMP = [
    ("01", pack("Gartenpumpen", "Garden pumps", "Bahçe pompası", ar="مضخات حديقة", fr="Pompes jardin", it="Pompe giardino", es="Bombas jardín"), "gartenpumpen"),
    ("02", pack("Umwälzpumpen", "Circulation pumps", "Sirkülasyon", ar="مضخات دوران", fr="Circulateurs", it="Circolatori", es="Circuladoras"), "umwaelzpumpen"),
    ("03", pack("Tauchpumpen", "Submersible pumps", "Dalgıç pompa", ar="مضخات غاطسة", fr="Pompes immergées", it="Pompe sommerse", es="Bombas sumergibles"), "tauchpumpen"),
    ("04", pack("Hauswasserwerke", "Booster sets", "Ev su sistemi", ar="محطات منزلية", fr="Surpresseurs", it="Autoclave", es="Grupos presión"), "hauswasserwerke"),
]
TAP = [
    ("01", pack("Mischbatterien", "Mixers", "Batarya", ar="خلاطات", fr="Mitigeurs", it="Miscelatori", es="Mezcladores"), "mischbatterien"),
    ("02", pack("Kugelhähne", "Ball valves", "Küresel vana", ar="صمامات كروية", fr="Vannes à bille", it="Valvole a sfera", es="Válvulas de bola"), "kugelhaehne"),
    ("03", pack("Eckventile", "Angle valves", "Köşe vana", ar="صمامات زاوية", fr="Robinets d'équerre", it="Rubinetti squadra", es="Llaves escuadra"), "eckventile"),
    ("04", pack("Rückschlagventile", "Check valves", "Çekvalf", ar="صمامات لا رجعة", fr="Clapets", it="Valvole di ritegno", es="Válvulas retención"), "rueckschlagventile"),
]
PIPE = [
    ("01", pack("Kupferrohre", "Copper pipe", "Bakır boru", ar="نحاس", fr="Cuivre", it="Rame", es="Cobre"), "kupferrohre"),
    ("02", pack("Mehrschicht", "Multilayer", "Çok katman", ar="متعدد الطبقات", fr="Multicouche", it="Multistrato", es="Multicapa"), "mehrschicht"),
    ("03", pack("PEX", "PEX", "PEX", ar="PEX", fr="PER", it="PEX", es="PEX"), "pex"),
    ("04", pack("Fittings", "Fittings", "Rakor", ar="وصلات", fr="Raccords", it="Raccordi", es="Racores"), "fittings"),
]
FILT = [
    ("01", pack("Hauswasserfilter", "Whole-house filters", "Ev su filtresi", ar="فلاتر منزلية", fr="Filtres maison", it="Filtri casa", es="Filtros casa"), "hauswasserfilter"),
    ("02", pack("Kartuschen", "Cartridges", "Kartuş", ar="خراطيش", fr="Cartouches", it="Cartucce", es="Cartuchos"), "kartuschen"),
    ("03", pack("Umkehrosmose", "RO", "Ters osmoz", ar="تناضح عكسي", fr="Osmose inverse", it="Osmosi inversa", es="Ósmosis"), "umkehrosmose"),
    ("04", pack("Kalkfilter", "Scale filters", "Kireç filtresi", ar="كلس", fr="Anti-calcaire", it="Anticalcare", es="Antical"), "kalkfilter"),
    ("05", pack("Untertisch", "Under-sink", "Eviye altı", ar="تحت الحوض", fr="Sous évier", it="Sottolavello", es="Bajo fregadero"), "untertisch"),
]
IRR = [
    ("01", pack("Hahnanschlüsse", "Tap adapters", "Musluk adaptörü", ar="محولات حنفية", fr="Raccords robinet", it="Raccordi rubinetto", es="Adaptadores grifo"), "hahnanschluesse"),
    ("02", pack("Tropfer", "Drippers", "Damlatıcı", ar="نقاطات", fr="Goutteurs", it="Gocciolatori", es="Goteros"), "tropfer"),
    ("03", pack("Schlauchkupplungen", "Hose couplings", "Hortum rakoru", ar="وصلات خرطوم", fr="Raccords tuyau", it="Raccordi tubo", es="Racores manguera"), "schlauchkupplungen"),
    ("04", pack("Bewässerungsuhren", "Water timers", "Sulama saati", ar="مؤقتات", fr="Programmateurs", it="Timer", es="Programadores"), "bewaesserungsuhren"),
]
HEAT = [
    ("01", pack("Heizkörper", "Radiators", "Radyatör", ar="مشعات", fr="Radiateurs", it="Radiatori", es="Radiadores"), "heizkoerper"),
    ("02", pack("Thermostate", "Thermostats", "Termostat", ar="منظمات", fr="Thermostats", it="Termostati", es="Termostatos"), "thermostate"),
    ("03", pack("Handtuchtrockner", "Towel rails", "Havluluk", ar="سحابات مناشف", fr="Sèche-serviettes", it="Scaldasalviette", es="Toalleros"), "handtuchtrockner"),
    ("04", pack("Ausdehnungsgefäße", "Expansion vessels", "Genleşme tankı", ar="أوعية تمدد", fr="Vases d'expansion", it="Vasi espansione", es="Vasos expansión"), "ausdehnungsgefaesse"),
]
EXISTING = {
    "cat-23-01": (pack("Wassertanks", "Water tanks", "Su deposu", ar="خزانات ماء", fr="Citernes", it="Serbatoi", es="Depósitos"), TANK),
    "cat-23-02": (pack("Pumpen", "Pumps", "Pompa", ar="مضخات", fr="Pompes", it="Pompe", es="Bombas"), PUMP),
    "cat-23-03": (pack("Hähne & Ventile", "Taps & valves", "Musluk ve vana", ar="حنفيات وصمامات", fr="Robinets et vannes", it="Rubinetti e valvole", es="Grifos y válvulas"), TAP),
    "cat-23-04": (pack("Rohre & Fittinge", "Pipes & fittings", "Boru ve rakor", ar="أنابيب ووصلات", fr="Tubes et raccords", it="Tubi e raccordi", es="Tuberías y racores"), PIPE),
    "cat-23-05": (pack("Wasserfilter", "Water filters", "Su filtresi", ar="فلاتر ماء", fr="Filtres à eau", it="Filtri acqua", es="Filtros de agua"), FILT),
    "cat-23-06": (pack("Gartenbewässerung", "Garden irrigation", "Bahçe sulama", ar="ري الحديقة", fr="Arrosage jardin", it="Irrigazione giardino", es="Riego jardín"), IRR),
    "cat-23-07": (pack("Heizung", "Heating", "Isıtma", ar="تدفئة", fr="Chauffage", it="Riscaldamento", es="Calefacción"), HEAT),
}
NEW_L2 = [
    ("08", "sanitaer", pack("Sanitär", "Sanitary", "Sıhhi tesisat", ar="صحي", fr="Sanitaire", it="Sanitari", es="Sanitario"), [
        ("01", pack("Siphons", "Traps", "Sifon", ar="سيفون", fr="Siphons", it="Sifoni", es="Sifones"), "siphons"),
        ("02", pack("Abläufe", "Drains", "Gider", ar="مصارف", fr="Écoulements", it="Scarichi", es="Desagües"), "ablaeufe"),
        ("03", pack("WC-Spülung", "WC flush", "Klozet rezervuar", ar="سيفون مرحاض", fr="Chasse d'eau", it="Cassetta WC", es="Cisterna WC"), "wc-spuelung"),
        ("04", pack("Dichtungen", "Seals", "Conta", ar="حشوات", fr="Joints", it="Guarnizioni", es="Juntas"), "dichtungen"),
    ]),
]


def replace_l3_group(parent, specs):
    existing = {child["id"]: child for child in parent.get("children") or []}
    rebuilt = []
    kept = set()
    for suffix, labels, slug in specs:
        extra = {}
        old = existing.get(f"{parent['id']}-{suffix}")
        if old:
            extra["legacy_name"] = old.get("name")
            extra["legacy_slug"] = old.get("slug")
            extra["legacy_url"] = old.get("url")
            remember_redirect(old["url"], f"{parent['url']}/{slug}")
            kept.add(old["id"])
        rebuilt.append(l3(parent["id"], parent["url"], suffix, labels, slug, **extra))
    for old in existing.values():
        if old["id"] not in kept:
            remember_redirect(old["url"], parent["url"])
    parent["children"] = rebuilt


def main():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    tree = json.loads(TREE_PATH.read_text(encoding="utf-8"))
    redirects = json.loads(REDIRECTS_PATH.read_text(encoding="utf-8"))
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-23")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-23-{suffix}"
        if cid in existing:
            continue
        url = f"{cat['url']}/{slug}"
        hub = node(cid, int(suffix), labels, slug, url, 2, [])
        for item in children:
            hub["children"].append(l3(cid, url, item[0], item[1], item[2]))
        cat["children"].append(hub)
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tree.update(NEW_LABELS)
    TREE_PATH.write_text(json.dumps(tree, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    seen = {(i.get("from"), i.get("to")) for i in redirects}
    for item in REDIRECTS:
        key = (item["from"], item["to"])
        if key not in seen:
            redirects.append(item)
            seen.add(key)
    REDIRECTS_PATH.write_text(json.dumps(redirects, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("L2", len(cat["children"]), "L3", sum(len(c.get("children") or []) for c in cat["children"]), "labels", len(NEW_LABELS), "redirects", len(REDIRECTS))


if __name__ == "__main__":
    main()
