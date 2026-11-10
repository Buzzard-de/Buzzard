#!/usr/bin/env python3
"""Complete Gesundheit & Wellness (cat-27) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Wellness placeholder L3 replaced with a real product group"})


FIT = [
    ("01", pack("Fitnessbänder", "Resistance bands", "Direnç lastiği", ar="أربطة مقاومة", fr="Élastiques", it="Elastici", es="Bandas"), "fitnessbaender"),
    ("02", pack("Yogamatten", "Yoga mats", "Yoga matı", ar="حصائر يوغا", fr="Tapis de yoga", it="Tappetini yoga", es="Esterillas"), "yogamatten"),
    ("03", pack("Hanteln", "Dumbbells", "Dambıl", ar="دمبل", fr="Haltères", it="Manubri", es="Mancuernas"), "hanteln"),
    ("04", pack("Faszienrollen", "Foam rollers", "Fasya rulosu", ar="رولر فاشيا", fr="Rouleaux", it="Rulli fascia", es="Rodillos"), "faszienrollen"),
]
MASSAGE = [
    ("01", pack("Massagegeräte", "Massage devices", "Masaj aleti", ar="أجهزة تدليك", fr="Appareils massage", it="Massaggiatori", es="Masajeadores"), "massagegeraete"),
    ("02", pack("Massageöle", "Massage oils", "Masaj yağı", ar="زيوت تدليك", fr="Huiles de massage", it="Oli massaggio", es="Aceites de masaje"), "massageoele"),
    ("03", pack("Massagekissen", "Massage cushions", "Masaj yastığı", ar="وسائد تدليك", fr="Coussins massage", it="Cuscini massaggio", es="Cojines de masaje"), "massagekissen"),
    ("04", pack("Hot-Stone", "Hot stones", "Hot stone", ar="حجارة ساخنة", fr="Pierres chaudes", it="Pietre calde", es="Piedras calientes"), "hot-stone"),
]
SLEEP = [
    ("01", pack("Schlafmasken", "Sleep masks", "Uyku bandı", ar="قناع نوم", fr="Masques de sommeil", it="Mascherine sonno", es="Antifaces"), "schlafmasken"),
    ("02", pack("Ohrstöpsel", "Earplugs", "Kulak tıkacı", ar="سدادات أذن", fr="Bouchons d'oreilles", it="Tappi orecchie", es="Tapones"), "ohrstoepsel"),
    ("03", pack("Gewichtsdecken", "Weighted blankets", "Ağırlıklı battaniye", ar="بطانيات مثقلة", fr="Couvertures lestées", it="Coperte ponderate", es="Mantas pesadas"), "gewichtsdecken"),
    ("04", pack("Nackenkissen", "Neck pillows", "Boyun yastığı", ar="وسائد رقبة", fr="Oreillers cervical", it="Cuscini cervicali", es="Almohadas cervicales"), "nackenkissen"),
]
CARE = [
    ("01", pack("Blutdruckmessgeräte", "Blood pressure monitors", "Tansiyon aleti", ar="أجهزة ضغط", fr="Tensiomètres", it="Misuratori pressione", es="Tensiómetros"), "blutdruckmessgeraete"),
    ("02", pack("Fieberthermometer", "Thermometers", "Ateş ölçer", ar="موازين حرارة", fr="Thermomètres", it="Termometri", es="Termómetros"), "fieberthermometer"),
    ("03", pack("Pulsoximeter", "Pulse oximeters", "Nabız oksimetre", ar="مقياس أكسجين", fr="Oxymètres", it="Saturimetri", es="Pulsioxímetros"), "pulsoximeter"),
    ("04", pack("Personenwaagen", "Bathroom scales", "Banyo tartısı", ar="موازين أشخاص", fr="Pèse-personnes", it="Bilance pesapersone", es="Básculas"), "personenwaagen"),
]
HOME = [
    ("01", pack("Luftbefeuchter", "Humidifiers", "Nemlendirici", ar="مرطبات هواء", fr="Humidificateurs", it="Umidificatori", es="Humidificadores"), "luftbefeuchter"),
    ("02", pack("Aroma-Diffuser", "Diffusers", "Difüzör", ar="موزعات عطر", fr="Diffuseurs", it="Diffusori", es="Difusores"), "aroma-diffuser"),
    ("03", pack("Salzinhalatoren", "Salt inhalers", "Tuz inhaler", ar="استنشاق ملح", fr="Inhalateurs sel", it="Inalatori sale", es="Inhaladores"), "salzinhalatoren"),
    ("04", pack("Tageslichtlampen", "Daylight lamps", "Gün ışığı lambası", ar="مصابيح ضوء نهاري", fr="Lampes lumière du jour", it="Lampade daylight", es="Lámparas de luz diurna"), "tageslichtlampen"),
]
AROMA = [
    ("01", pack("Ätherische Öle", "Essential oils", "Uçucu yağ", ar="زيوت عطرية", fr="Huiles essentielles", it="Oli essenziali", es="Aceites esenciales"), "aetherische-oele"),
    ("02", pack("Duftkerzen", "Scented candles", "Kokulu mum", ar="شموع معطرة", fr="Bougies parfumées", it="Candele profumate", es="Velas aromáticas"), "duftkerzen"),
    ("03", pack("Räucherstäbchen", "Incense", "Tütsü", ar="بخور", fr="Encens", it="Incenso", es="Incienso"), "raeucherstaebchen"),
    ("04", pack("Raumsprays", "Room sprays", "Oda spreyi", ar="بخاخ غرف", fr="Sprays d'ambiance", it="Spray ambiente", es="Sprays de ambiente"), "raumsprays"),
]
HEAT = [
    ("01", pack("Heizkissen", "Heating pads", "Isı yastığı", ar="وسائد تدفئة", fr="Coussins chauffants", it="Termofori", es="Almohadillas térmicas"), "heizkissen"),
    ("02", pack("Infrarotlampen", "Infrared lamps", "Kızılötesi lamba", ar="مصابيح تحت الحمراء", fr="Lampes infrarouge", it="Lampade infrarossi", es="Lámparas infrarrojas"), "infrarotlampen"),
    ("03", pack("Wärmepflaster", "Heat patches", "Isı bandı", ar="لصقات حرارة", fr="Patchs chaleur", it="Cerotti calore", es="Parches de calor"), "waermepflaster"),
    ("04", pack("Kühlpads", "Cooling pads", "Soğutma pedi", ar="كمادات تبريد", fr="Patches froid", it="Patch raffreddanti", es="Parches fríos"), "kuehlpads"),
]
AID = [
    ("01", pack("Pflaster", "Plasters", "Yara bandı", ar="لصقات", fr="Pansements", it="Cerotti", es="Tiritas"), "pflaster"),
    ("02", pack("Verbandmaterial", "Bandages", "Sargı", ar="ضمادات", fr="Bandes", it="Bende", es="Vendas"), "verbandmaterial"),
    ("03", pack("Desinfektion", "Antiseptics", "Dezenfektan", ar="مطهر", fr="Antiseptiques", it="Antisettici", es="Antisépticos"), "desinfektion"),
    ("04", pack("Erste-Hilfe-Sets", "First-aid kits", "İlk yardım seti", ar="طقم إسعاف", fr="Trousses de secours", it="Kit pronto soccorso", es="Botiquines"), "erste-hilfe-sets"),
]
EXISTING = {
    "cat-27-01": (pack("Fitness & Wellness", "Fitness & wellness", "Fitness ve wellness", ar="لياقة وعافية", fr="Fitness et wellness", it="Fitness e wellness", es="Fitness y wellness"), FIT),
    "cat-27-02": (pack("Massage", "Massage", "Masaj", ar="تدليك", fr="Massage", it="Massaggio", es="Masaje"), MASSAGE),
    "cat-27-03": (pack("Schlaf & Entspannung", "Sleep & relaxation", "Uyku ve rahatlama", ar="نوم واسترخاء", fr="Sommeil", it="Sonno", es="Sueño"), SLEEP),
    "cat-27-04": (pack("Gesundheitsmessung", "Health monitors", "Ölçüm cihazları", ar="أجهزة قياس", fr="Mesure santé", it="Misuratori", es="Medición"), CARE),
    "cat-27-05": (pack("Raumklima & Aroma", "Air & aroma", "Ortam ve aroma", ar="مناخ داخلي", fr="Ambiance", it="Ambiente", es="Ambiente"), HOME),
}
NEW_L2 = [
    ("06", "aroma-und-duft", pack("Aroma & Duft", "Aroma & scent", "Aroma ve koku", ar="عطور المنزل", fr="Arômes", it="Aromi", es="Aromas"), AROMA),
    ("07", "waerme-und-kaelte", pack("Wärme & Kälte", "Heat & cold therapy", "Sıcak-soğuk tedavi", ar="حرارة وبرودة", fr="Chaud et froid", it="Caldo e freddo", es="Calor y frío"), HEAT),
    ("08", "erste-hilfe", pack("Erste Hilfe", "First aid", "İlk yardım", ar="إسعاف أولي", fr="Premiers secours", it="Primo soccorso", es="Primeros auxilios"), AID),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-27")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-27-{suffix}"
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
