#!/usr/bin/env python3
"""Complete Garten (cat-07) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Garden L3 replaced with a real German product group"})


TOOLS = [
    ("01", pack("Gartenscheren", "Garden shears", "Bahçe makası", ar="مقصات", fr="Sécateurs", it="Forbici", es="Tijeras"), "gartenscheren"),
    ("02", pack("Hacken", "Hoes", "Çapa", ar="معاول", fr="Houes", it="Zappe", es="Azadas"), "hacken"),
    ("03", pack("Spaten", "Spades", "Kürek", ar="جاروف", fr="Bêches", it="Vanghe", es="Palas"), "spaten"),
    ("04", pack("Rechen", "Rakes", "Tırmık", ar="مجارف", fr="Râteaux", it="Rastrelli", es="Rastrillos"), "rechen"),
    ("05", pack("Gartensägen", "Garden saws", "Bahçe testeresi", ar="مناشير", fr="Scies", it="Seghe", es="Sierras"), "gartensaegen"),
    ("06", pack("Handwerkzeug-Sets", "Hand tool sets", "El aleti seti", ar="أطقم يدوية", fr="Kits d'outils", it="Set attrezzi", es="Kits de herramientas"), "handwerkzeug-sets"),
]
WATER = [
    ("01", pack("Gartenschläuche", "Garden hoses", "Bahçe hortumu", ar="خراطيم", fr="Tuyaux", it="Tubi", es="Mangueras"), "gartenschlaeuche"),
    ("02", pack("Brausen", "Spray guns", "Sulama tabancası", ar="مسدسات رش", fr="Pistolets", it="Pistole", es="Pistolas"), "brausen"),
    ("03", pack("Tropfbewässerung", "Drip irrigation", "Damla sulama", ar="ري بالتنقيط", fr="Goutte-à-goutte", it="Irrigazione a goccia", es="Riego por goteo"), "tropfbewaesserung"),
    ("04", pack("Sprinkler", "Sprinklers", "Sprinkler", ar="رشاشات", fr="Arroseurs", it="Irrigatori", es="Aspersores"), "sprinkler"),
    ("05", pack("Wassertanks", "Water tanks", "Su deposu", ar="خزانات", fr="Citernes", it="Serbatoi", es="Depósitos"), "wassertanks"),
    ("06", pack("Pumpen", "Pumps", "Pompa", ar="مضخات", fr="Pompes", it="Pompe", es="Bombas"), "pumpen"),
]
IBC = [
    ("01", pack("IBC 1000L", "IBC 1000L", "IBC 1000L", ar="IBC 1000ل", fr="IBC 1000L", it="IBC 1000L", es="IBC 1000L"), "ibc-1000l"),
    ("02", pack("IBC-Hähne", "IBC taps", "IBC musluk", ar="حنفيات", fr="Robinets IBC", it="Rubinetti IBC", es="Grifos IBC"), "ibc-haehne"),
    ("03", pack("IBC-Ventile", "IBC valves", "IBC vana", ar="صمامات", fr="Vannes IBC", it="Valvole IBC", es="Válvulas IBC"), "ibc-ventile"),
    ("04", pack("IBC-Adapter", "IBC adapters", "IBC adaptör", ar="محولات", fr="Adaptateurs IBC", it="Adattatori IBC", es="Adaptadores IBC"), "ibc-adapter"),
    ("05", pack("IBC-Filter", "IBC filters", "IBC filtre", ar="فلاتر", fr="Filtres IBC", it="Filtri IBC", es="Filtros IBC"), "ibc-filter"),
    ("06", pack("IBC-Deckel", "IBC lids", "IBC kapak", ar="أغطية", fr="Couvercles IBC", it="Coperchi IBC", es="Tapas IBC"), "ibc-deckel"),
    ("07", pack("IBC-Käfige", "IBC cages", "IBC kafes", ar="أقفاص", fr="Cages IBC", it="Gabbie IBC", es="Jaulas IBC"), "ibc-kaefige"),
    ("08", pack("IBC-Paletten", "IBC pallets", "IBC palet", ar="منصات", fr="Palettes IBC", it="Pallet IBC", es="Palés IBC"), "ibc-paletten"),
]
RAIN = [
    ("01", pack("Regenfässer", "Rain barrels", "Yağmur varili", ar="براميل مطر", fr="Récupérateurs", it="Fusti pioggia", es="Barriles"), "regenfaesser"),
    ("02", pack("Regenwassertanks", "Rainwater tanks", "Yağmur suyu tankı", ar="خزانات مطر", fr="Citernes pluie", it="Serbatoi pioggia", es="Depósitos de lluvia"), "regenwassertanks"),
    ("03", pack("Dachrinnen-Sets", "Gutter sets", "Oluk seti", ar="مزاريب", fr="Gouttières", it="Grondaie", es="Canalones"), "dachrinnen-sets"),
    ("04", pack("Regenfilter", "Rain filters", "Yağmur filtresi", ar="فلاتر مطر", fr="Filtres pluie", it="Filtri pioggia", es="Filtros de lluvia"), "regenfilter"),
    ("05", pack("Sammelkits", "Collection kits", "Toplama kiti", ar="أطقم تجميع", fr="Kits de collecte", it="Kit raccolta", es="Kits de recogida"), "sammelkits"),
]
GREEN = [
    ("01", pack("Foliengewächshäuser", "Polytunnels", "Folyo sera", ar="بيوت بلاستيك", fr="Serres tunnel", it="Tunnel", es="Invernaderos de plástico"), "foliengewaechshaeuser"),
    ("02", pack("Glasgewächshäuser", "Glass greenhouses", "Cam sera", ar="بيوت زجاج", fr="Serres verre", it="Serre vetro", es="Invernaderos de cristal"), "glasgewaechshaeuser"),
    ("03", pack("Anzuchthäuser", "Propagators", "Fide evi", ar="مشاتل", fr="Mini-serres", it="Mini serre", es="Mini invernaderos"), "anzuchthaeuser"),
    ("04", pack("Gewächshaus-Zubehör", "Greenhouse accessories", "Sera aksesuarı", ar="ملحقات", fr="Accessoires serre", it="Accessori serra", es="Accesorios invernadero"), "gewaechshaus-zubehoer"),
]
SEED = [
    ("01", pack("Gemüsesamen", "Vegetable seeds", "Sebze tohumu", ar="بذور خضار", fr="Graines légumes", it="Semi ortaggi", es="Semillas hortalizas"), "gemuesesamen"),
    ("02", pack("Blumensamen", "Flower seeds", "Çiçek tohumu", ar="بذور زهور", fr="Graines fleurs", it="Semi fiori", es="Semillas flores"), "blumensamen"),
    ("03", pack("Kräutersamen", "Herb seeds", "Baharat tohumu", ar="بذور أعشاب", fr="Graines herbes", it="Semi erbe", es="Semillas hierbas"), "kraeutersamen"),
    ("04", pack("Anzuchtsets", "Growing kits", "Yetiştirme seti", ar="أطقم زراعة", fr="Kits de culture", it="Kit coltivazione", es="Kits de cultivo"), "anzuchtsets"),
]
POTS = [
    ("01", pack("Blumentöpfe", "Flower pots", "Saksı", ar="أصص", fr="Pots", it="Vasi", es="Macetas"), "blumentoepfe"),
    ("02", pack("Pflanzkästen", "Planters", "Saksı kutu", ar="صناديق زرع", fr="Jardinières", it="Fioriere", es="Jardineras"), "pflanzkaesten"),
    ("03", pack("Übertöpfe", "Cachepots", "Dış saksı", ar="أغطية أصص", fr="Cache-pots", it="Coprivaso", es="Cubremacetas"), "uebertoepfe"),
    ("04", pack("Pflanzerde", "Potting soil", "Saksı toprağı", ar="تربة", fr="Terreau", it="Terriccio", es="Tierra"), "pflanzerde"),
]
FURN = [
    ("01", pack("Gartenstühle", "Garden chairs", "Bahçe sandalyesi", ar="كراسي", fr="Chaises", it="Sedie", es="Sillas"), "gartenstuehle"),
    ("02", pack("Gartentische", "Garden tables", "Bahçe masası", ar="طاولات", fr="Tables", it="Tavoli", es="Mesas"), "gartentische"),
    ("03", pack("Lounges", "Lounge sets", "Lounge", ar="جلسات", fr="Salons", it="Salotti", es="Lounges"), "lounges"),
    ("04", pack("Sonnenschirme", "Parasols", "Şemsiye", ar="مظلات", fr="Parasols", it="Ombrelloni", es="Sombrillas"), "sonnenschirme"),
]
GRILL = [
    ("01", pack("Gasgrills", "Gas grills", "Gazlı ızgara", ar="شوايات غاز", fr="Barbecues gaz", it="Grill a gas", es="Parrillas gas"), "gasgrills"),
    ("02", pack("Holzkohlegrills", "Charcoal grills", "Kömür ızgara", ar="شوايات فحم", fr="Barbecues charbon", it="Grill carbone", es="Parrillas carbón"), "holzkohlegrills"),
    ("03", pack("Grillzubehör", "Grill accessories", "Izgara aksesuarı", ar="ملحقات شواء", fr="Accessoires barbecue", it="Accessori grill", es="Accesorios parrilla"), "grillzubehoer"),
    ("04", pack("Smoker", "Smokers", "Füme", ar="مداخن", fr="Fumoirs", it="Affumicatori", es="Ahumadores"), "smoker"),
]
CARE = [
    ("01", pack("Dünger", "Fertilizer", "Gübre", ar="سماد", fr="Engrais", it="Fertilizzanti", es="Abono"), "duenger"),
    ("02", pack("Pflanzenschutz", "Plant protection", "Bitki koruma", ar="حماية النبات", fr="Protection plantes", it="Fitofarmaci", es="Fitoprotección"), "pflanzenschutz"),
    ("03", pack("Erde & Substrat", "Soil & substrate", "Toprak ve substrat", ar="تربة", fr="Terre et substrat", it="Terra e substrato", es="Tierra y sustrato"), "erde-und-substrat"),
    ("04", pack("Gießkannen", "Watering cans", "Sulama kabı", ar="أباريق", fr="Arrosoirs", it="Innaffiatoi", es="Regaderas"), "giesskannen"),
]
EXISTING = {
    "cat-07-01": (pack("Gartenwerkzeuge", "Garden tools", "Bahçe aletleri", ar="أدوات حديقة", fr="Outils de jardin", it="Attrezzi da giardino", es="Herramientas de jardín"), TOOLS),
    "cat-07-02": (pack("Bewässerung", "Irrigation", "Sulama", ar="ري", fr="Irrigation", it="Irrigazione", es="Riego"), WATER),
    "cat-07-03": (pack("IBC-Tanks & Zubehör", "IBC tanks & accessories", "IBC tank ve aksesuar", ar="خزانات IBC", fr="Cuves IBC", it="Cisterne IBC", es="Depósitos IBC"), IBC),
    "cat-07-04": (pack("Regenwassernutzung", "Rainwater harvesting", "Yağmur suyu", ar="مياه الأمطار", fr="Eau de pluie", it="Acqua piovana", es="Agua de lluvia"), RAIN),
    "cat-07-05": (pack("Gewächshäuser", "Greenhouses", "Sera", ar="بيوت بلاستيكية", fr="Serres", it="Serre", es="Invernaderos"), GREEN),
    "cat-07-06": (pack("Samen & Anbau", "Seeds & growing", "Tohum ve yetiştirme", ar="بذور وزراعة", fr="Graines et culture", it="Semi e coltivazione", es="Semillas y cultivo"), SEED),
    "cat-07-07": (pack("Töpfe & Pflanzen", "Pots & planting", "Saksı ve dikim", ar="أصص وزراعة", fr="Pots et plantation", it="Vasi e piantumazione", es="Macetas y plantación"), POTS),
    "cat-07-08": (pack("Gartenmöbel", "Garden furniture", "Bahçe mobilyası", ar="أثاث حديقة", fr="Mobilier de jardin", it="Mobili da giardino", es="Muebles de jardín"), FURN),
    "cat-07-09": (pack("Grill & Outdoor-Küche", "Grill & outdoor kitchen", "Izgara ve dış mutfak", ar="شواء", fr="Barbecue", it="Grill", es="Parrilla"), GRILL),
    "cat-07-10": (pack("Pflanzenpflege", "Plant care", "Bitki bakımı", ar="عناية النبات", fr="Soin des plantes", it="Cura delle piante", es="Cuidado de plantas"), CARE),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-07")
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
