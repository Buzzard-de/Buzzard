#!/usr/bin/env python3
"""Complete Geschenke, Blumen & Anlässe (cat-50) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Gifts placeholder L3 replaced with a real product group"})


GIFT = [
    ("01", pack("Für Sie", "For her", "Kadınlara", ar="لها", fr="Pour elle", it="Per lei", es="Para ella"), "fuer-sie"),
    ("02", pack("Für Ihn", "For him", "Erkeklere", ar="له", fr="Pour lui", it="Per lui", es="Para él"), "fuer-ihn"),
    ("03", pack("Für Kinder", "For kids", "Çocuklara", ar="للأطفال", fr="Pour enfants", it="Per bambini", es="Para niños"), "fuer-kinder"),
    ("04", pack("Für Paare", "For couples", "Çiftlere", ar="للأزواج", fr="Pour couples", it="Per coppie", es="Para parejas"), "fuer-paare"),
]
FLOW = [
    ("01", pack("Schnittblumen", "Cut flowers", "Kesme çiçek", ar="زهور مقطوعة", fr="Fleurs coupées", it="Fiori recisi", es="Flores cortadas"), "schnittblumen"),
    ("02", pack("Sträuße", "Bouquets", "Buket", ar="باقات", fr="Bouquets", it="Bouquet", es="Ramos"), "straeusse"),
    ("03", pack("Trockenblumen", "Dried flowers", "Kurutulmuş çiçek", ar="زهور مجففة", fr="Fleurs séchées", it="Fiori secchi", es="Flores secas"), "trockenblumen"),
    ("04", pack("Blumenvasen", "Vases", "Vazo", ar="مزهريات", fr="Vases", it="Vasi", es="Jarrones"), "blumenvasen"),
]
OCC = [
    ("01", pack("Geburtstag", "Birthday", "Doğum günü", ar="عيد ميلاد", fr="Anniversaire", it="Compleanno", es="Cumpleaños"), "geburtstag"),
    ("02", pack("Hochzeit", "Wedding", "Düğün", ar="زفاف", fr="Mariage", it="Matrimonio", es="Boda"), "hochzeit"),
    ("03", pack("Jubiläum", "Anniversary", "Yıldönümü", ar="ذكرى", fr="Anniversaire couple", it="Anniversario", es="Aniversario"), "jubilaeum"),
    ("04", pack("Danke", "Thank you", "Teşekkür", ar="شكر", fr="Merci", it="Grazie", es="Gracias"), "danke"),
]
VOUCH = [
    ("01", pack("Gutscheine", "Vouchers", "Hediye çeki", ar="قسائم", fr="Bons cadeau", it="Buoni", es="Vales"), "gutscheine"),
    ("02", pack("Geschenksets", "Gift sets", "Hediye seti", ar="أطقم هدايا", fr="Coffrets cadeau", it="Set regalo", es="Sets regalo"), "geschenksets"),
    ("03", pack("Präsentkörbe", "Hampers", "Hediye sepeti", ar="سلال هدايا", fr="Paniers cadeau", it="Ceste regalo", es="Cestas regalo"), "praesentkoerbe"),
    ("04", pack("Mini-Sets", "Mini sets", "Mini set", ar="أطقم صغيرة", fr="Mini coffrets", it="Mini set", es="Mini sets"), "mini-sets"),
]
GOURM = [
    ("01", pack("Schokolade", "Chocolate", "Çikolata", ar="شوكولاتة", fr="Chocolat", it="Cioccolato", es="Chocolate"), "schokolade"),
    ("02", pack("Honig & Konfitüre", "Honey & jam", "Bal ve reçel", ar="عسل ومربى", fr="Miel et confiture", it="Miele e marmellata", es="Miel y mermelada"), "honig-und-konfituere"),
    ("03", pack("Tee & Kaffee", "Tea & coffee", "Çay ve kahve", ar="شاي وقهوة", fr="Thé et café", it="Tè e caffè", es="Té y café"), "tee-und-kaffee"),
    ("04", pack("Naschkörbe", "Sweet hampers", "Tatlı sepeti", ar="سلال حلويات", fr="Paniers sucrés", it="Ceste dolci", es="Cestas dulces"), "naschkoerbe"),
]
PLANT = [
    ("01", pack("Zimmerpflanzen", "Houseplants", "İç mekan bitkisi", ar="نباتات داخلية", fr="Plantes d'intérieur", it="Piante interne", es="Plantas interior"), "zimmerpflanzen"),
    ("02", pack("Sukkulenten", "Succulents", "Sukulent", ar="عصاريات", fr="Succulentes", it="Succulente", es="Suculentas"), "sukkulenten"),
    ("03", pack("Übertöpfe", "Planters", "Saksı", ar="أحواض", fr="Cache-pots", it="Vasi coprenti", es="Macetas"), "uebertoepfe"),
    ("04", pack("Pflanzenpflege", "Plant care", "Bitki bakımı", ar="عناية نبات", fr="Soin plantes", it="Cura piante", es="Cuidado plantas"), "pflanzenpflege"),
]
CARD = [
    ("01", pack("Glückwunschkarten", "Greeting cards", "Tebrik kartı", ar="بطاقات تهنئة", fr="Cartes vœux", it="Biglietti auguri", es="Tarjetas felicitación"), "glueckwunschkarten"),
    ("02", pack("Einladungskarten", "Invitations", "Davetiye", ar="دعوات", fr="Invitations", it="Inviti", es="Invitaciones"), "einladungskarten"),
    ("03", pack("Trauerkarten", "Sympathy cards", "Taziye kartı", ar="تعزية", fr="Condoléances", it="Condoglianze", es="Pésame"), "trauerkarten"),
    ("04", pack("Blankokarten", "Blank cards", "Boş kart", ar="بطاقات فارغة", fr="Cartes vierges", it="Biglietti bianchi", es="Tarjetas en blanco"), "blankokarten"),
]
WRAP = [
    ("01", pack("Geschenkpapier", "Wrapping paper", "Hediye kağıdı", ar="ورق تغليف", fr="Papier cadeau", it="Carta regalo", es="Papel regalo"), "geschenkpapier"),
    ("02", pack("Geschenktüten", "Gift bags", "Hediye torbası", ar="أكياس هدايا", fr="Sacs cadeau", it="Buste regalo", es="Bolsas regalo"), "geschenktueten"),
    ("03", pack("Schleifen", "Ribbons", "Kurdele", ar="شرائط", fr="Rubans", it="Nastri", es="Lazos"), "schleifen"),
    ("04", pack("Geschenkkartons", "Gift boxes", "Hediye kutusu", ar="علب هدايا", fr="Boîtes cadeau", it="Scatole regalo", es="Cajas regalo"), "geschenkkartons"),
]
EXISTING = {
    "cat-50-01": (pack("Geschenke", "Gifts", "Hediye", ar="هدايا", fr="Cadeaux", it="Regali", es="Regalos"), GIFT),
    "cat-50-02": (pack("Blumen & Pflanzen", "Flowers & plants", "Çiçek ve bitki", ar="زهور ونباتات", fr="Fleurs et plantes", it="Fiori e piante", es="Flores y plantas"), FLOW),
    "cat-50-03": (pack("Anlässe & Feiern", "Occasions", "Özel günler", ar="مناسبات", fr="Occasions", it="Occasioni", es="Ocasiones"), OCC),
    "cat-50-04": (pack("Gutscheine & Sets", "Vouchers & sets", "Çek ve set", ar="قسائم وأطقم", fr="Bons et coffrets", it="Buoni e set", es="Vales y sets"), VOUCH),
}
NEW_L2 = [
    ("05", "gourmet-geschenke", pack("Gourmet-Geschenke", "Gourmet gifts", "Gurme hediye", ar="هدايا ذواقة", fr="Cadeaux gourmet", it="Regali gourmet", es="Regalos gourmet"), GOURM),
    ("06", "zimmerpflanzen", pack("Zimmerpflanzen", "Houseplants", "İç mekan bitkisi", ar="نباتات داخلية", fr="Plantes d'intérieur", it="Piante interne", es="Plantas de interior"), PLANT),
    ("07", "grusskarten", pack("Grußkarten", "Greeting cards", "Tebrik kartı", ar="بطاقات", fr="Cartes de vœux", it="Biglietti", es="Tarjetas"), CARD),
    ("08", "geschenkverpackung", pack("Geschenkverpackung", "Gift wrapping", "Hediye paketi", ar="تغليف هدايا", fr="Emballage cadeau", it="Incarto regalo", es="Envoltorio"), WRAP),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-50")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-50-{suffix}"
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
