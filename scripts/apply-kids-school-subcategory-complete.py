#!/usr/bin/env python3
"""Complete Kinder & Schule (cat-47) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Kids-school placeholder L3 replaced with a real product group"})


SUPPLY = [
    ("01", pack("Hefte", "Exercise books", "Defter", ar="كراسات", fr="Cahiers", it="Quaderni", es="Cuadernos"), "hefte"),
    ("02", pack("Stifte", "Pens & pencils", "Kalem", ar="أقلام", fr="Stylos", it="Penne", es="Bolígrafos"), "stifte"),
    ("03", pack("Lineale", "Rulers", "Cetvel", ar="مساطر", fr="Règles", it="Righelli", es="Reglas"), "lineale"),
    ("04", pack("Mappen", "Folders", "Dosya", ar="ملفات", fr="Chemises", it="Cartelline", es="Carpetas"), "mappen"),
]
GAMES = [
    ("01", pack("Rechenspiele", "Math games", "Matematik oyunu", ar="ألعاب حساب", fr="Jeux de calcul", it="Giochi di calcolo", es="Juegos de mates"), "rechenspiele"),
    ("02", pack("Sprachspiele", "Language games", "Dil oyunu", ar="ألعاب لغة", fr="Jeux de langue", it="Giochi di lingua", es="Juegos de idioma"), "sprachspiele"),
    ("03", pack("Quizspiele", "Quiz games", "Quiz", ar="مسابقات", fr="Quiz", it="Quiz", es="Quiz"), "quizspiele"),
    ("04", pack("Lernkarten", "Flash cards", "Öğrenme kartı", ar="بطاقات", fr="Cartes éducatives", it="Schede", es="Tarjetas"), "lernkarten"),
]
BAGS = [
    ("01", pack("Schulrucksäcke", "School backpacks", "Okul çantası", ar="حقائب مدرسية", fr="Sacs d'école", it="Zaini scuola", es="Mochilas escolares"), "schulrucksaecke"),
    ("02", pack("Federmappen", "Pencil cases", "Kalemlik", ar="مقلمات", fr="Trousses", it="Astucci", es="Estuches"), "federmappen"),
    ("03", pack("Turnbeutel", "Gym bags", "Spor çantası", ar="حقائب رياضة", fr="Sacs de sport", it="Sacchi palestra", es="Bolsas de deporte"), "turnbeutel"),
    ("04", pack("Schlamper", "Pencil rolls", "Kalem rulosu", ar="رول أقلام", fr="Rouleaux crayons", it="Rollini", es="Rollos de lápices"), "schlamper"),
]
ACC = [
    ("01", pack("Haarspangen", "Hair clips", "Toka", ar="مشابك شعر", fr="Barrettes", it="Fermagli", es="Horquillas"), "haarspangen"),
    ("02", pack("Kinderschals", "Kids' scarves", "Çocuk atkısı", ar="أوشحة أطفال", fr="Écharpes enfants", it="Sciarpe bambini", es="Bufandas infantiles"), "kinderschals"),
    ("03", pack("Caps", "Caps", "Şapka", ar="قبعات", fr="Casquettes", it="Cappellini", es="Gorras"), "caps"),
    ("04", pack("Kinderuhren", "Kids' watches", "Çocuk saati", ar="ساعات أطفال", fr="Montres enfants", it="Orologi bambini", es="Relojes infantiles"), "kinderuhren"),
]
LUNCH = [
    ("01", pack("Brotdosen", "Lunch boxes", "Beslenme kutusu", ar="علب طعام", fr="Boîtes à goûter", it="Portamerenda", es="Fiambreras"), "brotdosen"),
    ("02", pack("Trinkflaschen", "Bottles", "Suluk", ar="زجاجات", fr="Gourdes", it="Borracce", es="Botellas"), "trinkflaschen"),
    ("03", pack("Ice-Packs", "Ice packs", "Buz aküsü", ar="كمادات ثلج", fr="Pains de glace", it="Ghiaccio gel", es="Acumuladores"), "ice-packs"),
    ("04", pack("Besteck-Sets", "Cutlery sets", "Çatal bıçak seti", ar="طقم أدوات", fr="Couverts", it="Posate", es="Cubiertos"), "besteck-sets"),
]
SPORT = [
    ("01", pack("Sportbeutel", "Kit bags", "Spor torbası", ar="أكياس رياضة", fr="Sacs sport", it="Borse sport", es="Bolsas deporte"), "sportbeutel"),
    ("02", pack("Trinkflaschen Sport", "Sports bottles", "Spor suluğu", ar="زجاجات رياضة", fr="Gourdes sport", it="Borracce sport", es="Botellas deporte"), "sport-trinkflaschen"),
    ("03", pack("Sprungseile", "Skipping ropes", "İp", ar="حبال قفز", fr="Cordes à sauter", it="Corde per saltare", es="Cuerdas de saltar"), "sprungseile"),
    ("04", pack("Bälle Pause", "Playground balls", "Teneffüs topu", ar="كرات ساحة", fr="Ballons récré", it="Palloni ricreazione", es="Pelotas recreo"), "baelle-pause"),
]
ART = [
    ("01", pack("Malfarben", "Paints", "Boya", ar="ألوان", fr="Peintures", it="Colori", es="Pinturas"), "malfarben"),
    ("02", pack("Pinsel", "Brushes", "Fırça", ar="فرش", fr="Pinceaux", it="Pennelli", es="Pinceles"), "pinsel"),
    ("03", pack("Tonpapier", "Construction paper", "Elişi kâğıdı", ar="ورق مقوى", fr="Papier Canson", it="Cartoncini", es="Cartulinas"), "tonpapier"),
    ("04", pack("Knete Schule", "Modelling clay", "Oyun hamuru", ar="صلصال", fr="Pâte à modeler", it="Plastilina", es="Plastilina"), "knete-schule"),
]
LABEL = [
    ("01", pack("Namensaufkleber", "Name labels", "İsim etiketi", ar="ملصقات اسم", fr="Étiquettes nom", it="Etichette nome", es="Etiquetas nombre"), "namensaufkleber"),
    ("02", pack("Heftaufkleber", "Book covers", "Defter kapağı", ar="أغلفة كراسات", fr="Protège-cahiers", it="Copertine", es="Forros"), "heftaufkleber"),
    ("03", pack("Stundenpläne", "Timetables", "Ders programı", ar="جدول حصص", fr="Emplois du temps", it="Orari", es="Horarios"), "stundenplaene"),
    ("04", pack("Buchhüllen", "Book jackets", "Kitap kılıfı", ar="أغلفة كتب", fr="Couvre-livres", it="Copri libri", es="Forros de libros"), "buchhuellen"),
]
EXISTING = {
    "cat-47-01": (pack("Schulbedarf", "School supplies", "Okul malzemesi", ar="مستلزمات مدرسية", fr="Fournitures scolaires", it="Materiale scolastico", es="Material escolar"), SUPPLY),
    "cat-47-02": (pack("Lernspiele", "Learning games", "Öğrenme oyunu", ar="ألعاب تعليم", fr="Jeux éducatifs", it="Giochi didattici", es="Juegos educativos"), GAMES),
    "cat-47-03": (pack("Schulrucksäcke", "School bags", "Okul çantası", ar="حقائب مدرسية", fr="Cartables", it="Zaini", es="Mochilas"), BAGS),
    "cat-47-04": (pack("Kinderaccessoires", "Kids' accessories", "Çocuk aksesuarı", ar="إكسسوارات أطفال", fr="Accessoires enfants", it="Accessori bambini", es="Accesorios infantiles"), ACC),
}
NEW_L2 = [
    ("05", "brotdosen-und-trinken", pack("Brotdosen & Trinken", "Lunch & drink", "Beslenme ve içecek", ar="طعام وشراب", fr="Goûter et boisson", it="Merenda e bevande", es="Almuerzo y bebida"), LUNCH),
    ("06", "pause-und-sport", pack("Pause & Sport", "Break & sport", "Teneffüs ve spor", ar="فسحة ورياضة", fr="Récré et sport", it="Ricreazione e sport", es="Recreo y deporte"), SPORT),
    ("07", "kunstunterricht", pack("Kunstunterricht", "Art class", "Sanat dersi", ar="حصة فن", fr="Arts plastiques", it="Arte", es="Plástica"), ART),
    ("08", "etiketten-und-ordnung", pack("Etiketten & Ordnung", "Labels & organisers", "Etiket ve düzen", ar="ملصقات وتنظيم", fr="Étiquettes", it="Etichette", es="Etiquetas"), LABEL),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-47")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-47-{suffix}"
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
