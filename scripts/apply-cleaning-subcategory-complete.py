#!/usr/bin/env python3
"""Complete Reinigung & Hauspflege (cat-03) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Cleaning placeholder L3 replaced with a real product group"})


LAUNDRY = [
    ("01", pack("Waschmittel", "Detergent", "Deterjan", ar="منظف غسيل", fr="Lessive", it="Detersivo", es="Detergente"), "waschmittel"),
    ("02", pack("Weichspüler", "Fabric softener", "Yumuşatıcı", ar="منعم", fr="Adoucissant", it="Ammorbidente", es="Suavizante"), "weichspueler"),
    ("03", pack("Fleckentferner", "Stain removers", "Leke çıkarıcı", ar="مزيل بقع", fr="Détachants", it="Smacchiatori", es="Quitamanchas"), "fleckentferner"),
    ("04", pack("Wäscheduft", "Laundry scent", "Çamaşır kokusu", ar="عطر غسيل", fr="Parfum linge", it="Profumo bucato", es="Perfume ropa"), "waescheduft"),
]
DISH = [
    ("01", pack("Spülmittel", "Washing-up liquid", "Bulaşık deterjanı", ar="سائل صحون", fr="Liquide vaisselle", it="Detersivo piatti", es="Lavavajillas a mano"), "spuelmittel"),
    ("02", pack("Tabs", "Dishwasher tabs", "Tablet", ar="أقراص غسالة", fr="Tablettes", it="Tabs", es="Pastillas"), "tabs"),
    ("03", pack("Klarspüler", "Rinse aid", "Parlatıcı", ar="ملمع", fr="Liquide de rinçage", it="Brillantante", es="Abrillantador"), "klarspueler"),
    ("04", pack("Maschinensalz", "Dishwasher salt", "Makine tuzu", ar="ملح غسالة", fr="Sel régénérant", it="Sale", es="Sal regeneradora"), "maschinensalz"),
]
HOME = [
    ("01", pack("Allzweckreiniger", "All-purpose cleaner", "Çok amaçlı temizleyici", ar="منظف عام", fr="Nettoyant multi-usage", it="Sgrassatore", es="Limpiador multiusos"), "allzweckreiniger"),
    ("02", pack("Bodenreiniger", "Floor cleaner", "Yer temizleyici", ar="منظف أرضيات", fr="Nettoyant sols", it="Pulitore pavimenti", es="Limpiasuelos"), "bodenreiniger"),
    ("03", pack("Glasreiniger", "Glass cleaner", "Cam silici", ar="منظف زجاج", fr="Nettoyant vitres", it="Pulivetro", es="Limpiacristales"), "glasreiniger"),
    ("04", pack("Möbelpflege", "Furniture care", "Mobilya bakımı", ar="عناية أثاث", fr="Soin meubles", it="Cura mobili", es="Cuidado muebles"), "moebelpflege"),
]
KITCHEN = [
    ("01", pack("Entfetter", "Degreasers", "Yağ sökücü", ar="مزيل دهون", fr="Dégraissants", it="Sgrassatori", es="Desengrasantes"), "entfetter"),
    ("02", pack("Edelstahlpflege", "Stainless-steel care", "Paslanmaz bakım", ar="عناية ستانلس", fr="Soin inox", it="Cura inox", es="Cuidado inox"), "edelstahlpflege"),
    ("03", pack("Spülbeckenpflege", "Sink care", "Eviye bakımı", ar="عناية حوض", fr="Soin évier", it="Cura lavello", es="Cuidado fregadero"), "spuelbeckenpflege"),
    ("04", pack("Backofenreiniger", "Oven cleaner", "Fırın temizleyici", ar="منظف فرن", fr="Nettoyant four", it="Pulitore forno", es="Limpiador horno"), "backofenreiniger"),
]
BATH = [
    ("01", pack("WC-Reiniger", "Toilet cleaner", "WC temizleyici", ar="منظف مرحاض", fr="Nettoyant WC", it="Pulitore WC", es="Limpiador WC"), "wc-reiniger"),
    ("02", pack("Kalklöser", "Descalers", "Kireç sökücü", ar="مزيل كلس", fr="Détartrants", it="Anticalcare", es="Antical"), "kalkloeser"),
    ("03", pack("Duschkabinenpflege", "Shower-cabin care", "Duş kabini bakımı", ar="عناية كابينة", fr="Soin cabine", it="Cura box doccia", es="Cuidado mampara"), "duschkabinenpflege"),
    ("04", pack("Lufterfrischer", "Air fresheners", "Oda kokusu", ar="معطر هواء", fr="Désodorisants", it="Deodoranti", es="Ambientadores"), "lufterfrischer"),
]
PRO = [
    ("01", pack("Konzentrate", "Concentrates", "Konsantre", ar="مركزات", fr="Concentrés", it="Concentrati", es="Concentrados"), "konzentrate"),
    ("02", pack("Desinfektion", "Disinfectants", "Dezenfektan", ar="مطهر", fr="Désinfectants", it="Disinfettanti", es="Desinfectantes"), "desinfektion"),
    ("03", pack("Industriepackungen", "Industrial packs", "Endüstriyel paket", ar="عبوات صناعية", fr="Packs industriels", it="Confezioni industriali", es="Packs industriales"), "industriepackungen"),
    ("04", pack("Dosiersysteme", "Dosing systems", "Dozaj sistemi", ar="أنظمة جرعات", fr="Systèmes dosage", it="Sistemi dosaggio", es="Sistemas de dosificación"), "dosiersysteme"),
]
PAPER = [
    ("01", pack("Küchenrolle", "Kitchen roll", "Mutfak rulosu", ar="مناديل مطبخ", fr="Essuie-tout", it="Scottex", es="Papel de cocina"), "kuechenrolle"),
    ("02", pack("Toilettenpapier", "Toilet paper", "Tuvalet kâğıdı", ar="ورق حمام", fr="Papier toilette", it="Carta igienica", es="Papel higiénico"), "toilettenpapier"),
    ("03", pack("Taschentücher", "Tissues", "Mendil", ar="مناديل", fr="Mouchoirs", it="Fazzoletti", es="Pañuelos"), "taschentuecher"),
    ("04", pack("Wischtücher", "Wipes", "Temizlik bezi", ar="مناديل مسح", fr="Lingettes", it="Panni", es="Toallitas"), "wischtuecher"),
]
GEAR = [
    ("01", pack("Besen", "Brooms", "Süpürge", ar="مكانس", fr="Balais", it="Scope", es="Escobas"), "besen"),
    ("02", pack("Eimer", "Buckets", "Kova", ar="دلاء", fr="Seaux", it="Secchi", es="Cubos"), "eimer"),
    ("03", pack("Wischmops", "Mops", "Paspas", ar="ممسحات", fr="Serpillères", it="Mop", es="Fregonas"), "wischmops"),
    ("04", pack("Schwämme", "Sponges", "Sünger", ar="إسفنج", fr="Éponges", it="Spugne", es="Esponjas"), "schwaemme"),
]
EXISTING = {
    "cat-03-01": (pack("Wäschereinigung", "Laundry", "Çamaşır", ar="غسيل ملابس", fr="Linge", it="Bucato", es="Ropa"), LAUNDRY),
    "cat-03-02": (pack("Geschirrreinigung", "Dishwashing", "Bulaşık", ar="غسيل صحون", fr="Vaisselle", it="Stoviglie", es="Vajilla"), DISH),
    "cat-03-03": (pack("Hausreinigung", "Home cleaning", "Ev temizliği", ar="تنظيف المنزل", fr="Ménage", it="Pulizia casa", es="Limpieza hogar"), HOME),
    "cat-03-04": (pack("Küchenreinigung", "Kitchen cleaning", "Mutfak temizliği", ar="تنظيف المطبخ", fr="Nettoyage cuisine", it="Pulizia cucina", es="Limpieza cocina"), KITCHEN),
    "cat-03-05": (pack("Bad & WC", "Bath & WC", "Banyo ve WC", ar="حمام ومرحاض", fr="Salle de bain et WC", it="Bagno e WC", es="Baño y WC"), BATH),
    "cat-03-06": (pack("Professionelle Reinigung", "Professional cleaning", "Profesyonel temizlik", ar="تنظيف احترافي", fr="Nettoyage pro", it="Pulizia professionale", es="Limpieza profesional"), PRO),
    "cat-03-07": (pack("Papierprodukte", "Paper goods", "Kâğıt ürünleri", ar="منتجات ورق", fr="Produits papier", it="Carta", es="Papel"), PAPER),
    "cat-03-08": (pack("Reinigungsausrüstung", "Cleaning tools", "Temizlik ekipmanı", ar="معدات تنظيف", fr="Matériel ménage", it="Attrezzi pulizia", es="Utensilios de limpieza"), GEAR),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-03")
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
