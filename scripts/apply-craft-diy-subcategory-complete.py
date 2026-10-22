#!/usr/bin/env python3
"""Complete Kunsthandwerk, Nähen & DIY (cat-51) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Craft DIY placeholder L3 replaced with a real product group"})


SEW = [
    ("01", pack("Nähmaschinen-Zubehör", "Sewing extras", "Dikiş aksesuarı", ar="ملحقات خياطة", fr="Accessoires couture", it="Accessori cucito", es="Accesorios costura"), "naehmaschinen-zubehoer"),
    ("02", pack("Garne", "Threads", "İplik", ar="خيوط", fr="Fils", it="Fili", es="Hilos"), "garne"),
    ("03", pack("Stoffe", "Fabrics", "Kumaş", ar="أقمشة", fr="Tissus", it="Tessuti", es="Telas"), "stoffe"),
    ("04", pack("Nadeln", "Needles", "İğne", ar="إبر", fr="Aiguilles", it="Aghi", es="Agujas"), "nadeln"),
]
CRAFT = [
    ("01", pack("Papierbasteln", "Paper crafts", "Kağıt işi", ar="حرف ورق", fr="Loisirs papier", it="Carta", es="Papel"), "papierbasteln"),
    ("02", pack("Klebstoffe", "Adhesives", "Yapıştırıcı", ar="مواد لاصقة", fr="Colles", it="Adesivi", es="Adhesivos"), "klebstoffe"),
    ("03", pack("Stempel", "Stamps", "Damga", ar="أختام", fr="Tampons", it="Timbri", es="Sellos"), "stempel"),
    ("04", pack("Dekobänder", "Ribbons", "Kurdele", ar="شرائط", fr="Rubans", it="Nastri", es="Cintas"), "dekobaender"),
]
TOOL = [
    ("01", pack("Cutter", "Craft knives", "Maket bıçağı", ar="سكاكين حرف", fr="Cutters", it="Cutter", es="Cúter"), "cutter"),
    ("02", pack("Schneidematten", "Cutting mats", "Kesim matı", ar="حصائر قص", fr="Tapis de coupe", it="Tappetini taglio", es="Alfombrillas corte"), "schneidematten"),
    ("03", pack("Lineale", "Rulers", "Cetvel", ar="مساطر", fr="Règles", it="Righelli", es="Reglas"), "lineale"),
    ("04", pack("Heißklebepistolen", "Glue guns", "Silikon tabancası", ar="مسدسات صمغ", fr="Pistolets colle", it="Pistole colla", es="Pistolas silicona"), "heissklebepistolen"),
]
KITS = [
    ("01", pack("Kinder-Sets", "Kids kits", "Çocuk seti", ar="أطقم أطفال", fr="Kits enfants", it="Kit bambini", es="Kits niños"), "kinder-sets"),
    ("02", pack("Schmuck-Sets", "Jewelry kits", "Takı seti", ar="أطقم مجوهرات", fr="Kits bijoux", it="Kit gioielli", es="Kits bisutería"), "schmuck-sets"),
    ("03", pack("Näh-Sets", "Sewing kits", "Dikiş seti", ar="أطقم خياطة", fr="Kits couture", it="Kit cucito", es="Kits costura"), "naeh-sets"),
    ("04", pack("Mal-Sets", "Paint kits", "Boya seti", ar="أطقم رسم", fr="Kits peinture", it="Kit pittura", es="Kits pintura"), "mal-sets"),
]
FAB = [
    ("01", pack("Baumwolle", "Cotton", "Pamuk", ar="قطن", fr="Coton", it="Cotone", es="Algodón"), "baumwolle"),
    ("02", pack("Jersey", "Jersey", "Jersey", ar="جيرسي", fr="Jersey", it="Jersey", es="Punto"), "jersey"),
    ("03", pack("Filz", "Felt", "Keçe", ar="لباد", fr="Feutrine", it="Feltro", es="Fieltro"), "filz"),
    ("04", pack("Lederreste", "Leather remnants", "Deri parça", ar="بقايا جلد", fr="Chutes cuir", it="Avanzi pelle", es="Retales cuero"), "lederreste"),
]
PAPER = [
    ("01", pack("Origami", "Origami", "Origami", ar="أوريغامي", fr="Origami", it="Origami", es="Origami"), "origami"),
    ("02", pack("Kartenbasteln", "Card making", "Kart yapımı", ar="صنع بطاقات", fr="Cartes", it="Biglietti", es="Tarjetas"), "kartenbasteln"),
    ("03", pack("Scrapbooking", "Scrapbooking", "Scrapbooking", ar="سكرابوكينغ", fr="Scrapbooking", it="Scrapbooking", es="Scrapbooking"), "scrapbooking"),
    ("04", pack("Stanzformen", "Dies", "Kalıp", ar="قوالب قص", fr="Dies", it="Fustelle", es="Troqueles"), "stanzformen"),
]
JEWEL = [
    ("01", pack("Zangen", "Pliers", "Pense", ar="كماشات", fr="Pinces", it="Pinze", es="Alicates"), "zangen"),
    ("02", pack("Perlen", "Beads", "Boncuk", ar="خرز", fr="Perles", it="Perline", es="Cuentas"), "perlen"),
    ("03", pack("Verschlüsse", "Clasps", "Klips", ar="مشابك", fr="Fermoirs", it="Chiusure", es="Cierres"), "verschluesse"),
    ("04", pack("Draht", "Wire", "Tel", ar="سلك", fr="Fil", it="Filo", es="Alambre"), "draht"),
]
CLAY = [
    ("01", pack("Modelliermasse", "Modeling clay", "Hamur", ar="طين تشكيل", fr="Pâte modeler", it="Pasta modellare", es="Arcilla modelar"), "modelliermasse"),
    ("02", pack("Töpferwerkzeug", "Pottery tools", "Seramik aleti", ar="أدوات فخار", fr="Outils poterie", it="Attrezzi ceramica", es="Herramientas cerámica"), "toepferwerkzeug"),
    ("03", pack("Glasuren", "Glazes", "Sır", ar="طلاء زجاجي", fr="Émaux", it="Smalto", es="Esmaltes"), "glasuren"),
    ("04", pack("Brennhilfen", "Firing aids", "Pişirme", ar="مساعدات حرق", fr="Aides cuisson", it="Supporti cottura", es="Ayudas horno"), "brennhilfen"),
]
EXISTING = {
    "cat-51-01": (pack("Nähen & Stricken", "Sewing & knitting", "Dikiş ve örgü", ar="خياطة وحياكة", fr="Couture et tricot", it="Cucito e maglia", es="Costura y punto"), SEW),
    "cat-51-02": (pack("Basteln & Hobby", "Crafts", "Hobi", ar="حرف", fr="Loisirs créatifs", it="Hobby", es="Manualidades"), CRAFT),
    "cat-51-03": (pack("DIY-Werkzeug", "DIY tools", "DIY alet", ar="أدوات يدوية", fr="Outils DIY", it="Attrezzi DIY", es="Herramientas DIY"), TOOL),
    "cat-51-04": (pack("Kreativ-Sets", "Creative kits", "Kreatif set", ar="أطقم إبداع", fr="Kits créatifs", it="Kit creativi", es="Kits creativos"), KITS),
}
NEW_L2 = [
    ("05", "stoffe-und-textilien", pack("Stoffe & Textilien", "Fabrics & textiles", "Kumaş ve tekstil", ar="أقمشة ونسيج", fr="Tissus et textiles", it="Tessuti", es="Telas y textiles"), FAB),
    ("06", "papierarbeiten", pack("Papierarbeiten", "Paper crafts", "Kağıt işleri", ar="أعمال ورق", fr="Travaux papier", it="Lavori carta", es="Trabajos papel"), PAPER),
    ("07", "schmuckbasteln", pack("Schmuckbasteln", "Jewelry making", "Takı yapımı", ar="صنع مجوهرات", fr="Création bijoux", it="Bigiotteria", es="Bisutería"), JEWEL),
    ("08", "toepfern", pack("Töpfern", "Pottery", "Seramik", ar="فخار", fr="Poterie", it="Ceramica", es="Cerámica"), CLAY),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-51")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-51-{suffix}"
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
