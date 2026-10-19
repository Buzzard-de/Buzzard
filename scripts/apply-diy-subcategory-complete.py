#!/usr/bin/env python3
"""Complete Heimwerken, Bau & Konstruktion (cat-21) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "DIY placeholder L3 replaced with a real product group"})


MAT = [
    ("01", pack("Zement", "Cement", "Çimento", ar="أسمنت", fr="Ciment", it="Cemento", es="Cemento"), "zement"),
    ("02", pack("Gipskarton", "Plasterboard", "Alçıpan", ar="جبس بورد", fr="Placo", it="Cartongesso", es="Pladur"), "gipskarton"),
    ("03", pack("Ziegel", "Bricks", "Tuğla", ar="طوب", fr="Briques", it="Mattoni", es="Ladrillos"), "ziegel"),
    ("04", pack("Bauholz", "Timber", "Kereste", ar="خشب", fr="Bois", it="Legname", es="Madera"), "bauholz"),
]
ISO = [
    ("01", pack("Mineralwolle", "Mineral wool", "Mineral yün", ar="صوف معدني", fr="Laine minérale", it="Lana minerale", es="Lana mineral"), "mineralwolle"),
    ("02", pack("Hartschaum", "Rigid foam", "Sert köpük", ar="رغوة صلبة", fr="Mousse rigide", it="Schiuma rigida", es="Espuma rígida"), "hartschaum"),
    ("03", pack("Sprühschaum", "Spray foam", "Sprey köpük", ar="رغوة رش", fr="Mousse expansive", it="Schiuma spray", es="Espuma spray"), "spruehschaum"),
    ("04", pack("Dampfsperre", "Vapour barrier", "Buhar kesici", ar="حاجز بخار", fr="Pare-vapeur", it="Barriera vapore", es="Barrera de vapor"), "dampfsperre"),
]
PAINT = [
    ("01", pack("Innenfarbe", "Interior paint", "İç cephe boya", ar="طلاء داخلي", fr="Peinture intérieure", it="Pittura interna", es="Pintura interior"), "innenfarbe"),
    ("02", pack("Außenfarbe", "Exterior paint", "Dış cephe boya", ar="طلاء خارجي", fr="Peinture extérieure", it="Pittura esterna", es="Pintura exterior"), "aussenfarbe"),
    ("03", pack("Putz", "Plaster", "Sıva", ar="لياسة", fr="Enduit", it="Intonaco", es="Yeso"), "putz"),
    ("04", pack("Spachtel", "Filler", "Macun", ar="معجون", fr="Enduit de lissage", it="Stucco", es="Masilla"), "spachtel"),
]
GLUE = [
    ("01", pack("Montagekleber", "Construction adhesive", "Montaj yapıştırıcı", ar="لاصق تركيب", fr="Colle de montage", it="Adesivo montaggio", es="Adhesivo montaje"), "montagekleber"),
    ("02", pack("Holzleim", "Wood glue", "Ahşap tutkalı", ar="غراء خشب", fr="Colle à bois", it="Colla legno", es="Cola madera"), "holzleim"),
    ("03", pack("Silikon", "Silicone", "Silikon", ar="سيليكون", fr="Silicone", it="Silicone", es="Silicona"), "silikon"),
    ("04", pack("Malerband", "Masking tape", "Maskeleme bandı", ar="شريط لاصق", fr="Ruban de masquage", it="Nastro carta", es="Cinta de pintor"), "malerband"),
]
ROOF = [
    ("01", pack("Dachziegel", "Roof tiles", "Çatı kiremit", ar="قرميد", fr="Tuiles", it="Tegole", es="Tejas"), "dachziegel"),
    ("02", pack("Dachrinnen", "Gutters", "Oluk", ar="مزاريب", fr="Gouttières", it="Grondaie", es="Canalones"), "dachrinnen"),
    ("03", pack("Fallrohre", "Downpipes", "İniş borusu", ar="مواسير", fr="Descentes", it="Pluviali", es="Bajantes"), "fallrohre"),
    ("04", pack("Bleche", "Flashings", "Sac", ar="صفائح", fr="Bandes", it="Lamiera", es="Chapas"), "bleche"),
]
DOOR = [
    ("01", pack("Griffe", "Handles", "Kulp", ar="مقابض", fr="Poignées", it="Maniglie", es="Manillas"), "griffe"),
    ("02", pack("Schließzylinder", "Cylinders", "Silindir", ar="أسطوانات", fr="Cylindres", it="Cilindri", es="Bombines"), "schliesszylinder"),
    ("03", pack("Fensterbeschläge", "Window fittings", "Pencere aksesuarı", ar="تجهيزات نوافذ", fr="Ferrures fenêtre", it="Ferramenta finestra", es="Herrajes ventana"), "fensterbeschlaege"),
    ("04", pack("Dichtungen", "Seals", "Conta", ar="حشوات", fr="Joints", it="Guarnizioni", es="Juntas"), "dichtungen"),
]
MOUNT = [
    ("01", pack("Dübel", "Wall plugs", "Dübel", ar="مسامير جدار", fr="Chevilles", it="Tasselli", es="Tacos"), "duebel"),
    ("02", pack("Schienen", "Rails", "Ray", ar="قضبان", fr="Rails", it="Binari", es="Raíles"), "schienen"),
    ("03", pack("Konsolen", "Brackets", "Konsol", ar="حاملات", fr="Consoles", it="Mensole", es="Soportes"), "konsolen"),
    ("04", pack("Verbundmörtel", "Chemical anchors", "Kimyasal dübel", ar="مراسي كيميائية", fr="Scellement chimique", it="Ancorante chimico", es="Taco químico"), "verbundmoertel"),
]
EXISTING = {
    "cat-21-01": (pack("Baustoffe", "Building materials", "Yapı malzemesi", ar="مواد بناء", fr="Matériaux", it="Materiali edili", es="Materiales"), MAT),
    "cat-21-02": (pack("Dämmung", "Insulation", "Yalıtım", ar="عزل", fr="Isolation", it="Isolamento", es="Aislamiento"), ISO),
    "cat-21-03": (pack("Farbe & Putz", "Paint & plaster", "Boya ve sıva", ar="طلاء ولياس", fr="Peinture et enduit", it="Pittura e intonaco", es="Pintura y yeso"), PAINT),
    "cat-21-04": (pack("Klebstoffe", "Adhesives", "Yapıştırıcı", ar="مواد لاصقة", fr="Colles", it="Adesivi", es="Adhesivos"), GLUE),
    "cat-21-05": (pack("Dach & Rinne", "Roof & gutter", "Çatı ve oluk", ar="سقف ومزراب", fr="Toit et gouttière", it="Tetto e grondaia", es="Tejado y canalón"), ROOF),
    "cat-21-06": (pack("Tür & Fenster", "Doors & windows", "Kapı ve pencere", ar="أبواب ونوافذ", fr="Portes et fenêtres", it="Porte e finestre", es="Puertas y ventanas"), DOOR),
    "cat-21-07": (pack("Montage", "Mounting", "Montaj", ar="تركيب", fr="Fixation", it="Montaggio", es="Montaje"), MOUNT),
}
NEW_L2 = [
    ("08", "bodenbelaege", pack("Bodenbeläge", "Flooring", "Zemin kaplama", ar="أرضيات", fr="Revêtements de sol", it="Pavimenti", es="Suelos"), [
        ("01", pack("Laminat", "Laminate", "Laminat", ar="لامينيت", fr="Stratifié", it="Laminato", es="Laminado"), "laminat"),
        ("02", pack("Vinyl", "Vinyl", "Vinil", ar="فينيل", fr="Vinyle", it="Vinile", es="Vinilo"), "vinyl"),
        ("03", pack("Sockelleisten", "Skirting", "Süpürgelik", ar="قواعد", fr="Plinthes", it="Battiscopa", es="Rodapiés"), "sockelleisten"),
        ("04", pack("Trittschall", "Underlay", "Ses yalıtımı", ar="عازل صوت", fr="Sous-couche", it="Sottofondo", es="Base"), "trittschall"),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-21")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-21-{suffix}"
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
