#!/usr/bin/env python3
"""Complete Sport & Outdoor (cat-14) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Sport placeholder L3 replaced with a real product group"})


FIT = [
    ("01", pack("Hanteln", "Dumbbells", "Dambıl", ar="أثقال", fr="Haltères", it="Manubri", es="Mancuernas"), "hanteln"),
    ("02", pack("Kettlebells", "Kettlebells", "Kettlebell", ar="كيتل بل", fr="Kettlebells", it="Kettlebell", es="Kettlebells"), "kettlebells"),
    ("03", pack("Widerstandsbänder", "Resistance bands", "Direnç bandı", ar="أشرطة", fr="Élastiques", it="Elastici", es="Bandas"), "widerstandsbaender"),
    ("04", pack("Yogamatten", "Yoga mats", "Yoga matı", ar="حصائر يوغا", fr="Tapis yoga", it="Tappetini yoga", es="Esterillas"), "yogamatten"),
    ("05", pack("Kraftgeräte", "Strength machines", "Fitness aleti", ar="أجهزة قوة", fr="Appareils muscu", it="Attrezzi forza", es="Máquinas fuerza"), "kraftgeraete"),
]
RUN = [
    ("01", pack("Laufschuhe", "Running shoes", "Koşu ayakkabısı", ar="أحذية جري", fr="Chaussures running", it="Scarpe running", es="Zapatillas running"), "laufschuhe"),
    ("02", pack("Laufshirts", "Running shirts", "Koşu tişörtü", ar="قمصان", fr="Maillots", it="Maglie", es="Camisetas"), "laufshirts"),
    ("03", pack("Laufshorts", "Running shorts", "Koşu şortu", ar="شورت", fr="Shorts", it="Shorts", es="Pantalones cortos"), "laufshorts"),
    ("04", pack("Lauftights", "Running tights", "Koşu taytı", ar="تايتس", fr="Collants", it="Leggings", es="Mallas"), "lauftights"),
    ("05", pack("Laufsocken", "Running socks", "Koşu çorabı", ar="جوارب", fr="Chaussettes", it="Calze", es="Calcetines"), "laufsocken"),
    ("06", pack("Trinkgürtel", "Hydration belts", "Hidration kemeri", ar="أحزمة", fr="Ceintures", it="Cinture", es="Cinturones"), "trinkguertel"),
]
BIKE = [
    ("01", pack("Citybikes", "City bikes", "Şehir bisikleti", ar="دراجات مدينة", fr="Vélos ville", it="City bike", es="Bicis urbanas"), "citybikes"),
    ("02", pack("Mountainbikes", "Mountain bikes", "Dağ bisikleti", ar="دراجات جبلية", fr="VTT", it="MTB", es="MTB"), "mountainbikes"),
    ("03", pack("Rennräder", "Road bikes", "Yol bisikleti", ar="دراجات طريق", fr="Vélos route", it="Bici da corsa", es="Carretera"), "rennraeder"),
    ("04", pack("E-Bikes", "E-bikes", "E-bisiklet", ar="دراجات كهربائية", fr="Vélos électriques", it="E-bike", es="E-bikes"), "e-bikes"),
    ("05", pack("Fahrrad-Zubehör", "Bike accessories", "Bisiklet aksesuarı", ar="إكسسوارات", fr="Accessoires vélo", it="Accessori bici", es="Accesorios bici"), "fahrrad-zubehoer"),
]
KIT = [
    ("01", pack("Trikots", "Jerseys", "Forma", ar="قمصان", fr="Maillots", it="Maglie", es="Maillots"), "trikots"),
    ("02", pack("Radhosen", "Cycling shorts", "Bisiklet şortu", ar="شورت", fr="Cuissards", it="Salopette", es="Culottes"), "radhosen"),
    ("03", pack("Radschuhe", "Cycling shoes", "Bisiklet ayakkabısı", ar="أحذية", fr="Chaussures vélo", it="Scarpe bici", es="Zapatillas ciclismo"), "radschuhe"),
    ("04", pack("Helme", "Helmets", "Kask", ar="خوذات", fr="Casques", it="Caschi", es="Cascos"), "helme"),
    ("05", pack("Handschuhe", "Gloves", "Eldiven", ar="قفازات", fr="Gants", it="Guanti", es="Guantes"), "handschuhe"),
    ("06", pack("Trinkflaschen", "Bottles", "Matara", ar="زجاجات", fr="Bidons", it="Borracce", es="Bidones"), "trinkflaschen"),
]
CAMP = [
    ("01", pack("Zelte", "Tents", "Çadır", ar="خيام", fr="Tentes", it="Tende", es="Tiendas"), "zelte"),
    ("02", pack("Schlafsäcke", "Sleeping bags", "Uyku tulumu", ar="أكياس نوم", fr="Sacs de couchage", it="Sacchi a pelo", es="Sacos"), "schlafsacke"),
    ("03", pack("Campingstühle", "Camp chairs", "Kamp sandalyesi", ar="كراسي", fr="Chaises camping", it="Sedie camping", es="Sillas camping"), "campingstuehle"),
    ("04", pack("Campingtische", "Camp tables", "Kamp masası", ar="طاولات", fr="Tables camping", it="Tavoli camping", es="Mesas camping"), "campingtische"),
    ("05", pack("Campingkocher", "Camp stoves", "Kamp ocağı", ar="مواقد", fr="Réchauds", it="Fornelli", es="Hornillos"), "campingkocher"),
    ("06", pack("Isomatten", "Sleeping pads", "Mat", ar="فرش", fr="Matelas", it="Materassini", es="Esterillas"), "isomatten"),
]
HIKE = [
    ("01", pack("Trekkingschuhe", "Hiking boots", "Trekking ayakkabısı", ar="أحذية تنزه", fr="Chaussures rando", it="Scarponi", es="Botas trekking"), "trekkingschuhe"),
    ("02", pack("Trekkinghosen", "Hiking pants", "Trekking pantolonu", ar="بناطيل", fr="Pantalons rando", it="Pantaloni", es="Pantalones"), "trekkinghosen"),
    ("03", pack("Outdoorjacken", "Outdoor jackets", "Outdoor mont", ar="سترات", fr="Vestes outdoor", it="Giacche", es="Chaquetas"), "outdoorjacken"),
    ("04", pack("Wanderrucksäcke", "Hiking packs", "Sırt çantası", ar="حقائب", fr="Sacs rando", it="Zaini", es="Mochilas"), "wanderrucksaecke"),
    ("05", pack("Wanderstöcke", "Trekking poles", "Baton", ar="عصي", fr="Bâtons", it="Bastoncini", es="Bastones"), "wanderstoecke"),
]
OUT = [
    ("01", pack("Hardshell", "Hardshell", "Hardshell", ar="هاردشل", fr="Hardshell", it="Hardshell", es="Hardshell"), "hardshell"),
    ("02", pack("Softshell", "Softshell", "Softshell", ar="سوفتشل", fr="Softshell", it="Softshell", es="Softshell"), "softshell"),
    ("03", pack("Baselayer", "Baselayer", "İç katman", ar="طبقة داخلية", fr="Sous-couche", it="Intimo tecnico", es="Primera capa"), "baselayer"),
    ("04", pack("Mützen", "Beanies", "Bere", ar="قبعات", fr="Bonnets", it="Berretti", es="Gorro"), "muetzen"),
    ("05", pack("Handschuhe", "Gloves", "Eldiven", ar="قفازات", fr="Gants", it="Guanti", es="Guantes"), "handschuhe"),
]
BAG = [
    ("01", pack("Gymbags", "Gym bags", "Spor çantası", ar="حقائب جيم", fr="Sacs sport", it="Borse palestra", es="Bolsas gym"), "gymbags"),
    ("02", pack("Duffels", "Duffels", "Silindir çanta", ar="حقائب سفر", fr="Sacs polochon", it="Duffel", es="Petates"), "duffels"),
    ("03", pack("Sportrucksäcke", "Sport backpacks", "Spor sırt çantası", ar="حقائب ظهر", fr="Sacs à dos sport", it="Zaini sport", es="Mochilas sport"), "sportrucksaecke"),
    ("04", pack("Schuhtaschen", "Shoe bags", "Ayakkabı çantası", ar="حقائب أحذية", fr="Sacs chaussures", it="Borse scarpe", es="Bolsas zapatos"), "schuhtaschen"),
    ("05", pack("Hüfttaschen", "Belt bags", "Bel çantası", ar="حقائب خصر", fr="Bananes", it="Marsupi", es="Riñoneras"), "huefttaschen"),
]
HYD = [
    ("01", pack("Trinkflaschen", "Bottles", "Matara", ar="زجاجات", fr="Gourdes", it="Borracce", es="Botellas"), "trinkflaschen"),
    ("02", pack("Trinkblasen", "Hydration bladders", "Hidration çantası", ar="مثانات", fr="Poches hydratation", it="Sacche idriche", es="Bolsas hidratación"), "trinkblasen"),
    ("03", pack("Thermosflaschen", "Thermos", "Termos", ar="ترموس", fr="Thermos", it="Thermos", es="Termos"), "thermosflaschen"),
    ("04", pack("Wasserfilter", "Water filters", "Su filtresi", ar="فلاتر ماء", fr="Filtres eau", it="Filtri acqua", es="Filtros agua"), "wasserfilter"),
]
TEAM = [
    ("01", pack("Fußball", "Football", "Futbol", ar="كرة قدم", fr="Football", it="Calcio", es="Fútbol"), "fussball"),
    ("02", pack("Basketball", "Basketball", "Basketbol", ar="كرة سلة", fr="Basket", it="Basket", es="Baloncesto"), "basketball"),
    ("03", pack("Volleyball", "Volleyball", "Voleybol", ar="كرة طائرة", fr="Volley", it="Pallavolo", es="Voleibol"), "volleyball"),
    ("04", pack("Tennis", "Tennis", "Tenis", ar="تنس", fr="Tennis", it="Tennis", es="Tenis"), "tennis"),
    ("05", pack("Badminton", "Badminton", "Badminton", ar="ريشة", fr="Badminton", it="Badminton", es="Bádminton"), "badminton"),
]
EXISTING = {
    "cat-14-01": (pack("Fitness", "Fitness", "Fitness", ar="لياقة", fr="Fitness", it="Fitness", es="Fitness"), FIT),
    "cat-14-02": (pack("Laufen", "Running", "Koşu", ar="جري", fr="Running", it="Running", es="Running"), RUN),
    "cat-14-03": (pack("Fahrrad", "Cycling", "Bisiklet", ar="دراجات", fr="Vélo", it="Ciclismo", es="Ciclismo"), BIKE),
    "cat-14-04": (pack("Radbekleidung", "Cycling kit", "Bisiklet giysisi", ar="ملابس دراجات", fr="Tenue vélo", it="Abbigliamento bici", es="Ropa ciclismo"), KIT),
    "cat-14-05": (pack("Camping", "Camping", "Kamp", ar="تخييم", fr="Camping", it="Camping", es="Camping"), CAMP),
    "cat-14-06": (pack("Wandern", "Hiking", "Yürüyüş", ar="تنزه", fr="Randonnée", it="Trekking", es="Senderismo"), HIKE),
    "cat-14-07": (pack("Outdoor-Bekleidung", "Outdoor clothing", "Outdoor giysi", ar="ملابس خارجية", fr="Vêtements outdoor", it="Abbigliamento outdoor", es="Ropa outdoor"), OUT),
    "cat-14-08": (pack("Sporttaschen", "Sports bags", "Spor çantası", ar="حقائب رياضية", fr="Sacs de sport", it="Borse sportive", es="Bolsas deporte"), BAG),
    "cat-14-09": (pack("Hydration", "Hydration", "Hidrasyon", ar="ترطيب", fr="Hydratation", it="Idratazione", es="Hidratación"), HYD),
    "cat-14-10": (pack("Mannschaftssport", "Team sports", "Takım sporları", ar="رياضات جماعية", fr="Sports collectifs", it="Sport di squadra", es="Deportes de equipo"), TEAM),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-14")
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
