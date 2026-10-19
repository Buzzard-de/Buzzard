#!/usr/bin/env python3
"""Complete Computer & IT (cat-38) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Computer IT placeholder L3 replaced with a real product group"})


LAPTOP = [
    ("01", pack("Laptop-Taschen", "Laptop bags", "Laptop çantası", ar="حقائب لابتوب", fr="Sacs laptop", it="Borse laptop", es="Bolsas portátil"), "laptop-taschen"),
    ("02", pack("Laptop-Ständer", "Laptop stands", "Laptop stand", ar="حوامل لابتوب", fr="Supports laptop", it="Supporti laptop", es="Soportes portátil"), "laptop-staender"),
    ("03", pack("Kühlpads", "Cooling pads", "Soğutucu", ar="وسادات تبريد", fr="Refroidisseurs", it="Pad raffreddamento", es="Bases refrigerantes"), "kuehlpads"),
    ("04", pack("Dockingstations", "Docking stations", "Dock", ar="محطات إرساء", fr="Stations d'accueil", it="Dock", es="Bases de conexión"), "dockingstations"),
    ("05", pack("Laptop-Netzteile", "Laptop chargers", "Laptop adaptör", ar="شواحن لابتوب", fr="Chargeurs laptop", it="Caricatori laptop", es="Cargadores portátil"), "laptop-netzteile"),
]
KM = [
    ("01", pack("Tastaturen", "Keyboards", "Klavye", ar="لوحات مفاتيح", fr="Claviers", it="Tastiere", es="Teclados"), "tastaturen"),
    ("02", pack("Mäuse", "Mice", "Mouse", ar="فأرة", fr="Souris", it="Mouse", es="Ratones"), "maeuse"),
    ("03", pack("Tastatur-Maus-Sets", "Keyboard mouse sets", "Klavye mouse set", ar="أطقم", fr="Packs clavier souris", it="Kit tastiera mouse", es="Kits teclado ratón"), "tastatur-maus-sets"),
    ("04", pack("Handballenauflagen", "Wrist rests", "Bilek desteği", ar="مسند معصم", fr="Repose-poignets", it="Poggiapolsi", es="Reposamuñecas"), "handballenauflagen"),
]
MON = [
    ("01", pack("Monitorarme", "Monitor arms", "Monitör kolu", ar="أذرع شاشة", fr="Bras écran", it="Bracci monitor", es="Brazos monitor"), "monitorarme"),
    ("02", pack("Monitorständer", "Monitor stands", "Monitör stand", ar="حوامل شاشة", fr="Supports écran", it="Supporti monitor", es="Soportes monitor"), "monitorstaender"),
    ("03", pack("Kabelkanäle", "Cable channels", "Kablo kanalı", ar="قنوات كابل", fr="Goulottes", it="Canaline", es="Canaletas"), "kabelkanaele"),
    ("04", pack("Monitorhauben", "Monitor hoods", "Monitör başlığı", ar="أغطية شاشة", fr="Capots écran", it="Coperture monitor", es="Capuchas monitor"), "monitorhauben"),
]
GAME = [
    ("01", pack("Gaming-Headsets", "Gaming headsets", "Oyuncu kulaklığı", ar="سماعات ألعاب", fr="Casques gaming", it="Headset gaming", es="Auriculares gaming"), "gaming-headsets"),
    ("02", pack("Gaming-Mäuse", "Gaming mice", "Oyuncu mouse", ar="فأرة ألعاب", fr="Souris gaming", it="Mouse gaming", es="Ratones gaming"), "gaming-maeuse"),
    ("03", pack("Controller", "Controllers", "Kol", ar="أذرع تحكم", fr="Manettes", it="Controller", es="Mandos"), "controller"),
    ("04", pack("Gaming-Tastaturen", "Gaming keyboards", "Oyuncu klavye", ar="لوحات ألعاب", fr="Claviers gaming", it="Tastiere gaming", es="Teclados gaming"), "gaming-tastaturen"),
    ("05", pack("Mauspads", "Mouse pads", "Mousepad", ar="لوحة فأرة", fr="Tapis souris", it="Mousepad", es="Alfombrillas"), "mauspads"),
]
CAM = [
    ("01", pack("Full-HD-Webcams", "Full HD webcams", "Full HD webcam", ar="كاميرات Full HD", fr="Webcams Full HD", it="Webcam Full HD", es="Webcams Full HD"), "full-hd-webcams"),
    ("02", pack("4K-Webcams", "4K webcams", "4K webcam", ar="كاميرات 4K", fr="Webcams 4K", it="Webcam 4K", es="Webcams 4K"), "4k-webcams"),
    ("03", pack("Webcam-Stative", "Webcam stands", "Webcam stand", ar="حوامل كاميرا", fr="Supports webcam", it="Supporti webcam", es="Soportes webcam"), "webcam-stative"),
    ("04", pack("Abdeckungen", "Covers", "Kapak", ar="أغطية", fr="Caches", it="Coperture", es="Cubiertas"), "abdeckungen"),
]
USB = [
    ("01", pack("USB-Sticks", "USB sticks", "USB bellek", ar="فلاش USB", fr="Clés USB", it="Chiavette USB", es="Pendrives"), "usb-sticks"),
    ("02", pack("USB-Hubs", "USB hubs", "USB hub", ar="موزعات USB", fr="Hubs USB", it="Hub USB", es="Hubs USB"), "usb-hubs"),
    ("03", pack("USB-C Adapter", "USB-C adapters", "USB-C adaptör", ar="محولات USB-C", fr="Adaptateurs USB-C", it="Adattatori USB-C", es="Adaptadores USB-C"), "usb-c-adapter"),
    ("04", pack("Verlängerungen", "Extensions", "Uzatma", ar="تمديدات", fr="Rallonges", it="Prolunghe", es="Alargadores"), "verlaengerungen"),
]
AUDIO = [
    ("01", pack("PC-Lautsprecher", "PC speakers", "PC hoparlör", ar="سماعات كمبيوتر", fr="Enceintes PC", it="Speaker PC", es="Altavoces PC"), "pc-lautsprecher"),
    ("02", pack("Studiomonitore", "Studio monitors", "Stüdyo monitör", ar="شاشات استوديو", fr="Moniteurs studio", it="Monitor studio", es="Monitores estudio"), "studiomonitore"),
    ("03", pack("Soundkarten", "Sound cards", "Ses kartı", ar="بطاقات صوت", fr="Cartes son", it="Schede audio", es="Tarjetas sonido"), "soundkarten"),
    ("04", pack("Mikrofone", "Microphones", "Mikrofon", ar="ميكروفونات", fr="Micros", it="Microfoni", es="Micrófonos"), "mikrofone"),
]
STOR = [
    ("01", pack("Externe SSDs", "External SSDs", "Harici SSD", ar="SSD خارجي", fr="SSD externes", it="SSD esterni", es="SSD externos"), "externe-ssds"),
    ("02", pack("Externe Festplatten", "External HDDs", "Harici disk", ar="أقراص خارجية", fr="Disques externes", it="HDD esterni", es="Discos externos"), "externe-festplatten"),
    ("03", pack("Kartenleser", "Card readers", "Kart okuyucu", ar="قارئ بطاقات", fr="Lecteurs de cartes", it="Lettori schede", es="Lectores tarjetas"), "kartenleser"),
    ("04", pack("NAS-Zubehör", "NAS extras", "NAS aksesuarı", ar="ملحقات NAS", fr="Accessoires NAS", it="Accessori NAS", es="Accesorios NAS"), "nas-zubehoer"),
]
EXISTING = {
    "cat-38-01": (pack("Laptop-Zubehör", "Laptop accessories", "Laptop aksesuarı", ar="ملحقات لابتوب", fr="Accessoires laptop", it="Accessori laptop", es="Accesorios portátil"), LAPTOP),
    "cat-38-02": (pack("Tastatur & Maus", "Keyboard & mouse", "Klavye ve mouse", ar="لوحة وفأرة", fr="Clavier et souris", it="Tastiera e mouse", es="Teclado y ratón"), KM),
    "cat-38-03": (pack("Monitor-Zubehör", "Monitor accessories", "Monitör aksesuarı", ar="ملحقات شاشة", fr="Accessoires écran", it="Accessori monitor", es="Accesorios monitor"), MON),
    "cat-38-04": (pack("Gaming-Zubehör", "Gaming accessories", "Oyuncu aksesuarı", ar="ملحقات ألعاب", fr="Accessoires gaming", it="Accessori gaming", es="Accesorios gaming"), GAME),
    "cat-38-05": (pack("Webcams", "Webcams", "Webcam", ar="كاميرات ويب", fr="Webcams", it="Webcam", es="Webcams"), CAM),
    "cat-38-06": (pack("USB-Zubehör", "USB accessories", "USB aksesuarı", ar="ملحقات USB", fr="Accessoires USB", it="Accessori USB", es="Accesorios USB"), USB),
}
NEW_L2 = [
    ("07", "pc-audio", pack("PC-Audio", "PC audio", "PC ses", ar="صوت الكمبيوتر", fr="Audio PC", it="Audio PC", es="Audio PC"), AUDIO),
    ("08", "speicher", pack("Speicher", "Storage", "Depolama", ar="تخزين", fr="Stockage", it="Storage", es="Almacenamiento"), STOR),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-38")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-38-{suffix}"
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
