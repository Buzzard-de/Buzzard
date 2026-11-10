#!/usr/bin/env python3
"""Complete Landwirtschaft & Agrar (cat-20) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Agriculture placeholder L3 replaced with a real product group"})


STALL = [
    ("01", pack("Boxen & Trennwände", "Stalls & partitions", "Bölme", ar="فواصل", fr="Cloisons", it="Divisori", es="Tabiques"), "boxen-und-trennwaende"),
    ("02", pack("Stallmatten", "Stall mats", "Ahır matı", ar="حصائر", fr="Tapis d'étable", it="Tappeti stalla", es="Alfombras establo"), "stallmatten"),
    ("03", pack("Tröge", "Troughs", "Yemlik tekne", ar="أحواض", fr="Auge", it="Mangiatoie", es="Pesebres"), "troege"),
    ("04", pack("Beleuchtung", "Lighting", "Aydınlatma", ar="إضاءة", fr="Éclairage", it="Illuminazione", es="Iluminación"), "beleuchtung"),
    ("05", pack("Lüftung", "Ventilation", "Havalandırma", ar="تهوية", fr="Ventilation", it="Ventilazione", es="Ventilación"), "lueftung"),
]
FARM = [
    ("01", pack("Schubkarren", "Wheelbarrows", "El arabası", ar="عربات", fr="Brouettes", it="Carriole", es="Carretillas"), "schubkarren"),
    ("02", pack("Mistgabeln", "Pitchforks", "Dirgen", ar="مذاري", fr="Fourches", it="Forche", es="Horcas"), "mistgabeln"),
    ("03", pack("Schaufeln", "Shovels", "Kürek", ar="جاروف", fr="Pelles", it="Palette", es="Palas"), "schaufeln"),
    ("04", pack("Mühlen", "Mills", "Değirmen", ar="طواحين", fr="Moulins", it="Mulini", es="Molinos"), "muehlen"),
    ("05", pack("Anhänger-Zubehör", "Trailer accessories", "Römork aksesuarı", ar="مقطورات", fr="Accessoires remorque", it="Accessori rimorchio", es="Accesorios remolque"), "anhaenger-zubehoer"),
]
DRINK = [
    ("01", pack("Selbsttränken", "Auto drinkers", "Otomatik suluk", ar="شاربات", fr="Abreuvoirs auto", it="Abbeveratoi", es="Bebederos auto"), "selbsttraenken"),
    ("02", pack("Trogtränken", "Trough drinkers", "Tekne suluk", ar="أحواض شرب", fr="Bacs d'abreuvement", it="Vasca", es="Bebederos cuba"), "trogtraenken"),
    ("03", pack("Nippeltränken", "Nipple drinkers", "Nipel suluk", ar="حلمات", fr="Pipettes", it="Nipple", es="Tetinas"), "nippeltraenken"),
    ("04", pack("Heiztränken", "Heated drinkers", "Isıtmalı suluk", ar="تدفئة", fr="Abreuvoirs chauffants", it="Riscaldati", es="Calefactados"), "heiztraenken"),
    ("05", pack("Schwimmer", "Float valves", "Şamandıra", ar="عوامات", fr="Flotteurs", it="Galleggianti", es="Flotadores"), "schwimmer"),
]
FEED = [
    ("01", pack("Raufen", "Hay racks", "Otluk", ar="رفوف تبن", fr="Râteliers", it="Rastrelliere", es="Pesebres heno"), "raufen"),
    ("02", pack("Futterautomaten", "Feeders", "Yem otomatı", ar="مغذيات", fr="Distributeurs", it="Mangiatoie auto", es="Tolvas"), "futterautomaten"),
    ("03", pack("Minerallecken", "Mineral licks", "Mineral", ar="معادن", fr="Pierres à lécher", it="Sali minerali", es="Piedras minerales"), "minerallecken"),
    ("04", pack("Kükentröge", "Chick troughs", "Civciv yemliği", ar="صغار", fr="Mangeoires poussins", it="Mangiatoie pulcini", es="Comederos pollitos"), "kuekentroeg"),
    ("05", pack("Silo-Deckel", "Silo lids", "Silo kapağı", ar="أغطية صوامع", fr="Couvercles silo", it="Coperchi silo", es="Tapas silo"), "silo-deckel"),
]
FENCE = [
    ("01", pack("Drahtgitter", "Wire mesh", "Tel örgü", ar="شبك", fr="Grillage", it="Rete", es="Malla"), "drahtgitter"),
    ("02", pack("Pfähle", "Posts", "Direk", ar="أعمدة", fr="Poteaux", it="Pali", es="Postes"), "pfaehle"),
    ("03", pack("Weidetore", "Pasture gates", "Mera kapısı", ar="بوابات", fr="Portails", it="Cancelli", es="Puertas"), "weidetore"),
    ("04", pack("Elektrozaun", "Electric fence", "Elektrikli çit", ar="سياج كهربائي", fr="Clôture électrique", it="Recinzione elettrica", es="Cerca eléctrica"), "elektrozaun"),
    ("05", pack("Isolatoren", "Insulators", "İzolatör", ar="عوازل", fr="Isolateurs", it="Isolatori", es="Aisladores"), "isolatoren"),
]
CARE = [
    ("01", pack("Hufpflege", "Hoof care", "Tırnak bakımı", ar="حوافر", fr="Soin des sabots", it="Cura zoccoli", es="Cuidado cascos"), "hufpflege"),
    ("02", pack("Bürsten", "Brushes", "Fırça", ar="فرش", fr="Brosses", it="Spazzole", es="Cepillos"), "buersten"),
    ("03", pack("Klauenmesser", "Hoof knives", "Tırnak bıçağı", ar="سكاكين", fr="Couteaux", it="Coltelli", es="Cuchillos"), "klauenmesser"),
    ("04", pack("Drenchen", "Drenching", "Sonda", ar="جرعات", fr="Drenchage", it="Drench", es="Drench"), "drenchen"),
    ("05", pack("Handschuhe", "Gloves", "Eldiven", ar="قفازات", fr="Gants", it="Guanti", es="Guantes"), "handschuhe"),
]
EXISTING = {
    "cat-20-01": (pack("Stallausrüstung", "Stall equipment", "Ahır ekipmanı", ar="معدات حظيرة", fr="Équipement étable", it="Attrezzatura stalla", es="Equipo establo"), STALL),
    "cat-20-02": (pack("Hofausrüstung", "Farm equipment", "Çiftlik ekipmanı", ar="معدات مزرعة", fr="Équipement ferme", it="Attrezzatura fattoria", es="Equipo granja"), FARM),
    "cat-20-03": (pack("Tränken", "Drinkers", "Suluk", ar="شاربات", fr="Abreuvoirs", it="Abbeveratoi", es="Bebederos"), DRINK),
    "cat-20-04": (pack("Futterstellen", "Feeders", "Yemlik", ar="مغذيات", fr="Mangeoires", it="Mangiatoie", es="Comederos"), FEED),
    "cat-20-05": (pack("Zaun & Käfig", "Fence & cage", "Çit ve kafes", ar="سياج وقفص", fr="Clôture et cage", it="Recinzione e gabbia", es="Cerca y jaula"), FENCE),
    "cat-20-06": (pack("Tierpflege", "Animal care", "Hayvan bakımı", ar="عناية الحيوان", fr="Soin animal", it="Cura animale", es="Cuidado animal"), CARE),
}
NEW_L2 = [
    ("07", "melk-und-milch", pack("Melk & Milch", "Milking & milk", "Süt sağım", ar="حلب وحليب", fr="Traite et lait", it="Mungitura e latte", es="Ordeño y leche"), [
        ("01", pack("Melkeimer", "Milk buckets", "Süt kovası", ar="دلاء حليب", fr="Seaux à lait", it="Secchi latte", es="Cubos leche"), "melkeimer"),
        ("02", pack("Melkbecher", "Teat cups", "Sağım başlığı", ar="أكواب", fr="Gaines", it="Guaine", es="Pezoneras"), "melkbecher"),
        ("03", pack("Milchfilter", "Milk filters", "Süt filtresi", ar="فلاتر حليب", fr="Filtres lait", it="Filtri latte", es="Filtros leche"), "milchfilter"),
        ("04", pack("Kannen", "Milk cans", "Süt güğümü", ar="أوعية", fr="Bidons", it="Bidoni", es="Cántaras"), "kannen"),
        ("05", pack("Kühlung", "Cooling", "Soğutma", ar="تبريد", fr="Refroidissement", it="Raffreddamento", es="Enfriamiento"), "kuehlung"),
    ]),
    ("08", "stallhygiene", pack("Stallhygiene", "Stall hygiene", "Ahır hijyeni", ar="نظافة الحظيرة", fr="Hygiène étable", it="Igiene stalla", es="Higiene establo"), [
        ("01", pack("Desinfektion", "Disinfectants", "Dezenfektan", ar="مطهرات", fr="Désinfectants", it="Disinfettanti", es="Desinfectantes"), "desinfektion"),
        ("02", pack("Sprüher", "Sprayers", "Püskürtücü", ar="رشاشات", fr="Pulvérisateurs", it="Spruzzatori", es="Pulverizadores"), "sprueher"),
        ("03", pack("Einstreu", "Bedding", "Altlık", ar="فرش", fr="Litière", it="Lettiera", es="Cama"), "einstreu"),
        ("04", pack("Kalk", "Lime", "Kireç", ar="جير", fr="Chaux", it="Calce", es="Cal"), "kalk"),
        ("05", pack("Besen & Schieber", "Brooms & scrapers", "Süpürge", ar="مكانس", fr="Balais", it="Scope", es="Escobas"), "besen-und-schieber"),
    ]),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-20")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-20-{suffix}"
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
