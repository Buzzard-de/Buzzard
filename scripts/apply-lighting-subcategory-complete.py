#!/usr/bin/env python3
"""Complete Beleuchtung & Lampen (cat-22) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Lighting placeholder L3 replaced with a real product group"})


LED = [
    ("01", pack("LED-Lampen", "LED lamps", "LED lamba", ar="لمبات LED", fr="Lampes LED", it="Lampadine LED", es="Lámparas LED"), "led-lampen"),
    ("02", pack("LED-Panels", "LED panels", "LED panel", ar="لوحات LED", fr="Panneaux LED", it="Pannelli LED", es="Paneles LED"), "led-panels"),
    ("03", pack("LED-Streifen", "LED strips", "LED şerit", ar="شرائط LED", fr="Rubans LED", it="Strisce LED", es="Tiras LED"), "led-streifen"),
    ("04", pack("Spots", "Spots", "Spot", ar="سبوت", fr="Spots", it="Faretto", es="Focos"), "spots"),
    ("05", pack("Strahler", "Floodlights", "Projektör", ar="كشافات", fr="Projecteurs", it="Proiettori", es="Proyectores"), "strahler"),
]
BULB = [
    ("01", pack("LED", "LED", "LED", ar="LED", fr="LED", it="LED", es="LED"), "led"),
    ("02", pack("Halogen", "Halogen", "Halojen", ar="هالوجين", fr="Halogène", it="Alogena", es="Halógena"), "halogen"),
    ("03", pack("E27", "E27", "E27", ar="E27", fr="E27", it="E27", es="E27"), "e27"),
    ("04", pack("E14", "E14", "E14", ar="E14", fr="E14", it="E14", es="E14"), "e14"),
    ("05", pack("GU10", "GU10", "GU10", ar="GU10", fr="GU10", it="GU10", es="GU10"), "gu10"),
    ("06", pack("Smart-Lampen", "Smart bulbs", "Akıllı ampul", ar="لمبات ذكية", fr="Ampoules connectées", it="Lampadine smart", es="Bombillas smart"), "smart-lampen"),
]
SOCK = [
    ("01", pack("Steckdosen", "Sockets", "Priz", ar="مقابس", fr="Prises", it="Prese", es="Enchufes"), "steckdosen"),
    ("02", pack("Schalter", "Switches", "Anahtar", ar="مفاتيح", fr="Interrupteurs", it="Interruttori", es="Interruptores"), "schalter"),
    ("03", pack("Dimmer", "Dimmers", "Dimmer", ar="خافت", fr="Variateurs", it="Dimmer", es="Reguladores"), "dimmer"),
    ("04", pack("Rahmen", "Frames", "Çerçeve", ar="إطارات", fr="Plaques", it="Placche", es="Marcos"), "rahmen"),
]
CABLE = [
    ("01", pack("Installationskabel", "Installation cable", "Tesisat kablosu", ar="كابل تركيب", fr="Câble d'installation", it="Cavo installazione", es="Cable instalación"), "installationskabel"),
    ("02", pack("Kabeltrommeln", "Cable reels", "Kablo makarası", ar="بكرات كابل", fr="Enrouleurs", it="Avvolgicavo", es="Enrolladores"), "kabeltrommeln"),
    ("03", pack("Datenkabel", "Data cables", "Data kablosu", ar="كابل بيانات", fr="Câbles data", it="Cavi dati", es="Cables datos"), "datenkabel"),
    ("04", pack("Lautsprecherkabel", "Speaker cable", "Hoparlör kablosu", ar="كابل سماعات", fr="Câble enceintes", it="Cavo altoparlanti", es="Cable altavoz"), "lautsprecherkabel"),
]
EXT = [
    ("01", pack("3-fach", "3-way", "3'lü", ar="ثلاثي", fr="3 prises", it="3 vie", es="3 tomas"), "3-fach"),
    ("02", pack("5-fach", "5-way", "5'li", ar="خماسي", fr="5 prises", it="5 vie", es="5 tomas"), "5-fach"),
    ("03", pack("10-fach", "10-way", "10'lu", ar="عشاري", fr="10 prises", it="10 vie", es="10 tomas"), "10-fach"),
    ("04", pack("Kabeltrommel", "Reel", "Makara", ar="بكرة", fr="Enrouleur", it="Avvolgitore", es="Enrollador"), "kabeltrommel"),
    ("05", pack("Garten", "Garden", "Bahçe", ar="حديقة", fr="Jardin", it="Giardino", es="Jardín"), "garten"),
]
PROT = [
    ("01", pack("Sicherungsautomaten", "MCBs", "Sigorta otomatı", ar="قواطع", fr="Disjoncteurs", it="Magnetotermici", es="Magnetotérmicos"), "sicherungsautomaten"),
    ("02", pack("FI-Schalter", "RCDs", "Kaçak akım", ar="تفاضلي", fr="Différentiels", it="Differenziali", es="Diferenciales"), "fi-schalter"),
    ("03", pack("Feinsicherungen", "Fuses", "Cam sigorta", ar="فيوزات", fr="Fusibles", it="Fusibili", es="Fusibles"), "feinsicherungen"),
    ("04", pack("Überspannungsschutz", "Surge protection", "Aşırı gerilim", ar="حماية جهد", fr="Parasurtenseurs", it="Scaricatori", es="Sobretensión"), "ueberspannungsschutz"),
]
OUT = [
    ("01", pack("Wandleuchten", "Wall lights", "Duvar lambası", ar="إضاءة جدارية", fr="Appliques", it="Applique", es="Apliques"), "wandleuchten"),
    ("02", pack("Wegeleuchten", "Path lights", "Yol lambası", ar="إضاءة ممرات", fr="Bornes", it="Segnapasso", es="Balizas"), "wegeleuchten"),
    ("03", pack("Solarleuchten", "Solar lights", "Güneş lambası", ar="طاقة شمسية", fr="Lampes solaires", it="Lampade solari", es="Solares"), "solarleuchten"),
    ("04", pack("Außenstrahler", "Outdoor floodlights", "Dış projektör", ar="كشاف خارجي", fr="Projecteurs extérieurs", it="Proiettori esterni", es="Proyectores exteriores"), "aussenstrahler"),
]
EXISTING = {
    "cat-22-01": (pack("LED-Beleuchtung", "LED lighting", "LED aydınlatma", ar="إضاءة LED", fr="Éclairage LED", it="Illuminazione LED", es="Iluminación LED"), LED),
    "cat-22-02": (pack("Leuchtmittel", "Bulbs", "Ampul", ar="لمبات", fr="Ampoules", it="Lampadine", es="Bombillas"), BULB),
    "cat-22-03": (pack("Steckdosen & Schalter", "Sockets & switches", "Priz ve anahtar", ar="مقابس ومفاتيح", fr="Prises et interrupteurs", it="Prese e interruttori", es="Enchufes e interruptores"), SOCK),
    "cat-22-04": (pack("Kabel", "Cables", "Kablo", ar="كابلات", fr="Câbles", it="Cavi", es="Cables"), CABLE),
    "cat-22-05": (pack("Verlängerungen", "Extension leads", "Uzatma kablosu", ar="أسلاك تمديد", fr="Rallonges", it="Prolunghe", es="Alargadores"), EXT),
    "cat-22-06": (pack("Sicherung & Schutz", "Fuses & protection", "Sigorta ve koruma", ar="حماية", fr="Protection", it="Protezione", es="Protección"), PROT),
    "cat-22-07": (pack("Außenbeleuchtung", "Outdoor lighting", "Dış aydınlatma", ar="إضاءة خارجية", fr="Éclairage extérieur", it="Illuminazione esterna", es="Iluminación exterior"), OUT),
}
NEW_L2 = [
    ("08", "leuchten", pack("Leuchten", "Luminaires", "Aydınlatma armatürü", ar="وحدات إضاءة", fr="Luminaires", it="Lampade", es="Lámparas"), [
        ("01", pack("Tischlampen", "Table lamps", "Masa lambası", ar="مصابيح طاولة", fr="Lampes de table", it="Lampade da tavolo", es="Lámparas de mesa"), "tischlampen"),
        ("02", pack("Stehlampen", "Floor lamps", "Lambader", ar="مصابيح أرضية", fr="Lampadaires", it="Piantane", es="Lámparas de pie"), "stehlampen"),
        ("03", pack("Pendelleuchten", "Pendants", "Sarkıt", ar="معلقات", fr="Suspensions", it="Sospensioni", es="Colgantes"), "pendelleuchten"),
        ("04", pack("Deckenleuchten", "Ceiling lights", "Tavan lambası", ar="سقف", fr="Plafonniers", it="Plafoniere", es="Plafones"), "deckenleuchten"),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-22")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-22-{suffix}"
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
