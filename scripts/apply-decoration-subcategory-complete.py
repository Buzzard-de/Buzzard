#!/usr/bin/env python3
"""Complete Wohndekoration (cat-35) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Decoration placeholder L3 replaced with a real product group"})


WALL = [
    ("01", pack("Poster", "Posters", "Poster", ar="ملصقات", fr="Affiches", it="Poster", es="Pósters"), "poster"),
    ("02", pack("Leinwände", "Canvas prints", "Kanvas", ar="لوحات قماشية", fr="Toiles", it="Tele", es="Lienzos"), "leinwaende"),
    ("03", pack("Wandtattoos", "Wall stickers", "Duvar sticker", ar="ملصقات جدار", fr="Stickers muraux", it="Adesivi muro", es="Vinilos pared"), "wandtattoos"),
    ("04", pack("Wandbuchstaben", "Wall letters", "Duvar harfi", ar="حروف جدار", fr="Lettres murales", it="Lettere muro", es="Letras de pared"), "wandbuchstaben"),
]
CANDLE = [
    ("01", pack("Stumpenkerzen", "Pillar candles", "Blok mum", ar="شموع عمودية", fr="Bougies cylindriques", it="Candele a colonna", es="Velas pilar"), "stumpenkerzen"),
    ("02", pack("Teelichter", "Tealights", "Tealight", ar="شموع صغيرة", fr="Bougies chauffe-plat", it="Tealight", es="Velas de té"), "teelichter"),
    ("03", pack("Duftkerzen", "Scented candles", "Kokulu mum", ar="شموع معطرة", fr="Bougies parfumées", it="Candele profumate", es="Velas aromáticas"), "duftkerzen"),
    ("04", pack("Laternen", "Lanterns", "Fener", ar="فوانيس", fr="Lanternes", it="Lanterne", es="Farolillos"), "laternen"),
]
MIRROR = [
    ("01", pack("Wandspiegel", "Wall mirrors", "Duvar aynası", ar="مرايا جدار", fr="Miroirs muraux", it="Specchi da parete", es="Espejos de pared"), "wandspiegel"),
    ("02", pack("Standspiegel", "Floor mirrors", "Ayaklı ayna", ar="مرايا أرضية", fr="Miroirs sur pied", it="Specchi da terra", es="Espejos de pie"), "standspiegel"),
    ("03", pack("Kosmetikspiegel", "Makeup mirrors", "Makyaj aynası", ar="مرايا تجميل", fr="Miroirs maquillage", it="Specchi makeup", es="Espejos de maquillaje"), "kosmetikspiegel"),
    ("04", pack("Dekorspiegel", "Decorative mirrors", "Dekoratif ayna", ar="مرايا ديكور", fr="Miroirs déco", it="Specchi decorativi", es="Espejos decorativos"), "dekorspiegel"),
]
FRAME = [
    ("01", pack("Bilderrahmen", "Picture frames", "Çerçeve", ar="إطارات", fr="Cadres", it="Cornici", es="Marcos"), "bilderrahmen"),
    ("02", pack("Collagen", "Collage frames", "Kolaj çerçeve", ar="إطارات كولاج", fr="Cadres collage", it="Cornici collage", es="Marcos collage"), "collagen"),
    ("03", pack("Passepartouts", "Mounts", "Pasepartu", ar="حواشي", fr="Passe-partout", it="Passepartout", es="Passepartout"), "passepartouts"),
    ("04", pack("Digitalrahmen", "Digital frames", "Dijital çerçeve", ar="إطارات رقمية", fr="Cadres numériques", it="Cornici digitali", es="Marcos digitales"), "digitalrahmen"),
]
ACC = [
    ("01", pack("Schalen", "Bowls", "Kase", ar="أوعية", fr="Coupes", it="Coppe", es="Cuencos"), "schalen"),
    ("02", pack("Figuren", "Figurines", "Figür", ar="تماثيل", fr="Figurines", it="Statuine", es="Figuras"), "figuren"),
    ("03", pack("Windlichter", "Hurricane lamps", "Fenerlik", ar="فوانيس زجاج", fr="Photophores", it="Portacandele vetro", es="Portavelas de cristal"), "windlichter"),
    ("04", pack("Dekotabletts", "Décor trays", "Dekor tepsi", ar="صواني ديكور", fr="Plateaux déco", it="Vassoi deco", es="Bandejas deco"), "dekotabletts"),
]
SEASON = [
    ("01", pack("Weihnachten", "Christmas", "Yılbaşı", ar="عيد الميلاد", fr="Noël", it="Natale", es="Navidad"), "weihnachten"),
    ("02", pack("Ostern", "Easter", "Paskalya", ar="عيد الفصح", fr="Pâques", it="Pasqua", es="Pascua"), "ostern"),
    ("03", pack("Halloween", "Halloween", "Halloween", ar="هالوين", fr="Halloween", it="Halloween", es="Halloween"), "halloween"),
    ("04", pack("Sommerdeko", "Summer décor", "Yaz dekoru", ar="ديكور صيفي", fr="Déco d'été", it="Deco estate", es="Decoración verano"), "sommerdeko"),
]
PLANT = [
    ("01", pack("Kunstpflanzen", "Faux plants", "Yapay bitki", ar="نباتات صناعية", fr="Plantes artificielles", it="Piante finte", es="Plantas artificiales"), "kunstpflanzen"),
    ("02", pack("Trockenblumen", "Dried flowers", "Kurutulmuş çiçek", ar="زهور مجففة", fr="Fleurs séchées", it="Fiori secchi", es="Flores secas"), "trockenblumen"),
    ("03", pack("Übertöpfe", "Planters", "Saksı", ar="أصص", fr="Cache-pots", it="Vasi", es="Macetas"), "uebertoepfe"),
    ("04", pack("Kränze", "Wreaths", "Çelenk", ar="أكاليل", fr="Couronnes", it="Ghirlande", es="Coronas"), "kraenze"),
]
LIGHT = [
    ("01", pack("Lichterketten", "Fairy lights", "Işık zinciri", ar="سلسل إضاءة", fr="Guirlandes lumineuses", it="Luci decorative", es="Guirnaldas"), "lichterketten"),
    ("02", pack("Tischlampen Deko", "Accent lamps", "Dekoratif lamba", ar="مصابيح ديكور", fr="Lampes déco", it="Lampade deco", es="Lámparas deco"), "tischlampen-deko"),
    ("03", pack("LED-Laternen", "LED lanterns", "LED fener", ar="فوانيس LED", fr="Lanternes LED", it="Lanterne LED", es="Faroles LED"), "led-laternen"),
    ("04", pack("Kerzenlampen", "Candle lamps", "Mum lamba", ar="مصابيح شموع", fr="Lampes bougie", it="Lampade candela", es="Lámparas vela"), "kerzenlampen"),
]
EXISTING = {
    "cat-35-01": (pack("Wanddekor", "Wall décor", "Duvar dekoru", ar="ديكور جدار", fr="Déco murale", it="Deco parete", es="Decoración de pared"), WALL),
    "cat-35-02": (pack("Kerze & Duft", "Candles & scent", "Mum ve koku", ar="شموع وعطر", fr="Bougies et parfum", it="Candele e profumo", es="Velas y aroma"), CANDLE),
    "cat-35-03": (pack("Spiegel", "Mirrors", "Ayna", ar="مرايا", fr="Miroirs", it="Specchi", es="Espejos"), MIRROR),
    "cat-35-04": (pack("Rahmen", "Frames", "Çerçeve", ar="إطارات", fr="Cadres", it="Cornici", es="Marcos"), FRAME),
    "cat-35-05": (pack("Dekoratives Zubehör", "Decorative extras", "Dekoratif aksesuar", ar="إكسسوارات ديكور", fr="Accessoires déco", it="Accessori deco", es="Accesorios deco"), ACC),
    "cat-35-06": (pack("Saisondekor", "Seasonal décor", "Mevsim dekoru", ar="ديكور موسمي", fr="Déco saisonnière", it="Deco stagionale", es="Decoración de temporada"), SEASON),
}
NEW_L2 = [
    ("07", "pflanzen-und-blueten", pack("Pflanzen & Blüten", "Plants & blooms", "Bitki ve çiçek", ar="نباتات وأزهار", fr="Plantes et fleurs", it="Piante e fiori", es="Plantas y flores"), PLANT),
    ("08", "dekolicht", pack("Dekolicht", "Accent lighting", "Dekor ışık", ar="إضاءة ديكور", fr="Éclairage déco", it="Luci deco", es="Iluminación deco"), LIGHT),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-35")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-35-{suffix}"
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
