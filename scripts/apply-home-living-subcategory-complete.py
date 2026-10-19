#!/usr/bin/env python3
"""Complete Haus & Haushalt (cat-10) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Home placeholder L3 replaced with a real product group"})


KITCHEN = [
    ("01", pack("Kochutensilien", "Kitchen utensils", "Mutfak gereçleri", ar="أدوات مطبخ", fr="Ustensiles", it="Utensili", es="Utensilios"), "kochutensilien"),
    ("02", pack("Geschirr", "Tableware", "Servis", ar="أواني", fr="Vaisselle", it="Stoviglie", es="Vajilla"), "geschirr"),
    ("03", pack("Besteck", "Cutlery", "Çatal bıçak", ar="أدوات مائدة", fr="Couverts", it="Posate", es="Cubiertos"), "besteck"),
    ("04", pack("Vorratsdosen", "Food storage", "Saklama kabı", ar="علب تخزين", fr="Boîtes alimentaires", it="Contenitori", es="Tápers"), "vorratsdosen"),
    ("05", pack("Küchenhelfer", "Kitchen gadgets", "Mutfak yardımcısı", ar="مساعدات مطبخ", fr="Ustensiles pratiques", it="Gadget cucina", es="Utensilios extra"), "kuechenhelfer"),
]
BATH = [
    ("01", pack("Badaccessoires", "Bath accessories", "Banyo aksesuarı", ar="إكسسوارات حمام", fr="Accessoires bain", it="Accessori bagno", es="Accesorios baño"), "badaccessoires"),
    ("02", pack("Seifenspender", "Soap dispensers", "Sabunluk", ar="موزعات صابون", fr="Distributeurs savon", it="Dispenser", es="Dispensadores"), "seifenspender"),
    ("03", pack("Wäschekörbe", "Laundry baskets", "Kirli sepeti", ar="سلال غسيل", fr="Paniers linge", it="Ceste biancheria", es="Cestos de ropa"), "waeschekoerbe"),
    ("04", pack("Haken & Stangen", "Hooks & rails", "Askı ve ray", ar="خطاطيف", fr="Crochets", it="Ganci", es="Ganchos"), "haken-und-stangen"),
    ("05", pack("Duschzubehör", "Shower extras", "Duş aksesuarı", ar="إكسسوارات دش", fr="Accessoires douche", it="Accessori doccia", es="Accesorios ducha"), "duschzubehoer"),
]
BED = [
    ("01", pack("Kleiderbügel", "Hangers", "Askı", ar="علاقات", fr="Cintres", it="Grucce", es="Perchas"), "kleiderbuegel"),
    ("02", pack("Wäscheboxen", "Laundry boxes", "Çamaşır kutusu", ar="صناديق غسيل", fr="Bacs linge", it="Box biancheria", es="Cajas de ropa"), "waescheboxen"),
    ("03", pack("Unterbettkommoden", "Underbed storage", "Yatak altı", ar="تخزين تحت السرير", fr="Rangement lit", it="Contenitori sottoletto", es="Almacenaje cama"), "unterbettkommoden"),
    ("04", pack("Schmuckablagen", "Jewellery trays", "Takı tepsisi", ar="صواني مجوهرات", fr="Vide-poches bijoux", it="Portagioie", es="Bandejas joyas"), "schmuckablagen"),
    ("05", pack("Raumsprays Schlaf", "Bedroom scent", "Yatak odası kokusu", ar="عطر غرفة", fr="Parfum chambre", it="Profumo camera", es="Ambientador dormitorio"), "raumsprays-schlaf"),
]
LIVING = [
    ("01", pack("Vasen", "Vases", "Vazo", ar="مزهريات", fr="Vases", it="Vasi", es="Jarrones"), "vasen"),
    ("02", pack("Bilderrahmen", "Frames", "Çerçeve", ar="إطارات", fr="Cadres", it="Cornici", es="Marcos"), "bilderrahmen"),
    ("03", pack("Tabletts", "Trays", "Tepsi", ar="صواني", fr="Plateaux", it="Vassoi", es="Bandejas"), "tabletts"),
    ("04", pack("Kerzenhalter", "Candle holders", "Şamdan", ar="حاملات شموع", fr="Bougeoirs", it="Portacandele", es="Portavelas"), "kerzenhalter"),
    ("05", pack("Wanduhren", "Wall clocks", "Duvar saati", ar="ساعات حائط", fr="Horloges murales", it="Orologi da parete", es="Relojes de pared"), "wanduhren"),
]
STORE = [
    ("01", pack("Aufbewahrungsboxen", "Storage boxes", "Saklama kutusu", ar="صناديق تخزين", fr="Boîtes de rangement", it="Scatole", es="Cajas"), "aufbewahrungsboxen"),
    ("02", pack("Körbe", "Baskets", "Sepet", ar="سلال", fr="Paniers", it="Ceste", es="Cestas"), "koerbe"),
    ("03", pack("Vakuumbeutel", "Vacuum bags", "Vakum torbası", ar="أكياس تفريغ", fr="Sacs sous vide", it="Sacchi sottovuoto", es="Bolsas al vacío"), "vakuumbeutel"),
    ("04", pack("Kleiderhüllen", "Garment covers", "Elbise kılıfı", ar="أغطية ملابس", fr="Housses vêtements", it="Copriabiti", es="Fundas de ropa"), "kleiderhuellen"),
    ("05", pack("Regaleinsätze", "Shelf inserts", "Raf içi", ar="فواصل أرفف", fr="Séparateurs étagères", it="Divisori ripiani", es="Separadores"), "regaleinsaetze"),
]
ORG = [
    ("01", pack("Schlüsselboards", "Key boards", "Anahtarlık panosu", ar="لوحات مفاتيح", fr="Tableaux clés", it="Portachiavi muro", es="Colgadores llaves"), "schluesselboards"),
    ("02", pack("Kabelboxen", "Cable boxes", "Kablo kutusu", ar="صناديق كابلات", fr="Boîtes câbles", it="Box cavi", es="Cajas de cables"), "kabelboxen"),
    ("03", pack("Wäschesortierer", "Laundry sorters", "Çamaşır ayırıcı", ar="فراز غسيل", fr="Trieurs linge", it="Sorter biancheria", es="Clasificadores ropa"), "waeschesortierer"),
    ("04", pack("Kalender", "Calendars", "Takvim", ar="تقويم", fr="Calendriers", it="Calendari", es="Calendarios"), "kalender"),
    ("05", pack("Whiteboards", "Whiteboards", "Yazı tahtası", ar="سبورات بيضاء", fr="Tableaux blancs", it="Lavagne", es="Pizarras"), "whiteboards"),
]
ACC = [
    ("01", pack("Türstopper", "Door stops", "Kapı stoperi", ar="مصدات باب", fr="Cales de porte", it="Fermaporta", es="Topes de puerta"), "tuerstopper"),
    ("02", pack("Filzgleiter", "Felt pads", "Keçe patik", ar="لباد أثاث", fr="Patins feutre", it="Feltrini", es="Fieltro muebles"), "filzgleiter"),
    ("03", pack("Möbelfüße", "Furniture feet", "Mobilya ayağı", ar="أرجل أثاث", fr="Pieds meubles", it="Piedini", es="Patas de mueble"), "moebelfuesse"),
    ("04", pack("Klebefolien", "Adhesive films", "Yapışkan folyo", ar="أفلام لاصقة", fr="Films adhésifs", it="Pellicole", es="Vinilos"), "klebefolien"),
    ("05", pack("Treppenkanten", "Stair nosing", "Merdiven kenarı", ar="حواف درج", fr="Nez de marche", it="Profili scale", es="Cantos de escalera"), "treppenkanten"),
]
SAFE = [
    ("01", pack("Rauchmelder", "Smoke alarms", "Duman alarmı", ar="كاشف دخان", fr="Détecteurs fumée", it="Rilevatori fumo", es="Detectores de humo"), "rauchmelder"),
    ("02", pack("CO-Melder", "CO alarms", "CO alarmı", ar="كاشف أول أكسيد", fr="Détecteurs CO", it="Rilevatori CO", es="Detectores CO"), "co-melder"),
    ("03", pack("Türsicherheit", "Door security", "Kapı güvenliği", ar="أمن الباب", fr="Sécurité porte", it="Sicurezza porta", es="Seguridad puerta"), "tuersicherheit"),
    ("04", pack("Fenstersicherung", "Window locks", "Pencere kilidi", ar="أقفال نوافذ", fr="Sécurité fenêtre", it="Sicurezza finestra", es="Cierres ventana"), "fenstersicherung"),
    ("05", pack("Tresore", "Safes", "Kasa", ar="خزائن", fr="Coffres", it="Casseforti", es="Cajas fuertes"), "tresore"),
]
EXISTING = {
    "cat-10-01": (pack("Küche", "Kitchen", "Mutfak", ar="مطبخ", fr="Cuisine", it="Cucina", es="Cocina"), KITCHEN),
    "cat-10-02": (pack("Bad", "Bathroom", "Banyo", ar="حمام", fr="Salle de bain", it="Bagno", es="Baño"), BATH),
    "cat-10-03": (pack("Schlafzimmer", "Bedroom", "Yatak odası", ar="غرفة نوم", fr="Chambre", it="Camera", es="Dormitorio"), BED),
    "cat-10-04": (pack("Wohnzimmer", "Living room", "Oturma odası", ar="غرفة معيشة", fr="Salon", it="Soggiorno", es="Salón"), LIVING),
    "cat-10-05": (pack("Aufbewahrung", "Storage", "Depolama", ar="تخزين", fr="Rangement", it="Ripostiglio", es="Almacenaje"), STORE),
    "cat-10-06": (pack("Organisation", "Organisation", "Düzen", ar="تنظيم", fr="Organisation", it="Organizzazione", es="Organización"), ORG),
    "cat-10-07": (pack("Haushaltszubehör", "Household extras", "Ev aksesuarı", ar="إكسسوارات منزل", fr="Accessoires maison", it="Accessori casa", es="Accesorios hogar"), ACC),
    "cat-10-08": (pack("Haussicherheit", "Home security", "Ev güvenliği", ar="أمن المنزل", fr="Sécurité maison", it="Sicurezza casa", es="Seguridad hogar"), SAFE),
}


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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-10")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
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
