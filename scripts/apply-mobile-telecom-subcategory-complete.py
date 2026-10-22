#!/usr/bin/env python3
"""Complete Mobil & Telekommunikation (cat-36) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Mobile telecom placeholder L3 replaced with a real product group"})


WATCH = [
    ("01", pack("Smartwatches", "Smartwatches", "Akıllı saat", ar="ساعات ذكية", fr="Montres connectées", it="Smartwatch", es="Smartwatches"), "smartwatches"),
    ("02", pack("Sportuhren", "Sports watches", "Spor saat", ar="ساعات رياضية", fr="Montres sport", it="Orologi sport", es="Relojes deporte"), "sportuhren"),
    ("03", pack("Fitness-Tracker", "Fitness trackers", "Fitness bileklik", ar="تتبع اللياقة", fr="Trackers fitness", it="Tracker fitness", es="Pulseras fitness"), "fitness-tracker"),
    ("04", pack("Wechselarmbänder", "Watch bands", "Kayış", ar="أساور", fr="Bracelets", it="Cinturini", es="Correas"), "wechselarmbaender"),
    ("05", pack("Uhr-Ladegeräte", "Watch chargers", "Saat şarj", ar="شواحن ساعة", fr="Chargeurs montre", it="Caricatori orologio", es="Cargadores reloj"), "uhr-ladegeraete"),
]
HEAD = [
    ("01", pack("In-Ear", "In-ear", "Kulak içi", ar="داخل الأذن", fr="Intra-auriculaires", it="In-ear", es="In-ear"), "in-ear"),
    ("02", pack("Over-Ear", "Over-ear", "Kulak üstü", ar="فوق الأذن", fr="Circumauriculaires", it="Over-ear", es="Over-ear"), "over-ear"),
    ("03", pack("True Wireless", "True wireless", "TWS", ar="TWS", fr="True wireless", it="True wireless", es="True wireless"), "true-wireless"),
    ("04", pack("Sportkopfhörer", "Sports earbuds", "Spor kulaklık", ar="سماعات رياضية", fr="Écouteurs sport", it="Auricolari sport", es="Auriculares deporte"), "sportkopfhoerer"),
    ("05", pack("Kopfhörer-Zubehör", "Headphone extras", "Kulaklık aksesuarı", ar="ملحقات سماعات", fr="Accessoires casque", it="Accessori cuffie", es="Accesorios auriculares"), "kopfhoerer-zubehoer"),
]
POWER = [
    ("01", pack("Kompakt", "Compact", "Kompakt", ar="مدمج", fr="Compact", it="Compatte", es="Compactos"), "kompakt"),
    ("02", pack("High Capacity", "High capacity", "Yüksek kapasite", ar="سعة عالية", fr="Grande capacité", it="Alta capacità", es="Alta capacidad"), "high-capacity"),
    ("03", pack("Magnetisch", "Magnetic", "Manyetik", ar="مغناطيسي", fr="Magnétique", it="Magnetici", es="Magnéticos"), "magnetisch"),
    ("04", pack("Solar-Powerbanks", "Solar power banks", "Güneş powerbank", ar="باور بانك شمسي", fr="Batteries solaires", it="Power bank solari", es="Power banks solares"), "solar-powerbanks"),
    ("05", pack("Powerbank-Kabel", "Power bank cables", "Powerbank kablosu", ar="كابل باور بانك", fr="Câbles power bank", it="Cavi power bank", es="Cables power bank"), "powerbank-kabel"),
]
CASES = [
    ("01", pack("Silikonhüllen", "Silicone cases", "Silikon kılıf", ar="أغطية سيليكون", fr="Coques silicone", it="Cover silicone", es="Fundas silicona"), "silikonhuellen"),
    ("02", pack("Hardcases", "Hard cases", "Sert kılıf", ar="أغطية صلبة", fr="Coques rigides", it="Cover rigide", es="Fundas rígidas"), "hardcases"),
    ("03", pack("Bookcovers", "Book covers", "Kitap kılıf", ar="أغطية كتاب", fr="Étuis livre", it="Cover libro", es="Fundas libro"), "bookcovers"),
    ("04", pack("Kameraschutz", "Camera protection", "Kamera koruma", ar="حماية كاميرا", fr="Protection caméra", it="Protezione camera", es="Protección cámara"), "kameraschutz"),
    ("05", pack("Displayschutz", "Screen protectors", "Ekran koruyucu", ar="واقي شاشة", fr="Protection écran", it="Pellicole", es="Protectores"), "displayschutz"),
]
TABLET = [
    ("01", pack("Tablet-Hüllen", "Tablet cases", "Tablet kılıf", ar="أغطية تابلت", fr="Étuis tablette", it="Cover tablet", es="Fundas tablet"), "tablet-huellen"),
    ("02", pack("Tastaturen", "Keyboards", "Klavye", ar="لوحات مفاتيح", fr="Claviers", it="Tastiere", es="Teclados"), "tastaturen"),
    ("03", pack("Stifte", "Styluses", "Kalem", ar="أقلام", fr="Stylos", it="Penna", es="Lápices"), "stifte"),
    ("04", pack("Displayschutz", "Screen protectors", "Ekran koruyucu", ar="واقي شاشة", fr="Protection écran", it="Pellicole", es="Protectores"), "displayschutz"),
    ("05", pack("Tablet-Ständer", "Tablet stands", "Tablet stand", ar="حوامل تابلت", fr="Supports tablette", it="Supporti tablet", es="Soportes tablet"), "tablet-staender"),
]
CHARGE = [
    ("01", pack("USB-C Ladegeräte", "USB-C chargers", "USB-C şarj", ar="شواحن USB-C", fr="Chargeurs USB-C", it="Caricatori USB-C", es="Cargadores USB-C"), "usb-c-ladegeraete"),
    ("02", pack("Kfz-Ladegeräte", "Car chargers", "Araç şarj", ar="شواحن سيارة", fr="Chargeurs auto", it="Caricatori auto", es="Cargadores auto"), "kfz-ladegeraete"),
    ("03", pack("Induktiv", "Wireless", "Kablosuz", ar="لاسلكي", fr="Sans fil", it="Wireless", es="Inalámbrico"), "induktiv"),
    ("04", pack("Ladekabel", "Charge cables", "Şarj kablosu", ar="كابل شحن", fr="Câbles charge", it="Cavi ricarica", es="Cables carga"), "ladekabel"),
    ("05", pack("Mehrfach-Ladestationen", "Multi chargers", "Çoklu şarj", ar="شواحن متعددة", fr="Stations multiples", it="Stazioni multiple", es="Cargadores múltiples"), "mehrfach-ladestationen"),
]
SPEAKER = [
    ("01", pack("Portable", "Portable", "Taşınabilir", ar="محمول", fr="Portables", it="Portatili", es="Portátiles"), "portable"),
    ("02", pack("Wasserdicht", "Waterproof", "Su geçirmez", ar="مقاوم للماء", fr="Étanches", it="Impermeabili", es="Estancos"), "wasserdicht"),
    ("03", pack("Party-Lautsprecher", "Party speakers", "Parti hoparlör", ar="سماعات حفلات", fr="Enceintes fête", it="Speaker party", es="Altavoces fiesta"), "party-lautsprecher"),
    ("04", pack("Mini-Speaker", "Mini speakers", "Mini hoparlör", ar="سماعات صغيرة", fr="Mini enceintes", it="Mini speaker", es="Mini altavoces"), "mini-speaker"),
]
PHOTO = [
    ("01", pack("Selfie-Sticks", "Selfie sticks", "Selfie çubuğu", ar="عصا سيلفي", fr="Perches selfie", it="Aste selfie", es="Palos selfie"), "selfie-sticks"),
    ("02", pack("Stative", "Tripods", "Tripod", ar="حامل ثلاثي", fr="Trépieds", it="Treppiedi", es="Trípodes"), "stative"),
    ("03", pack("Handy-Objektive", "Phone lenses", "Telefon lensi", ar="عدسات هاتف", fr="Objectifs téléphone", it="Lenti telefono", es="Lentes teléfono"), "handy-objektive"),
    ("04", pack("Ringleuchten", "Ring lights", "Halka ışık", ar="إضاءة حلقية", fr="Lampes anneau", it="Luci anello", es="Aros de luz"), "ringleuchten"),
]
EXISTING = {
    "cat-36-01": (pack("Smartwatches", "Smartwatches", "Akıllı saat", ar="ساعات ذكية", fr="Montres connectées", it="Smartwatch", es="Smartwatches"), WATCH),
    "cat-36-02": (pack("Kopfhörer", "Headphones", "Kulaklık", ar="سماعات", fr="Casques", it="Cuffie", es="Auriculares"), HEAD),
    "cat-36-03": (pack("Powerbanks", "Power banks", "Powerbank", ar="باور بانك", fr="Batteries externes", it="Power bank", es="Power banks"), POWER),
    "cat-36-04": (pack("Smartphone-Hüllen", "Phone cases", "Telefon kılıfı", ar="أغطية هاتف", fr="Coques téléphone", it="Cover telefono", es="Fundas móvil"), CASES),
    "cat-36-05": (pack("Tablet-Zubehör", "Tablet accessories", "Tablet aksesuarı", ar="ملحقات تابلت", fr="Accessoires tablette", it="Accessori tablet", es="Accesorios tablet"), TABLET),
    "cat-36-06": (pack("Mobil-Laden", "Mobile charging", "Mobil şarj", ar="شحن متنقل", fr="Charge mobile", it="Ricarica mobile", es="Carga móvil"), CHARGE),
}
NEW_L2 = [
    ("07", "bluetooth-lautsprecher", pack("Bluetooth-Lautsprecher", "Bluetooth speakers", "Bluetooth hoparlör", ar="سماعات بلوتوث", fr="Enceintes Bluetooth", it="Speaker Bluetooth", es="Altavoces Bluetooth"), SPEAKER),
    ("08", "smartphone-fotografie", pack("Smartphone-Fotografie", "Smartphone photography", "Telefon fotoğrafçılığı", ar="تصوير الهاتف", fr="Photo smartphone", it="Foto smartphone", es="Foto smartphone"), PHOTO),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-36")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-36-{suffix}"
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
