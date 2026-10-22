#!/usr/bin/env python3
"""Complete Küche & Kochen (cat-24) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Kitchen placeholder L3 replaced with a real product group"})


POTS = [
    ("01", pack("Töpfe", "Pots", "Tencere", ar="قدور", fr="Casseroles", it="Pentole", es="Ollas"), "toepfe"),
    ("02", pack("Pfannen", "Pans", "Tava", ar="مقالي", fr="Poêles", it="Padelle", es="Sartenes"), "pfannen"),
    ("03", pack("Kasserollen", "Saucepans", "Sos tenceresi", ar="قدور صغيرة", fr="Casseroles basses", it="Casseruole", es="Cazos"), "kasserollen"),
    ("04", pack("Schnellkochtöpfe", "Pressure cookers", "Düdüklü", ar="قدور ضغط", fr="Autocuiseurs", it="Pentole a pressione", es="Ollas a presión"), "schnellkochtopfe"),
    ("05", pack("Woks", "Woks", "Wok", ar="ووك", fr="Woks", it="Wok", es="Woks"), "woks"),
]
COOK = [
    ("01", pack("Backformen", "Baking tins", "Kek kalıbı", ar="قوالب خبز", fr="Moules", it="Stampi", es="Moldes"), "backformen"),
    ("02", pack("Backbleche", "Baking trays", "Fırın tepsisi", ar="صواني فرن", fr="Plaques", it="Teglie", es="Bandejas horno"), "backbleche"),
    ("03", pack("Spritzbeutel", "Piping bags", "Sıkma torbası", ar="أكياس تزيين", fr="Poches à douille", it="Sac à poche", es="Mangas pasteleras"), "spritzbeutel"),
    ("04", pack("Teigschaber", "Spatulas", "Spatula", ar="ملاعق سيليكون", fr="Maryses", it="Spatole", es="Espátulas"), "teigschaber"),
]
STORE = [
    ("01", pack("Vorratsgläser", "Storage jars", "Kavanoz", ar="برطمانات", fr="Bocaux", it="Barattoli", es="Tarros"), "vorratsglaeser"),
    ("02", pack("Lunchboxen", "Lunch boxes", "Beslenme kabı", ar="علب غداء", fr="Boîtes repas", it="Lunch box", es="Tápers"), "lunchboxen"),
    ("03", pack("Vakuumdosen", "Vacuum containers", "Vakum kap", ar="علب تفريغ", fr="Boîtes sous vide", it="Contenitori sottovuoto", es="Tápers vacío"), "vakuumdosen"),
    ("04", pack("Ölflaschen", "Oil bottles", "Yağ şişesi", ar="زجاجات زيت", fr="Bouteilles d'huile", it="Oliere", es="Aceiteras"), "oelflaschen"),
]
TOOLS = [
    ("01", pack("Reiben", "Graters", "Rende", ar="مبشرات", fr="Râpes", it="Grattugie", es="Ralladores"), "reiben"),
    ("02", pack("Schäler", "Peelers", "Soyacak", ar="مقشرات", fr="Éplucheurs", it="Pelapatate", es="Peladores"), "schaeler"),
    ("03", pack("Messbecher", "Measuring jugs", "Ölçü kabı", ar="أكواب قياس", fr="Verres doseurs", it="Misurini", es="Jarras medidoras"), "messbecher"),
    ("04", pack("Siebe", "Sieves", "Süzgeç", ar="مناخل", fr="Tamis", it="Setacci", es="Coladores"), "siebe"),
    ("05", pack("Schneidebretter", "Chopping boards", "Kesme tahtası", ar="ألواح تقطيع", fr="Planches", it="Taglieri", es="Tablas"), "schneidebretter"),
]
KNIFE = [
    ("01", pack("Kochmesser", "Chef's knives", "Şef bıçağı", ar="سكاكين شيف", fr="Couteaux de chef", it="Coltelli da chef", es="Cuchillos chef"), "kochmesser"),
    ("02", pack("Brotmesser", "Bread knives", "Ekmek bıçağı", ar="سكاكين خبز", fr="Couteaux à pain", it="Coltelli pane", es="Cuchillos pan"), "brotmesser"),
    ("03", pack("Gemüsemesser", "Paring knives", "Sebze bıçağı", ar="سكاكين خضار", fr="Couteaux office", it="Coltelli verdura", es="Cuchillos verdura"), "gemuesemesser"),
    ("04", pack("Messersets", "Knife sets", "Bıçak seti", ar="أطقم سكاكين", fr="Sets de couteaux", it="Set coltelli", es="Sets de cuchillos"), "messersets"),
]
TABLE = [
    ("01", pack("Teller", "Plates", "Tabak", ar="صحون", fr="Assiettes", it="Piatti", es="Platos"), "teller"),
    ("02", pack("Tassen", "Cups", "Fincan", ar="أكواب", fr="Tasses", it="Tazze", es="Tazas"), "tassen"),
    ("03", pack("Glaswaren", "Glassware", "Cam eşya", ar="زجاجيات", fr="Verrerie", it="Bicchieri", es="Cristalería"), "glaswaren"),
    ("04", pack("Servierteller", "Serving platters", "Servis tabağı", ar="أطباق تقديم", fr="Plats de service", it="Piatti da portata", es="Fuentes"), "servierteller"),
]
COFFEE = [
    ("01", pack("Kaffeebereiter", "Coffee makers", "Kahve demliği", ar="محضرات قهوة", fr="Cafetières", it="Caffettiere", es="Cafeteras"), "kaffeebereiter"),
    ("02", pack("Teekannen", "Teapots", "Çaydanlık", ar="أباريق شاي", fr="Théières", it="Teiere", es="Teteras"), "teekannen"),
    ("03", pack("Milchschäumer", "Milk frothers", "Süt köpürtücü", ar="مخفقة حليب", fr="Mousseurs", it="Monta latte", es="Espumadores"), "milchschaeumer"),
    ("04", pack("Filter & Pads", "Filters", "Filtre", ar="فلاتر", fr="Filtres", it="Filtri", es="Filtros"), "filter-und-pads"),
]
BAKE = [
    ("01", pack("Muffinformen", "Muffin tins", "Muffin kalıbı", ar="قوالب مافن", fr="Moules muffins", it="Stampi muffin", es="Moldes muffins"), "muffinformen"),
    ("02", pack("Ofenhandschuhe", "Oven mitts", "Fırın eldiveni", ar="قفازات فرن", fr="Gants four", it="Guanti forno", es="Guantes horno"), "ofenhandschuhe"),
    ("03", pack("Tortenplatten", "Cake stands", "Pasta tabağı", ar="حوامل كعك", fr="Présentoirs gâteaux", it="Alzate torte", es="Bases de tarta"), "tortenplatten"),
    ("04", pack("Teigrollen", "Rolling pins", "Merdane", ar="نَشّابات", fr="Rouleaux", it="Mattarelli", es="Rodillos"), "teigrollen"),
]
EXISTING = {
    "cat-24-01": (pack("Töpfe & Pfannen", "Pots & pans", "Tencere ve tava", ar="قدور ومقالي", fr="Casseroles et poêles", it="Pentole e padelle", es="Ollas y sartenes"), POTS),
    "cat-24-02": (pack("Backzubehör", "Baking tools", "Fırın gereçleri", ar="أدوات خبز", fr="Ustensiles pâtisserie", it="Utensili forno", es="Utensilios de horno"), COOK),
    "cat-24-03": (pack("Vorrat & Aufbewahrung", "Food storage", "Saklama", ar="تخزين طعام", fr="Conservation", it="Conservazione", es="Conservación"), STORE),
    "cat-24-04": (pack("Küchenhelfer", "Kitchen tools", "Mutfak gereçleri", ar="أدوات مطبخ", fr="Ustensiles", it="Utensili", es="Utensilios"), TOOLS),
    "cat-24-05": (pack("Messer", "Knives", "Bıçak", ar="سكاكين", fr="Couteaux", it="Coltelli", es="Cuchillos"), KNIFE),
    "cat-24-06": (pack("Tisch & Service", "Tableware", "Masa servisi", ar="خدمة المائدة", fr="Arts de la table", it="Tavola", es="Vajilla"), TABLE),
    "cat-24-07": (pack("Kaffee & Tee", "Coffee & tea", "Kahve ve çay", ar="قهوة وشاي", fr="Café et thé", it="Caffè e tè", es="Café y té"), COFFEE),
}
NEW_L2 = [
    ("08", "backen", pack("Backen", "Baking", "Fırıncılık", ar="خبز", fr="Pâtisserie", it="Pasticceria", es="Repostería"), BAKE),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-24")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-24-{suffix}"
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
