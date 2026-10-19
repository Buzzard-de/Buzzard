#!/usr/bin/env python3
"""Complete Schuhe (cat-15) L2/L3 hubs and replace placeholder leaves."""
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


def node(cid: str, order: int, labels: dict[str, str], slug: str, url: str, level: int, children: list, **extra) -> dict:
    NEW_LABELS[cid] = labels
    out = {
        "id": cid,
        "menu_order": order,
        "name": labels["de"],
        "slug": slug,
        "url": url,
        "level": level,
        "children": children,
    }
    out.update(extra)
    return out


def l3(parent_id: str, parent_url: str, suffix: str, labels: dict[str, str], slug: str, **extra) -> dict:
    cid = f"{parent_id}-{suffix}"
    return node(cid, int(suffix), labels, slug, f"{parent_url}/{slug}", 3, [], **extra)


def remember_redirect(old_url: str, new_url: str) -> None:
    old = old_url if old_url.endswith("/") else old_url + "/"
    new = new_url if new_url.endswith("/") else new_url + "/"
    if old == new:
        return
    REDIRECTS.append(
        {
            "from": old,
            "to": new,
            "permanent": True,
            "note": "Shoe placeholder L3 replaced with a real product group",
        }
    )


WOMEN = [
    ("01", pack("Sneaker", "Sneakers", "Sneaker", ar="سنيكرز", fr="Baskets", it="Sneakers", es="Zapatillas"), "sneaker"),
    ("02", pack("Pumps", "Pumps", "Topuklu", ar="كعب عالي", fr="Escarpins", it="Décolleté", es="Salones"), "pumps"),
    ("03", pack("Ballerinas", "Ballerinas", "Babet", ar="باليرينا", fr="Ballerines", it="Ballerine", es="Manoletinas"), "ballerinas"),
    ("04", pack("Stiefeletten", "Ankle boots", "Botine", ar="بوت كاحل", fr="Bottines", it="Stivaletti", es="Botines"), "stiefeletten"),
    ("05", pack("Stiefel", "Boots", "Çizme", ar="جزمة", fr="Bottes", it="Stivali", es="Botas"), "stiefel"),
    ("06", pack("Loafer", "Loafers", "Loafer", ar="لوفر", fr="Mocassins", it="Mocassini", es="Mocasines"), "loafer"),
    ("07", pack("Sandalen", "Sandals", "Sandalet", ar="صنادل", fr="Sandales", it="Sandali", es="Sandalias"), "sandalen"),
]

MEN = [
    ("01", pack("Sneaker", "Sneakers", "Sneaker", ar="سنيكرز", fr="Baskets", it="Sneakers", es="Zapatillas"), "sneaker"),
    ("02", pack("Halbschuhe", "Casual shoes", "Günlük ayakkabı", ar="أحذية يومية", fr="Chaussures casual", it="Scarpe casual", es="Zapatos casual"), "halbschuhe"),
    ("03", pack("Businessschuhe", "Dress shoes", "Klasik ayakkabı", ar="أحذية رسمية", fr="Chaussures de ville", it="Scarpe classiche", es="Zapatos de vestir"), "businessschuhe"),
    ("04", pack("Boots", "Boots", "Bot", ar="بوت", fr="Bottines homme", it="Stivaletti uomo", es="Botines hombre"), "boots"),
    ("05", pack("Loafer", "Loafers", "Loafer", ar="لوفر", fr="Mocassins", it="Mocassini", es="Mocasines"), "loafer"),
    ("06", pack("Slipper", "Slip-ons", "Slip-on", ar="سليب أون", fr="Slip-on", it="Slip-on", es="Slip-on"), "slipper"),
]

KIDS = [
    ("01", pack("Sneaker", "Sneakers", "Sneaker", ar="سنيكرز أطفال", fr="Baskets enfant", it="Sneakers bambino", es="Zapatillas infantiles"), "sneaker"),
    ("02", pack("Sandalen", "Sandals", "Sandalet", ar="صنادل أطفال", fr="Sandales enfant", it="Sandali bambino", es="Sandalias infantiles"), "sandalen"),
    ("03", pack("Stiefel", "Boots", "Çizme", ar="جزمة أطفال", fr="Bottes enfant", it="Stivali bambino", es="Botas infantiles"), "stiefel"),
    ("04", pack("Hausschuhe", "Slippers", "Ev terliği", ar="شباشب أطفال", fr="Chaussons", it="Pantofole", es="Zapatillas de casa"), "hausschuhe"),
    ("05", pack("Schulsneaker", "School shoes", "Okul ayakkabısı", ar="أحذية مدرسية", fr="Chaussures d'école", it="Scarpe scuola", es="Zapatos escolares"), "schulsneaker"),
]

SPORT = [
    ("01", pack("Fitnessschuhe", "Training shoes", "Fitness ayakkabısı", ar="أحذية لياقة", fr="Chaussures fitness", it="Scarpe fitness", es="Zapatillas fitness"), "fitnessschuhe"),
    ("02", pack("Laufschuhe", "Running shoes", "Koşu ayakkabısı", ar="أحذية جري", fr="Chaussures running", it="Scarpe running", es="Zapatillas running"), "laufschuhe"),
    ("03", pack("Fußballschuhe", "Football boots", "Futbol kramponu", ar="أحذية كرة قدم", fr="Crampons", it="Scarpe da calcio", es="Botas de fútbol"), "fussballschuhe"),
    ("04", pack("Basketballschuhe", "Basketball shoes", "Basketbol ayakkabısı", ar="أحذية كرة سلة", fr="Chaussures basket", it="Scarpe basket", es="Zapatillas de baloncesto"), "basketballschuhe"),
    ("05", pack("Tennisschuhe", "Tennis shoes", "Tenis ayakkabısı", ar="أحذية تنس", fr="Chaussures tennis", it="Scarpe tennis", es="Zapatillas de tenis"), "tennisschuhe"),
    ("06", pack("Hallenschuhe", "Indoor court shoes", "Salon ayakkabısı", ar="أحذية صالة", fr="Chaussures indoor", it="Scarpe indoor", es="Zapatillas de indoor"), "hallenschuhe"),
]

RUN = [
    ("01", pack("Alltagslaufschuhe", "Everyday running", "Günlük koşu", ar="جري يومي", fr="Running quotidien", it="Running quotidiano", es="Running diario"), "alltagslaufschuhe"),
    ("02", pack("Straßenlauf", "Road running", "Yol koşusu", ar="جري طرق", fr="Running route", it="Running su strada", es="Running de asfalto"), "strassenlauf"),
    ("03", pack("Trailrunning", "Trail running", "Trail", ar="جري جبلي", fr="Trail", it="Trail", es="Trail"), "trailrunning"),
    ("04", pack("Wettkampfschuhe", "Racing flats", "Yarış ayakkabısı", ar="أحذية سباق", fr="Chaussures de compétition", it="Scarpe da gara", es="Zapatillas de competición"), "wettkampfschuhe"),
    ("05", pack("Stabilitätsschuhe", "Stability shoes", "Stabilite ayakkabısı", ar="أحذية ثبات", fr="Chaussures stabilité", it="Scarpe stabilità", es="Zapatillas de estabilidad"), "stabilitaetsschuhe"),
]

WORK = [
    ("01", pack("Sicherheitsschuhe", "Safety shoes", "İş güvenlik ayakkabısı", ar="أحذية أمان", fr="Chaussures de sécurité", it="Scarpe antinfortunistiche", es="Zapatos de seguridad"), "sicherheitsschuhe"),
    ("02", pack("Berufsschuhe", "Occupational shoes", "Meslek ayakkabısı", ar="أحذية مهنية", fr="Chaussures professionnelles", it="Scarpe da lavoro", es="Zapatos de trabajo"), "berufsschuhe"),
    ("03", pack("Arbeits-Gummistiefel", "Work wellingtons", "İş çizmesi", ar="جزمة عمل", fr="Bottes de travail", it="Stivali da lavoro", es="Botas de trabajo"), "arbeits-gummistiefel"),
    ("04", pack("Clogs", "Clogs", "Sabot", ar="قبقاب", fr="Sabots", it="Zoccoli", es="Zuecos"), "clogs"),
]

OUTDOOR = [
    ("01", pack("Wanderschuhe", "Hiking shoes", "Yürüyüş ayakkabısı", ar="أحذية مشي", fr="Chaussures de randonnée", it="Scarpe trekking", es="Zapatos de senderismo"), "wanderschuhe"),
    ("02", pack("Trekkingschuhe", "Trekking boots", "Trekking botu", ar="أحذية تسلق", fr="Chaussures de trekking", it="Scarponcini", es="Botas de trekking"), "trekkingschuhe"),
    ("03", pack("Winterstiefel", "Winter boots", "Kış botu", ar="جزمة شتاء", fr="Bottes d'hiver", it="Stivali invernali", es="Botas de invierno"), "winterstiefel"),
    ("04", pack("Gummistiefel", "Wellingtons", "Yağmur çizmesi", ar="جزمة مطر", fr="Bottes de pluie", it="Stivali di gomma", es="Botas de agua"), "gummistiefel"),
]

SLIPPER = [
    ("01", pack("Hausschuhe", "Slippers", "Ev terliği", ar="شباشب", fr="Chaussons", it="Pantofole", es="Zapatillas de casa"), "hausschuhe"),
    ("02", pack("Sandalen", "Sandals", "Sandalet", ar="صنادل", fr="Sandales", it="Sandali", es="Sandalias"), "sandalen"),
    ("03", pack("Pantoletten", "Mules", "Terlik sandal", ar="ميول", fr="Mules", it="Ciabatte", es="Mules"), "pantoletten"),
    ("04", pack("Badeschuhe", "Pool slides", "Havuz terliği", ar="شبشب مسبح", fr="Claquettes", it="Ciabatte mare", es="Chanclas"), "badeschuhe"),
]

BOOTS = [
    ("01", pack("Damenstiefel", "Women's boots", "Kadın çizme", ar="جزمة نسائية", fr="Bottes femme", it="Stivali donna", es="Botas de mujer"), "damenstiefel"),
    ("02", pack("Herrenstiefel", "Men's boots", "Erkek bot", ar="جزمة رجالية", fr="Bottes homme", it="Stivali uomo", es="Botas de hombre"), "herrenstiefel"),
    ("03", pack("Winterstiefel", "Winter boots", "Kış botu", ar="جزمة شتاء", fr="Bottes d'hiver", it="Stivali invernali", es="Botas de invierno"), "winterstiefel"),
    ("04", pack("Reitstiefel", "Riding boots", "Binici çizmesi", ar="جزمة فروسية", fr="Bottes d'équitation", it="Stivali da equitazione", es="Botas de montar"), "reitstiefel"),
]

CARE = [
    ("01", pack("Schuhpflege", "Shoe care", "Ayakkabı bakımı", ar="العناية بالأحذية", fr="Entretien", it="Cura scarpe", es="Cuidado del calzado"), "schuhpflege"),
    ("02", pack("Schnürsenkel", "Laces", "Bağcık", ar="أربطة", fr="Lacets", it="Lacci", es="Cordones"), "schnuersenkel"),
    ("03", pack("Einlegesohlen", "Insoles", "Tabanlık", ar="نعل داخلي", fr="Semelles", it="Plantari", es="Plantillas"), "einlegesohlen"),
    ("04", pack("Schuhlöffel & Spanner", "Shoehorns & trees", "Çekecek ve kalıp", ar="ملعقة حذاء", fr="Chausse-pieds", it="Calzascarpe", es="Calzadores"), "schuhloeffel-und-spanner"),
]

EXISTING = {
    "cat-15-01": (pack("Damenschuhe", "Women's shoes", "Kadın ayakkabı", ar="أحذية نسائية", fr="Chaussures femme", it="Scarpe donna", es="Zapatos de mujer", pl="Buty damskie", nl="Damesschoenen"), WOMEN),
    "cat-15-02": (pack("Herrenschuhe", "Men's shoes", "Erkek ayakkabı", ar="أحذية رجالية", fr="Chaussures homme", it="Scarpe uomo", es="Zapatos de hombre", pl="Buty męskie"), MEN),
    "cat-15-03": (pack("Kinderschuhe", "Kids' shoes", "Çocuk ayakkabı", ar="أحذية أطفال", fr="Chaussures enfant", it="Scarpe bambino", es="Zapatos infantiles"), KIDS),
    "cat-15-04": (pack("Sportschuhe", "Sports shoes", "Spor ayakkabı", ar="أحذية رياضية", fr="Chaussures de sport", it="Scarpe sportive", es="Zapatillas deportivas"), SPORT),
    "cat-15-05": (pack("Laufschuhe", "Running shoes", "Koşu ayakkabısı", ar="أحذية الجري", fr="Chaussures de running", it="Scarpe da running", es="Zapatillas de running"), RUN),
    "cat-15-06": (pack("Arbeitsschuhe", "Work shoes", "İş ayakkabısı", ar="أحذية عمل", fr="Chaussures de travail", it="Scarpe da lavoro", es="Zapatos de trabajo"), WORK),
    "cat-15-07": (pack("Outdoorschuhe", "Outdoor shoes", "Outdoor ayakkabı", ar="أحذية خارجية", fr="Chaussures outdoor", it="Scarpe outdoor", es="Zapatos outdoor"), OUTDOOR),
    "cat-15-08": (pack("Hausschuhe & Sandalen", "Slippers & sandals", "Terlik ve sandalet", ar="شباشب وصنادل", fr="Chaussons et sandales", it="Pantofole e sandali", es="Zapatillas y sandalias"), SLIPPER),
}

NEW_L2 = [
    ("09", "stiefel", pack("Stiefel", "Boots", "Çizme ve bot", ar="جزمة", fr="Bottes", it="Stivali", es="Botas", pl="Kozaki"), BOOTS),
    ("10", "schuhpflege-und-zubehoer", pack("Schuhpflege & Zubehör", "Shoe care & accessories", "Bakım ve aksesuar", ar="العناية والإكسسوارات", fr="Entretien et accessoires", it="Cura e accessori", es="Cuidado y accesorios"), CARE),
]


def replace_l3_group(parent: dict, specs: list[tuple[str, dict, str]]) -> None:
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


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    tree = json.loads(TREE_PATH.read_text(encoding="utf-8"))
    redirects = json.loads(REDIRECTS_PATH.read_text(encoding="utf-8"))
    shoes = next(c for c in catalog["categories"] if c["id"] == "cat-15")
    by_id = {c["id"]: c for c in shoes["children"]}

    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)

    existing = {c["id"] for c in shoes["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-15-{suffix}"
        if cid in existing:
            continue
        url = f"{shoes['url']}/{slug}"
        hub = node(cid, int(suffix), labels, slug, url, 2, [])
        for item in children:
            hub["children"].append(l3(cid, url, item[0], item[1], item[2]))
        shoes["children"].append(hub)

    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tree.update(NEW_LABELS)
    TREE_PATH.write_text(json.dumps(tree, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    seen = {(item.get("from"), item.get("to")) for item in redirects}
    for item in REDIRECTS:
        key = (item["from"], item["to"])
        if key not in seen:
            redirects.append(item)
            seen.add(key)
    REDIRECTS_PATH.write_text(json.dumps(redirects, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    l2 = shoes["children"]
    print("L2", len(l2), "L3", sum(len(c.get("children") or []) for c in l2), "labels", len(NEW_LABELS), "redirects", len(REDIRECTS))


if __name__ == "__main__":
    main()
