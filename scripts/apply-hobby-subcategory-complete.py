#!/usr/bin/env python3
"""Complete Hobby & Freizeit (cat-19) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Hobby placeholder L3 replaced with a real product group"})


CRAFT = [
    ("01", pack("Stricken", "Knitting", "Örgü", ar="حياكة", fr="Tricot", it="Maglia", es="Punto"), "stricken"),
    ("02", pack("Häkeln", "Crochet", "Tığ işi", ar="كروشيه", fr="Crochet", it="Uncinetto", es="Ganchillo"), "haekeln"),
    ("03", pack("Stickerei", "Embroidery", "Nakış", ar="تطريز", fr="Broderie", it="Ricamo", es="Bordado"), "stickerei"),
    ("04", pack("Perlen", "Beads", "Boncuk", ar="خرز", fr="Perles", it="Perline", es="Cuentas"), "perlen"),
]
MODEL = [
    ("01", pack("Modellautos", "Model cars", "Model araba", ar="سيارات مجسمة", fr="Voitures modèles", it="Auto modello", es="Coches modelo"), "modellautos"),
    ("02", pack("Flugmodelle", "Model aircraft", "Uçak modeli", ar="طائرات مجسمة", fr="Avions modèles", it="Aerei modello", es="Aviones modelo"), "flugmodelle"),
    ("03", pack("Schiffsmodelle", "Model ships", "Gemi modeli", ar="سفن مجسمة", fr="Bateaux modèles", it="Navi modello", es="Barcos modelo"), "schiffsmodelle"),
    ("04", pack("Farben & Werkzeug", "Paints & tools", "Boya ve alet", ar="دهانات وأدوات", fr="Peintures et outils", it="Colori e attrezzi", es="Pinturas y herramientas"), "farben-und-werkzeug"),
]
COLL = [
    ("01", pack("Briefmarken", "Stamps", "Pul", ar="طوابع", fr="Timbres", it="Francobolli", es="Sellos"), "briefmarken"),
    ("02", pack("Münzen", "Coins", "Madeni para", ar="عملات", fr="Pièces", it="Monete", es="Monedas"), "muenzen"),
    ("03", pack("Sammelkarten", "Trading cards", "Koleksiyon kartı", ar="بطاقات جمع", fr="Cartes à collectionner", it="Carte collezione", es="Cartas coleccion"), "sammelkarten"),
    ("04", pack("Vitrinen", "Display cases", "Vitrin", ar="خزائن عرض", fr="Vitrines", it="Vetrine", es="Vitrinas"), "vitrinen"),
]
MUSIC = [
    ("01", pack("Saiten", "Strings", "Tel", ar="أوتار", fr="Cordes", it="Corde", es="Cuerdas"), "saiten"),
    ("02", pack("Plektren", "Picks", "Pena", ar="ريش", fr="Médiator", it="Plettri", es="Púas"), "plektren"),
    ("03", pack("Stimmgeräte", "Tuners", "Akort cihazı", ar="موالفات", fr="Accordeurs", it="Accordatori", es="Afinadores"), "stimmgeraete"),
    ("04", pack("Kabel", "Cables", "Kablo", ar="كابلات", fr="Câbles", it="Cavi", es="Cables"), "kabel"),
]
PUZ = [
    ("01", pack("1000 Teile", "1000 pieces", "1000 parça", ar="1000 قطعة", fr="1000 pièces", it="1000 pezzi", es="1000 piezas"), "1000-teile"),
    ("02", pack("3D-Puzzles", "3D puzzles", "3D puzzle", ar="ألغاز ثلاثية", fr="Puzzles 3D", it="Puzzle 3D", es="Puzzles 3D"), "3d-puzzles"),
    ("03", pack("Kinderpuzzles", "Kids puzzles", "Çocuk puzzle", ar="ألغاز أطفال", fr="Puzzles enfants", it="Puzzle bambini", es="Puzzles niños"), "kinderpuzzles"),
    ("04", pack("Puzzle-Zubehör", "Puzzle extras", "Puzzle aksesuarı", ar="ملحقات ألغاز", fr="Accessoires puzzle", it="Accessori puzzle", es="Accesorios puzzle"), "puzzle-zubehoer"),
]
BOARD = [
    ("01", pack("Familienspiele", "Family games", "Aile oyunu", ar="ألعاب عائلية", fr="Jeux famille", it="Giochi famiglia", es="Juegos familia"), "familienspiele"),
    ("02", pack("Strategiespiele", "Strategy games", "Strateji", ar="ألعاب استراتيجية", fr="Jeux stratégie", it="Giochi strategia", es="Juegos estrategia"), "strategiespiele"),
    ("03", pack("Kartenspiele", "Card games", "Kart oyunu", ar="ألعاب ورق", fr="Jeux de cartes", it="Giochi di carte", es="Juegos de cartas"), "kartenspiele"),
    ("04", pack("Würfel & Tokens", "Dice & tokens", "Zar ve token", ar="نرد ورموز", fr="Dés et jetons", it="Dadi e gettoni", es="Dados y fichas"), "wuerfel-und-tokens"),
]
DIY = [
    ("01", pack("Heißklebepistolen", "Glue guns", "Silikon tabancası", ar="مسدسات صمغ", fr="Pistolets colle", it="Pistole colla", es="Pistolas silicona"), "heissklebepistolen"),
    ("02", pack("Bastelscheren", "Craft scissors", "Makas", ar="مقص حرف", fr="Ciseaux craft", it="Forbici craft", es="Tijeras craft"), "bastelscheren"),
    ("03", pack("Holzstäbchen", "Craft sticks", "Ahşap çubuk", ar="عصي خشب", fr="Bâtonnets bois", it="Stecche legno", es="Palitos madera"), "holzstaebchen"),
    ("04", pack("Bastelsets", "Craft kits", "Hobi seti", ar="أطقم حرف", fr="Kits créatifs", it="Kit hobby", es="Kits manualidades"), "bastelsets"),
]
PAINT = [
    ("01", pack("Acrylfarben", "Acrylic paints", "Akrilik boya", ar="أكريليك", fr="Peintures acryliques", it="Acrilici", es="Acrílicos"), "acrylfarben"),
    ("02", pack("Aquarell", "Watercolor", "Sulu boya", ar="ألوان مائية", fr="Aquarelle", it="Acquerello", es="Acuarela"), "aquarell"),
    ("03", pack("Pinsel", "Brushes", "Fırça", ar="فرش", fr="Pinceaux", it="Pennelli", es="Pinceles"), "pinsel"),
    ("04", pack("Leinwände", "Canvases", "Tuval", ar="لوحات قماشية", fr="Toiles", it="Tele", es="Lienzos"), "leinwaende"),
]
EXISTING = {
    "cat-19-01": (pack("Handarbeiten", "Handicrafts", "El işi", ar="أعمال يدوية", fr="Travaux manuels", it="Lavori manuali", es="Manualidades"), CRAFT),
    "cat-19-02": (pack("Modellbau", "Model making", "Maket", ar="نماذج", fr="Modélisme", it="Modellismo", es="Modelismo"), MODEL),
    "cat-19-03": (pack("Sammeln", "Collecting", "Koleksiyon", ar="جمع", fr="Collection", it="Collezionismo", es="Coleccionismo"), COLL),
    "cat-19-04": (pack("Musik-Zubehör", "Music accessories", "Müzik aksesuarı", ar="ملحقات موسيقى", fr="Accessoires musique", it="Accessori musica", es="Accesorios música"), MUSIC),
    "cat-19-05": (pack("Puzzles", "Puzzles", "Puzzle", ar="ألغاز", fr="Puzzles", it="Puzzle", es="Puzzles"), PUZ),
    "cat-19-06": (pack("Brettspiele", "Board games", "Masa oyunu", ar="ألعاب طاولة", fr="Jeux de société", it="Giochi da tavolo", es="Juegos de mesa"), BOARD),
    "cat-19-07": (pack("Basteln", "Craft DIY", "Kendin yap", ar="أشغال يدوية", fr="Loisirs créatifs", it="Fai da te", es="Manualidades DIY"), DIY),
}
NEW_L2 = [
    ("08", "malen-und-zeichnen", pack("Malen & Zeichnen", "Painting & drawing", "Boyama ve çizim", ar="رسم وتلوين", fr="Peinture et dessin", it="Pittura e disegno", es="Pintura y dibujo"), PAINT),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-19")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-19-{suffix}"
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
