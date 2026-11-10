#!/usr/bin/env python3
"""Complete Möbel & Wohnen (cat-11) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Furniture placeholder L3 replaced with a real product group"})


LIVING = [
    ("01", pack("Sofas", "Sofas", "Kanepe", ar="أرائك", fr="Canapés", it="Divani", es="Sofás"), "sofas"),
    ("02", pack("Sessel", "Armchairs", "Berjer", ar="كراسي بذراعين", fr="Fauteuils", it="Poltrone", es="Sillones"), "sessel"),
    ("03", pack("Couchtische", "Coffee tables", "Orta sehpa", ar="طاولات قهوة", fr="Tables basses", it="Tavolini", es="Mesas de centro"), "couchtische"),
    ("04", pack("TV-Möbel", "TV units", "TV ünitesi", ar="وحدات تلفاز", fr="Meubles TV", it="Mobili TV", es="Muebles TV"), "tv-moebel"),
]
BED = [
    ("01", pack("Betten", "Beds", "Yatak", ar="أسرة", fr="Lits", it="Letti", es="Camas"), "betten"),
    ("02", pack("Nachttische", "Nightstands", "Komodin", ar="طاولات سرير", fr="Tables de chevet", it="Comodini", es="Mesitas"), "nachttische"),
    ("03", pack("Kleiderschränke", "Wardrobes", "Gardırop", ar="خزائن ملابس", fr="Armoires", it="Armadi", es="Armarios"), "kleiderschraenke"),
    ("04", pack("Kommoden", "Chests", "Şifonyer", ar="كومودينو", fr="Commodes", it="Cassettiere", es="Cómodas"), "kommoden"),
]
OFFICE = [
    ("01", pack("Schreibtische", "Desks", "Çalışma masası", ar="مكاتب", fr="Bureaux", it="Scrivanie", es="Escritorios"), "schreibtische"),
    ("02", pack("Bürostühle", "Office chairs", "Ofis koltuğu", ar="كراسي مكتب", fr="Chaises de bureau", it="Sedie ufficio", es="Sillas de oficina"), "buerostuehle"),
    ("03", pack("Aktenregale", "Filing shelves", "Dosya rafı", ar="رفوف ملفات", fr="Étagères dossiers", it="Scaffali archivio", es="Estanterías archivo"), "aktenregale"),
    ("04", pack("Sideboards Büro", "Office sideboards", "Ofis konsolu", ar="كونسول مكتب", fr="Bahuts bureau", it="Madie ufficio", es="Aparadores oficina"), "sideboards-buero"),
]
GARDEN = [
    ("01", pack("Lounge-Sets", "Lounge sets", "Lounge set", ar="جلسات خارجية", fr="Salons de jardin", it="Salotti giardino", es="Sets de jardín"), "lounge-sets"),
    ("02", pack("Gartenstühle", "Garden chairs", "Bahçe sandalyesi", ar="كراسي حديقة", fr="Chaises de jardin", it="Sedie giardino", es="Sillas de jardín"), "gartenstuehle"),
    ("03", pack("Gartentische", "Garden tables", "Bahçe masası", ar="طاولات حديقة", fr="Tables de jardin", it="Tavoli giardino", es="Mesas de jardín"), "gartentische"),
    ("04", pack("Auflagen", "Cushions", "Minder", ar="وسائد خارجية", fr="Coussins extérieur", it="Cuscini outdoor", es="Cojines exterior"), "auflagen"),
]
KIDS = [
    ("01", pack("Kinderbetten", "Kids' beds", "Çocuk yatağı", ar="أسرة أطفال", fr="Lits enfants", it="Letti bambini", es="Camas infantiles"), "kinderbetten"),
    ("02", pack("Hochstühle", "High chairs", "Mama sandalyesi", ar="كراسي عالية", fr="Chaises hautes", it="Seggioloni", es="Tronas"), "hochstuehle"),
    ("03", pack("Kinderschreibtische", "Kids' desks", "Çocuk çalışma masası", ar="مكاتب أطفال", fr="Bureaux enfants", it="Scrivanie bambini", es="Escritorios infantiles"), "kinderschreibtische"),
    ("04", pack("Spielregale", "Toy shelves", "Oyuncak rafı", ar="رفوف ألعاب", fr="Étagères jouets", it="Scaffali giochi", es="Estanterías juguetes"), "spielregale"),
]
SHELF = [
    ("01", pack("Bücherregale", "Bookshelves", "Kitaplık", ar="مكتبات", fr="Bibliothèques", it="Librerie", es="Estanterías"), "buecherregale"),
    ("02", pack("Vitrinen", "Display cabinets", "Vitrin", ar="واجهات عرض", fr="Vitrines", it="Vetrine", es="Vitrinas"), "vitrinen"),
    ("03", pack("Garderoben", "Hall trees", "Portmanto", ar="علاقات مدخل", fr="Vestiaires", it="Appendiabiti", es="Percheros"), "garderoben"),
    ("04", pack("Schuhschränke", "Shoe cabinets", "Ayakkabılık", ar="خزائن أحذية", fr="Meubles chaussures", it="Scarpiera", es="Zapateros"), "schuhschraenke"),
]
TABLE = [
    ("01", pack("Esstische", "Dining tables", "Yemek masası", ar="طاولات طعام", fr="Tables à manger", it="Tavoli da pranzo", es="Mesas de comedor"), "esstische"),
    ("02", pack("Stühle", "Chairs", "Sandalye", ar="كراسي", fr="Chaises", it="Sedie", es="Sillas"), "stuehle"),
    ("03", pack("Bänke", "Benches", "Bank", ar="مقاعد طويلة", fr="Bancs", it="Panche", es="Bancos"), "baenke"),
    ("04", pack("Bartische", "Bar tables", "Bar masası", ar="طاولات بار", fr="Tables de bar", it="Tavoli bar", es="Mesas de bar"), "bartische"),
]
RELAX = [
    ("01", pack("Relaxsessel", "Recliners", "Tv koltuğu", ar="كراسي استرخاء", fr="Fauteuils relax", it="Poltrone relax", es="Sillones relax"), "relaxsessel"),
    ("02", pack("Hocker", "Stools", "Tabure", ar="مقاعد", fr="Tabourets", it="Sgabelli", es="Taburetes"), "hocker"),
    ("03", pack("Poufs", "Pouffes", "Puf", ar="بوف", fr="Poufs", it="Pouff", es="Pufs"), "poufs"),
    ("04", pack("Recamieren", "Chaises longues", "Şezlong", ar="شيزلونج", fr="Méridiennes", it="Chaise longue", es="Chaise longue"), "recamieren"),
]
EXISTING = {
    "cat-11-01": (pack("Wohnzimmermöbel", "Living-room furniture", "Oturma odası mobilyası", ar="أثاث معيشة", fr="Meubles salon", it="Mobili soggiorno", es="Muebles de salón"), LIVING),
    "cat-11-02": (pack("Schlafzimmermöbel", "Bedroom furniture", "Yatak odası mobilyası", ar="أثاث غرف نوم", fr="Meubles chambre", it="Mobili camera", es="Muebles de dormitorio"), BED),
    "cat-11-03": (pack("Büromöbel", "Office furniture", "Ofis mobilyası", ar="أثاث مكتب", fr="Meubles bureau", it="Mobili ufficio", es="Muebles de oficina"), OFFICE),
    "cat-11-04": (pack("Gartenmöbel", "Garden furniture", "Bahçe mobilyası", ar="أثاث حديقة", fr="Meubles de jardin", it="Mobili giardino", es="Muebles de jardín"), GARDEN),
    "cat-11-05": (pack("Kindermöbel", "Kids' furniture", "Çocuk mobilyası", ar="أثاث أطفال", fr="Meubles enfants", it="Mobili bambini", es="Muebles infantiles"), KIDS),
    "cat-11-06": (pack("Regal & Schrank", "Shelves & cabinets", "Raf ve dolap", ar="رفوف وخزائن", fr="Étagères et armoires", it="Scaffali e armadi", es="Estanterías y armarios"), SHELF),
    "cat-11-07": (pack("Tisch & Stuhl", "Tables & chairs", "Masa ve sandalye", ar="طاولات وكراسي", fr="Tables et chaises", it="Tavoli e sedie", es="Mesas y sillas"), TABLE),
}
NEW_L2 = [
    ("08", "polster-und-relax", pack("Polster & Relax", "Upholstery & relax", "Döşeme ve rahatlama", ar="تنجيد واسترخاء", fr="Rembourrage et relax", it="Imbottiti e relax", es="Tapizados y relax"), RELAX),
]


def replace_l3_group(parent, specs):
    existing = {child["id"]: child for child in parent.get("children") or []}
    rebuilt = []
    for suffix, labels, slug in specs:
        extra = {}
        old = existing.get(f"{parent['id']}-{suffix}")
        if old:
            extra["legacy_name"] = old.get("name")
            extra["legacy_slug"] = old.get("slug")
            extra["legacy_url"] = old.get("url")
            remember_redirect(old["url"], f"{parent['url']}/{slug}")
        rebuilt.append(l3(parent["id"], parent["url"], suffix, labels, slug, **extra))
    parent["children"] = rebuilt


def main():
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    tree = json.loads(TREE_PATH.read_text(encoding="utf-8"))
    redirects = json.loads(REDIRECTS_PATH.read_text(encoding="utf-8"))
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-11")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-11-{suffix}"
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
