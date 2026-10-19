#!/usr/bin/env python3
"""Complete Mutter & Baby (cat-17) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Baby placeholder L3 replaced with a real product group"})


CLOTHES = [
    ("01", pack("Bodys", "Bodysuits", "Body", ar="بودي", fr="Bodies", it="Body", es="Bodies"), "body"),
    ("02", pack("Strampler", "Rompers", "Tulum", ar="أفرول", fr="Grenouillères", it="Tutine", es="Peelitos"), "strampler"),
    ("03", pack("Wickelbodys", "Wrap bodysuits", "Wickelbody", ar="بودي لف", fr="Bodies croisés", it="Body incrociati", es="Bodies cruzados"), "wickelbody"),
    ("04", pack("Pyjamas", "Pyjamas", "Pijama", ar="بيجاما", fr="Pyjamas", it="Pigiama", es="Pijamas"), "pyjama"),
    ("05", pack("Hosen", "Trousers", "Pantolon", ar="بناطيل", fr="Pantalons", it="Pantaloni", es="Pantalones"), "babyhose"),
    ("06", pack("Pullover", "Jumpers", "Kazak", ar="كنزات", fr="Pulls", it="Maglioni", es="Jerseys"), "babypullover"),
    ("07", pack("Kleider", "Dresses", "Elbise", ar="فساتين", fr="Robes", it="Vestiti", es="Vestidos"), "baby-elbisesi"),
    ("08", pack("Jacken & Mäntel", "Jackets & coats", "Mont", ar="معاطف", fr="Manteaux", it="Cappotti", es="Abrigos"), "baby-mont"),
]
CARE = [
    ("01", pack("Pflegecremes", "Care creams", "Bakım kremi", ar="كريمات عناية", fr="Crèmes de soin", it="Creme cura", es="Cremas de cuidado"), "pflegecremes"),
    ("02", pack("Badezusätze", "Bath care", "Banyo bakımı", ar="عناية استحمام", fr="Soin bain", it="Cura bagno", es="Cuidado de baño"), "badezusaetze"),
    ("03", pack("Wickeln", "Nappies & changing", "Bez", ar="حفاضات", fr="Couches", it="Pannolini", es="Pañales"), "wickeln"),
    ("04", pack("Babywatte & Öl", "Cotton & oil", "Pamuk ve yağ", ar="قطن وزيت", fr="Coton et huile", it="Cotone e olio", es="Algodón y aceite"), "watte-und-oel"),
]
FEED = [
    ("01", pack("Flaschen", "Bottles", "Biberon", ar="زجاجات", fr="Biberons", it="Biberon", es="Biberones"), "flaschen"),
    ("02", pack("Schnuller", "Dummies", "Emzik", ar="لهايات", fr="Tétines", it="Ciucci", es="Chupetes"), "schnuller"),
    ("03", pack("Sterilisatoren", "Sterilisers", "Sterilizatör", ar="معقمات", fr="Stérilisateurs", it="Sterilizzatori", es="Esterilizadores"), "sterilisatoren"),
    ("04", pack("Breikochgeräte", "Weaning prep", "Mama hazırlama", ar="تحضير الطعام", fr="Préparation repas", it="Pappe", es="Preparación papillas"), "breikochgeraete"),
]
ROOM = [
    ("01", pack("Babybetten", "Cots", "Beşik", ar="أسرة أطفال", fr="Lits bébé", it="Culle", es="Cunas"), "babybetten"),
    ("02", pack("Wickelkommoden", "Changing tables", "Alt değiştirme", ar="طاولات تغيير", fr="Tables à langer", it="Fasciatoi", es="Cambiadores"), "wickelkommoden"),
    ("03", pack("Babytextilien", "Nursery textiles", "Bebek tekstili", ar="منسوجات", fr="Textiles nursery", it="Tessili nursery", es="Textiles cuna"), "babytextilien"),
    ("04", pack("Nachtlichter", "Night lights", "Gece lambası", ar="إضاءة ليلية", fr="Veilleuses", it="Luci notturne", es="Luces nocturnas"), "nachtlichter"),
]
TOYS = [
    ("01", pack("Greiflinge", "Rattles", "Çıngırak", ar="خشخيشات", fr="Hochets", it="Sonagli", es="Sonajeros"), "greiflinge"),
    ("02", pack("Spielbögen", "Play gyms", "Oyun halısı", ar="حصائر لعب", fr="Tapis d'éveil", it="Palestrine", es="Gimnasios"), "spielboegen"),
    ("03", pack("Kuscheltier", "Soft toys", "Peluş", ar="ألعاب قطيفة", fr="Peluches", it="Peluche", es="Peluches"), "kuscheltiere"),
    ("04", pack("Beißringe", "Teethers", "Diş kaşıyıcı", ar="عضاضات", fr="Anneaux de dentition", it="Massaggiagengive", es="Mordedores"), "beissringe"),
]
TRANSPORT = [
    ("01", pack("Kinderwagen", "Prams", "Bebek arabası", ar="عربات", fr="Poussettes", it="Passeggini", es="Cochecitos"), "kinderwagen"),
    ("02", pack("Autositze", "Car seats", "Oto koltuğu", ar="مقاعد سيارة", fr="Sièges auto", it="Seggiolini", es="Sillas de auto"), "autositze"),
    ("03", pack("Tragen", "Carriers", "Kanguru", ar="حمالات", fr="Porte-bébés", it="Marsupi", es="Portabebés"), "tragen"),
    ("04", pack("Reisetaschen", "Travel bags", "Seyahat çantası", ar="حقائب سفر", fr="Sacs de voyage", it="Borse viaggio", es="Bolsas de viaje"), "reisetaschen"),
]
SAFE = [
    ("01", pack("Babyphones", "Monitors", "Telsiz", ar="أجهزة مراقبة", fr="Babyphones", it="Baby monitor", es="Vigilabebés"), "babyphones"),
    ("02", pack("Steckdosenschutz", "Socket covers", "Priz koruyucu", ar="أغطية مقابس", fr="Cache-prises", it="Copriprese", es="Protectores enchufe"), "steckdosenschutz"),
    ("03", pack("Treppenschutzgitter", "Stair gates", "Merdiven korkuluğu", ar="بوابات سلالم", fr="Barrières d'escalier", it="Cancelleti", es="Barreras de escalera"), "treppenschutzgitter"),
    ("04", pack("Eckenschutz", "Corner guards", "Köşe koruyucu", ar="حماية الزوايا", fr="Protections d'angles", it="Paraspigoli", es="Protectores de esquinas"), "eckenschutz"),
]
MUM = [
    ("01", pack("Stillkissen", "Nursing pillows", "Emzirme yastığı", ar="وسائد رضاعة", fr="Coussins d'allaitement", it="Cuscini allattamento", es="Cojines de lactancia"), "stillkissen"),
    ("02", pack("Milchpumpen", "Breast pumps", "Göğüs pompası", ar="مضخات حليب", fr="Tire-lait", it="Tiralatte", es="Sacaleches"), "milchpumpen"),
    ("03", pack("Still-BHs", "Nursing bras", "Emzirme sütyeni", ar="حمالات رضاعة", fr="Soutiens allaitement", it="Reggiseni allattamento", es="Sujetadores de lactancia"), "still-bhs"),
    ("04", pack("Wochenbett", "Postpartum care", "Lohusa bakımı", ar="عناية بعد الولادة", fr="Suites de couches", it="Post parto", es="Postparto"), "wochenbett"),
]
EXISTING = {
    "cat-17-01": (pack("Babybekleidung", "Baby clothing", "Bebek giyim", ar="ملابس رضع", fr="Vêtements bébé", it="Abbigliamento neonato", es="Ropa de bebé"), CLOTHES),
    "cat-17-02": (pack("Babypflege", "Baby care", "Bebek bakımı", ar="عناية بالرضع", fr="Soin bébé", it="Cura neonato", es="Cuidado del bebé"), CARE),
    "cat-17-03": (pack("Ernährung", "Feeding", "Beslenme", ar="تغذية", fr="Alimentation", it="Alimentazione", es="Alimentación"), FEED),
    "cat-17-04": (pack("Babyzimmer", "Nursery", "Bebek odası", ar="غرفة الرضيع", fr="Chambre bébé", it="Cameretta", es="Habitación bebé"), ROOM),
    "cat-17-05": (pack("Spielzeug", "Toys", "Oyuncak", ar="ألعاب", fr="Jouets", it="Giocattoli", es="Juguetes"), TOYS),
    "cat-17-06": (pack("Kinderwagen & Transport", "Prams & travel", "Bebek arabası ve taşıma", ar="عربات ونقل", fr="Poussettes et transport", it="Passeggini e trasporto", es="Cochecitos y transporte"), TRANSPORT),
    "cat-17-07": (pack("Sicherheit", "Safety", "Güvenlik", ar="أمان", fr="Sécurité", it="Sicurezza", es="Seguridad"), SAFE),
    "cat-17-08": (pack("Mutterprodukte", "Maternity", "Anne ürünleri", ar="منتجات الأم", fr="Maternité", it="Maternità", es="Maternidad"), MUM),
}


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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-17")
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
