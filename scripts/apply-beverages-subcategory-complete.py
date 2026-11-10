#!/usr/bin/env python3
"""Complete Getränke (cat-46) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Beverages placeholder L3 replaced with a real product group"})


WATER = [
    ("01", pack("Stilles Wasser", "Still water", "Durgun su", ar="ماء ساكن", fr="Eau plate", it="Acqua naturale", es="Agua sin gas"), "stilles-wasser"),
    ("02", pack("Medium", "Medium sparkling", "Orta gazlı", ar="ماء متوسط الغاز", fr="Eau légèrement gazeuse", it="Acqua leggermente frizzante", es="Agua ligeramente con gas"), "medium"),
    ("03", pack("Sprudel", "Sparkling", "Gazlı", ar="ماء غازي", fr="Eau gazeuse", it="Acqua frizzante", es="Agua con gas"), "sprudel"),
    ("04", pack("Glasflaschen", "Glass bottles", "Cam şişe", ar="زجاجات", fr="Bouteilles verre", it="Bottiglie vetro", es="Botellas de vidrio"), "glasflaschen"),
]
JUICE = [
    ("01", pack("Orangensaft", "Orange juice", "Portakal suyu", ar="عصير برتقال", fr="Jus d'orange", it="Succo d'arancia", es="Zumo de naranja"), "orangensaft"),
    ("02", pack("Multivitamin", "Multivitamin", "Multivitamin", ar="فيتامينات متعددة", fr="Multivitaminé", it="Multivitaminico", es="Multivitamínico"), "multivitamin"),
    ("03", pack("Schorle", "Spritzers", "Schorle", ar="شورله", fr="Schorle", it="Schorle", es="Schorle"), "schorle"),
    ("04", pack("Smoothies", "Smoothies", "Smoothie", ar="سموذي", fr="Smoothies", it="Smoothie", es="Smoothies"), "smoothies"),
]
COFFEE = [
    ("01", pack("Röstkaffee", "Roasted coffee", "Çekirdek kahve", ar="قهوة محمصة", fr="Café torréfié", it="Caffè tostato", es="Café tostado"), "roestkaffee"),
    ("02", pack("Kapseln", "Capsules", "Kapsül", ar="كبسولات", fr="Capsules", it="Capsule", es="Cápsulas"), "kapseln"),
    ("03", pack("Schwarztee", "Black tea", "Siyah çay", ar="شاي أسود", fr="Thé noir", it="Tè nero", es="Té negro"), "schwarztee"),
    ("04", pack("Kräutertee", "Herbal tea", "Bitki çayı", ar="شاي أعشاب", fr="Tisanes", it="Tisane", es="Infusiones"), "kraeutertee"),
]
WINE = [
    ("01", pack("Rotwein", "Red wine", "Kırmızı şarap", ar="نبيذ أحمر", fr="Vin rouge", it="Vino rosso", es="Vino tinto"), "rotwein"),
    ("02", pack("Weißwein", "White wine", "Beyaz şarap", ar="نبيذ أبيض", fr="Vin blanc", it="Vino bianco", es="Vino blanco"), "weisswein"),
    ("03", pack("Sekt", "Sparkling wine", "Köpüklü", ar="نبيذ فوار", fr="Vin mousseux", it="Spumante", es="Espumoso"), "sekt"),
    ("04", pack("Spirituosen", "Spirits", "İçki", ar="مشروبات روحية", fr="Spiritueux", it="Distillati", es="Destilados"), "spirituosen"),
]
BEER = [
    ("01", pack("Pils", "Pils", "Pils", ar="بيلز", fr="Pils", it="Pils", es="Pils"), "pils"),
    ("02", pack("Weizen", "Wheat beer", "Weizen", ar="قمح", fr="Blanche", it="Weizen", es="De trigo"), "weizen"),
    ("03", pack("Alkoholfrei", "Non-alcoholic", "Alkolsüz", ar="بدون كحول", fr="Sans alcool", it="Analcolica", es="Sin alcohol"), "alkoholfrei"),
    ("04", pack("Craft", "Craft beer", "Craft", ar="كرافت", fr="Craft", it="Craft", es="Craft"), "craft"),
]
SPORT = [
    ("01", pack("Energy-Drinks", "Energy drinks", "Enerji içeceği", ar="مشروبات طاقة", fr="Boissons énergisantes", it="Energy drink", es="Bebidas energéticas"), "energy-drinks"),
    ("02", pack("Isotonisch", "Isotonic", "İzotonik", ar="متساوي التوتر", fr="Isotoniques", it="Isotoniche", es="Isotónicas"), "isotonisch"),
    ("03", pack("Protein-Drinks", "Protein drinks", "Protein içeceği", ar="مشروبات بروتين", fr="Boissons protéines", it="Bevande proteiche", es="Bebidas proteicas"), "protein-drinks"),
    ("04", pack("Vitaminwasser", "Vitamin water", "Vitamin suyu", ar="ماء فيتامين", fr="Eaux vitaminées", it="Acqua vitaminizzata", es="Agua vitaminada"), "vitaminwasser"),
]
MIX = [
    ("01", pack("Sirupe", "Syrups", "Şurup", ar="شراب", fr="Sirops", it="Sciroppi", es="Siropes"), "sirupe"),
    ("02", pack("Tonic", "Tonic", "Tonik", ar="تونيك", fr="Tonic", it="Tonic", es="Tónica"), "tonic"),
    ("03", pack("Bitter Lemon", "Bitter lemon", "Bitter lemon", ar="بيتر ليمون", fr="Bitter lemon", it="Bitter lemon", es="Bitter lemon"), "bitter-lemon"),
    ("04", pack("Soda", "Soda", "Soda", ar="صودا", fr="Soda", it="Soda", es="Soda"), "soda"),
]
HOT = [
    ("01", pack("Kakao", "Cocoa", "Kakao", ar="كاكاو", fr="Cacao", it="Cacao", es="Cacao"), "kakao"),
    ("02", pack("Chai", "Chai", "Chai", ar="شاي", fr="Chai", it="Chai", es="Chai"), "chai"),
    ("03", pack("Matcha", "Matcha", "Matcha", ar="ماتشا", fr="Matcha", it="Matcha", es="Matcha"), "matcha"),
    ("04", pack("Instant-Kaffee", "Instant coffee", "Hazır kahve", ar="قهوة سريعة", fr="Café soluble", it="Caffè solubile", es="Café soluble"), "instant-kaffee"),
]
EXISTING = {
    "cat-46-01": (pack("Wasser", "Water", "Su", ar="ماء", fr="Eau", it="Acqua", es="Agua"), WATER),
    "cat-46-02": (pack("Säfte & Softdrinks", "Juices & soft drinks", "Meyve suyu ve gazlı", ar="عصائر ومشروبات", fr="Jus et sodas", it="Succhi e bibite", es="Zumos y refrescos"), JUICE),
    "cat-46-03": (pack("Kaffee & Tee", "Coffee & tea", "Kahve ve çay", ar="قهوة وشاي", fr="Café et thé", it="Caffè e tè", es="Café y té"), COFFEE),
    "cat-46-04": (pack("Wein & Spirituosen", "Wine & spirits", "Şarap ve içki", ar="نبيذ ومشروبات روحية", fr="Vins et spiritueux", it="Vini e distillati", es="Vinos y destilados"), WINE),
}
NEW_L2 = [
    ("05", "bier", pack("Bier", "Beer", "Bira", ar="بيرة", fr="Bière", it="Birra", es="Cerveza"), BEER),
    ("06", "sport-und-energy", pack("Sport & Energy", "Sport & energy", "Spor ve enerji", ar="رياضة وطاقة", fr="Sport et énergie", it="Sport e energy", es="Deporte y energía"), SPORT),
    ("07", "sirup-und-mixer", pack("Sirup & Mixer", "Syrups & mixers", "Şurup ve mikser", ar="شراب ومكسرات", fr="Sirops et mixers", it="Sciroppi e mixer", es="Siropes y mixers"), MIX),
    ("08", "heissgetraenke", pack("Heißgetränke", "Hot drinks", "Sıcak içecek", ar="مشروبات ساخنة", fr="Boissons chaudes", it="Bevande calde", es="Bebidas calientes"), HOT),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-46")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-46-{suffix}"
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
