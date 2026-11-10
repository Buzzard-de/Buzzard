#!/usr/bin/env python3
"""Complete Industrie & Gewerbebedarf (cat-28) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Industry placeholder L3 replaced with a real product group"})


FURN = [
    ("01", pack("Bürostühle", "Office chairs", "Ofis koltuğu", ar="كراسي مكتب", fr="Chaises bureau", it="Sedie ufficio", es="Sillas oficina"), "buerostuehle"),
    ("02", pack("Schreibtische", "Desks", "Masa", ar="مكاتب", fr="Bureaux", it="Scrivanie", es="Escritorios"), "schreibtische"),
    ("03", pack("Aktenschränke", "Filing cabinets", "Dosya dolabı", ar="خزائن ملفات", fr="Armoires dossiers", it="Armadi archivio", es="Archivadores"), "aktenschraenke"),
    ("04", pack("Besprechungstische", "Meeting tables", "Toplantı masası", ar="طاولات اجتماع", fr="Tables réunion", it="Tavoli riunione", es="Mesas reunión"), "besprechungstische"),
]
STAT = [
    ("01", pack("Kopierpapier", "Copy paper", "Fotokopi kağıdı", ar="ورق تصوير", fr="Papier copieur", it="Carta fotocopie", es="Papel copias"), "kopierpapier"),
    ("02", pack("Stifte", "Pens", "Kalem", ar="أقلام", fr="Stylos", it="Penna", es="Bolígrafos"), "stifte"),
    ("03", pack("Hefter", "Staplers", "Zımba", ar="دباسات", fr="Agrafeuses", it="Spillatrici", es="Grapadoras"), "hefter"),
    ("04", pack("Ordner", "Binders", "Klasör", ar="ملفات", fr="Classeurs", it="Raccoglitori", es="Archivadores anillas"), "ordner"),
]
PRINT = [
    ("01", pack("Toner", "Toner", "Toner", ar="تونر", fr="Toner", it="Toner", es="Tóner"), "toner"),
    ("02", pack("Tintenpatronen", "Ink cartridges", "Kartuş", ar="خراطيش حبر", fr="Cartouches encre", it="Cartucce", es="Cartuchos"), "tintenpatronen"),
    ("03", pack("Trommeln", "Drums", "Drum", ar="طبلات", fr="Tambours", it="Tamburi", es="Tambores"), "trommeln"),
    ("04", pack("Fotopapier", "Photo paper", "Fotoğraf kağıdı", ar="ورق صور", fr="Papier photo", it="Carta foto", es="Papel foto"), "fotopapier"),
]
PACK = [
    ("01", pack("Kartons", "Cartons", "Karton", ar="كراتين", fr="Cartons", it="Cartoni", es="Cartones"), "kartons"),
    ("02", pack("Klebeband", "Packing tape", "Koli bandı", ar="شريط تغليف", fr="Scotch emballage", it="Nastro imballo", es="Cinta embalaje"), "klebeband"),
    ("03", pack("Luftpolsterfolie", "Bubble wrap", "Balonlu naylon", ar="فقاعات", fr="Film bulles", it="Plastica bolle", es="Plástico burbuja"), "luftpolsterfolie"),
    ("04", pack("Füllmaterial", "Void fill", "Dolgu", ar="حشو", fr="Calage", it="Riempimento", es="Relleno"), "fuellmaterial"),
]
LAB = [
    ("01", pack("Etikettendrucker", "Label printers", "Etiket yazıcı", ar="طابعات ملصقات", fr="Imprimantes étiquettes", it="Stampanti etichette", es="Impresoras etiquetas"), "etikettendrucker"),
    ("02", pack("Etikettenrollen", "Label rolls", "Etiket rulosu", ar="لفائف ملصقات", fr="Rouleaux étiquettes", it="Rotoli etichette", es="Rollos etiquetas"), "etikettenrollen"),
    ("03", pack("Barcode-Etiketten", "Barcode labels", "Barkod etiket", ar="ملصقات باركود", fr="Étiquettes code-barres", it="Etichette barcode", es="Etiquetas código"), "barcode-etiketten"),
    ("04", pack("Handetikettierer", "Label guns", "Etiket tabancası", ar="مسدسات ملصقات", fr="Étiqueteuses", it="Etichettatrici", es="Pistolas etiquetas"), "handetikettierer"),
]
STOR = [
    ("01", pack("Sichtlagerkästen", "Bins", "Kutu", ar="صناديق", fr="Bacs", it="Cassette", es="Cajas"), "sichtlagerkaesten"),
    ("02", pack("Regalteile", "Shelving parts", "Raf parçası", ar="قطع رفوف", fr="Pièces rayonnage", it="Parti scaffali", es="Piezas estantería"), "regalteile"),
    ("03", pack("Palettenboxen", "Pallet boxes", "Palet kutu", ar="صناديق منصات", fr="Caisses palette", it="Box pallet", es="Cajas palé"), "palettenboxen"),
    ("04", pack("Rollenwagen", "Trolleys", "Arabası", ar="عربات", fr="Chariots", it="Carrelli", es="Carros"), "rollenwagen"),
]
POS = [
    ("01", pack("Bondrucker", "Receipt printers", "Fiş yazıcı", ar="طابعات إيصالات", fr="Imprimantes tickets", it="Stampanti scontrini", es="Impresoras tickets"), "bondrucker"),
    ("02", pack("Barcode-Scanner", "Barcode scanners", "Barkod okuyucu", ar="ماسحات باركود", fr="Scanners codes", it="Scanner barcode", es="Escáneres"), "barcode-scanner"),
    ("03", pack("Kassenschubladen", "Cash drawers", "Kasa çekmecesi", ar="أدراج نقد", fr="Tiroirs-caisse", it="Cassetti cassa", es="Cajones"), "kassenschubladen"),
    ("04", pack("Kundendisplays", "Customer displays", "Müşteri ekranı", ar="شاشات عميل", fr="Afficheurs client", it="Display cliente", es="Pantallas cliente"), "kundendisplays"),
]
HYG = [
    ("01", pack("Seifenspender", "Soap dispensers", "Sabunluk", ar="موزعات صابون", fr="Distributeurs savon", it="Dispenser sapone", es="Dispensadores jabón"), "seifenspender"),
    ("02", pack("Papierhandtücher", "Paper towels", "Kağıt havlu", ar="مناشف ورق", fr="Essuie-mains", it="Asciugamani carta", es="Toallas papel"), "papierhandtuecher"),
    ("03", pack("Desinfektion", "Sanitizer", "Dezenfektan", ar="مطهر", fr="Désinfectant", it="Disinfettante", es="Desinfectante"), "desinfektion"),
    ("04", pack("Abfallbeutel", "Waste bags", "Çöp torbası", ar="أكياس نفايات", fr="Sacs poubelle", it="Sacchi rifiuti", es="Bolsas basura"), "abfallbeutel"),
]
EXISTING = {
    "cat-28-01": (pack("Büromöbel", "Office furniture", "Ofis mobilyası", ar="أثاث مكتب", fr="Mobilier bureau", it="Mobili ufficio", es="Muebles oficina"), FURN),
    "cat-28-02": (pack("Büroschreibwaren", "Office stationery", "Kırtasiye", ar="قرطاسية", fr="Papeterie bureau", it="Cancelleria", es="Papelería"), STAT),
    "cat-28-03": (pack("Druckerverbrauch", "Printer supplies", "Yazıcı sarf", ar="مستهلكات طابعة", fr="Consommables imprimante", it="Consumabili stampante", es="Consumibles impresora"), PRINT),
    "cat-28-04": (pack("Verpackung", "Packaging", "Ambalaj", ar="تغليف", fr="Emballage", it="Imballaggio", es="Embalaje"), PACK),
    "cat-28-05": (pack("Etikettierung", "Labelling", "Etiketleme", ar="ملصقات", fr="Étiquetage", it="Etichettatura", es="Etiquetado"), LAB),
    "cat-28-06": (pack("Lagerorganisation", "Warehouse organisation", "Depo organizasyonu", ar="تنظيم مستودع", fr="Organisation entrepôt", it="Organizzazione magazzino", es="Organización almacén"), STOR),
    "cat-28-07": (pack("POS & Shop", "POS & shop", "POS ve mağaza", ar="نقطة بيع ومتجر", fr="POS et magasin", it="POS e negozio", es="POS y tienda"), POS),
}
NEW_L2 = [
    ("08", "gewerbehygiene", pack("Gewerbehygiene", "Commercial hygiene", "Ticari hijyen", ar="نظافة تجارية", fr="Hygiène professionnelle", it="Igiene commerciale", es="Higiene comercial"), HYG),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-28")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-28-{suffix}"
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
