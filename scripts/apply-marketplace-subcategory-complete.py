#!/usr/bin/env python3
"""Complete Allgemeine Produkte & Marktplatz (cat-41) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Marketplace placeholder L3 replaced with a real product group"})


NEW = [
    ("01", pack("Diese Woche", "This week", "Bu hafta", ar="هذا الأسبوع", fr="Cette semaine", it="Questa settimana", es="Esta semana"), "diese-woche"),
    ("02", pack("Vorbestellungen", "Pre-orders", "Ön sipariş", ar="طلب مسبق", fr="Précommandes", it="Preordini", es="Preventas"), "vorbestellungen"),
    ("03", pack("Limitierte Editionen", "Limited editions", "Sınırlı", ar="إصدارات محدودة", fr="Éditions limitées", it="Edizioni limitate", es="Ediciones limitadas"), "limitierte-editionen"),
    ("04", pack("Restocks", "Restocks", "Yeniden stok", ar="إعادة تخزين", fr="Réapprovisionnements", it="Rifornimenti", es="Reposiciones"), "restocks"),
]
BEST = [
    ("01", pack("Top 10", "Top 10", "İlk 10", ar="الأفضل 10", fr="Top 10", it="Top 10", es="Top 10"), "top-10"),
    ("02", pack("Meistgekauft", "Most bought", "En çok satan", ar="الأكثر شراء", fr="Plus achetés", it="Più comprati", es="Más comprados"), "meistgekauft"),
    ("03", pack("Kundenfavoriten", "Customer favorites", "Müşteri favorisi", ar="مفضلات العملاء", fr="Favoris clients", it="Preferiti clienti", es="Favoritos clientes"), "kundenfavoriten"),
    ("04", pack("Editor-Picks", "Editor picks", "Editör seçimi", ar="اختيارات المحرر", fr="Choix éditeur", it="Scelte editor", es="Selección editor"), "editor-picks"),
]
DEAL = [
    ("01", pack("Tagesangebote", "Daily deals", "Günün fırsatı", ar="عروض يومية", fr="Offres du jour", it="Offerte del giorno", es="Ofertas del día"), "tagesangebote"),
    ("02", pack("Wochenangebote", "Weekly deals", "Haftalık fırsat", ar="عروض أسبوعية", fr="Offres semaine", it="Offerte settimana", es="Ofertas semanales"), "wochenangebote"),
    ("03", pack("Mengenrabatte", "Bulk discounts", "Toplu indirim", ar="خصم كمية", fr="Remises volume", it="Sconti volume", es="Descuentos volumen"), "mengenrabatte"),
    ("04", pack("Last Minute", "Last minute", "Son dakika", ar="آخر لحظة", fr="Dernière minute", it="Last minute", es="Último minuto"), "last-minute"),
]
SEAS = [
    ("01", pack("Frühling", "Spring", "İlkbahar", ar="ربيع", fr="Printemps", it="Primavera", es="Primavera"), "fruehling"),
    ("02", pack("Sommer", "Summer", "Yaz", ar="صيف", fr="Été", it="Estate", es="Verano"), "sommer"),
    ("03", pack("Herbst", "Autumn", "Sonbahar", ar="خريف", fr="Automne", it="Autunno", es="Otoño"), "herbst"),
    ("04", pack("Winter", "Winter", "Kış", ar="شتاء", fr="Hiver", it="Inverno", es="Invierno"), "winter"),
]
OUT = [
    ("01", pack("B-Ware", "B-stock", "B-ürün", ar="بضاعة ب", fr="Stock B", it="Stock B", es="Stock B"), "b-ware"),
    ("02", pack("Auslaufmodelle", "Discontinued", "Stok dışı model", ar="موديلات منتهية", fr="Fin de série", it="Fine serie", es="Fin de serie"), "auslaufmodelle"),
    ("03", pack("Überbestände", "Overstock", "Fazla stok", ar="فائض", fr="Surstock", it="Sovrastock", es="Excedente"), "ueberbestaende"),
    ("04", pack("Retouren-Deals", "Return deals", "İade fırsatı", ar="عروض مرتجعات", fr="Retours", it="Resi", es="Devoluciones"), "retouren-deals"),
]
BRAND = [
    ("01", pack("Hausmarken", "House brands", "Ev markası", ar="علامات داخلية", fr="Marques maison", it="Marche interne", es="Marcas propias"), "hausmarken"),
    ("02", pack("Premium-Marken", "Premium brands", "Premium marka", ar="علامات فاخرة", fr="Marques premium", it="Marche premium", es="Marcas premium"), "premium-marken"),
    ("03", pack("Eigenmarken-Sets", "Private-label sets", "Özel marka set", ar="أطقم علامة خاصة", fr="Sets marque propre", it="Set private label", es="Sets marca propia"), "eigenmarken-sets"),
    ("04", pack("Kollaborationen", "Collaborations", "İşbirliği", ar="تعاونات", fr="Collaborations", it="Collaborazioni", es="Colaboraciones"), "kollaborationen"),
]
B2B = [
    ("01", pack("Palettenware", "Pallet goods", "Palet ürün", ar="بضاعة منصات", fr="Marchandise palette", it="Merce pallet", es="Mercancía palé"), "palettenware"),
    ("02", pack("Kartonweise", "By carton", "Koli", ar="بالكرتون", fr="Par carton", it="Per cartone", es="Por cartón"), "kartonweise"),
    ("03", pack("Mindestmengen", "Minimum orders", "Minimum sipariş", ar="حد أدنى", fr="Quantités min", it="Minimi d'ordine", es="Pedidos mínimos"), "mindestmengen"),
    ("04", pack("Musterpackungen", "Sample packs", "Numune", ar="عينات", fr="Échantillons", it="Campioni", es="Muestras"), "musterpackungen"),
]
BUND = [
    ("01", pack("2-für-1", "2-for-1", "2 al 1 öde", ar="اثنان بواحد", fr="2 pour 1", it="2 per 1", es="2 por 1"), "2-fuer-1"),
    ("02", pack("Starter-Bundles", "Starter bundles", "Başlangıç paketi", ar="حزم بداية", fr="Packs démarrage", it="Bundle starter", es="Packs inicio"), "starter-bundles"),
    ("03", pack("Familien-Pakete", "Family packs", "Aile paketi", ar="حزم عائلية", fr="Packs famille", it="Pack famiglia", es="Packs familia"), "familien-pakete"),
    ("04", pack("Zubehör-Bundles", "Accessory bundles", "Aksesuar paketi", ar="حزم ملحقات", fr="Packs accessoires", it="Bundle accessori", es="Packs accesorios"), "zubehoer-bundles"),
]
EXISTING = {
    "cat-41-01": (pack("Neuheiten", "New in", "Yeni gelenler", ar="وصل حديثا", fr="Nouveautés", it="Novità", es="Novedades"), NEW),
    "cat-41-02": (pack("Bestseller", "Bestsellers", "Çok satanlar", ar="الأكثر مبيعا", fr="Meilleures ventes", it="Bestseller", es="Más vendidos"), BEST),
    "cat-41-03": (pack("Angebote", "Deals", "Fırsatlar", ar="عروض", fr="Offres", it="Offerte", es="Ofertas"), DEAL),
    "cat-41-04": (pack("Saisonprodukte", "Seasonal", "Sezon", ar="موسمي", fr="Saisonnier", it="Stagionali", es="Temporada"), SEAS),
    "cat-41-05": (pack("Outlet", "Outlet", "Outlet", ar="أوتلت", fr="Outlet", it="Outlet", es="Outlet"), OUT),
    "cat-41-06": (pack("Markenkollektionen", "Brand collections", "Marka koleksiyonları", ar="مجموعات علامات", fr="Collections marques", it="Collezioni marche", es="Colecciones marcas"), BRAND),
    "cat-41-07": (pack("Geschäftskunden", "Business customers", "Kurumsal", ar="عملاء أعمال", fr="Clients pro", it="Clienti business", es="Clientes empresa"), B2B),
}
NEW_L2 = [
    ("08", "bundles", pack("Bundles", "Bundles", "Paketler", ar="حزم", fr="Packs", it="Bundle", es="Packs"), BUND),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-41")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-41-{suffix}"
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
