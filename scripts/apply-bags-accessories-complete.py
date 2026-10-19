#!/usr/bin/env python3
"""Complete Taschen, Koffer & Accessoires (cat-16) L2/L3 hubs."""
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


def pack(de: str, en: str, tr: str, **more: str) -> dict[str, str]:
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
    if old == new:
        return
    REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Bags placeholder L3 replaced with a real product group"})


DAY = [
    ("01", pack("Shopper", "Shopper bags", "Shopper", ar="شنط تسوق", fr="Sacs shopper", it="Shopper", es="Bolsos shopper"), "shopper"),
    ("02", pack("Umhängetaschen", "Shoulder bags", "Omuz çantası", ar="حقائب كتف", fr="Sacs à bandoulière", it="Borse a spalla", es="Bolsos de hombro"), "umhaengetaschen"),
    ("03", pack("Handtaschen", "Handbags", "El çantası", ar="حقائب يد", fr="Sacs à main", it="Borse a mano", es="Bolsos de mano"), "handtaschen"),
    ("04", pack("Clutches", "Clutches", "Clutch", ar="كلاتش", fr="Pochettes", it="Pochette", es="Clutch"), "clutches"),
    ("05", pack("Crossbody-Taschen", "Crossbody bags", "Crossbody", ar="حقائب كروس", fr="Sacs bandoulière", it="Borse a tracolla", es="Bolsos cruzados"), "crossbody-taschen"),
]
BACK = [
    ("01", pack("Tagesrucksäcke", "Daypacks", "Günlük sırt çantası", ar="حقائب يومية", fr="Sacs à dos jour", it="Zaini giornalieri", es="Mochilas de día"), "tagesrucksaecke"),
    ("02", pack("Laptop-Rucksäcke", "Laptop backpacks", "Laptop sırt çantası", ar="حقائب لابتوب", fr="Sacs à dos laptop", it="Zaini laptop", es="Mochilas para portátil"), "laptop-rucksaecke"),
    ("03", pack("Wanderrucksäcke", "Hiking backpacks", "Doğa sırt çantası", ar="حقائب مشي", fr="Sacs de randonnée", it="Zaini trekking", es="Mochilas de trekking"), "wanderrucksaecke"),
    ("04", pack("Schulrucksäcke", "School backpacks", "Okul çantası", ar="حقائب مدرسية", fr="Sacs d'école", it="Zaini scuola", es="Mochilas escolares"), "schulrucksaecke"),
]
TRAVEL = [
    ("01", pack("Reisetaschen", "Duffle bags", "Seyahat çantası", ar="حقائب سفر", fr="Sacs de voyage", it="Borsoni", es="Bolsas de viaje"), "reisetaschen"),
    ("02", pack("Weekender", "Weekenders", "Weekender", ar="ويكندر", fr="Week-end", it="Weekender", es="Weekender"), "weekender"),
    ("03", pack("Kulturbeutel", "Toiletry bags", "Neseser", ar="حقائب أدوات الزينة", fr="Trousses de toilette", it="Beauty case", es="Neceseres"), "kulturbeutel"),
    ("04", pack("Packwürfel", "Packing cubes", "Organizer", ar="منظمات سفر", fr="Cubes de rangement", it="Cubi da viaggio", es="Organizadores"), "packwuerfel"),
]
WALLET = [
    ("01", pack("Damengeldbörsen", "Women's wallets", "Kadın cüzdan", ar="محافظ نسائية", fr="Portefeuilles femme", it="Portafogli donna", es="Carteras de mujer"), "damengeldborsoen"),
    ("02", pack("Herrengeldbörsen", "Men's wallets", "Erkek cüzdan", ar="محافظ رجالية", fr="Portefeuilles homme", it="Portafogli uomo", es="Carteras de hombre"), "herrengeldborsoen"),
    ("03", pack("Kartenetuis", "Card holders", "Kartlık", ar="حاملات بطاقات", fr="Porte-cartes", it="Portacarte", es="Tarjeteros"), "kartenetuis"),
    ("04", pack("Münzbörsen", "Coin purses", "Bozuk para cüzdanı", ar="محافظ نقود", fr="Porte-monnaie", it="Portamonete", es="Monederos"), "muenzboersen"),
]
CASE = [
    ("01", pack("Kabinentrolley", "Cabin trolleys", "Kabin valiz", ar="حقائب مقصورة", fr="Cabine", it="Trolley cabina", es="Maletas de cabina"), "kabinentrolley"),
    ("02", pack("Mittelgroßer Koffer", "Medium suitcases", "Orta boy valiz", ar="حقائب متوسطة", fr="Valises moyennes", it="Valigie medie", es="Maletas medianas"), "mittelgrosser-koffer"),
    ("03", pack("Großer Koffer", "Large suitcases", "Büyük valiz", ar="حقائب كبيرة", fr="Grandes valises", it="Valigie grandi", es="Maletas grandes"), "grosser-koffer"),
    ("04", pack("Kofferset", "Luggage sets", "Valiz seti", ar="طقم حقائب", fr="Sets de valises", it="Set valigie", es="Juegos de maletas"), "kofferset"),
]
BELT = [
    ("01", pack("Damengürtel", "Women's belts", "Kadın kemer", ar="أحزمة نسائية", fr="Ceintures femme", it="Cinture donna", es="Cinturones de mujer"), "damenguertel"),
    ("02", pack("Herrengürtel", "Men's belts", "Erkek kemer", ar="أحزمة رجالية", fr="Ceintures homme", it="Cinture uomo", es="Cinturones de hombre"), "herrenguertel"),
    ("03", pack("Ledergürtel", "Leather belts", "Deri kemer", ar="أحزمة جلد", fr="Ceintures cuir", it="Cinture in pelle", es="Cinturones de cuero"), "lederguertel"),
    ("04", pack("Stoffgürtel", "Fabric belts", "Kumaş kemer", ar="أحزمة قماش", fr="Ceintures tissu", it="Cinture in tessuto", es="Cinturones de tela"), "stoffguertel"),
]
HAT = [
    ("01", pack("Caps", "Caps", "Şapka", ar="قبعات كاب", fr="Casquettes", it="Cappellini", es="Gorras"), "caps"),
    ("02", pack("Mützen", "Beanies", "Bere", ar="قبعات صوف", fr="Bonnets", it="Berretti", es="Gorros"), "muetzen"),
    ("03", pack("Sonnenhüte", "Sun hats", "Hasır şapka", ar="قبعات شمس", fr="Chapeaux de soleil", it="Cappelli sole", es="Sombreros"), "sonnenhuete"),
    ("04", pack("Wintermützen", "Winter hats", "Kış bere", ar="قبعات شتاء", fr="Bonnets d'hiver", it="Cappelli invernali", es="Gorros de invierno"), "wintermuetzen"),
]
UMBRELLA = [
    ("01", pack("Taschenschirme", "Compact umbrellas", "Katlanır şemsiye", ar="مظلات جيب", fr="Parapluies pliants", it="Ombrelli pieghevoli", es="Paraguas plegables"), "taschenschirme"),
    ("02", pack("Stockschirme", "Stick umbrellas", "Uzun şemsiye", ar="مظلات طويلة", fr="Parapluies longs", it="Ombrelli da passeggio", es="Paraguas de palo"), "stockschirme"),
    ("03", pack("XXL-Schirme", "Oversized umbrellas", "Büyük şemsiye", ar="مظلات كبيرة", fr="Grands parapluies", it="Ombrelli XXL", es="Paraguas XXL"), "xxl-schirme"),
    ("04", pack("Sonnenschirme klein", "Patio umbrellas compact", "Güneş şemsiyesi", ar="مظلات شمس", fr="Ombrelle", it="Ombrellini", es="Sombrillas"), "sonnenschirme-klein"),
]
LAPTOP = [
    ("01", pack("Laptoptaschen", "Laptop bags", "Laptop çantası", ar="حقائب حاسوب", fr="Sacs ordinateur", it="Borse laptop", es="Bolsas para portátil"), "laptoptaschen"),
    ("02", pack("Aktentaschen", "Briefcases", "Evrak çantası", ar="حقائب وثائق", fr="Serviettes", it="Cartelle", es="Maletines"), "aktentaschen"),
    ("03", pack("Messenger-Bags", "Messenger bags", "Postacı çantası", ar="حقائب مسنجر", fr="Besaces", it="Messenger", es="Bandoleras"), "messenger-bags"),
    ("04", pack("Tablethüllen", "Tablet sleeves", "Tablet kılıfı", ar="أغطية تابلت", fr="Housses tablette", it="Custodie tablet", es="Fundas tablet"), "tablethuellen"),
]
TRAVEL_ACC = [
    ("01", pack("Adressanhänger", "Luggage tags", "Valiz etiketi", ar="بطاقات أمتعة", fr="Étiquettes bagage", it="Etichette", es="Identificadores"), "adressanhaenger"),
    ("02", pack("Zahlenschlösser", "Travel locks", "Şifreli kilit", ar="أقفال سفر", fr="Cadenas", it="Lucchetti", es="Candados"), "zahlenschloesser"),
    ("03", pack("Reisekissen", "Travel pillows", "Seyahat yastığı", ar="وسائد سفر", fr="Oreillers voyage", it="Cuscini viaggio", es="Almohadas de viaje"), "reisekissen"),
    ("04", pack("Dokumente-Organizer", "Document organizers", "Evrak organizer", ar="منظم وثائق", fr="Porte-documents", it="Portadocumenti", es="Organizadores de documentos"), "dokumente-organizer"),
]

EXISTING = {
    "cat-16-01": (pack("Alltagstaschen", "Everyday bags", "Günlük çanta", ar="حقائب يومية", fr="Sacs du quotidien", it="Borse quotidiane", es="Bolsos de diario"), DAY),
    "cat-16-02": (pack("Rucksäcke", "Backpacks", "Sırt çantası", ar="حقائب ظهر", fr="Sacs à dos", it="Zaini", es="Mochilas"), BACK),
    "cat-16-03": (pack("Reisetaschen", "Travel bags", "Seyahat çantası", ar="حقائب السفر", fr="Sacs de voyage", it="Borse da viaggio", es="Bolsas de viaje"), TRAVEL),
    "cat-16-04": (pack("Geldbörsen", "Wallets", "Cüzdan", ar="محافظ", fr="Portefeuilles", it="Portafogli", es="Carteras"), WALLET),
    "cat-16-05": (pack("Koffer", "Suitcases", "Valiz", ar="حقائب سفر بعجلات", fr="Valises", it="Valigie", es="Maletas"), CASE),
    "cat-16-06": (pack("Gürtel", "Belts", "Kemer", ar="أحزمة", fr="Ceintures", it="Cinture", es="Cinturones"), BELT),
    "cat-16-07": (pack("Hüte & Mützen", "Hats & caps", "Şapka ve bere", ar="قبعات", fr="Chapeaux", it="Cappelli", es="Sombreros"), HAT),
    "cat-16-08": (pack("Regenschirme", "Umbrellas", "Şemsiye", ar="مظلات", fr="Parapluies", it="Ombrelli", es="Paraguas"), UMBRELLA),
}
NEW_L2 = [
    ("09", "laptoptaschen-und-business", pack("Laptoptaschen & Business", "Laptop & business bags", "Laptop ve evrak çantası", ar="حقائب عمل", fr="Sacs business", it="Borse business", es="Bolsos de trabajo"), LAPTOP),
    ("10", "reiseaccessoires", pack("Reiseaccessoires", "Travel accessories", "Seyahat aksesuarı", ar="إكسسوارات السفر", fr="Accessoires voyage", it="Accessori viaggio", es="Accesorios de viaje"), TRAVEL_ACC),
]


def replace_l3_group(parent, specs):
    existing = {child["id"]: child for child in parent.get("children") or []}
    rebuilt = []
    for suffix, labels, slug in specs:
        cid = f"{parent['id']}-{suffix}"
        extra = {}
        old = existing.get(cid)
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
    bags = next(c for c in catalog["categories"] if c["id"] == "cat-16")
    by_id = {c["id"]: c for c in bags["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in bags["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-16-{suffix}"
        if cid in existing:
            continue
        url = f"{bags['url']}/{slug}"
        hub = node(cid, int(suffix), labels, slug, url, 2, [])
        for item in children:
            hub["children"].append(l3(cid, url, item[0], item[1], item[2]))
        bags["children"].append(hub)
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
    print("L2", len(bags["children"]), "L3", sum(len(c.get("children") or []) for c in bags["children"]), "labels", len(NEW_LABELS), "redirects", len(REDIRECTS))


if __name__ == "__main__":
    main()
