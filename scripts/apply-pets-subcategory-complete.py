#!/usr/bin/env python3
"""Complete Haustierbedarf (cat-06) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Pets placeholder L3 replaced with a real product group"})


CAT = [
    ("01", pack("Trockenfutter", "Dry food", "Kuru mama", ar="طعام جاف", fr="Croquettes", it="Crocchette", es="Pienso seco"), "trockenfutter"),
    ("02", pack("Nassfutter", "Wet food", "Yaş mama", ar="طعام رطب", fr="Pâtée", it="Umido", es="Comida húmeda"), "nassfutter"),
    ("03", pack("Katzenspielzeug", "Cat toys", "Kedi oyuncağı", ar="ألعاب قطط", fr="Jouets chat", it="Giochi gatto", es="Juguetes gato"), "katzenspielzeug"),
    ("04", pack("Katzenstreu", "Cat litter", "Kedi kumu", ar="رمل قطط", fr="Litière", it="Lettiera", es="Arena"), "katzenstreu"),
    ("05", pack("Kratzbäume", "Scratching trees", "Tırmalama ağacı", ar="شجرة خدش", fr="Arbres à chat", it="Tiragraffi", es="Rascadores"), "kratzbaeume"),
]
DOG = [
    ("01", pack("Trockenfutter", "Dry food", "Kuru mama", ar="طعام جاف", fr="Croquettes", it="Crocchette", es="Pienso seco"), "trockenfutter"),
    ("02", pack("Nassfutter", "Wet food", "Yaş mama", ar="طعام رطب", fr="Pâtée", it="Umido", es="Comida húmeda"), "nassfutter"),
    ("03", pack("Hundespielzeug", "Dog toys", "Köpek oyuncağı", ar="ألعاب كلاب", fr="Jouets chien", it="Giochi cane", es="Juguetes perro"), "hundespielzeug"),
    ("04", pack("Leinen & Halsbänder", "Leashes & collars", "Tasma ve kayış", ar="مقود وطوق", fr="Laisses et colliers", it="Guinzagli e collari", es="Correas y collares"), "leinen-und-halsbaender"),
    ("05", pack("Näpfe & Tränken", "Bowls & drinkers", "Mama ve su kabı", ar="أوعية", fr="Gamelles", it="Ciotole", es="Comederos"), "naepfe-und-traenken"),
]
BIRD = [
    ("01", pack("Körnerfutter", "Seed mix", "Karışık yem", ar="حبوب", fr="Mélange graines", it="Miscela semi", es="Mezcla de semillas"), "koernerfutter"),
    ("02", pack("Sämereien", "Millet & seeds", "Darı ve tohum", ar="بذور", fr="Graines", it="Semi", es="Semillas"), "saemereien"),
    ("03", pack("Käfige", "Cages", "Kafes", ar="أقفاص", fr="Cages", it="Gabbie", es="Jaulas"), "kaefige"),
    ("04", pack("Sitzstangen", "Perches", "Tünek", ar="مجاثم", fr="Perchoirs", it="Posatoi", es="Perchas"), "sitzstangen"),
    ("05", pack("Vogelsand", "Bird sand", "Kuş kumu", ar="رمل طيور", fr="Sable oiseaux", it="Sabbia uccelli", es="Arena aves"), "vogelsand"),
]
FISH = [
    ("01", pack("Flockenfutter", "Flake food", "Pul yem", ar="رقائق", fr="Flocons", it="Fiocchi", es="Escamas"), "flockenfutter"),
    ("02", pack("Granulat", "Granules", "Granül", ar="حبيبات", fr="Granulés", it="Granuli", es="Granulado"), "granulat"),
    ("03", pack("Aquarien", "Aquariums", "Akvaryum", ar="أحواض", fr="Aquariums", it="Acquari", es="Acuarios"), "aquarien"),
    ("04", pack("Filtertechnik", "Filter tech", "Filtre", ar="فلاتر", fr="Filtres", it="Filtri", es="Filtros"), "filtertechnik"),
    ("05", pack("Wasserpflege", "Water care", "Su bakımı", ar="عناية الماء", fr="Soin de l'eau", it="Cura acqua", es="Cuidado del agua"), "wasserpflege"),
]
RODENT = [
    ("01", pack("Pellets", "Pellets", "Pellet", ar="حبيبات", fr="Granulés", it="Pellet", es="Pellets"), "pellets"),
    ("02", pack("Heu", "Hay", "Yonca", ar="تبن", fr="Foin", it="Fieno", es="Heno"), "heu"),
    ("03", pack("Käfige", "Cages", "Kafes", ar="أقفاص", fr="Cages", it="Gabbie", es="Jaulas"), "kaefige"),
    ("04", pack("Einstreu", "Bedding", "Altlık", ar="فرش", fr="Litière", it="Lettiera", es="Lecho"), "einstreu"),
    ("05", pack("Laufräder", "Exercise wheels", "Koşu çarkı", ar="عجلات", fr="Roues", it="Ruote", es="Ruedas"), "laufraeder"),
]
FOOD = [
    ("01", pack("Trockenfutter", "Dry food", "Kuru mama", ar="طعام جاف", fr="Croquettes", it="Crocchette", es="Pienso seco"), "trockenfutter"),
    ("02", pack("Nassfutter", "Wet food", "Yaş mama", ar="طعام رطب", fr="Pâtée", it="Umido", es="Comida húmeda"), "nassfutter"),
    ("03", pack("BARF", "BARF", "BARF", ar="بارف", fr="BARF", it="BARF", es="BARF"), "barf"),
    ("04", pack("Diätfutter", "Diet food", "Diyet mama", ar="طعام حمية", fr="Aliment diététique", it="Dietetico", es="Dietético"), "diaetfutter"),
    ("05", pack("Juniorfutter", "Junior food", "Yavru mama", ar="طعام صغار", fr="Junior", it="Junior", es="Junior"), "juniorfutter"),
]
TREATS = [
    ("01", pack("Hundeleckerlis", "Dog treats", "Köpek ödülü", ar="مكافآت كلاب", fr="Friandises chien", it="Snack cane", es="Premios perro"), "hundeleckerlis"),
    ("02", pack("Katzenleckerli", "Cat treats", "Kedi ödülü", ar="مكافآت قطط", fr="Friandises chat", it="Snack gatto", es="Premios gato"), "katzenleckerli"),
    ("03", pack("Kauartikel", "Chews", "Çiğneme", ar="مضغ", fr="Mastication", it="Masticativi", es="Masticables"), "kauartikel"),
    ("04", pack("Dentalsticks", "Dental sticks", "Diş çubuğu", ar="عناية أسنان", fr="Bâtonnets dentaires", it="Dental stick", es="Sticks dentales"), "dentalsticks"),
    ("05", pack("Trainingssnacks", "Training snacks", "Eğitim ödülü", ar="تدريب", fr="Snacks d'éducation", it="Snack addestramento", es="Snacks de adiestramiento"), "trainingssnacks"),
]
TOYS = [
    ("01", pack("Intelligenzspielzeug", "Puzzle toys", "Zeka oyuncağı", ar="ألعاب ذكاء", fr="Jouets intelligence", it="Giochi intelligenti", es="Juguetes inteligencia"), "intelligenzspielzeug"),
    ("02", pack("Bälle", "Balls", "Top", ar="كرات", fr="Balles", it="Palle", es="Pelotas"), "baelle"),
    ("03", pack("Plüsch", "Plush", "Peluş", ar="قطيفة", fr="Peluche", it="Peluche", es="Peluche"), "pluesch"),
    ("04", pack("Interaktiv", "Interactive", "Etkileşimli", ar="تفاعلي", fr="Interactif", it="Interattivo", es="Interactivo"), "interaktiv"),
    ("05", pack("Outdoor", "Outdoor", "Açık hava", ar="خارجي", fr="Plein air", it="Outdoor", es="Exterior"), "outdoor"),
]
BEDS = [
    ("01", pack("Hundebetten", "Dog beds", "Köpek yatağı", ar="أسرة كلاب", fr="Paniers chien", it="Cucce", es="Camas perro"), "hundebetten"),
    ("02", pack("Katzenkörbe", "Cat baskets", "Kedi sepeti", ar="سلال قطط", fr="Paniers chat", it="Ceste gatto", es="Cestas gato"), "katzenkoerbe"),
    ("03", pack("Transportboxen", "Carriers", "Taşıma kutusu", ar="صناديق نقل", fr="Cages de transport", it="Trasportini", es="Transportines"), "transportboxen"),
    ("04", pack("Autositze", "Car seats", "Araç koltuğu", ar="مقاعد سيارة", fr="Sièges auto", it="Seggiolini auto", es="Asientos auto"), "autositze"),
    ("05", pack("Reisedecken", "Travel blankets", "Seyahat battaniyesi", ar="بطانيات سفر", fr="Couvertures voyage", it="Coperte viaggio", es="Mantas viaje"), "reisedecken"),
]
CARE = [
    ("01", pack("Shampoo", "Shampoo", "Şampuan", ar="شامبو", fr="Shampooing", it="Shampoo", es="Champú"), "shampoo"),
    ("02", pack("Bürsten", "Brushes", "Fırça", ar="فرش", fr="Brosses", it="Spazzole", es="Cepillos"), "buersten"),
    ("03", pack("Zahnpflege", "Dental care", "Diş bakımı", ar="عناية الأسنان", fr="Soin dentaire", it="Igiene dentale", es="Cuidado dental"), "zahnpflege"),
    ("04", pack("Ohrenpflege", "Ear care", "Kulak bakımı", ar="عناية الأذن", fr="Soin oreilles", it="Cura orecchie", es="Cuidado oídos"), "ohrenpflege"),
    ("05", pack("Kotbeutel", "Waste bags", "Dışkı torbası", ar="أكياس فضلات", fr="Sacs déjections", it="Sacchetti", es="Bolsas"), "kotbeutel"),
]
EXISTING = {
    "cat-06-01": (pack("Katze", "Cats", "Kedi", ar="قطط", fr="Chats", it="Gatti", es="Gatos"), CAT),
    "cat-06-02": (pack("Hund", "Dogs", "Köpek", ar="كلاب", fr="Chiens", it="Cani", es="Perros"), DOG),
    "cat-06-03": (pack("Vogel", "Birds", "Kuş", ar="طيور", fr="Oiseaux", it="Uccelli", es="Aves"), BIRD),
    "cat-06-04": (pack("Fisch & Aquarium", "Fish & aquarium", "Balık ve akvaryum", ar="أسماك وأحواض", fr="Poissons et aquarium", it="Pesci e acquario", es="Peces y acuario"), FISH),
    "cat-06-05": (pack("Nagetiere", "Rodents", "Kemirgen", ar="قوارض", fr="Rongeurs", it="Roditori", es="Roedores"), RODENT),
    "cat-06-06": (pack("Haustierfutter", "Pet food", "Evcil hayvan maması", ar="طعام حيوانات", fr="Alimentation", it="Alimenti", es="Alimento"), FOOD),
    "cat-06-07": (pack("Leckerlis & Snacks", "Treats & snacks", "Ödül ve atıştırmalık", ar="مكافآت", fr="Friandises", it="Snack", es="Premios"), TREATS),
    "cat-06-08": (pack("Spielzeug", "Toys", "Oyuncak", ar="ألعاب", fr="Jouets", it="Giochi", es="Juguetes"), TOYS),
    "cat-06-09": (pack("Betten & Transport", "Beds & travel", "Yatak ve taşıma", ar="أسرّة ونقل", fr="Couchages et transport", it="Cucce e trasporto", es="Camas y transporte"), BEDS),
    "cat-06-10": (pack("Pflege & Hygiene", "Care & hygiene", "Bakım ve hijyen", ar="عناية ونظافة", fr="Soins et hygiène", it="Cura e igiene", es="Cuidado e higiene"), CARE),
}


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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-06")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
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
