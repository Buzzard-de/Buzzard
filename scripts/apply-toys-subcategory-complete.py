#!/usr/bin/env python3
"""Complete Spielzeug & Kinder (cat-18) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Toys placeholder L3 replaced with a real product group"})


LEARN = [
    ("01", pack("Holzspielzeug", "Wooden toys", "Ahşap oyuncak", ar="ألعاب خشبية", fr="Jouets en bois", it="Giocattoli in legno", es="Juguetes de madera"), "holzspielzeug"),
    ("02", pack("Montessori", "Montessori", "Montessori", ar="مونتيسوري", fr="Montessori", it="Montessori", es="Montessori"), "montessori"),
    ("03", pack("Experimentierkästen", "Science kits", "Deney seti", ar="أطقم تجارب", fr="Coffrets scientifiques", it="Kit scientifici", es="Kits de ciencia"), "experimentierkaesten"),
    ("04", pack("Lernkarten", "Flash cards", "Öğrenme kartı", ar="بطاقات تعليم", fr="Cartes éducatives", it="Schede didattiche", es="Tarjetas educativas"), "lernkarten"),
]
BABY = [
    ("01", pack("Activity-Center", "Activity centres", "Aktivite merkezi", ar="مراكز نشاط", fr="Centres d'activités", it="Centri attività", es="Centros de actividad"), "activity-center"),
    ("02", pack("Mobiles", "Mobiles", "Dönence", ar="موبايل سرير", fr="Mobiles", it="Giostrine", es="Móviles"), "mobiles"),
    ("03", pack("Quietschetiere", "Squeaky toys", "Cıvıl oyuncak", ar="ألعاب صوتية", fr="Jouets sonores", it="Giocattoli sonori", es="Juguetes sonoros"), "quietschetiere"),
    ("04", pack("Stapeltürme", "Stacking toys", "İstif kulesi", ar="أبراج تكديس", fr="Tours à empiler", it="Torri impilabili", es="Torres apilables"), "stapeltuerme"),
]
VEH = [
    ("01", pack("Spielzeugautos", "Toy cars", "Oyuncak araba", ar="سيارات ألعاب", fr="Voitures jouets", it="Macchinine", es="Coches de juguete"), "spielzeugautos"),
    ("02", pack("Fernsteuerung", "RC toys", "Kumandalı", ar="تحكم عن بعد", fr="Télécommandés", it="Radiocomandati", es="Radiocontrol"), "fernsteuerung"),
    ("03", pack("Eisenbahnen", "Train sets", "Tren seti", ar="قطارات", fr="Trains", it="Trenini", es="Trenes"), "eisenbahnen"),
    ("04", pack("Flugzeuge", "Toy planes", "Uçak", ar="طائرات", fr="Avions", it="Aerei", es="Aviones"), "flugzeuge"),
]
PUZZLE = [
    ("01", pack("Rahmenpuzzle", "Tray puzzles", "Çerçeveli puzzle", ar="بازل بإطار", fr="Puzzles à cadre", it="Puzzle con cornice", es="Puzzles con marco"), "rahmenpuzzle"),
    ("02", pack("3D-Puzzle", "3D puzzles", "3D puzzle", ar="بازل ثلاثي", fr="Puzzles 3D", it="Puzzle 3D", es="Puzzles 3D"), "3d-puzzle"),
    ("03", pack("Kinderpuzzle", "Kids' puzzles", "Çocuk puzzle", ar="بازل أطفال", fr="Puzzles enfants", it="Puzzle bambini", es="Puzzles infantiles"), "kinderpuzzle"),
    ("04", pack("Erwachsenenpuzzle", "Adult puzzles", "Yetişkin puzzle", ar="بازل للكبار", fr="Puzzles adultes", it="Puzzle adulti", es="Puzzles adultos"), "erwachsenenpuzzle"),
]
BOARD = [
    ("01", pack("Familienspiele", "Family games", "Aile oyunu", ar="ألعاب عائلية", fr="Jeux de famille", it="Giochi famiglia", es="Juegos familiares"), "familienspiele"),
    ("02", pack("Kinderspiele", "Kids' games", "Çocuk oyunu", ar="ألعاب أطفال", fr="Jeux enfants", it="Giochi bambini", es="Juegos infantiles"), "kinderspiele"),
    ("03", pack("Kartenspiele", "Card games", "Kart oyunu", ar="ألعاب ورق", fr="Jeux de cartes", it="Giochi di carte", es="Juegos de cartas"), "kartenspiele"),
    ("04", pack("Strategiespiele", "Strategy games", "Strateji oyunu", ar="ألعاب استراتيجية", fr="Jeux de stratégie", it="Giochi di strategia", es="Juegos de estrategia"), "strategiespiele"),
]
OUT = [
    ("01", pack("Sandspielzeug", "Sand toys", "Kum oyuncağı", ar="ألعاب رمل", fr="Jouets de sable", it="Giochi sabbia", es="Juguetes de arena"), "sandspielzeug"),
    ("02", pack("Rutschfahrzeuge", "Ride-ons", "Binmeli", ar="دراجات أطفال", fr="Porteurs", it="Cavalcabili", es="Correpasillos"), "rutschfahrzeuge"),
    ("03", pack("Bälle", "Balls", "Top", ar="كرات", fr="Ballons", it="Palloni", es="Pelotas"), "baelle"),
    ("04", pack("Wasserspiel", "Water play", "Su oyunu", ar="لعب مائي", fr="Jeux d'eau", it="Giochi d'acqua", es="Juegos de agua"), "wasserspiel"),
]
PARTY = [
    ("01", pack("Luftballons", "Balloons", "Balon", ar="بالونات", fr="Ballons", it="Palloncini", es="Globos"), "luftballons"),
    ("02", pack("Piñatas", "Piñatas", "Pinyata", ar="بينياتا", fr="Piñatas", it="Pignatte", es="Piñatas"), "pinatas"),
    ("03", pack("Kostüme", "Costumes", "Kostüm", ar="أزياء", fr="Costumes", it="Costumi", es="Disfraces"), "kostueme"),
    ("04", pack("Tischdeko", "Table décor", "Masa süsü", ar="زينة طاولة", fr="Déco de table", it="Decorazioni tavola", es="Decoración de mesa"), "tischdeko"),
]
CRAFT = [
    ("01", pack("Knete", "Modelling clay", "Oyun hamuru", ar="صلصال", fr="Pâte à modeler", it="Plastilina", es="Plastilina"), "knete"),
    ("02", pack("Malsets", "Painting sets", "Boyama seti", ar="أطقم تلوين", fr="Coffrets peinture", it="Set pittura", es="Sets de pintura"), "malsets"),
    ("03", pack("Bastelsets", "Craft kits", "El işi seti", ar="أطقم حرف", fr="Kits créatifs", it="Kit creativi", es="Kits de manualidades"), "bastelsets"),
    ("04", pack("Perlen", "Beads", "Boncuk", ar="خرز", fr="Perles", it="Perline", es="Cuentas"), "perlen"),
]
EXISTING = {
    "cat-18-01": (pack("Lernspielzeug", "Educational toys", "Eğitici oyuncak", ar="ألعاب تعليمية", fr="Jouets éducatifs", it="Giocattoli educativi", es="Juguetes educativos"), LEARN),
    "cat-18-02": (pack("Baby-Spielzeug", "Baby toys", "Bebek oyuncağı", ar="ألعاب رضع", fr="Jouets bébé", it="Giocattoli neonato", es="Juguetes de bebé"), BABY),
    "cat-18-03": (pack("Fahrzeuge & RC", "Vehicles & RC", "Araç ve kumanda", ar="مركبات وتحكم", fr="Véhicules et RC", it="Veicoli e RC", es="Vehículos y RC"), VEH),
    "cat-18-04": (pack("Puzzle", "Puzzles", "Puzzle", ar="بازل", fr="Puzzles", it="Puzzle", es="Puzzles"), PUZZLE),
    "cat-18-05": (pack("Brett- & Kartenspiele", "Board & card games", "Kutu ve kart oyunları", ar="ألعاب لوح وورق", fr="Jeux de société", it="Giochi da tavolo", es="Juegos de mesa"), BOARD),
    "cat-18-06": (pack("Outdoor-Spielzeug", "Outdoor toys", "Dış mekân oyuncağı", ar="ألعاب خارجية", fr="Jouets extérieur", it="Giochi outdoor", es="Juguetes exterior"), OUT),
    "cat-18-07": (pack("Party & Feier", "Party", "Parti", ar="حفلات", fr="Fêtes", it="Feste", es="Fiesta"), PARTY),
}
NEW_L2 = [
    ("08", "kreativ-und-basteln", pack("Kreativ & Basteln", "Crafts", "El işi", ar="حرف يدوية", fr="Loisirs créatifs", it="Creatività", es="Manualidades"), CRAFT),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-18")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-18-{suffix}"
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
