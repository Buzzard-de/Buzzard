#!/usr/bin/env python3
"""Complete Elektronik (cat-12) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Electronics placeholder L3 replaced with a real product group"})


PHONE = [
    ("01", pack("Hüllen", "Cases", "Kılıf", ar="أغطية", fr="Coques", it="Cover", es="Fundas"), "huellen"),
    ("02", pack("Displayschutz", "Screen protectors", "Ekran koruyucu", ar="واقي شاشة", fr="Protection écran", it="Pellicole", es="Protectores"), "displayschutz"),
    ("03", pack("Halterungen", "Holders", "Tutucu", ar="حوامل", fr="Supports", it="Supporti", es="Soportes"), "halterungen"),
    ("04", pack("Ladekabel", "Charge cables", "Şarj kablosu", ar="كابل شحن", fr="Câbles charge", it="Cavi ricarica", es="Cables carga"), "ladekabel"),
    ("05", pack("Netzteile", "Chargers", "Adaptör", ar="شواحن", fr="Chargeurs", it="Caricatori", es="Cargadores"), "netzteile"),
]
PC = [
    ("01", pack("Mäuse", "Mice", "Mouse", ar="فأرة", fr="Souris", it="Mouse", es="Ratones"), "maeuse"),
    ("02", pack("Tastaturen", "Keyboards", "Klavye", ar="لوحات مفاتيح", fr="Claviers", it="Tastiere", es="Teclados"), "tastaturen"),
    ("03", pack("USB-Hubs", "USB hubs", "USB hub", ar="موزعات USB", fr="Hubs USB", it="Hub USB", es="Hubs USB"), "usb-hubs"),
    ("04", pack("Webcams", "Webcams", "Webcam", ar="كاميرات ويب", fr="Webcams", it="Webcam", es="Webcams"), "webcams"),
]
CABLE = [
    ("01", pack("USB-C", "USB-C", "USB-C", ar="USB-C", fr="USB-C", it="USB-C", es="USB-C"), "usb-c"),
    ("02", pack("HDMI", "HDMI", "HDMI", ar="HDMI", fr="HDMI", it="HDMI", es="HDMI"), "hdmi"),
    ("03", pack("DisplayPort", "DisplayPort", "DisplayPort", ar="DisplayPort", fr="DisplayPort", it="DisplayPort", es="DisplayPort"), "displayport"),
    ("04", pack("Ethernet", "Ethernet", "Ethernet", ar="إيثرنت", fr="Ethernet", it="Ethernet", es="Ethernet"), "ethernet"),
    ("05", pack("Ladeadapter", "Charge adapters", "Şarj adaptörü", ar="محولات شحن", fr="Adaptateurs charge", it="Adattatori", es="Adaptadores"), "ladeadapter"),
]
CHARGE = [
    ("01", pack("Wandladegeräte", "Wall chargers", "Duvar şarj", ar="شواحن جدارية", fr="Chargeurs muraux", it="Caricatori muro", es="Cargadores pared"), "wandladegeraete"),
    ("02", pack("Kfz-Ladegeräte", "Car chargers", "Araç şarj", ar="شواحن سيارة", fr="Chargeurs auto", it="Caricatori auto", es="Cargadores auto"), "kfz-ladegeraete"),
    ("03", pack("Induktiv", "Wireless", "Kablosuz", ar="لاسلكي", fr="Sans fil", it="Wireless", es="Inalámbrico"), "induktiv"),
    ("04", pack("Powerbanks", "Power banks", "Powerbank", ar="باور بانك", fr="Batteries externes", it="Power bank", es="Power banks"), "powerbanks"),
]
AUDIO = [
    ("01", pack("Kopfhörer", "Headphones", "Kulaklık", ar="سماعات", fr="Casques", it="Cuffie", es="Auriculares"), "kopfhoerer"),
    ("02", pack("True Wireless", "TWS", "TWS", ar="TWS", fr="TWS", it="TWS", es="TWS"), "true-wireless"),
    ("03", pack("Bluetooth-Lautsprecher", "Bluetooth speakers", "Bluetooth hoparlör", ar="سماعات بلوتوث", fr="Enceintes BT", it="Speaker BT", es="Altavoces BT"), "bluetooth-lautsprecher"),
    ("04", pack("Mikrofone", "Microphones", "Mikrofon", ar="ميكروفونات", fr="Micros", it="Microfoni", es="Micrófonos"), "mikrofone"),
]
SMART = [
    ("01", pack("Smart-Steckdosen", "Smart plugs", "Akıllı priz", ar="مقابس ذكية", fr="Prises connectées", it="Prese smart", es="Enchufes smart"), "smart-steckdosen"),
    ("02", pack("Smart-Lampen", "Smart bulbs", "Akıllı ampul", ar="لمبات ذكية", fr="Ampoules connectées", it="Lampadine smart", es="Bombillas smart"), "smart-lampen"),
    ("03", pack("Sensoren", "Sensors", "Sensör", ar="حساسات", fr="Capteurs", it="Sensori", es="Sensores"), "sensoren"),
    ("04", pack("Hubs", "Hubs", "Hub", ar="محاور", fr="Hubs", it="Hub", es="Hubs"), "hubs"),
]
CAM = [
    ("01", pack("Innenkameras", "Indoor cameras", "İç mekan kamera", ar="كاميرات داخلية", fr="Caméras intérieures", it="Telecamere interne", es="Cámaras interior"), "innenkameras"),
    ("02", pack("Außenkameras", "Outdoor cameras", "Dış mekan kamera", ar="كاميرات خارجية", fr="Caméras extérieures", it="Telecamere esterne", es="Cámaras exterior"), "aussenkameras"),
    ("03", pack("WLAN-Kameras", "Wi-Fi cameras", "Wi-Fi kamera", ar="كاميرات واي فاي", fr="Caméras Wi-Fi", it="Telecamere Wi-Fi", es="Cámaras Wi-Fi"), "wlan-kameras"),
    ("04", pack("NVR", "NVR", "NVR", ar="NVR", fr="NVR", it="NVR", es="NVR"), "nvr"),
    ("05", pack("Kamera-Zubehör", "Camera accessories", "Kamera aksesuarı", ar="ملحقات كاميرا", fr="Accessoires caméra", it="Accessori camera", es="Accesorios cámara"), "kamera-zubehoer"),
]
ACC = [
    ("01", pack("SSD & Speicher", "SSD & storage", "SSD ve bellek", ar="تخزين", fr="Stockage", it="Storage", es="Almacenamiento"), "ssd-und-speicher"),
    ("02", pack("TV-Zubehör", "TV accessories", "TV aksesuarı", ar="ملحقات تلفاز", fr="Accessoires TV", it="Accessori TV", es="Accesorios TV"), "tv-zubehoer"),
    ("03", pack("Fernbedienungen", "Remotes", "Kumanda", ar="ريموت", fr="Télécommandes", it="Telecomandi", es="Mandos"), "fernbedienungen"),
    ("04", pack("Ständer", "Stands", "Stand", ar="حوامل", fr="Supports", it="Supporti", es="Soportes"), "staender"),
]
EXISTING = {
    "cat-12-01": (pack("Telefonzubehör", "Phone accessories", "Telefon aksesuarı", ar="إكسسوارات هاتف", fr="Accessoires téléphone", it="Accessori telefono", es="Accesorios teléfono"), PHONE),
    "cat-12-02": (pack("Computerzubehör", "Computer accessories", "Bilgisayar aksesuarı", ar="إكسسوارات كمبيوتر", fr="Accessoires PC", it="Accessori PC", es="Accesorios PC"), PC),
    "cat-12-03": (pack("Kabel & Adapter", "Cables & adapters", "Kablo ve adaptör", ar="كابلات ومحولات", fr="Câbles et adaptateurs", it="Cavi e adattatori", es="Cables y adaptadores"), CABLE),
    "cat-12-04": (pack("Laden", "Charging", "Şarj", ar="شحن", fr="Charge", it="Ricarica", es="Carga"), CHARGE),
    "cat-12-05": (pack("Audio", "Audio", "Ses", ar="صوت", fr="Audio", it="Audio", es="Audio"), AUDIO),
    "cat-12-06": (pack("Smart Home", "Smart home", "Akıllı ev", ar="منزل ذكي", fr="Maison connectée", it="Smart home", es="Hogar inteligente"), SMART),
    "cat-12-07": (pack("Sicherheitskameras", "Security cameras", "Güvenlik kamerası", ar="كاميرات أمن", fr="Caméras de sécurité", it="Telecamere sicurezza", es="Cámaras de seguridad"), CAM),
    "cat-12-08": (pack("Elektronik-Zubehör", "Electronics extras", "Elektronik aksesuar", ar="ملحقات إلكترونيات", fr="Accessoires électronique", it="Accessori elettronica", es="Accesorios electrónica"), ACC),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-12")
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
