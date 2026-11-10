#!/usr/bin/env python3
"""Complete Büro, Schule & Schreibwaren (cat-04) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Office-school placeholder L3 replaced with a real product group"})


SCHOOL = [
    ("01", pack("Arbeitshefte", "Workbooks", "Çalışma defteri", ar="كراسات تمارين", fr="Cahiers d'exercices", it="Quaderni esercizi", es="Cuadernos de ejercicios"), "arbeitshefte"),
    ("02", pack("Scheren", "Scissors", "Makas", ar="مقصات", fr="Ciseaux", it="Forbici", es="Tijeras"), "scheren"),
    ("03", pack("Klebstoff", "Glue", "Yapıştırıcı", ar="صمغ", fr="Colles", it="Colla", es="Pegamento"), "klebstoff"),
    ("04", pack("Geodreiecke", "Set squares", "Gönye", ar="مثلثات", fr="Équerres", it="Squadre", es="Escuadras"), "geodreiecke"),
]
PENS = [
    ("01", pack("Kugelschreiber", "Ballpoint pens", "Tükenmez", ar="أقلام حبر جاف", fr="Stylos bille", it="Penna a sfera", es="Bolígrafos"), "kugelschreiber"),
    ("02", pack("Bleistifte", "Pencils", "Kurşun kalem", ar="أقلام رصاص", fr="Crayons", it="Matite", es="Lápices"), "bleistifte"),
    ("03", pack("Textmarker", "Highlighters", "Fosforlu kalem", ar="أقلام تمييز", fr="Surligneurs", it="Evidenziatori", es="Marcadores"), "textmarker"),
    ("04", pack("Füller", "Fountain pens", "Dolma kalem", ar="أقلام حبر", fr="Stylos plume", it="Penna stilografica", es="Plumas"), "fueller"),
]
OFFICE = [
    ("01", pack("Locher", "Hole punches", "Delgeç", ar="خرامة", fr="Perforatrices", it="Perforatori", es="Perforadoras"), "locher"),
    ("02", pack("Hefter", "Staplers", "Zımba", ar="دباسة", fr="Agrafeuses", it="Spillatrici", es="Grapadoras"), "hefter"),
    ("03", pack("Klammern", "Staples & clips", "Ataş", ar="مشابك", fr="Trombones", it="Fermagli", es="Clips"), "klammern"),
    ("04", pack("Briefumschläge", "Envelopes", "Zarf", ar="أظرف", fr="Enveloppes", it="Buste", es="Sobres"), "briefumschlaege"),
]
ART = [
    ("01", pack("Aquarell", "Watercolour", "Sulu boya", ar="ألوان مائية", fr="Aquarelle", it="Acquerello", es="Acuarela"), "aquarell"),
    ("02", pack("Acrylfarben", "Acrylics", "Akrilik", ar="أكريليك", fr="Acrylique", it="Acrilici", es="Acrílicos"), "acrylfarben"),
    ("03", pack("Skizzenblöcke", "Sketch pads", "Eskiz defteri", ar="دفاتر رسم", fr="Carnets de croquis", it="Blocchi schizzi", es="Bloc de dibujo"), "skizzenbloecke"),
    ("04", pack("Marker", "Art markers", "Marker", ar="ماركر", fr="Marqueurs", it="Marker", es="Rotuladores"), "marker"),
]
BAGS = [
    ("01", pack("Federmäppchen", "Pencil cases", "Kalemlik", ar="مقلمات", fr="Trousses", it="Astucci", es="Estuches"), "federmaeppchen"),
    ("02", pack("Aktentaschen", "Briefcases", "Evrak çantası", ar="حقائب مستندات", fr="Porte-documents", it="Cartelle", es="Maletines"), "aktentaschen"),
    ("03", pack("Dokumentenmappen", "Document wallets", "Evrak klasörü", ar="حافظات مستندات", fr="Portefeuilles documents", it="Portadocumenti", es="Portadocumentos"), "dokumentenmappen"),
    ("04", pack("Rollkoffer Büro", "Pilot cases", "Pilot çanta", ar="حقائب بعجلات", fr="Valises pilote", it="Trolley ufficio", es="Trolleys oficina"), "rollkoffer-buero"),
]
START = [
    ("01", pack("Schultüten", "School cones", "Okul külahı", ar="أقماع مدرسية", fr="Cornets scolaires", it="Coni scuola", es="Conos escolares"), "schultueten"),
    ("02", pack("Einschulung", "First-day kits", "Okul başlangıcı", ar="مستلزمات أول يوم", fr="Kits rentrée", it="Kit primo giorno", es="Kits de inicio"), "einschulung"),
    ("03", pack("Glückwunschkarten", "Greeting cards", "Tebrik kartı", ar="بطاقات تهنئة", fr="Cartes de vœux", it="Biglietti", es="Tarjetas"), "glueckwunschkarten"),
    ("04", pack("Namensschilder", "Name badges", "İsimlik", ar="شارات اسم", fr="Badges nominatifs", it="Targhette", es="Identificadores"), "namensschilder"),
]
PAPER = [
    ("01", pack("Druckerpapier", "Printer paper", "Yazıcı kâğıdı", ar="ورق طابعة", fr="Papier imprimante", it="Carta stampante", es="Papel de impresora"), "druckerpapier"),
    ("02", pack("Kopierpapier", "Copy paper", "Fotokopi kâğıdı", ar="ورق تصوير", fr="Papier photocopie", it="Carta fotocopie", es="Papel de copias"), "kopierpapier"),
    ("03", pack("Notizblöcke", "Notepads", "Not defteri", ar="دفاتر ملاحظات", fr="Blocs-notes", it="Block notes", es="Bloc de notas"), "notizbloecke"),
    ("04", pack("Briefpapier", "Letter paper", "Mektup kâğıdı", ar="ورق رسائل", fr="Papier à lettres", it="Carta da lettere", es="Papel de cartas"), "briefpapier"),
]
ORG = [
    ("01", pack("Ordner", "Ring binders", "Klasör", ar="ملفات حلقات", fr="Classeurs", it="Raccoglitori", es="Archivadores"), "ordner"),
    ("02", pack("Register", "Dividers", "Ayraç", ar="فواصل", fr="Intercalaires", it="Divisori", es="Separadores"), "register"),
    ("03", pack("Etiketten", "Labels", "Etiket", ar="ملصقات", fr="Étiquettes", it="Etichette", es="Etiquetas"), "etiketten"),
    ("04", pack("Schubladenboxen", "Drawer units", "Çekmece kutusu", ar="صناديق أدراج", fr="Tiroirs de rangement", it="Cassettiere", es="Cajoneras"), "schubladenboxen"),
]
EXISTING = {
    "cat-04-01": (pack("Schulmaterial", "School materials", "Okul malzemesi", ar="مواد مدرسية", fr="Matériel scolaire", it="Materiale scuola", es="Material escolar"), SCHOOL),
    "cat-04-02": (pack("Schreibwaren", "Stationery", "Kırtasiye", ar="قرطاسية", fr="Papeterie", it="Cancelleria", es="Papelería"), PENS),
    "cat-04-03": (pack("Büromaterial", "Office supplies", "Ofis malzemesi", ar="مستلزمات مكتب", fr="Fournitures bureau", it="Cancelleria ufficio", es="Material de oficina"), OFFICE),
    "cat-04-04": (pack("Kunst & Hobby", "Art & hobby", "Sanat ve hobi", ar="فن وهواية", fr="Art et hobby", it="Arte e hobby", es="Arte y hobby"), ART),
    "cat-04-05": (pack("Taschen & Etui", "Bags & cases", "Çanta ve kalemlik", ar="حقائب ومقلمات", fr="Sacs et trousses", it="Borse e astucci", es="Bolsas y estuches"), BAGS),
    "cat-04-06": (pack("Schultüte & Einschulung", "School start", "Okula başlangıç", ar="بداية المدرسة", fr="Rentrée scolaire", it="Inizio scuola", es="Vuelta al cole"), START),
}
NEW_L2 = [
    ("07", "papier-und-druck", pack("Papier & Druck", "Paper & print", "Kâğıt ve baskı", ar="ورق وطباعة", fr="Papier et impression", it="Carta e stampa", es="Papel e impresión"), PAPER),
    ("08", "organisation-und-archiv", pack("Organisation & Archiv", "Filing & archive", "Düzen ve arşiv", ar="تنظيم وأرشيف", fr="Classement", it="Archivio", es="Archivo"), ORG),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-04")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-04-{suffix}"
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
