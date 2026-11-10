#!/usr/bin/env python3
"""Complete Heimtextilien (cat-42) L2/L3 hubs and replace placeholder leaves."""
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
            "note": "Home-textile placeholder L3 replaced with a real product group",
        }
    )


BED = [
    ("01", pack("Bettwäsche-Sets", "Bed linen sets", "Nevresim takımı", ar="أطقم مفروشات", fr="Parures de lit", it="Completi letto", es="Juegos de cama", pl="Komplety pościeli"), "bettwaesche-sets"),
    ("02", pack("Spannbettlaken", "Fitted sheets", "Lastikli çarşaf", ar="ملاءات مطاطية", fr="Draps housse", it="Lenzuola con angoli", es="Sábanas bajeras"), "spannbettlaken"),
    ("03", pack("Kissenbezüge", "Pillowcases", "Yastık kılıfı", ar="أكياس الوسائد", fr="Taies d'oreiller", it="Federe", es="Fundas de almohada"), "kissenbezuege"),
    ("04", pack("Bettbezüge", "Duvet covers", "Yorgan kılıfı", ar="أغطية اللحاف", fr="Housses de couette", it="Copripiumini", es="Fundas nórdicas"), "bettbezuege"),
    ("05", pack("Baby- & Kinderbettwäsche", "Kids' bed linen", "Bebek ve çocuk nevresimi", ar="مفروشات أطفال", fr="Linge de lit enfant", it="Biancheria bambini", es="Ropa de cama infantil"), "baby-und-kinderbettwaesche"),
    ("06", pack("Jersey-Bettwäsche", "Jersey bed linen", "Jersey nevresim", ar="مفروشات جيرسي", fr="Linge jersey", it="Biancheria jersey", es="Ropa de cama jersey"), "jersey-bettwaesche"),
]

BATH = [
    ("01", pack("Badetücher", "Bath towels", "Banyo havlusu", ar="مناشف استحمام", fr="Serviettes de bain", it="Asciugamani da bagno", es="Toallas de baño"), "badetuecher"),
    ("02", pack("Handtücher", "Hand towels", "El havlusu", ar="مناشف يد", fr="Serviettes à main", it="Asciugamani", es="Toallas de mano"), "handtuecher"),
    ("03", pack("Waschlappen", "Washcloths", "Yüz havlusu", ar="مناشف وجه", fr="Gants de toilette", it="Salviette", es="Toallitas"), "waschlappen"),
    ("04", pack("Badematten", "Bath mats", "Banyo paspası", ar="سجادة حمام", fr="Tapis de bain", it="Tappetini bagno", es="Alfombrillas"), "badematten"),
    ("05", pack("Saunatücher", "Sauna towels", "Sauna havlusu", ar="مناشف ساونا", fr="Serviettes sauna", it="Teli sauna", es="Toallas de sauna"), "saunatuecher"),
    ("06", pack("Gästehandtücher", "Guest towels", "Misafir havlusu", ar="مناشف ضيوف", fr="Serviettes invités", it="Asciugamani ospiti", es="Toallas de invitado"), "gaestehandtuecher"),
]

CURTAIN = [
    ("01", pack("Vorhänge", "Curtains", "Perde", ar="ستائر", fr="Rideaux", it="Tende", es="Cortinas", pl="Zasłony"), "vorhaenge"),
    ("02", pack("Stores", "Sheer curtains", "Tül perde", ar="ستائر شفافة", fr="Voilages", it="Tende a vetro", es="Visillos"), "stores"),
    ("03", pack("Raffrollos", "Roman blinds", "Stor perde", ar="ستائر رومانية", fr="Stores bateau", it="Tende a pacchetto", es="Estores plegables"), "raffrollos"),
    ("04", pack("Schiebegardinen", "Panel curtains", "Panel perde", ar="ستائر ألواح", fr="Panneaux japonais", it="Pannelli giapponesi", es="Paneles japoneses"), "schiebegardinen"),
    ("05", pack("Verdunklungsvorhänge", "Blackout curtains", "Karartma perde", ar="ستائر تعتيم", fr="Rideaux occultants", it="Tende oscuranti", es="Cortinas opacas"), "verdunklungsvorhaenge"),
]

RUG = [
    ("01", pack("Kurzflorteppiche", "Short-pile rugs", "Kısa havlı halı", ar="سجاد قصير الوبر", fr="Tapis poils courts", it="Tappeti pelo corto", es="Alfombras de pelo corto"), "kurzflorteppiche"),
    ("02", pack("Hochflorteppiche", "Shaggy rugs", "Uzun havlı halı", ar="سجاد طويل الوبر", fr="Tapis shaggy", it="Tappeti shaggy", es="Alfombras shaggy"), "hochflorteppiche"),
    ("03", pack("Läufer", "Runners", "Yolluk", ar="ممرات", fr="Passages", it="Passatoie", es="Alfombras de pasillo"), "laeufer"),
    ("04", pack("Badematte & WC-Vorleger", "Bath and WC rugs", "Klozet takımı", ar="سجاد حمام ومرحاض", fr="Tapis WC", it="Tappeti bagno", es="Alfombras de baño"), "badematte-und-wc-vorleger"),
    ("05", pack("Outdoor-Teppiche", "Outdoor rugs", "Dış mekan halısı", ar="سجاد خارجي", fr="Tapis extérieur", it="Tappeti outdoor", es="Alfombras de exterior"), "outdoor-teppiche"),
]

TABLE = [
    ("01", pack("Tischdecken", "Tablecloths", "Masa örtüsü", ar="مفارش طاولة", fr="Nappes", it="Tovaglie", es="Manteles"), "tischdecken"),
    ("02", pack("Tischläufer", "Table runners", "Runner", ar="ممرات طاولة", fr="Chemins de table", it="Runner", es="Caminos de mesa"), "tischlaeufer"),
    ("03", pack("Platzsets", "Placemats", "Amerikan servis", ar="مفارش أطباق", fr="Sets de table", it="Tovagliette", es="Manteles individuales"), "platzsets"),
    ("04", pack("Stoffservietten", "Cloth napkins", "Kumaş peçete", ar="مناديل قماشية", fr="Serviettes en tissu", it="Tovaglioli", es="Servilletas de tela"), "stoffservietten"),
    ("05", pack("Tischsets", "Table sets", "Masa seti", ar="أطقم طاولة", fr="Ensembles de table", it="Set tavola", es="Juegos de mesa"), "tischsets"),
]

KITCHEN = [
    ("01", pack("Geschirrtücher", "Tea towels", "Kurulama bezi", ar="مناشف مطبخ", fr="Torchons", it="Strofinacci", es="Paños de cocina"), "geschirrtuecher"),
    ("02", pack("Schürzen", "Aprons", "Önlük", ar="مرايل", fr="Tabliers", it="Grembiuli", es="Delantales"), "schuerzen"),
    ("03", pack("Topflappen & Ofenhandschuhe", "Pot holders & oven mitts", "Tutacak ve fırın eldiveni", ar="مسكات الفرن", fr="Maniques", it="Presine", es="Agarradores"), "topflappen-und-ofenhandschuhe"),
    ("04", pack("Küchenläufer", "Kitchen runners", "Mutfak yolluğu", ar="ممرات مطبخ", fr="Tapis de cuisine", it="Passatoie cucina", es="Alfombras de cocina"), "kuechenlaeufer"),
]

THROW = [
    ("01", pack("Wohndecken", "Throws", "Koltuk şalı", ar="بطانيات ديكور", fr="Plaids", it="Plaid", es="Plaid"), "wohndecken"),
    ("02", pack("Zierkissen", "Decorative cushions", "Dekoratif yastık", ar="وسائد زينة", fr="Coussins déco", it="Cuscini decorativi", es="Cojines"), "zierkissen"),
    ("03", pack("Zierkissenbezüge", "Cushion covers", "Kırlent kılıfı", ar="أكياس وسائد ديكور", fr="Housses de coussin", it="Federe cuscino", es="Fundas de cojín"), "zierkissenbezuege"),
    ("04", pack("Tagesdecken", "Bedspreads", "Yatak örtüsü", ar="أغطية سرير", fr="Couvre-lits", it="Copriletti", es="Colchas"), "tagesdecken"),
]

BEDDING = [
    ("01", pack("Kopfkissen", "Pillows", "Yastık", ar="وسائد", fr="Oreillers", it="Cuscini da letto", es="Almohadas"), "kopfkissen"),
    ("02", pack("Bettdecken", "Duvets", "Yorgan", ar="لحف", fr="Couettes", it="Piumini", es="Nórdicos"), "bettdecken"),
    ("03", pack("Matratzenschoner", "Mattress protectors", "Yatak koruyucu", ar="واقي مرتبة", fr="Protège-matelas", it="Coprimaterasso", es="Protectores de colchón"), "matratzenschoner"),
    ("04", pack("Matratzenauflagen", "Mattress toppers", "Yatak pedi", ar="طبقة مرتبة", fr="Surmatelas", it="Topper", es="Toppers"), "matratzenauflagen"),
]

COVER = [
    ("01", pack("Sofabezüge", "Sofa covers", "Koltuk kılıfı", ar="أغطية أريكة", fr="Housses de canapé", it="Copridivano", es="Fundas de sofá"), "sofabezuege"),
    ("02", pack("Sesselbezüge", "Armchair covers", "Berjer kılıfı", ar="أغطية كرسي", fr="Housses de fauteuil", it="Copripoltrona", es="Fundas de sillón"), "sesselbezuege"),
    ("03", pack("Stuhlhussen", "Chair covers", "Sandalye kılıfı", ar="أغطية كراسي", fr="Housses de chaise", it="Coprisedia", es="Fundas de silla"), "stuhlhussen"),
    ("04", pack("Elastische Möbelbezüge", "Stretch furniture covers", "Esnek kılıf", ar="أغطية مطاطية", fr="Housses stretch", it="Copridivano elasticizzati", es="Fundas elásticas"), "elastische-moebelbezuege"),
]

OUTDOOR = [
    ("01", pack("Gartenmöbel-Auflagen", "Garden furniture cushions", "Bahçe minder", ar="وسائد حديقة", fr="Coussins de jardin", it="Cuscini da giardino", es="Cojines de jardín"), "gartenmoebel-auflagen"),
    ("02", pack("Outdoor-Kissen", "Outdoor cushions", "Dış mekan yastığı", ar="وسائد خارجية", fr="Coussins outdoor", it="Cuscini outdoor", es="Cojines de exterior"), "outdoor-kissen"),
    ("03", pack("Strandtücher", "Beach towels", "Plaj havlusu", ar="مناشف شاطئ", fr="Serviettes de plage", it="Teli mare", es="Toallas de playa"), "strandtuecher"),
    ("04", pack("Hängematten-Textilien", "Hammock textiles", "Hamak tekstili", ar="منسوجات الأرجوحة", fr="Textiles hamac", it="Tessili amaca", es="Textiles de hamaca"), "haengematten-textilien"),
]

EXISTING_L2 = {
    "cat-42-01": BED,
    "cat-42-02": BATH,
    "cat-42-03": CURTAIN,
    "cat-42-04": RUG,
}

NEW_L2 = [
    ("05", "tischwaesche", pack("Tischwäsche", "Table linen", "Masa tekstili", ar="مفروشات المائدة", fr="Linge de table", it="Biancheria da tavola", es="Mantelería", pl="Obrasy", nl="Tafellinnen"), TABLE),
    ("06", "kuechentextilien", pack("Küchentextilien", "Kitchen textiles", "Mutfak tekstili", ar="منسوجات المطبخ", fr="Textiles de cuisine", it="Tessili cucina", es="Textiles de cocina", pl="Tekstylia kuchenne"), KITCHEN),
    ("07", "decken-und-kissen", pack("Decken & Kissen", "Throws & cushions", "Battaniye ve yastık", ar="بطانيات ووسائد", fr="Plaids et coussins", it="Plaid e cuscini", es="Mantas y cojines", pl="Koce i poduszki"), THROW),
    ("08", "bettwaren", pack("Bettwaren", "Duvets & pillows", "Yastık ve yorgan", ar="لحف ووسائد", fr="Couettes et oreillers", it="Piumini e cuscini", es="Nórdicos y almohadas", pl="Kołdry i poduszki"), BEDDING),
    ("09", "moebelbezuege", pack("Möbelbezüge", "Furniture covers", "Mobilya kılıfı", ar="أغطية الأثاث", fr="Housses de meubles", it="Copritutto", es="Fundas de muebles", pl="Pokrowce"), COVER),
    ("10", "outdoor-textilien", pack("Outdoor-Textilien", "Outdoor textiles", "Dış mekan tekstili", ar="منسوجات خارجية", fr="Textiles outdoor", it="Tessili outdoor", es="Textiles de exterior", pl="Tekstylia ogrodowe"), OUTDOOR),
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
    home = next(c for c in catalog["categories"] if c["id"] == "cat-42")
    by_id = {c["id"]: c for c in home["children"]}

    for cid, specs in EXISTING_L2.items():
        replace_l3_group(by_id[cid], specs)

    existing = {c["id"] for c in home["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-42-{suffix}"
        if cid in existing:
            continue
        url = f"{home['url']}/{slug}"
        hub = node(cid, int(suffix), labels, slug, url, 2, [])
        for item in children:
            hub["children"].append(l3(cid, url, item[0], item[1], item[2]))
        home["children"].append(hub)

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

    l2 = home["children"]
    l3n = sum(len(c.get("children") or []) for c in l2)
    print("L2", len(l2), "L3", l3n, "labels", len(NEW_LABELS), "redirects", len(REDIRECTS))


if __name__ == "__main__":
    main()
