#!/usr/bin/env python3
"""Complete Haushaltsgeräte (cat-13) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Appliances placeholder L3 replaced with a real product group"})


KITCHEN = [
    ("01", pack("Mixer", "Blenders", "Blender", ar="خلاطات", fr="Mixeurs", it="Frullatori", es="Batidoras"), "mixer"),
    ("02", pack("Toaster", "Toasters", "Tost makinesi", ar="محامص", fr="Grille-pain", it="Tostapane", es="Tostadoras"), "toaster"),
    ("03", pack("Wasserkocher", "Kettles", "Kettle", ar="غلايات", fr="Bouilloires", it="Bollitori", es="Hervidores"), "wasserkocher"),
    ("04", pack("Fritteusen", "Fryers", "Fritöz", ar="قلايات", fr="Friteuses", it="Friggitrice", es="Freidoras"), "fritteusen"),
    ("05", pack("Stabmixer", "Hand blenders", "El blenderı", ar="خلاطات يدوية", fr="Mixeurs plongeants", it="Frullatori ad immersione", es="Batidoras de mano"), "stabmixer"),
]
DRINK = [
    ("01", pack("Kaffeevollautomaten", "Bean-to-cup", "Tam otomatik kahve", ar="آلات قهوة", fr="Machines automatique", it="Macchine superautomatiche", es="Cafeteras superautomáticas"), "kaffeevollautomaten"),
    ("02", pack("Espressomaschinen", "Espresso machines", "Espresso makinesi", ar="آلات إسبريسو", fr="Machines espresso", it="Macchine espresso", es="Cafeteras espresso"), "espressomaschinen"),
    ("03", pack("Filterkaffee", "Filter coffee", "Filtre kahve", ar="قهوة مقطرة", fr="Café filtre", it="Caffè filtro", es="Café de filtro"), "filterkaffee"),
    ("04", pack("Entsafter", "Juicers", "Sıkacak", ar="عاصرات", fr="Extracteurs", it="Estrattori", es="Licuadoras"), "entsafter"),
    ("05", pack("Smoothiemaker", "Smoothie makers", "Smoothie makinesi", ar="صانعات سموذي", fr="Blenders smoothie", it="Frullatori smoothie", es="Batidoras smoothie"), "smoothiemaker"),
]
CLEAN = [
    ("01", pack("Staubsauger", "Vacuum cleaners", "Süpürge", ar="مكانس", fr="Aspirateurs", it="Aspirapolvere", es="Aspiradoras"), "staubsauger"),
    ("02", pack("Dampfreiniger", "Steam cleaners", "Buharlı temizlik", ar="بخار", fr="Nettoyeurs vapeur", it="Pulitori a vapore", es="Limpiadores de vapor"), "dampfreiniger"),
    ("03", pack("Fensterroboter", "Window robots", "Cam robotu", ar="روبوت نوافذ", fr="Robots vitres", it="Robot vetri", es="Robots de ventanas"), "fensterroboter"),
    ("04", pack("Waschsauger", "Wet vacuums", "Islak süpürge", ar="مكانس رطبة", fr="Aspirateurs eau", it="Aspiraliquidi", es="Aspiradoras de agua"), "waschsauger"),
    ("05", pack("Teppichreiniger", "Carpet cleaners", "Halı yıkama", ar="غسيل سجاد", fr="Shampouineuses", it="Lavamoquette", es="Limpiamoquetas"), "teppichreiniger"),
]
CARE = [
    ("01", pack("Haartrockner", "Hair dryers", "Saç kurutma", ar="مجففات شعر", fr="Sèche-cheveux", it="Asciugacapelli", es="Secadores"), "haartrockner"),
    ("02", pack("Glätteisen", "Straighteners", "Düzleştirici", ar="مكواة شعر", fr="Lisseurs", it="Piastre", es="Planchas"), "glaetteisen"),
    ("03", pack("Elektrorasierer", "Shavers", "Tıraş makinesi", ar="ماكينات حلاقة", fr="Rasoirs", it="Rasoio elettrico", es="Afeitadoras"), "elektrorasierer"),
    ("04", pack("Mundduschen", "Oral irrigators", "Ağız duşu", ar="خيط مائي", fr="Hydropulseurs", it="Idropulsori", es="Irrigadores"), "mundduschen"),
    ("05", pack("Epilierer", "Epilators", "Epilatör", ar="أجهزة إزالة الشعر", fr="Épilateurs", it="Epilatori", es="Depiladoras"), "epilierer"),
]
CLIMATE = [
    ("01", pack("Ventilatoren", "Fans", "Vantilatör", ar="مراوح", fr="Ventilateurs", it="Ventilatori", es="Ventiladores"), "ventilatoren"),
    ("02", pack("Heizlüfter", "Fan heaters", "Isıtıcı", ar="دفايات", fr="Radiateurs soufflants", it="Termoventilatori", es="Calefactores"), "heizluefter"),
    ("03", pack("Luftbefeuchter", "Humidifiers", "Nemlendirici", ar="مرطبات", fr="Humidificateurs", it="Umidificatori", es="Humidificadores"), "luftbefeuchter"),
    ("04", pack("Luftreiniger", "Air purifiers", "Hava temizleyici", ar="منقيات هواء", fr="Purificateurs", it="Purificatori", es="Purificadores"), "luftreiniger"),
    ("05", pack("Klimageräte", "Air conditioners", "Klima", ar="مكيفات", fr="Climatiseurs", it="Climatizzatori", es="Aires acondicionados"), "klimageraete"),
]
SMALL = [
    ("01", pack("Eierkocher", "Egg cookers", "Yumurta pişirici", ar="طباخ بيض", fr="Cuiseurs à œufs", it="Cuociuova", es="Cocedores de huevos"), "eierkocher"),
    ("02", pack("Sandwichmaker", "Sandwich makers", "Tost makinesi", ar="صانعات ساندويتش", fr="Croque-monsieur", it="Tostiere", es="Sandwicheras"), "sandwichmaker"),
    ("03", pack("Küchenwaagen", "Kitchen scales", "Mutfak tartısı", ar="موازين مطبخ", fr="Balances cuisine", it="Bilance cucina", es="Básculas de cocina"), "kuechenwaagen"),
    ("04", pack("Dosenöffner", "Can openers", "Konserve açacağı", ar="فتاحات علب", fr="Ouvre-boîtes", it="Apriscatole", es="Abrelatas"), "dosenoeffner"),
    ("05", pack("Popcornmaker", "Popcorn makers", "Patlamış mısır", ar="صانعات فشار", fr="Machines pop-corn", it="Macchine popcorn", es="Máquinas de palomitas"), "popcornmaker"),
]
IRON = [
    ("01", pack("Bügeleisen", "Irons", "Ütü", ar="مكواة", fr="Fers à repasser", it="Ferri da stiro", es="Planchas"), "buegeleisen"),
    ("02", pack("Bügelstationen", "Steam generators", "Ütü istasyonu", ar="محطات كي", fr="Centrales vapeur", it="Caldaie", es="Centros de planchado"), "buegelstationen"),
    ("03", pack("Bügelbretter", "Ironing boards", "Ütü masası", ar="طاولات كي", fr="Planches à repasser", it="Assi da stiro", es="Tablas de planchar"), "buegelbretter"),
    ("04", pack("Dampfbürsten", "Steam brushes", "Buhar fırçası", ar="فرش بخار", fr="Brosses vapeur", it="Spazzole vapore", es="Cepillos de vapor"), "dampfbruesten"),
]
PARTS = [
    ("01", pack("Staubsaugerbeutel", "Vacuum bags", "Süpürge torbası", ar="أكياس مكنسة", fr="Sacs aspirateur", it="Sacchetti", es="Bolsas aspiradora"), "staubsaugerbeutel"),
    ("02", pack("Wasserfilter", "Water filters", "Su filtresi", ar="فلاتر ماء", fr="Filtres à eau", it="Filtri acqua", es="Filtros de agua"), "wasserfilter"),
    ("03", pack("Ersatzklingen", "Spare blades", "Yedek bıçak", ar="شفرات بديلة", fr="Lames de rechange", it="Lame ricambio", es="Cuchillas recambio"), "ersatzklingen"),
    ("04", pack("Dichtungen", "Seals", "Conta", ar="حشوات", fr="Joints", it="Guarnizioni", es="Juntas"), "dichtungen"),
]
EXISTING = {
    "cat-13-01": (pack("Küchengeräte", "Kitchen appliances", "Mutfak aleti", ar="أجهزة مطبخ", fr="Électroménager cuisine", it="Elettrodomestici cucina", es="Electrodomésticos cocina"), KITCHEN),
    "cat-13-02": (pack("Kaffee & Getränke", "Coffee & drinks", "Kahve ve içecek", ar="قهوة ومشروبات", fr="Café et boissons", it="Caffè e bevande", es="Café y bebidas"), DRINK),
    "cat-13-03": (pack("Reinigungsgeräte", "Cleaning appliances", "Temizlik aleti", ar="أجهزة تنظيف", fr="Appareils ménage", it="Pulizia", es="Limpieza"), CLEAN),
    "cat-13-04": (pack("Körperpflege-Geräte", "Personal-care devices", "Kişisel bakım aleti", ar="أجهزة عناية", fr="Soin personnel", it="Cura persona", es="Cuidado personal"), CARE),
    "cat-13-05": (pack("Heizen & Kühlen", "Heating & cooling", "Isıtma ve soğutma", ar="تدفئة وتبريد", fr="Chauffage et froid", it="Riscaldamento e raffreddamento", es="Calor y frío"), CLIMATE),
    "cat-13-06": (pack("Kleingeräte", "Small appliances", "Küçük ev aleti", ar="أجهزة صغيرة", fr="Petits appareils", it="Piccoli elettrodomestici", es="Pequeño electrodoméstico"), SMALL),
}
NEW_L2 = [
    ("07", "buegeln", pack("Bügeln", "Ironing", "Ütü", ar="كي", fr="Repassage", it="Stiro", es="Planchado"), IRON),
    ("08", "ersatzteile-und-filter", pack("Ersatzteile & Filter", "Parts & filters", "Yedek parça ve filtre", ar="قطع وفلاتر", fr="Pièces et filtres", it="Ricambi e filtri", es="Recambios y filtros"), PARTS),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-13")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-13-{suffix}"
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
