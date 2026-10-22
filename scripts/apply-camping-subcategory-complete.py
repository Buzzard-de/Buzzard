#!/usr/bin/env python3
"""Complete Outdoor, Camping & Abenteuer (cat-33) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Camping placeholder L3 replaced with a real product group"})


CAMP = [
    ("01", pack("Zelte", "Tents", "Çadır", ar="خيام", fr="Tentes", it="Tende", es="Tiendas"), "zelte"),
    ("02", pack("Schlafsäcke", "Sleeping bags", "Uyku tulumu", ar="أكياس نوم", fr="Sacs de couchage", it="Sacchi a pelo", es="Sacos de dormir"), "schlafsacke"),
    ("03", pack("Isomatten", "Sleeping pads", "Mat", ar="فرش", fr="Matelas", it="Materassini", es="Esterillas"), "isomatten"),
    ("04", pack("Campingmöbel", "Camp furniture", "Kamp mobilyası", ar="أثاث تخييم", fr="Mobilier camping", it="Mobili camping", es="Muebles camping"), "campingmoebel"),
]
VAN = [
    ("01", pack("Markisen", "Awnings", "Tente", ar="مظلات", fr="Stores", it="Tendalini", es="Toldos"), "markisen"),
    ("02", pack("Frischwasser", "Fresh water", "Tatlı su", ar="مياه عذبة", fr="Eau douce", it="Acqua dolce", es="Agua dulce"), "frischwasser"),
    ("03", pack("Bordstrom", "Onboard power", "Araç elektriği", ar="طاقة", fr="Électricité bord", it="Elettricità", es="Electricidad"), "bordstrom"),
    ("04", pack("Sanitär", "Sanitary", "Sıhhi", ar="صحي", fr="Sanitaire", it="Sanitari", es="Sanitario"), "sanitaer"),
]
PICNIC = [
    ("01", pack("Picknickkörbe", "Picnic baskets", "Piknik sepeti", ar="سلال", fr="Paniers", it="Ceste", es="Cestas"), "picknickkoerbe"),
    ("02", pack("Kühlboxen", "Coolers", "Soğutucu", ar="مبردات", fr="Glacières", it="Ghiacciaie", es="Neveras"), "kuehlboxen"),
    ("03", pack("Geschirr", "Tableware", "Sofra", ar="أواني", fr="Vaisselle", it="Stoviglie", es="Vajilla"), "geschirr"),
    ("04", pack("Decken", "Blankets", "Örtü", ar="بطانيات", fr="Couvertures", it="Coperte", es="Mantas"), "decken"),
]
FISH = [
    ("01", pack("Ruten", "Rods", "Olta", ar="صنارات", fr="Cannes", it="Canne", es="Cañas"), "ruten"),
    ("02", pack("Rollen", "Reels", "Makara", ar="بكرات", fr="Moulinets", it="Mulinelli", es="Carretes"), "rollen"),
    ("03", pack("Köder", "Lures", "Yem", ar="طعوم", fr="Leurres", it="Esche", es="Señuelos"), "koeder"),
    ("04", pack("Kescher", "Landing nets", "Kepçe", ar="شباك", fr="Épuisettes", it="Guadini", es="Sacaderas"), "kescher"),
]
COOK = [
    ("01", pack("Campingkocher", "Camp stoves", "Kamp ocağı", ar="مواقد", fr="Réchauds", it="Fornelli", es="Hornillos"), "campingkocher"),
    ("02", pack("Gaskartuschen", "Gas cartridges", "Gaz kartuşu", ar="خراطيش غاز", fr="Cartouches gaz", it="Cartucce gas", es="Cartuchos"), "gaskartuschen"),
    ("03", pack("Outdoor-Geschirr", "Outdoor cookware", "Outdoor tencere", ar="أواني خارجية", fr="Batterie outdoor", it="Pentole outdoor", es="Menaje outdoor"), "outdoor-geschirr"),
    ("04", pack("Dutch Oven", "Dutch oven", "Dutch oven", ar="فرن هولندي", fr="Dutch oven", it="Dutch oven", es="Dutch oven"), "dutch-oven"),
]
LIGHT = [
    ("01", pack("Stirnlampen", "Headlamps", "Kafa feneri", ar="مصابيح رأس", fr="Lampes frontales", it="Frontali", es="Frontales"), "stirnlampen"),
    ("02", pack("Laternen", "Lanterns", "Fener", ar="فوانيس", fr="Lanternes", it="Lanterne", es="Linternas"), "laternen"),
    ("03", pack("Powerbanks", "Power banks", "Powerbank", ar="شواحن", fr="Batteries", it="Power bank", es="Power banks"), "powerbanks"),
    ("04", pack("Solarlampen", "Solar lamps", "Güneş lambası", ar="طاقة شمسية", fr="Lampes solaires", it="Lampade solari", es="Lámparas solares"), "solarlampen"),
]
EXISTING = {
    "cat-33-01": (pack("Camping-Ausrüstung", "Camping gear", "Kamp ekipmanı", ar="معدات تخييم", fr="Équipement camping", it="Attrezzatura camping", es="Equipo camping"), CAMP),
    "cat-33-02": (pack("Wohnmobil-Zubehör", "Camper accessories", "Karavan aksesuarı", ar="إكسسوارات كرفان", fr="Accessoires camping-car", it="Accessori camper", es="Accesorios autocaravana"), VAN),
    "cat-33-03": (pack("Picknick", "Picnic", "Piknik", ar="نزهة", fr="Pique-nique", it="Picnic", es="Picnic"), PICNIC),
    "cat-33-04": (pack("Angeln", "Fishing", "Balıkçılık", ar="صيد", fr="Pêche", it="Pesca", es="Pesca"), FISH),
    "cat-33-05": (pack("Outdoor-Kochen", "Outdoor cooking", "Açık hava pişirme", ar="طبخ خارجي", fr="Cuisine outdoor", it="Cucina outdoor", es="Cocina outdoor"), COOK),
    "cat-33-06": (pack("Licht & Energie", "Light & power", "Işık ve enerji", ar="ضوء وطاقة", fr="Lumière et énergie", it="Luce e energia", es="Luz y energía"), LIGHT),
}
NEW_L2 = [
    ("07", "trekking", pack("Trekking", "Trekking", "Trekking", ar="تنزه", fr="Trekking", it="Trekking", es="Trekking"), [
        ("01", pack("Rucksäcke", "Backpacks", "Sırt çantası", ar="حقائب", fr="Sacs à dos", it="Zaini", es="Mochilas"), "rucksaecke"),
        ("02", pack("Wanderstöcke", "Trekking poles", "Yürüyüş batonu", ar="عصي", fr="Bâtons", it="Bastoncini", es="Bastones"), "wanderstoecke"),
        ("03", pack("Trinksysteme", "Hydration", "Su sistemi", ar="ترطيب", fr="Hydratation", it="Idratazione", es="Hidratación"), "trinksysteme"),
        ("04", pack("Orientierung", "Navigation", "Yön bulma", ar="ملاحة", fr="Orientation", it="Orientamento", es="Orientación"), "orientierung"),
    ]),
    ("08", "survival", pack("Survival", "Survival", "Survival", ar="بقاء", fr="Survie", it="Sopravvivenza", es="Supervivencia"), [
        ("01", pack("Multitools", "Multitools", "Çok amaçlı", ar="أدوات متعددة", fr="Multitools", it="Multitool", es="Multiherramientas"), "multitools"),
        ("02", pack("Feuerstarter", "Fire starters", "Ateş başlatıcı", ar="قداحة", fr="Allume-feu", it="Accendifuoco", es="Iniciadores"), "feuerstarter"),
        ("03", pack("Survival-Kits", "Survival kits", "Hayatta kalma kiti", ar="أطقم بقاء", fr="Kits de survie", it="Kit survival", es="Kits supervivencia"), "survival-kits"),
        ("04", pack("Erste Hilfe", "First aid", "İlk yardım", ar="إسعاف", fr="Premiers secours", it="Primo soccorso", es="Primeros auxilios"), "erste-hilfe"),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-33")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-33-{suffix}"
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
