#!/usr/bin/env python3
"""Complete Körperpflege (cat-44) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Body-care placeholder L3 replaced with a real product group"})


HAIR = [
    ("01", pack("Shampoo", "Shampoo", "Şampuan", ar="شامبو", fr="Shampoing", it="Shampoo", es="Champú"), "shampoo"),
    ("02", pack("Spülung", "Conditioner", "Saç kremi", ar="بلسم", fr="Après-shampoing", it="Balsamo", es="Acondicionador"), "spuelung"),
    ("03", pack("Styling", "Styling", "Şekillendirici", ar="تصفيف", fr="Coiffage", it="Styling", es="Peinado"), "styling"),
    ("04", pack("Haarfärbung", "Hair colour", "Saç boyası", ar="صبغة شعر", fr="Coloration", it="Tinte", es="Tintes"), "haarfaerbung"),
]
TEETH = [
    ("01", pack("Zahnpasta", "Toothpaste", "Diş macunu", ar="معجون أسنان", fr="Dentifrice", it="Dentifricio", es="Pasta de dientes"), "zahnpasta"),
    ("02", pack("Zahnbürsten", "Toothbrushes", "Diş fırçası", ar="فرش أسنان", fr="Brosses à dents", it="Spazzolini", es="Cepillos"), "zahnbruesten"),
    ("03", pack("Mundspülung", "Mouthwash", "Gargara", ar="غسول فم", fr="Bain de bouche", it="Collutorio", es="Enjuague"), "mundspuelung"),
    ("04", pack("Zahnseide", "Floss", "Diş ipi", ar="خيط أسنان", fr="Fil dentaire", it="Filo interdentale", es="Hilo dental"), "zahnseide"),
]
SHAVE = [
    ("01", pack("Rasierer", "Razors", "Tıraş", ar="شفرات", fr="Rasoirs", it="Rasoio", es="Cuchillas"), "rasierer"),
    ("02", pack("Enthaarung", "Hair removal", "Ağda / tüy alma", ar="إزالة الشعر", fr="Épilation", it="Depilazione", es="Depilación"), "enthaarung"),
    ("03", pack("Aftershave", "Aftershave", "Aftershave", ar="بعد الحلاقة", fr="Aftershave", it="Aftershave", es="Aftershave"), "aftershave"),
    ("04", pack("Bartpflege", "Beard care", "Sakal bakımı", ar="عناية باللحية", fr="Soin barbe", it="Cura barba", es="Cuidado de barba"), "bartpflege"),
]
DEO = [
    ("01", pack("Deosprays", "Deo sprays", "Deo sprey", ar="بخاخ عرق", fr="Déos spray", it="Deo spray", es="Desodorante spray"), "deosprays"),
    ("02", pack("Deo-Roller", "Roll-on deo", "Roll-on", ar="رول أون", fr="Déos bille", it="Deo roll-on", es="Desodorante roll-on"), "deo-roller"),
    ("03", pack("Antitranspirant", "Antiperspirant", "Antiperspirant", ar="مضاد تعرق", fr="Anti-transpirant", it="Antitraspirante", es="Antitranspirante"), "antitranspirant"),
    ("04", pack("Fußdeo", "Foot deo", "Ayak deo", ar="مزيل عرق للقدم", fr="Déo pieds", it="Deo piedi", es="Desodorante pies"), "fussdeo"),
]
SHOWER = [
    ("01", pack("Duschgel", "Shower gel", "Duş jeli", ar="جل استحمام", fr="Gel douche", it="Doccia", es="Gel de ducha"), "duschgel"),
    ("02", pack("Badezusatz", "Bath additives", "Banyo tuzu", ar="إضافات حمام", fr="Bain", it="Sali da bagno", es="Sales de baño"), "badezusatz"),
    ("03", pack("Seife", "Soap", "Sabun", ar="صابون", fr="Savon", it="Sapone", es="Jabón"), "seife"),
    ("04", pack("Waschlotion", "Wash lotion", "Yıkama losyonu", ar="غسول جسم", fr="Lotion lavante", it="Detergente corpo", es="Loción de lavado"), "waschlotion"),
]
HAND = [
    ("01", pack("Handcreme", "Hand cream", "El kremi", ar="كريم يدين", fr="Crème mains", it="Crema mani", es="Crema de manos"), "handcreme"),
    ("02", pack("Fußcreme", "Foot cream", "Ayak kremi", ar="كريم قدم", fr="Crème pieds", it="Crema piedi", es="Crema de pies"), "fusscreme"),
    ("03", pack("Nagelpflege", "Nail care", "Tırnak bakımı", ar="عناية أظافر", fr="Ongles", it="Unghie", es="Uñas"), "nagelpflege"),
    ("04", pack("Hornhautpflege", "Callus care", "Nasır bakımı", ar="عناية بالجلد السميك", fr="Soin cors", it="Cura calli", es="Cuidado de callos"), "hornhautpflege"),
]
INTIM = [
    ("01", pack("Intimwaschlotion", "Intimate wash", "İntim yıkama", ar="غسول حميمي", fr="Soin intime", it="Detergente intimo", es="Higiene íntima"), "intimwaschlotion"),
    ("02", pack("Damenhygiene", "Feminine care", "Kadın hijyeni", ar="عناية نسائية", fr="Hygiène féminine", it="Igiene femminile", es="Higiene femenina"), "damenhygiene"),
    ("03", pack("Slipeinlagen", "Pantiliners", "Günlük ped", ar="فوط يومية", fr="Protège-slips", it="Salviette", es="Salvaslips"), "slipeinlagen"),
    ("04", pack("Tampons & Binden", "Tampons & pads", "Tampon ve ped", ar="فوط وحفاضات", fr="Serviettes et tampons", it="Assorbenti", es="Compensas"), "tampons-und-binden"),
]
SOAP = [
    ("01", pack("Flüssigseife", "Liquid soap", "Sıvı sabun", ar="صابون سائل", fr="Savon liquide", it="Sapone liquido", es="Jabón líquido"), "fluessigseife"),
    ("02", pack("Stückseife", "Bar soap", "Kalıp sabun", ar="صابون صلب", fr="Savon solide", it="Saponetta", es="Pastilla"), "stueckseife"),
    ("03", pack("Desinfektion", "Hand sanitiser", "Dezenfektan", ar="معقم", fr="Gel hydroalcoolique", it="Igienizzante", es="Gel hidroalcohólico"), "desinfektion"),
    ("04", pack("Cremeseife", "Cream soap", "Krem sabun", ar="صابون كريم", fr="Savon crème", it="Sapone crema", es="Jabón crema"), "cremeseife"),
]
EXISTING = {
    "cat-44-01": (pack("Haarpflege", "Hair care", "Saç bakımı", ar="العناية بالشعر", fr="Cheveux", it="Capelli", es="Cabello"), HAIR),
    "cat-44-02": (pack("Zahnpflege", "Oral care", "Diş bakımı", ar="العناية بالأسنان", fr="Dents", it="Denti", es="Dientes"), TEETH),
    "cat-44-03": (pack("Rasur & Enthaarung", "Shaving & hair removal", "Tıraş ve tüy alma", ar="حلاقة وإزالة الشعر", fr="Rasage", it="Rasatura", es="Afeitado"), SHAVE),
    "cat-44-04": (pack("Deodorants & Körperhygiene", "Deodorants & hygiene", "Deo ve hijyen", ar="مزيلات عرق ونظافة", fr="Déodorants", it="Deodoranti", es="Desodorantes"), DEO),
}
NEW_L2 = [
    ("05", "dusch-und-bad", pack("Dusch & Bad", "Shower & bath", "Duş ve banyo", ar="استحمام", fr="Douche et bain", it="Doccia e bagno", es="Ducha y baño"), SHOWER),
    ("06", "hand-und-fusspflege", pack("Hand- & Fußpflege", "Hand & foot care", "El ve ayak bakımı", ar="عناية باليدين والقدمين", fr="Mains et pieds", it="Mani e piedi", es="Manos y pies"), HAND),
    ("07", "intimpflege", pack("Intimpflege", "Intimate care", "İntim bakım", ar="عناية حميمة", fr="Soin intime", it="Igiene intima", es="Cuidado íntimo"), INTIM),
    ("08", "seifen-und-hygiene", pack("Seifen & Hygiene", "Soaps & hygiene", "Sabun ve hijyen", ar="صابون ونظافة", fr="Savons", it="Saponi", es="Jabones"), SOAP),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-44")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-44-{suffix}"
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
