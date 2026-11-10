#!/usr/bin/env python3
"""Complete Verpackung & Versand (cat-29) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Packaging placeholder L3 replaced with a real product group"})


BOX = [
    ("01", pack("Faltkartons", "Folding cartons", "Katlanır koli", ar="كراتين قابلة للطي", fr="Cartons pliants", it="Scatole pieghevoli", es="Cajas plegables"), "faltkartons"),
    ("02", pack("Wellpappkartons", "Corrugated boxes", "Oluklu koli", ar="صناديق مموجة", fr="Cartons ondulés", it="Scatole ondulate", es="Cajas corrugadas"), "wellpappkartons"),
    ("03", pack("Maxibrief-Kartons", "Maxibrief boxes", "Maxibrief kutu", ar="صناديق ماكسي", fr="Boîtes maxi", it="Scatole maxi", es="Cajas maxi"), "maxibrief-kartons"),
    ("04", pack("Umzugskartons", "Moving boxes", "Nakliye kolisi", ar="صناديق نقل", fr="Cartons déménagement", it="Scatole trasloco", es="Cajas mudanza"), "umzugskartons"),
]
BAG = [
    ("01", pack("Versandtaschen", "Mailer bags", "Kargo poşeti", ar="أكياس شحن", fr="Sacs envoi", it="Buste spedizione", es="Bolsas envío"), "versandtaschen"),
    ("02", pack("Luftpolstertaschen", "Padded bags", "Balonlu zarf", ar="أكياس مبطنة", fr="Enveloppes matelassées", it="Buste imbottite", es="Sobres acolchados"), "luftpolstertaschen"),
    ("03", pack("Dokumententaschen", "Document wallets", "Evrak poşeti", ar="حافظات وثائق", fr="Pochettes documents", it="Buste documenti", es="Portadocumentos"), "dokumententaschen"),
    ("04", pack("Rücksendetaschen", "Return bags", "İade poşeti", ar="أكياس إرجاع", fr="Sacs retour", it="Buste reso", es="Bolsas devolución"), "ruecksendetaschen"),
]
BUB = [
    ("01", pack("Luftpolsterfolie", "Bubble wrap", "Balonlu naylon", ar="فقاعات", fr="Film bulles", it="Plastica bolle", es="Plástico burbuja"), "luftpolsterfolie"),
    ("02", pack("Luftkissen", "Air pillows", "Hava yastığı", ar="وسائد هواء", fr="Coussins d'air", it="Cuscini aria", es="Almohadas aire"), "luftkissen"),
    ("03", pack("Schaumfolie", "Foam wrap", "Köpük folyo", ar="فوم", fr="Film mousse", it="Film schiuma", es="Film espuma"), "schaumfolie"),
    ("04", pack("Kantenschutz", "Edge protectors", "Kenar koruma", ar="حماية حواف", fr="Protecteurs d'angle", it="Paraspigoli", es="Protectores esquina"), "kantenschutz"),
]
TAPE = [
    ("01", pack("Paketklebeband", "Packing tape", "Koli bandı", ar="شريط تغليف", fr="Scotch emballage", it="Nastro imballo", es="Cinta embalaje"), "paketklebeband"),
    ("02", pack("Abroller", "Dispensers", "Band tutucu", ar="موزعات", fr="Dévidoirs", it="Erogatori", es="Dispensadores"), "abroller"),
    ("03", pack("Filamentband", "Filament tape", "Filament bant", ar="شريط خيطي", fr="Ruban filament", it="Nastro filament", es="Cinta filament"), "filamentband"),
    ("04", pack("Caution-Tape", "Caution tape", "Uyarı bandı", ar="شريط تحذير", fr="Ruban signal", it="Nastro segnaletica", es="Cinta precaución"), "caution-tape"),
]
LAB = [
    ("01", pack("Versandetiketten", "Shipping labels", "Kargo etiketi", ar="ملصقات شحن", fr="Étiquettes envoi", it="Etichette spedizione", es="Etiquetas envío"), "versandetiketten"),
    ("02", pack("Thermoetiketten", "Thermal labels", "Termal etiket", ar="ملصقات حرارية", fr="Étiquettes thermique", it="Etichette termiche", es="Etiquetas térmicas"), "thermoetiketten"),
    ("03", pack("Fragile-Aufkleber", "Fragile stickers", "Kırılır etiket", ar="ملصقات هش", fr="Stickers fragile", it="Adesivi fragile", es="Pegatinas frágil"), "fragile-aufkleber"),
    ("04", pack("Adressetiketten", "Address labels", "Adres etiketi", ar="ملصقات عنوان", fr="Étiquettes adresse", it="Etichette indirizzo", es="Etiquetas dirección"), "adressetiketten"),
]
FILL = [
    ("01", pack("Packpapier", "Packing paper", "Paket kağıdı", ar="ورق تغليف", fr="Papier calage", it="Carta imballo", es="Papel relleno"), "packpapier"),
    ("02", pack("Chips", "Packing peanuts", "Strafor top", ar="حبيبات", fr="Chips calage", it="Chips", es="Viruta"), "chips"),
    ("03", pack("Seidenpapier", "Tissue paper", "Pelur", ar="ورق حرير", fr="Papier de soie", it="Carta velina", es="Papel seda"), "seidenpapier"),
    ("04", pack("Wellpappe-Zuschnitte", "Corrugated pads", "Oluklu parça", ar="قطع مموجة", fr="Plaques ondulées", it="Lastre ondulate", es="Placas corrugadas"), "wellpappe-zuschnitte"),
]
PAL = [
    ("01", pack("Stretchfolie", "Stretch film", "Streç", ar="فيلم تمدد", fr="Film étirable", it="Film estensibile", es="Film estirable"), "stretchfolie"),
    ("02", pack("Kantenschutzwinkel", "Pallet corners", "Palet köşesi", ar="زوايا منصات", fr="Cornières palette", it="Angolari pallet", es="Esquineras palé"), "kantenschutzwinkel"),
    ("03", pack("Umreifungsband", "Strapping", "Çember", ar="أشرطة ربط", fr="Cerclage", it="Reggia", es="Fleje"), "umreifungsband"),
    ("04", pack("Palettenabdeckungen", "Pallet covers", "Palet örtüsü", ar="أغطية منصات", fr="Housses palette", it="Coperture pallet", es="Cubiertas palé"), "palettenabdeckungen"),
]
MAIL = [
    ("01", pack("Luftpolsterumschläge", "Padded envelopes", "Balonlu zarf", ar="مظاريف مبطنة", fr="Enveloppes à bulles", it="Buste a bolle", es="Sobres burbuja"), "luftpolsterumschlaege"),
    ("02", pack("Vollpapp-Umschläge", "Rigid mailers", "Sert zarf", ar="مظاريف صلبة", fr="Enveloppes rigides", it="Buste rigide", es="Sobres rígidos"), "vollpapp-umschlaege"),
    ("03", pack("CD-Mailer", "CD mailers", "CD zarfı", ar="مظاريف أقراص", fr="Enveloppes CD", it="Buste CD", es="Sobres CD"), "cd-mailer"),
    ("04", pack("Bücherversand", "Book mailers", "Kitap zarfı", ar="مظاريف كتب", fr="Envois livres", it="Spedizione libri", es="Envío libros"), "buecherversand"),
]
EXISTING = {
    "cat-29-01": (pack("Kartonboxen", "Carton boxes", "Karton kutu", ar="صناديق كرتون", fr="Boîtes carton", it="Scatole cartone", es="Cajas cartón"), BOX),
    "cat-29-02": (pack("Versandbeutel", "Shipping bags", "Kargo poşeti", ar="أكياس شحن", fr="Sacs d'expédition", it="Buste spedizione", es="Bolsas de envío"), BAG),
    "cat-29-03": (pack("Luftpolsterverpackung", "Bubble packaging", "Balonlu ambalaj", ar="تغليف فقاعات", fr="Emballage bulles", it="Imballo bolle", es="Embalaje burbuja"), BUB),
    "cat-29-04": (pack("Klebeband", "Tape", "Bant", ar="شريط", fr="Adhésif", it="Nastro", es="Cinta"), TAPE),
    "cat-29-05": (pack("Etiketten", "Labels", "Etiket", ar="ملصقات", fr="Étiquettes", it="Etichette", es="Etiquetas"), LAB),
    "cat-29-06": (pack("Füllmaterialien", "Void fill", "Dolgu malzemesi", ar="مواد حشو", fr="Matériaux de calage", it="Materiale riempimento", es="Material de relleno"), FILL),
    "cat-29-07": (pack("Palette & Stretch", "Pallet & stretch", "Palet ve streç", ar="منصات وفيلم", fr="Palette et film", it="Pallet e stretch", es="Palé y film"), PAL),
}
NEW_L2 = [
    ("08", "versandumschlaege", pack("Versandumschläge", "Shipping envelopes", "Kargo zarfı", ar="مظاريف شحن", fr="Enveloppes d'envoi", it="Buste di spedizione", es="Sobres de envío"), MAIL),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-29")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-29-{suffix}"
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
