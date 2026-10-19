#!/usr/bin/env python3
"""Complete Apotheke & Medizinprodukte (cat-45) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Pharmacy placeholder L3 replaced with a real product group"})


DEVICES = [
    ("01", pack("Blutdruckmessgeräte", "Blood pressure monitors", "Tansiyon aleti", ar="أجهزة ضغط", fr="Tensiomètres", it="Misuratori pressione", es="Tensiómetros"), "blutdruckmessgeraete"),
    ("02", pack("Inhalatoren", "Inhalers", "İnhaler", ar="أجهزة استنشاق", fr="Inhalateurs", it="Inalatori", es="Inhaladores"), "inhalatoren"),
    ("03", pack("Kompression", "Compression wear", "Kompresyon", ar="جوارب ضغط", fr="Compression", it="Compressione", es="Compresión"), "kompression"),
    ("04", pack("Blutzuckermessung", "Blood glucose", "Kan şekeri", ar="سكر الدم", fr="Glycémie", it="Glicemia", es="Glucosa"), "blutzuckermessung"),
]
FIRSTAID = [
    ("01", pack("Wundversorgung", "Wound care", "Yara bakımı", ar="عناية بالجروح", fr="Soin des plaies", it="Cura ferite", es="Cuidado de heridas"), "wundversorgung"),
    ("02", pack("Verbandskästen", "First-aid kits", "İlk yardım çantası", ar="صناديق إسعاف", fr="Trousses", it="Cassetti pronto soccorso", es="Botiquines"), "verbandskaesten"),
    ("03", pack("Desinfektion", "Antiseptics", "Dezenfektan", ar="مطهر", fr="Antiseptiques", it="Antisettici", es="Antisépticos"), "desinfektion"),
    ("04", pack("Rettungsdecken", "Emergency blankets", "Acil battaniye", ar="أغطية طوارئ", fr="Couvertures de survie", it="Coperte isotermiche", es="Mantas de emergencia"), "rettungsdecken"),
]
SUPP = [
    ("01", pack("Vitamine", "Vitamins", "Vitamin", ar="فيتامينات", fr="Vitamines", it="Vitamine", es="Vitaminas"), "vitamine"),
    ("02", pack("Mineralstoffe", "Minerals", "Mineral", ar="معادن", fr="Minéraux", it="Minerali", es="Minerales"), "mineralstoffe"),
    ("03", pack("Omega-3", "Omega-3", "Omega-3", ar="أوميغا 3", fr="Oméga-3", it="Omega-3", es="Omega-3"), "omega-3"),
    ("04", pack("Probiotika", "Probiotics", "Probiyotik", ar="بروبيوتيك", fr="Probiotiques", it="Probiotici", es="Probióticos"), "probiotika"),
]
CARE = [
    ("01", pack("Inkontinenz", "Incontinence", "İnkontinans", ar="سلس", fr="Incontinence", it="Incontinenza", es="Incontinencia"), "inkontinenz"),
    ("02", pack("Bettschutz", "Bed protection", "Yatak koruma", ar="حماية السرير", fr="Protection lit", it="Protezione letto", es="Protección cama"), "bettschutz"),
    ("03", pack("Gehhilfen", "Walking aids", "Yürüme yardımcısı", ar="مساعدات المشي", fr="Aides à la marche", it="Ausili deambulazione", es="Ayudas para caminar"), "gehhilfen"),
    ("04", pack("Greifhilfen", "Reachers", "Tutunma yardımı", ar="مساعدات الإمساك", fr="Pinces de préhension", it="Pinze di presa", es="Pinzas de alcance"), "greifhilfen"),
]
DIAG = [
    ("01", pack("Schwangerschaftstests", "Pregnancy tests", "Hamilelik testi", ar="اختبار حمل", fr="Tests de grossesse", it="Test gravidanza", es="Pruebas de embarazo"), "schwangerschaftstests"),
    ("02", pack("Schnelltests", "Rapid tests", "Hızlı test", ar="اختبارات سريعة", fr="Tests rapides", it="Test rapidi", es="Pruebas rápidas"), "schnelltests"),
    ("03", pack("Urintests", "Urine tests", "İdrar testi", ar="تحليل بول", fr="Tests urinaires", it="Test urine", es="Análisis de orina"), "urintests"),
    ("04", pack("Cholesterintests", "Cholesterol tests", "Kolesterol testi", ar="اختبار كوليسترول", fr="Tests cholestérol", it="Test colesterolo", es="Pruebas de colesterol"), "cholesterintests"),
]
COLD = [
    ("01", pack("Halstabletten", "Throat lozenges", "Boğaz pastili", ar="أقراص حلق", fr="Pastilles gorge", it="Pastiglie gola", es="Pastillas para la garganta"), "halstabletten"),
    ("02", pack("Nasensprays", "Nasal sprays", "Burun spreyi", ar="بخاخ أنف", fr="Sprays nasaux", it="Spray nasali", es="Sprays nasales"), "nasensprays"),
    ("03", pack("Inhalate", "Inhalants", "İnhalasyon", ar="مستنشقات", fr="Inhalats", it="Inalati", es="Inhalados"), "inhalate"),
    ("04", pack("Immunpräparate", "Immune support", "Bağışıklık", ar="دعم المناعة", fr="Immunité", it="Immunità", es="Inmunidad"), "immunpraeparate"),
]
EYE = [
    ("01", pack("Augentropfen", "Eye drops", "Göz damlası", ar="قطرة عين", fr="Gouttes oculaires", it="Colliri", es="Gotas oftálmicas"), "augentropfen"),
    ("02", pack("Kontaktlinsenpflege", "Contact lens care", "Lens bakımı", ar="عناية بالعدسات", fr="Entretien lentilles", it="Cura lenti", es="Cuidado de lentillas"), "kontaktlinsenpflege"),
    ("03", pack("Ohrentropfen", "Ear drops", "Kulak damlası", ar="قطرة أذن", fr="Gouttes auriculaires", it="Gocce orecchie", es="Gotas óticas"), "ohrentropfen"),
    ("04", pack("Brillenpflege", "Eyewear care", "Gözlük bakımı", ar="عناية بالنظارات", fr="Entretien lunettes", it="Cura occhiali", es="Cuidado de gafas"), "brillenpflege"),
]
ORAL = [
    ("01", pack("Interdentalpflege", "Interdental care", "Diş arası bakım", ar="عناية بين الأسنان", fr="Soin interdentaire", it="Igiene interdentale", es="Cuidado interdental"), "interdentalpflege"),
    ("02", pack("Mundspülungen", "Mouthwashes", "Ağız gargarası", ar="غسول فم", fr="Bains de bouche", it="Collutori", es="Enjuagues"), "mundspuelungen"),
    ("03", pack("Prothesenpflege", "Denture care", "Protez bakımı", ar="عناية بأطقم الأسنان", fr="Soin prothèses", it="Cura protesi", es="Cuidado de prótesis"), "prothesenpflege"),
    ("04", pack("Zahnfleischpflege", "Gum care", "Diş eti bakımı", ar="عناية باللثة", fr="Soin gencives", it="Cura gengive", es="Cuidado de encías"), "zahnfleischpflege"),
]
EXISTING = {
    "cat-45-01": (pack("Medizinprodukte", "Medical devices", "Tıbbi cihazlar", ar="أجهزة طبية", fr="Dispositifs médicaux", it="Dispositivi medici", es="Productos sanitarios"), DEVICES),
    "cat-45-02": (pack("Erste Hilfe", "First aid", "İlk yardım", ar="إسعاف أولي", fr="Premiers secours", it="Primo soccorso", es="Primeros auxilios"), FIRSTAID),
    "cat-45-03": (pack("Nahrungsergänzung", "Supplements", "Takviye", ar="مكملات", fr="Compléments", it="Integratori", es="Complementos"), SUPP),
    "cat-45-04": (pack("Pflegehilfsmittel", "Care aids", "Bakım yardımcıları", ar="مساعدات رعاية", fr="Aides aux soins", it="Ausili per la cura", es="Ayudas de cuidado"), CARE),
}
NEW_L2 = [
    ("05", "diagnostik-und-tests", pack("Diagnostik & Tests", "Diagnostics & tests", "Tanı ve testler", ar="تشخيص واختبارات", fr="Diagnostics", it="Diagnostica", es="Diagnóstico"), DIAG),
    ("06", "erkaeltung-und-immun", pack("Erkältung & Immun", "Cold & immune", "Soğuk algınlığı ve bağışıklık", ar="برد ومناعة", fr="Rhume et immunité", it="Raffreddore e immunità", es="Resfriado e inmunidad"), COLD),
    ("07", "augen-und-ohren", pack("Augen & Ohren", "Eyes & ears", "Göz ve kulak", ar="عين وأذن", fr="Yeux et oreilles", it="Occhi e orecchie", es="Ojos y oídos"), EYE),
    ("08", "mundhygiene-medizinisch", pack("Mundhygiene medizinisch", "Medical oral care", "Tıbbi ağız bakımı", ar="عناية فموية طبية", fr="Hygiène buccale médicale", it="Igiene orale medica", es="Higiene bucal médica"), ORAL),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-45")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-45-{suffix}"
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
