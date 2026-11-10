#!/usr/bin/env python3
"""Complete Tierfutter (cat-26) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Pet food placeholder L3 replaced with a real product group"})


CAT = [
    ("01", pack("Kitten", "Kitten", "Yavru kedi", ar="قطط صغيرة", fr="Chaton", it="Gattini", es="Gatitos"), "kitten"),
    ("02", pack("Adult", "Adult", "Yetişkin", ar="بالغ", fr="Adulte", it="Adulto", es="Adulto"), "adult"),
    ("03", pack("Senior", "Senior", "Yaşlı", ar="كبير", fr="Sénior", it="Senior", es="Senior"), "senior"),
    ("04", pack("Sterilisiert", "Sterilised", "Kısırlaştırılmış", ar="معقم", fr="Stérilisé", it="Sterilizzato", es="Esterilizado"), "sterilisiert"),
    ("05", pack("Indoor", "Indoor", "İç mekan", ar="داخلي", fr="Intérieur", it="Indoor", es="Interior"), "indoor"),
]
DOG = [
    ("01", pack("Welpe", "Puppy", "Yavru", ar="جراء", fr="Chiot", it="Cucciolo", es="Cachorro"), "welpe"),
    ("02", pack("Adult", "Adult", "Yetişkin", ar="بالغ", fr="Adulte", it="Adulto", es="Adulto"), "adult"),
    ("03", pack("Senior", "Senior", "Yaşlı", ar="كبير", fr="Sénior", it="Senior", es="Senior"), "senior"),
    ("04", pack("Große Rassen", "Large breeds", "Büyük ırk", ar="سلالات كبيرة", fr="Grandes races", it="Razze grandi", es="Razas grandes"), "grosse-rassen"),
    ("05", pack("Kleine Rassen", "Small breeds", "Küçük ırk", ar="سلالات صغيرة", fr="Petites races", it="Razze piccole", es="Razas pequeñas"), "kleine-rassen"),
]
BIRD = [
    ("01", pack("Wellensittich", "Budgies", "Muhabbet", ar="بادجي", fr="Perruches", it="Cocorite", es="Periquitos"), "wellensittich"),
    ("02", pack("Papagei", "Parrots", "Papağan", ar="ببغاء", fr="Perroquets", it="Pappagalli", es="Loros"), "papagei"),
    ("03", pack("Kanarien", "Canaries", "Kanarya", ar="كناري", fr="Canaris", it="Canarini", es="Canarios"), "kanarien"),
    ("04", pack("Exoten", "Exotics", "Egzotik", ar="غريب", fr="Exotiques", it="Esotici", es="Exóticos"), "exoten"),
    ("05", pack("Wildvögel", "Wild birds", "Yabani kuş", ar="طيور برية", fr="Oiseaux sauvages", it="Uccelli selvatici", es="Aves silvestres"), "wildvoegel"),
]
FISH = [
    ("01", pack("Flocken", "Flakes", "Pul", ar="رقائق", fr="Flocons", it="Fiocchi", es="Escamas"), "flocken"),
    ("02", pack("Granulat", "Granules", "Granül", ar="حبيبات", fr="Granulés", it="Granuli", es="Granulado"), "granulat"),
    ("03", pack("Tabletten", "Tablets", "Tablet", ar="أقراص", fr="Comprimés", it="Tavolette", es="Tabletas"), "tabletten"),
    ("04", pack("Frostfutter", "Frozen food", "Dondurulmuş", ar="مجمد", fr="Surgelé", it="Surgelato", es="Congelado"), "frostfutter"),
    ("05", pack("Lebendfutter", "Live food", "Canlı yem", ar="طعام حي", fr="Nourriture vivante", it="Vivo", es="Vivo"), "lebendfutter"),
]
RODENT = [
    ("01", pack("Hamster", "Hamster", "Hamster", ar="همستر", fr="Hamster", it="Criceto", es="Hámster"), "hamster"),
    ("02", pack("Meerschweinchen", "Guinea pigs", "Ginepig", ar="خنزير غينيا", fr="Cochons d'Inde", it="Porcellini d'India", es="Cobayas"), "meerschweinchen"),
    ("03", pack("Kaninchen", "Rabbits", "Tavşan", ar="أرانب", fr="Lapins", it="Conigli", es="Conejos"), "kaninchen"),
    ("04", pack("Chinchilla", "Chinchilla", "Çinçilla", ar="شنشيلا", fr="Chinchilla", it="Cincillà", es="Chinchilla"), "chinchilla"),
    ("05", pack("Ratte & Maus", "Rats & mice", "Sıçan ve fare", ar="جرذان وفئران", fr="Rats et souris", it="Ratti e topi", es="Ratas y ratones"), "ratte-und-maus"),
]
SPECIAL = [
    ("01", pack("Hypoallergen", "Hypoallergenic", "Hipoalerjenik", ar="مضاد للحساسية", fr="Hypoallergénique", it="Ipoallergenico", es="Hipoalergénico"), "hypoallergen"),
    ("02", pack("Getreidefrei", "Grain-free", "Tahılsız", ar="بدون حبوب", fr="Sans céréales", it="Senza cereali", es="Sin cereales"), "getreidefrei"),
    ("03", pack("Light", "Light", "Light", ar="لايت", fr="Light", it="Light", es="Light"), "light"),
    ("04", pack("Sensitive", "Sensitive", "Hassas", ar="حساس", fr="Sensible", it="Sensibile", es="Sensible"), "sensitive"),
    ("05", pack("Veterinary", "Veterinary", "Veteriner", ar="بيطري", fr="Vétérinaire", it="Veterinario", es="Veterinario"), "veterinary"),
]
EXISTING = {
    "cat-26-01": (pack("Katzenfutter", "Cat food", "Kedi maması", ar="طعام قطط", fr="Nourriture chat", it="Cibo gatto", es="Comida gato"), CAT),
    "cat-26-02": (pack("Hundefutter", "Dog food", "Köpek maması", ar="طعام كلاب", fr="Nourriture chien", it="Cibo cane", es="Comida perro"), DOG),
    "cat-26-03": (pack("Vogelfutter", "Bird food", "Kuş yemi", ar="طعام طيور", fr="Nourriture oiseaux", it="Cibo uccelli", es="Comida aves"), BIRD),
    "cat-26-04": (pack("Fischfutter", "Fish food", "Balık yemi", ar="طعام أسماك", fr="Nourriture poissons", it="Cibo pesci", es="Comida peces"), FISH),
    "cat-26-05": (pack("Nagetierfutter", "Rodent food", "Kemirgen yemi", ar="طعام قوارض", fr="Nourriture rongeurs", it="Cibo roditori", es="Comida roedores"), RODENT),
    "cat-26-06": (pack("Sonderernährung", "Special diet", "Özel beslenme", ar="تغذية خاصة", fr="Nutrition spéciale", it="Alimentazione speciale", es="Nutrición especial"), SPECIAL),
}
NEW_L2 = [
    ("07", "snacks-und-ergaenzung", pack("Snacks & Ergänzung", "Snacks & supplements", "Ödül ve takviye", ar="مكملات", fr="Snacks et compléments", it="Snack e integratori", es="Snacks y complementos"), [
        ("01", pack("Leckerlis", "Treats", "Ödül", ar="مكافآت", fr="Friandises", it="Snack", es="Premios"), "leckerlis"),
        ("02", pack("Nahrungsergänzung", "Supplements", "Takviye", ar="مكملات", fr="Compléments", it="Integratori", es="Complementos"), "nahrungsergaenzung"),
        ("03", pack("Malzpaste", "Malt paste", "Malt macunu", ar="معجون شعير", fr="Pâte de malt", it="Pasta di malto", es="Pasta de malta"), "malzpaste"),
        ("04", pack("Gelenk & Fell", "Joint & coat", "Eklem ve tüy", ar="مفاصل وفراء", fr="Articulations et pelage", it="Articolazioni e pelo", es="Articulaciones y pelaje"), "gelenk-und-fell"),
        ("05", pack("Probiotika", "Probiotics", "Probiyotik", ar="بروبيوتيك", fr="Probiotiques", it="Probiotici", es="Probióticos"), "probiotika"),
    ]),
    ("08", "naepfe-und-spender", pack("Näpfe & Spender", "Bowls & dispensers", "Kap ve dispenser", ar="أوعية وموزعات", fr="Gamelles et distributeurs", it="Ciotole e dispenser", es="Comederos y dispensadores"), [
        ("01", pack("Näpfe", "Bowls", "Kap", ar="أوعية", fr="Gamelles", it="Ciotole", es="Comederos"), "naepfe"),
        ("02", pack("Trinkbrunnen", "Fountains", "Su pınarı", ar="نوافير", fr="Fontaines", it="Fontanelle", es="Fuentes"), "trinkbrunnen"),
        ("03", pack("Futterautomaten", "Feeders", "Mama kabı otomatik", ar="مغذيات", fr="Distributeurs", it="Mangiatoie", es="Dispensadores"), "futterautomaten"),
        ("04", pack("Reisebecher", "Travel bowls", "Seyahat kabı", ar="أوعية سفر", fr="Gamelles voyage", it="Ciotole viaggio", es="Bolsillos viaje"), "reisebecher"),
        ("05", pack("Unterlagen", "Mats", "Altlık", ar="حصائر", fr="Tapis", it="Tappetini", es="Alfombrillas"), "unterlagen"),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-26")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-26-{suffix}"
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
