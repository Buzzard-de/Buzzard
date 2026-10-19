#!/usr/bin/env python3
"""Complete Saisonale & Festtagsartikel (cat-34) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Seasonal placeholder L3 replaced with a real product group"})


XMAS = [
    ("01", pack("Christbaumschmuck", "Tree ornaments", "Ağaç süsü", ar="زينة شجرة", fr="Boules sapin", it="Addobbi albero", es="Adornos árbol"), "christbaumschmuck"),
    ("02", pack("Lichterketten", "String lights", "Işık zinciri", ar="أضواء سلسلة", fr="Guirlandes lumineuses", it="Luci catena", es="Guirnaldas luces"), "lichterketten"),
    ("03", pack("Adventskränze", "Advent wreaths", "Advent çelengi", ar="أكاليل مجيء", fr="Couronnes avent", it="Ghirlande avvento", es="Coronas adviento"), "adventskraenze"),
    ("04", pack("Silvester", "New Year", "Yılbaşı", ar="رأس السنة", fr="Nouvel an", it="Capodanno", es="Año nuevo"), "silvester"),
]
BDAY = [
    ("01", pack("Luftballons", "Balloons", "Balon", ar="بالونات", fr="Ballons", it="Palloncini", es="Globos"), "luftballons"),
    ("02", pack("Geschenkverpackung", "Gift wrap", "Hediye paketi", ar="تغليف هدايا", fr="Emballage cadeau", it="Incarto regalo", es="Envoltorio"), "geschenkverpackung"),
    ("03", pack("Geburtstagskerzen", "Birthday candles", "Pasta mumu", ar="شموع عيد", fr="Bougies anniversaire", it="Candele compleanno", es="Velas cumpleaños"), "geburtstagskerzen"),
    ("04", pack("Partytüten", "Party bags", "Parti torbası", ar="أكياس حفلة", fr="Sacs fête", it="Sacchetti festa", es="Bolsas fiesta"), "partytueten"),
]
WED = [
    ("01", pack("Tischdeko", "Table decor", "Masa süsü", ar="زينة طاولة", fr="Déco table", it="Decor tavolo", es="Decor mesa"), "tischdeko"),
    ("02", pack("Gastgeschenke", "Favors", "Misafir hediyesi", ar="هدايا ضيوف", fr="Cadeaux invités", it="Bomboniere", es="Detalles invitados"), "gastgeschenke"),
    ("03", pack("Girlanden", "Garlands", "Girland", ar="أكاليل", fr="Guirlandes", it="Ghirlande", es="Guirnaldas"), "girlanden"),
    ("04", pack("Kerzen", "Candles", "Mum", ar="شموع", fr="Bougies", it="Candele", es="Velas"), "kerzen"),
]
PARTY = [
    ("01", pack("Einweggeschirr", "Disposable tableware", "Tek kullanımlık", ar="أدوات مائدة", fr="Vaisselle jetable", it="Stoviglie usa e getta", es="Vajilla desechable"), "einweggeschirr"),
    ("02", pack("Servietten", "Napkins", "Peçete", ar="مناديل", fr="Serviettes", it="Tovaglioli", es="Servilletas"), "servietten"),
    ("03", pack("Luftschlangen", "Streamers", "Serpantin", ar="شرائط", fr="Serpentins", it="Stelle filanti", es="Serpentinas"), "luftschlangen"),
    ("04", pack("Konfetti", "Confetti", "Konfeti", ar="ورق ملون", fr="Confettis", it="Coriandoli", es="Confeti"), "konfetti"),
]
DECO = [
    ("01", pack("Kränze", "Wreaths", "Çelenk", ar="أكاليل", fr="Couronnes", it="Ghirlande", es="Coronas"), "kraenze"),
    ("02", pack("Figuren", "Figurines", "Figür", ar="تماثيل", fr="Figurines", it="Statuine", es="Figuras"), "figuren"),
    ("03", pack("Fensterdeko", "Window decor", "Pencere süsü", ar="زينة نافذة", fr="Déco fenêtre", it="Decor finestra", es="Decor ventana"), "fensterdeko"),
    ("04", pack("Tischläufer", "Table runners", "Runner", ar="مفارش طاولة", fr="Chemins de table", it="Runner", es="Caminos mesa"), "tischlaeufer"),
]
BALC = [
    ("01", pack("Outdoor-Lichter", "Outdoor lights", "Dış ışık", ar="أضواء خارجية", fr="Lumières extérieures", it="Luci esterne", es="Luces exterior"), "outdoor-lichter"),
    ("02", pack("Zitronella", "Citronella", "Citronella", ar="سيترونيللا", fr="Citronnelle", it="Citronella", es="Citronela"), "zitronella"),
    ("03", pack("Saison-Pflanzgefäße", "Seasonal planters", "Mevsim saksı", ar="أحواض موسمية", fr="Jardinières saison", it="Vasi stagione", es="Macetas temporada"), "saison-pflanzgefaesse"),
    ("04", pack("Windlichter", "Lanterns", "Fener", ar="فوانيس", fr="Lanternes", it="Lanterne", es="Farolillos"), "windlichter"),
]
HAL = [
    ("01", pack("Kürbisse", "Pumpkins", "Balkabağı", ar="يقطين", fr="Citrouilles", it="Zucche", es="Calabazas"), "kuerbisse"),
    ("02", pack("Laternen", "Lanterns", "Fener", ar="فوانيس", fr="Lanternes", it="Lanterne", es="Faroles"), "laternen"),
    ("03", pack("Kostüm-Zubehör", "Costume extras", "Kostüm aksesuarı", ar="ملحقات زي", fr="Accessoires costume", it="Accessori costume", es="Accesorios disfraz"), "kostuem-zubehoer"),
    ("04", pack("Halloween-Lichter", "Halloween lights", "Halloween ışık", ar="أضواء هالوين", fr="Lumières Halloween", it="Luci Halloween", es="Luces Halloween"), "halloween-lichter"),
]
EAST = [
    ("01", pack("Ostereier", "Easter eggs", "Paskalya yumurtası", ar="بيض فصح", fr="Œufs de Pâques", it="Uova Pasqua", es="Huevos Pascua"), "ostereier"),
    ("02", pack("Osterkörbe", "Easter baskets", "Paskalya sepeti", ar="سلال فصح", fr="Paniers Pâques", it="Ceste Pasqua", es="Cestas Pascua"), "ostekoerbe"),
    ("03", pack("Frühlingsdeko", "Spring decor", "Bahar süsü", ar="زينة ربيع", fr="Déco printemps", it="Decor primavera", es="Decor primavera"), "fruehlingsdeko"),
    ("04", pack("Hasenfiguren", "Bunny figures", "Tavşan figürü", ar="أشكال أرنب", fr="Figurines lapin", it="Coniglietti", es="Figuras conejo"), "hasenfiguren"),
]
EXISTING = {
    "cat-34-01": (pack("Weihnachten & Neujahr", "Christmas & New Year", "Noel ve yılbaşı", ar="عيد الميلاد ورأس السنة", fr="Noël et Nouvel An", it="Natale e Capodanno", es="Navidad y Año Nuevo"), XMAS),
    "cat-34-02": (pack("Geburtstag", "Birthday", "Doğum günü", ar="عيد ميلاد", fr="Anniversaire", it="Compleanno", es="Cumpleaños"), BDAY),
    "cat-34-03": (pack("Hochzeit & Verlobung", "Wedding & engagement", "Düğün ve nişan", ar="زواج وخطوبة", fr="Mariage et fiançailles", it="Matrimonio e fidanzamento", es="Boda y compromiso"), WED),
    "cat-34-04": (pack("Party-Materialien", "Party supplies", "Parti malzemesi", ar="مستلزمات حفلة", fr="Articles fête", it="Articoli festa", es="Artículos fiesta"), PARTY),
    "cat-34-05": (pack("Saison-Dekoration", "Seasonal decor", "Mevsim dekoru", ar="ديكور موسمي", fr="Déco saisonnière", it="Decor stagione", es="Decor temporada"), DECO),
    "cat-34-06": (pack("Balkon & Garten Saison", "Balcony & garden season", "Balkon ve bahçe sezonu", ar="شرفة وحديقة موسم", fr="Balcon et jardin saison", it="Balcone e giardino stagione", es="Balcón y jardín temporada"), BALC),
}
NEW_L2 = [
    ("07", "halloween", pack("Halloween", "Halloween", "Halloween", ar="هالوين", fr="Halloween", it="Halloween", es="Halloween"), HAL),
    ("08", "ostern", pack("Ostern", "Easter", "Paskalya", ar="الفصح", fr="Pâques", it="Pasqua", es="Pascua"), EAST),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-34")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-34-{suffix}"
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
