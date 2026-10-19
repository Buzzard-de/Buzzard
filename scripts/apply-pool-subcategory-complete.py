#!/usr/bin/env python3
"""Complete Pool, Spa & Wellness-Ausstattung (cat-52) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Pool placeholder L3 replaced with a real product group"})


POOL = [
    ("01", pack("Aufstellpools", "Above-ground pools", "Hazır havuz", ar="مسابح فوق الأرض", fr="Piscines hors-sol", it="Piscine fuori terra", es="Piscinas desmontables"), "aufstellpools"),
    ("02", pack("Filteranlagen", "Filter systems", "Filtre sistemi", ar="أنظمة فلترة", fr="Systèmes de filtration", it="Impianti filtrazione", es="Sistemas de filtrado"), "filteranlagen"),
    ("03", pack("Pumpen", "Pumps", "Pompa", ar="مضخات", fr="Pompes", it="Pompe", es="Bombas"), "pumpen"),
    ("04", pack("Poolleitern", "Pool ladders", "Havuz merdiveni", ar="سلالم المسبح", fr="Échelles de piscine", it="Scale piscina", es="Escaleras de piscina"), "poolleitern"),
]
SPA = [
    ("01", pack("Whirlpools", "Whirlpools", "Jakuzi", ar="جاكوزي", fr="Bains à remous", it="Idromassaggi", es="Jacuzzis"), "whirlpools"),
    ("02", pack("Saunaöfen", "Sauna heaters", "Sauna sobası", ar="أفران ساونا", fr="Poêles sauna", it="Stufe sauna", es="Estufas de sauna"), "saunaoefen"),
    ("03", pack("Infrarotkabinen", "Infrared cabins", "Kızılötesi kabin", ar="كابينات أشعة تحت الحمراء", fr="Cabines infrarouge", it="Cabine infrarossi", es="Cabinas infrarrojas"), "infrarotkabinen"),
    ("04", pack("Aufguss & Duft", "Sauna infusion", "Sauna kokusu", ar="عطور الساونا", fr="Infusion sauna", it="Infusioni sauna", es="Esencias de sauna"), "aufguss-und-duft"),
]
GEAR = [
    ("01", pack("Gegenstromanlagen", "Counter-current", "Karşı akıntı", ar="تيار معاكس", fr="Nage à contre-courant", it="Nuoto controcorrente", es="Nado contracorriente"), "gegenstromanlagen"),
    ("02", pack("Massagedüsen", "Massage jets", "Masaj jetleri", ar="فوهات تدليك", fr="Buses massage", it="Getti massaggio", es="Jets de masaje"), "massageduesen"),
    ("03", pack("Poolheizungen", "Pool heaters", "Havuz ısıtıcı", ar="تدفئة المسبح", fr="Chauffages piscine", it="Riscaldatori piscina", es="Calentadores de piscina"), "poolheizungen"),
    ("04", pack("Wasserfälle", "Waterfalls", "Şelale", ar="شلالات", fr="Cascades", it="Cascate", es="Cascadas"), "wasserfaelle"),
]
CARE = [
    ("01", pack("Chlor & Desinfektion", "Chlorine & sanitizer", "Klor", ar="كلور", fr="Chlore", it="Cloro", es="Cloro"), "chlor-und-desinfektion"),
    ("02", pack("pH-Regulierung", "pH control", "pH ayarı", ar="ضبط الأس الهيدروجيني", fr="Régulation pH", it="Regolazione pH", es="Regulación pH"), "ph-regulierung"),
    ("03", pack("Algizide", "Algaecides", "Yosun önleyici", ar="مضاد طحالب", fr="Algicides", it="Antialghe", es="Algicidas"), "algizide"),
    ("04", pack("Wassertests", "Water tests", "Su testi", ar="اختبار الماء", fr="Tests d'eau", it="Test acqua", es="Tests de agua"), "wassertests"),
]
CLEAN = [
    ("01", pack("Poolroboter", "Pool robots", "Havuz robotu", ar="روبوت مسبح", fr="Robots piscine", it="Robot piscina", es="Robots de piscina"), "poolroboter"),
    ("02", pack("Kescher", "Nets", "Kepçe", ar="شباك", fr="Épuisettes", it="Retini", es="Recogedores"), "kescher"),
    ("03", pack("Bürsten", "Brushes", "Fırça", ar="فرش", fr="Brosses", it="Spazzole", es="Cepillos"), "buersten"),
    ("04", pack("Sauger", "Vacuums", "Süpürge", ar="مكانس", fr="Aspirateurs", it="Aspiratori", es="Aspiradores"), "sauger"),
]
COVER = [
    ("01", pack("Solarabdeckungen", "Solar covers", "Güneş örtüsü", ar="أغطية شمسية", fr="Couvertures solaires", it="Coperture solari", es="Cubiertas solares"), "solarabdeckungen"),
    ("02", pack("Winterplanen", "Winter covers", "Kış brandası", ar="أغطية شتوية", fr="Bâches d'hiver", it="Teli invernali", es="Lonas de invierno"), "winterplanen"),
    ("03", pack("Sicherheitsabdeckungen", "Safety covers", "Güvenlik örtüsü", ar="أغطية أمان", fr="Couvertures de sécurité", it="Coperture sicurezza", es="Cubiertas de seguridad"), "sicherheitsabdeckungen"),
    ("04", pack("Aufroller", "Reels", "Makara", ar="بكرات", fr="Enrouleurs", it="Avvolgitori", es="Enrolladores"), "aufroller"),
]
KIDS = [
    ("01", pack("Planschbecken", "Paddling pools", "Çocuk havuzu", ar="مسابح أطفال", fr="Pataugeoires", it="Piscine per bambini", es="Piscinas infantiles"), "planschbecken"),
    ("02", pack("Aufblasbare Pools", "Inflatable pools", "Şişme havuz", ar="مسابح قابلة للنفخ", fr="Piscines gonflables", it="Piscine gonfiabili", es="Piscinas hinchables"), "aufblasbare-pools"),
    ("03", pack("Wasserspielzeug", "Water toys", "Su oyuncağı", ar="ألعاب مائية", fr="Jouets aquatiques", it="Giochi acquatici", es="Juguetes de agua"), "wasserspielzeug"),
    ("04", pack("Schwimmhilfen", "Swim aids", "Yüzme yardımcısı", ar="مساعدات سباحة", fr="Aides à la nage", it="Aiuti nuoto", es="Ayudas de natación"), "schwimmhilfen"),
]
WINTER = [
    ("01", pack("Frostschutz", "Antifreeze", "Donma koruması", ar="مضاد تجمد", fr="Antigel", it="Antigelo", es="Anticongelante"), "frostschutz"),
    ("02", pack("Poolkissen", "Pool pillows", "Havuz yastığı", ar="وسائد المسبح", fr="Oreillers piscine", it="Cuscini piscina", es="Almohadas de piscina"), "poolkissen"),
    ("03", pack("Ventile & Stopfen", "Valves & plugs", "Vana ve tapa", ar="صمامات وسدادات", fr="Vannes et bouchons", it="Valvole e tappi", es="Válvulas y tapones"), "ventile-und-stopfen"),
    ("04", pack("Einwinterungssets", "Winterizing kits", "Kış seti", ar="أطقم الشتاء", fr="Kits d'hivernage", it="Kit svernamento", es="Kits de invernaje"), "einwinterungssets"),
]
EXISTING = {
    "cat-52-01": (pack("Pool & Schwimmbad", "Pool & swimming", "Havuz", ar="مسبح", fr="Piscine", it="Piscina", es="Piscina"), POOL),
    "cat-52-02": (pack("Spa & Sauna", "Spa & sauna", "Spa ve sauna", ar="سبا وساونا", fr="Spa et sauna", it="Spa e sauna", es="Spa y sauna"), SPA),
    "cat-52-03": (pack("Wellness-Geräte", "Wellness equipment", "Wellness cihazları", ar="أجهزة عافية", fr="Équipements wellness", it="Attrezzature wellness", es="Equipos wellness"), GEAR),
    "cat-52-04": (pack("Poolpflege", "Pool care", "Havuz bakımı", ar="عناية بالمسبح", fr="Entretien piscine", it="Cura piscina", es="Cuidado de piscina"), CARE),
}
NEW_L2 = [
    ("05", "reinigung-und-roboter", pack("Reinigung & Roboter", "Cleaning & robots", "Temizlik ve robot", ar="تنظيف وروبوتات", fr="Nettoyage et robots", it="Pulizia e robot", es="Limpieza y robots"), CLEAN),
    ("06", "abdeckungen", pack("Abdeckungen", "Covers", "Örtüler", ar="أغطية", fr="Couvertures", it="Coperture", es="Cubiertas"), COVER),
    ("07", "planschbecken-und-kinder", pack("Planschbecken & Kinder", "Kids' pools", "Çocuk havuzları", ar="مسابح أطفال", fr="Piscines enfants", it="Piscine bambini", es="Piscinas infantiles"), KIDS),
    ("08", "einwinterung", pack("Einwinterung", "Winterizing", "Kışa hazırlık", ar="تجهيز شتوي", fr="Hivernage", it="Svernamento", es="Invernaje"), WINTER),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-52")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-52-{suffix}"
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
