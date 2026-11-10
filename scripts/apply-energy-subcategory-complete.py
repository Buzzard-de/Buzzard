#!/usr/bin/env python3
"""Complete Heizung, Klima & Energie (cat-40) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Energy placeholder L3 replaced with a real product group"})


PANEL = [
    ("01", pack("Monokristallin", "Monocrystalline", "Monokristal", ar="أحادي البلورة", fr="Monocristallin", it="Monocristallino", es="Monocristalino"), "monokristallin"),
    ("02", pack("Polykristallin", "Polycrystalline", "Polikristal", ar="متعدد البلورات", fr="Polycristallin", it="Policristallino", es="Policristalino"), "polykristallin"),
    ("03", pack("Faltbar", "Foldable", "Katlanır", ar="قابل للطي", fr="Pliable", it="Pieghevole", es="Plegable"), "faltbar"),
    ("04", pack("Balkonkraftwerk", "Balcony solar", "Balkon paneli", ar="شرفة", fr="Balcon", it="Balcone", es="Balcón"), "balkonkraftwerk"),
]
CHARGE = [
    ("01", pack("MPPT", "MPPT", "MPPT", ar="MPPT", fr="MPPT", it="MPPT", es="MPPT"), "mppt"),
    ("02", pack("PWM", "PWM", "PWM", ar="PWM", fr="PWM", it="PWM", es="PWM"), "pwm"),
    ("03", pack("Laderegler-Sets", "Controller kits", "Şarj seti", ar="أطقم شحن", fr="Kits régulateur", it="Kit regolatore", es="Kits regulador"), "laderegler-sets"),
    ("04", pack("MC4-Zubehör", "MC4 accessories", "MC4 aksesuar", ar="ملحقات MC4", fr="Accessoires MC4", it="Accessori MC4", es="Accesorios MC4"), "mc4-zubehoer"),
]
PS = [
    ("01", pack("Camping", "Camping", "Kamp", ar="تخييم", fr="Camping", it="Camping", es="Camping"), "camping"),
    ("02", pack("Haus-Backup", "Home backup", "Ev yedek", ar="منزل", fr="Secours maison", it="Backup casa", es="Respaldo hogar"), "haus-backup"),
    ("03", pack("Mini", "Mini", "Mini", ar="صغير", fr="Mini", it="Mini", es="Mini"), "mini"),
    ("04", pack("High-Capacity", "High capacity", "Yüksek kapasite", ar="سعة عالية", fr="Grande capacité", it="Alta capacità", es="Alta capacidad"), "high-capacity"),
]
BAT = [
    ("01", pack("LiFePO4", "LiFePO4", "LiFePO4", ar="ليثيوم حديد", fr="LiFePO4", it="LiFePO4", es="LiFePO4"), "lifepo4"),
    ("02", pack("AGM", "AGM", "AGM", ar="AGM", fr="AGM", it="AGM", es="AGM"), "agm"),
    ("03", pack("Gel", "Gel", "Jel", ar="جل", fr="Gel", it="Gel", es="Gel"), "gel"),
    ("04", pack("12V-Blöcke", "12V blocks", "12V blok", ar="12 فولت", fr="Blocs 12V", it="Blocchi 12V", es="Bloques 12V"), "12v-bloecke"),
]
INV = [
    ("01", pack("Off-Grid", "Off-grid", "Off-grid", ar="خارج الشبكة", fr="Hors réseau", it="Off-grid", es="Off-grid"), "off-grid"),
    ("02", pack("On-Grid", "On-grid", "On-grid", ar="على الشبكة", fr="Réseau", it="On-grid", es="On-grid"), "on-grid"),
    ("03", pack("Hybrid", "Hybrid", "Hibrit", ar="هجين", fr="Hybride", it="Ibrido", es="Híbrido"), "hybrid"),
    ("04", pack("Reiner Sinus", "Pure sine", "Tam sinüs", ar="جيب نقي", fr="Sinus pur", it="Onda pura", es="Seno puro"), "reiner-sinus"),
]
CAMP = [
    ("01", pack("Solarkoffer", "Solar suitcases", "Güneş çantası", ar="حقائب شمسية", fr="Valises solaires", it="Valigie solari", es="Maletas solares"), "solarkoffer"),
    ("02", pack("12V-Versorgung", "12V supply", "12V besleme", ar="12 فولت", fr="Alim. 12V", it="Alim. 12V", es="Alim. 12V"), "12v-versorgung"),
    ("03", pack("Bordbatterien", "Leisure batteries", "Karavan aküsü", ar="بطاريات ترفيه", fr="Batteries loisirs", it="Batterie leisure", es="Baterías ocio"), "bordbatterien"),
    ("04", pack("Ladegeräte 12V", "12V chargers", "12V şarj", ar="شواحن 12V", fr="Chargeurs 12V", it="Caricabatterie 12V", es="Cargadores 12V"), "ladegeraete-12v"),
]
ACC = [
    ("01", pack("Solarkabel", "Solar cable", "Solar kablo", ar="كابل شمسي", fr="Câble solaire", it="Cavo solare", es="Cable solar"), "solarkabel"),
    ("02", pack("Montageschienen", "Mounting rails", "Montaj rayı", ar="قضبان تثبيت", fr="Rails", it="Binari", es="Raíles"), "montageschienen"),
    ("03", pack("MC4", "MC4", "MC4", ar="MC4", fr="MC4", it="MC4", es="MC4"), "mc4"),
    ("04", pack("Combiner", "Combiner boxes", "Combiner", ar="صناديق تجميع", fr="Coffrets", it="Combiner", es="Cajas"), "combiner"),
]
EXISTING = {
    "cat-40-01": (pack("Solarmodule", "Solar panels", "Güneş paneli", ar="ألواح شمسية", fr="Panneaux solaires", it="Pannelli solari", es="Paneles solares"), PANEL),
    "cat-40-02": (pack("Solarladung", "Solar charging", "Güneş şarj", ar="شحن شمسي", fr="Charge solaire", it="Carica solare", es="Carga solar"), CHARGE),
    "cat-40-03": (pack("Powerstations", "Power stations", "Power station", ar="محطات طاقة", fr="Stations d'énergie", it="Power station", es="Estaciones de energía"), PS),
    "cat-40-04": (pack("Batterien", "Batteries", "Akü", ar="بطاريات", fr="Batteries", it="Batterie", es="Baterías"), BAT),
    "cat-40-05": (pack("Wechselrichter", "Inverters", "İnvertör", ar="محولات", fr="Onduleurs", it="Inverter", es="Inversores"), INV),
    "cat-40-06": (pack("Camping-Energie", "Camping energy", "Kamp enerjisi", ar="طاقة التخييم", fr="Énergie camping", it="Energia camping", es="Energía camping"), CAMP),
    "cat-40-07": (pack("Energie-Zubehör", "Energy accessories", "Enerji aksesuarı", ar="ملحقات طاقة", fr="Accessoires énergie", it="Accessori energia", es="Accesorios energía"), ACC),
}
NEW_L2 = [
    ("08", "wallbox-und-ev", pack("Wallbox & EV", "EV charging", "Wallbox ve EV", ar="شحن سيارات", fr="Recharge VE", it="Ricarica EV", es="Carga EV"), [
        ("01", pack("Wallboxen", "Wallboxes", "Wallbox", ar="صناديق شحن", fr="Bornes murales", it="Wallbox", es="Wallbox"), "wallboxen"),
        ("02", pack("Typ-2-Kabel", "Type 2 cables", "Tip 2 kablo", ar="كابل نوع 2", fr="Câbles type 2", it="Cavi tipo 2", es="Cables tipo 2"), "typ-2-kabel"),
        ("03", pack("Mobile Ladegeräte", "Portable chargers", "Taşınabilir şarj", ar="شواحن محمولة", fr="Chargeurs portables", it="Caricatori portatili", es="Cargadores portátiles"), "mobile-ladegeraete"),
        ("04", pack("Adapter", "Adapters", "Adaptör", ar="محولات", fr="Adaptateurs", it="Adattatori", es="Adaptadores"), "adapter"),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-40")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-40-{suffix}"
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
