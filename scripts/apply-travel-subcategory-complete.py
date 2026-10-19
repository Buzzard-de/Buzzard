#!/usr/bin/env python3
"""Complete Reisen & Mobilität (cat-32) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Travel placeholder L3 replaced with a real product group"})


CASE = [
    ("01", pack("Handgepäck", "Carry-on", "Kabin boy", ar="حقائب مقصورة", fr="Cabine", it="Cabina", es="Cabina"), "handgepaeck"),
    ("02", pack("Mittelgroße Koffer", "Medium cases", "Orta valiz", ar="حقائب متوسطة", fr="Valises moyennes", it="Valigie medie", es="Maletas medianas"), "mittelgrosse-koffer"),
    ("03", pack("Große Koffer", "Large cases", "Büyük valiz", ar="حقائب كبيرة", fr="Grandes valises", it="Valigie grandi", es="Maletas grandes"), "grosse-koffer"),
    ("04", pack("Kofferset", "Case sets", "Valiz seti", ar="أطقم حقائب", fr="Sets valises", it="Set valigie", es="Sets maletas"), "kofferset"),
]
BAGS = [
    ("01", pack("Reisetaschen", "Duffels", "Seyahat çantası", ar="حقائب سفر", fr="Sacs voyage", it="Borsoni", es="Bolsas viaje"), "reisetaschen"),
    ("02", pack("Rucksäcke", "Backpacks", "Sırt çantası", ar="حقائب ظهر", fr="Sacs à dos", it="Zaini", es="Mochilas"), "rucksaecke"),
    ("03", pack("Organizer", "Organizers", "Organizer", ar="منظمات", fr="Organisateurs", it="Organizer", es="Organizadores"), "organizer"),
    ("04", pack("Laptoptaschen", "Laptop bags", "Laptop çantası", ar="حقائب لابتوب", fr="Sacs laptop", it="Borse laptop", es="Bolsas portátil"), "laptoptaschen"),
]
ACC = [
    ("01", pack("Koffergurte", "Luggage straps", "Valiz kayışı", ar="أحزمة حقائب", fr="Sangles", it="Cinghie", es="Correas"), "koffergurte"),
    ("02", pack("Schlösser", "Locks", "Kilit", ar="أقفال", fr="Cadenas", it="Lucchetti", es="Candados"), "schloesser"),
    ("03", pack("Kofferanhänger", "Luggage tags", "Etiket", ar="بطاقات أمتعة", fr="Étiquettes", it="Etichette", es="Etiquetas"), "kofferanhaenger"),
    ("04", pack("Waagen", "Scales", "Tartı", ar="موازين", fr="Balances", it="Bilance", es="Básculas"), "waagen"),
]
PILLOW = [
    ("01", pack("Nackenkissen", "Neck pillows", "Boyun yastığı", ar="وسائد رقبة", fr="Coussins nuque", it="Cuscini collo", es="Almohadas cuello"), "nackenkissen"),
    ("02", pack("Schlafmasken", "Sleep masks", "Uyku maskesi", ar="أقنعة نوم", fr="Masques sommeil", it="Mascherine sonno", es="Antifaces"), "schlafmasken"),
    ("03", pack("Ohrstöpsel", "Earplugs", "Kulak tıkacı", ar="سدادات أذن", fr="Bouchons oreilles", it="Tappi orecchie", es="Tapones"), "ohrstoepsel"),
    ("04", pack("Reise-Decken", "Travel blankets", "Seyahat battaniyesi", ar="بطانيات سفر", fr="Couvertures voyage", it="Coperte viaggio", es="Mantas viaje"), "reise-decken"),
]
DOC = [
    ("01", pack("Reisepassetuis", "Passport covers", "Pasaport kılıfı", ar="أغطية جواز", fr="Étuis passeport", it="Cover passaporto", es="Fundas pasaporte"), "reisepassetuis"),
    ("02", pack("RFID-Schutz", "RFID sleeves", "RFID kılıf", ar="أكمام RFID", fr="Pochettes RFID", it="Fodere RFID", es="Fundas RFID"), "rfid-schutz"),
    ("03", pack("Dokumente-Mappen", "Document folders", "Evrak klasörü", ar="مجلدات وثائق", fr="Pochettes documents", it="Cartelline", es="Carpetas"), "dokumente-mappen"),
    ("04", pack("Geldgürtel", "Money belts", "Para kemeri", ar="أحزمة نقود", fr="Ceintures argent", it="Cinture soldi", es="Riñoneras dinero"), "geldguertel"),
]
CAR = [
    ("01", pack("Sitz-Organizer", "Seat organizers", "Koltuk organizer", ar="منظمات مقعد", fr="Organisateurs siège", it="Organizer sedile", es="Organizadores asiento"), "sitz-organizer"),
    ("02", pack("Tablet-Halter", "Tablet holders", "Tablet tutucu", ar="حوامل تابلت", fr="Supports tablette", it="Supporti tablet", es="Soportes tablet"), "tablet-halter"),
    ("03", pack("Reise-Kühltaschen", "Cooler bags", "Soğutucu çanta", ar="حقائب تبريد", fr="Sacs isothermes", it="Borse termiche", es="Neveras"), "reise-kuehltaschen"),
    ("04", pack("Sonnenblenden", "Sun shades", "Güneşlik", ar="ظلال شمس", fr="Pare-soleil", it="Parasole", es="Parasoles"), "sonnenblenden"),
]
ADAPT = [
    ("01", pack("Reiseadapter", "Travel adapters", "Seyahat adaptörü", ar="محولات سفر", fr="Adaptateurs voyage", it="Adattatori viaggio", es="Adaptadores viaje"), "reiseadapter"),
    ("02", pack("USB-Adapter", "USB adapters", "USB adaptör", ar="محولات USB", fr="Adaptateurs USB", it="Adattatori USB", es="Adaptadores USB"), "usb-adapter"),
    ("03", pack("Spannungswandler", "Converters", "Voltaj çevirici", ar="محولات جهد", fr="Convertisseurs", it="Convertitori", es="Convertidores"), "spannungswandler"),
    ("04", pack("Ladekabel", "Charge cables", "Şarj kablosu", ar="كابل شحن", fr="Câbles charge", it="Cavi ricarica", es="Cables carga"), "ladekabel"),
]
CUBE = [
    ("01", pack("Packwürfel", "Packing cubes", "Paket küpü", ar="مكعبات تعبئة", fr="Cubes rangement", it="Cubi packing", es="Cubos empaque"), "packwuerfel"),
    ("02", pack("Kompressionstaschen", "Compression bags", "Kompresyon çanta", ar="أكياس ضغط", fr="Sacs compression", it="Sacchi compressione", es="Bolsas compresión"), "kompressionstaschen"),
    ("03", pack("Schuhbeutel", "Shoe bags", "Ayakkabı torbası", ar="أكياس أحذية", fr="Sacs chaussures", it="Sacchi scarpe", es="Bolsas zapatos"), "schuhbeutel"),
    ("04", pack("Wäschebeutel", "Laundry bags", "Çamaşır torbası", ar="أكياس غسيل", fr="Sacs linge", it="Sacchi biancheria", es="Bolsas ropa"), "waeschebeutel"),
]
EXISTING = {
    "cat-32-01": (pack("Koffer", "Suitcases", "Valiz", ar="حقائب", fr="Valises", it="Valigie", es="Maletas"), CASE),
    "cat-32-02": (pack("Reisetaschen", "Travel bags", "Seyahat çantası", ar="حقائب سفر", fr="Sacs de voyage", it="Borse viaggio", es="Bolsas de viaje"), BAGS),
    "cat-32-03": (pack("Reise-Zubehör", "Travel extras", "Seyahat aksesuarı", ar="ملحقات سفر", fr="Accessoires voyage", it="Accessori viaggio", es="Accesorios viaje"), ACC),
    "cat-32-04": (pack("Nackenkissen", "Neck pillows", "Boyun yastığı", ar="وسائد رقبة", fr="Coussins nuque", it="Cuscini collo", es="Almohadas cuello"), PILLOW),
    "cat-32-05": (pack("Reisepass & Dokumente", "Passport & documents", "Pasaport ve evrak", ar="جواز ووثائق", fr="Passeport et documents", it="Passaporto e documenti", es="Pasaporte y documentos"), DOC),
    "cat-32-06": (pack("Fahrzeug-Innenreise", "In-car travel", "Araç içi seyahat", ar="سفر داخل السيارة", fr="Voyage auto", it="Viaggio auto", es="Viaje en coche"), CAR),
}
NEW_L2 = [
    ("07", "reiseadapter", pack("Reiseadapter", "Travel adapters", "Seyahat adaptörü", ar="محولات سفر", fr="Adaptateurs voyage", it="Adattatori viaggio", es="Adaptadores viaje"), ADAPT),
    ("08", "packwuerfel", pack("Packwürfel", "Packing cubes", "Paket küpleri", ar="مكعبات تعبئة", fr="Cubes de rangement", it="Cubi packing", es="Cubos de empaque"), CUBE),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-32")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-32-{suffix}"
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
