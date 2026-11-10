#!/usr/bin/env python3
"""Complete Smart Home & Sicherheit (cat-31) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Security placeholder L3 replaced with a real product group"})


CAM = [
    ("01", pack("Innenkameras", "Indoor cameras", "İç mekan kamera", ar="كاميرات داخلية", fr="Caméras intérieures", it="Telecamere interne", es="Cámaras interior"), "innenkameras"),
    ("02", pack("Außenkameras", "Outdoor cameras", "Dış mekan kamera", ar="كاميرات خارجية", fr="Caméras extérieures", it="Telecamere esterne", es="Cámaras exterior"), "aussenkameras"),
    ("03", pack("WLAN-Kameras", "Wi-Fi cameras", "Wi-Fi kamera", ar="كاميرات واي فاي", fr="Caméras Wi-Fi", it="Telecamere Wi-Fi", es="Cámaras Wi-Fi"), "wlan-kameras"),
    ("04", pack("NVR", "NVR", "NVR", ar="NVR", fr="NVR", it="NVR", es="NVR"), "nvr"),
    ("05", pack("Kamera-Zubehör", "Camera extras", "Kamera aksesuarı", ar="ملحقات كاميرا", fr="Accessoires caméra", it="Accessori camera", es="Accesorios cámara"), "kamera-zubehoer"),
]
ALARM = [
    ("01", pack("Alarmanlagen", "Alarm systems", "Alarm sistemi", ar="أنظمة إنذار", fr="Alarmes", it="Allarmi", es="Alarmas"), "alarmanlagen"),
    ("02", pack("Funk-Alarme", "Wireless alarms", "Kablosuz alarm", ar="إنذار لاسلكي", fr="Alarmes sans fil", it="Allarmi wireless", es="Alarmas inalámbricas"), "funk-alarme"),
    ("03", pack("Sirenen", "Sirens", "Siren", ar="صفارات", fr="Sirènes", it="Sirene", es="Sirenas"), "sirenen"),
    ("04", pack("Bedienteile", "Keypads", "Tuş takımı", ar="لوحات تحكم", fr="Claviers", it="Tastierini", es="Teclados"), "bedienteile"),
]
SENS = [
    ("01", pack("Bewegungsmelder", "Motion sensors", "Hareket sensörü", ar="حساسات حركة", fr="Détecteurs mouvement", it="Sensori movimento", es="Sensores movimiento"), "bewegungsmelder"),
    ("02", pack("Türkontakte", "Door contacts", "Kapı kontağı", ar="ملامسات باب", fr="Contacts porte", it="Contatti porta", es="Contactos puerta"), "tuerkontakte"),
    ("03", pack("Glasbruchmelder", "Glass-break sensors", "Cam kırılma", ar="كسر زجاج", fr="Bris de vitre", it="Rottura vetro", es="Rotura cristal"), "glasbruchmelder"),
    ("04", pack("Wassermelder", "Water sensors", "Su alarmı", ar="حساسات ماء", fr="Détecteurs eau", it="Sensori acqua", es="Sensores agua"), "wassermelder"),
]
DOOR = [
    ("01", pack("Türschlösser", "Door locks", "Kapı kilidi", ar="أقفال باب", fr="Serrures porte", it="Serrature porta", es="Cerraduras puerta"), "tuerschloesser"),
    ("02", pack("Smart Locks", "Smart locks", "Akıllı kilit", ar="أقفال ذكية", fr="Serrures connectées", it="Serrature smart", es="Cerraduras smart"), "smart-locks"),
    ("03", pack("Türspione", "Door viewers", "Kapı dürbünü", ar="عيون باب", fr="Judas", it="Spioncini", es="Mirillas"), "tuerspione"),
    ("04", pack("Sicherheitsketten", "Door chains", "Güvenlik zinciri", ar="سلاسل أمان", fr="Chaînes de porte", it="Catene porta", es="Cadenas puerta"), "sicherheitsketten"),
]
SAFE = [
    ("01", pack("Möbeltresore", "Furniture safes", "Mobilya kasa", ar="خزائن أثاث", fr="Coffres meuble", it="Casseforti mobile", es="Cajas mueble"), "moebeltresore"),
    ("02", pack("Wandtresore", "Wall safes", "Duvar kasa", ar="خزائن جدارية", fr="Coffres muraux", it="Casseforti muro", es="Cajas pared"), "wandtresore"),
    ("03", pack("Vorhängeschlösser", "Padlocks", "Asma kilit", ar="أقفال حافظة", fr="Cadenas", it="Lucchetti", es="Candados"), "vorhaengeschloesser"),
    ("04", pack("Schlüsselkästen", "Key cabinets", "Anahtar dolabı", ar="خزائن مفاتيح", fr="Boîtes clés", it="Cassette chiavi", es="Cajas llaves"), "schluesselkaesten"),
]
ACC = [
    ("01", pack("Attrappen", "Dummy cameras", "Sahte kamera", ar="كاميرات وهمية", fr="Caméras factices", it="Telecamere fittizie", es="Cámaras dummy"), "attrappen"),
    ("02", pack("Fensteralarme", "Window alarms", "Pencere alarmı", ar="إنذار نافذة", fr="Alarmes fenêtre", it="Allarmi finestra", es="Alarmas ventana"), "fensteralarme"),
    ("03", pack("Montagezubehör", "Mounting extras", "Montaj aksesuarı", ar="ملحقات تركيب", fr="Accessoires montage", it="Accessori montaggio", es="Accesorios montaje"), "montagezubehoer"),
    ("04", pack("Ersatzakkus", "Spare batteries", "Yedek batarya", ar="بطاريات احتياطية", fr="Batteries de rechange", it="Batterie ricambio", es="Baterías recambio"), "ersatzakkus"),
]
BELL = [
    ("01", pack("Video-Türklingeln", "Video doorbells", "Video zil", ar="أجراس فيديو", fr="Sonnettes vidéo", it="Campanelli video", es="Timbre vídeo"), "video-tuerklingeln"),
    ("02", pack("Funkklingeln", "Wireless doorbells", "Kablosuz zil", ar="أجراس لاسلكية", fr="Sonnettes sans fil", it="Campanelli wireless", es="Timbres inalámbricos"), "funkklingeln"),
    ("03", pack("Gong", "Chimes", "Gong", ar="أجراس داخلية", fr="Carillons", it="Suonerie", es="Timbre interior"), "gong"),
    ("04", pack("Klingel-Zubehör", "Doorbell extras", "Zil aksesuarı", ar="ملحقات جرس", fr="Accessoires sonnette", it="Accessori campanello", es="Accesorios timbre"), "klingel-zubehoer"),
]
SMOKE = [
    ("01", pack("Rauchmelder", "Smoke detectors", "Duman dedektörü", ar="كاشفات دخان", fr="Détecteurs fumée", it="Rilevatori fumo", es="Detectores humo"), "rauchmelder"),
    ("02", pack("CO-Melder", "CO alarms", "CO alarmı", ar="إنذار أول أكسيد", fr="Détecteurs CO", it="Rilevatori CO", es="Detectores CO"), "co-melder"),
    ("03", pack("Hitzemelder", "Heat alarms", "Isı alarmı", ar="كاشفات حرارة", fr="Détecteurs chaleur", it="Rilevatori calore", es="Detectores calor"), "hitzemelder"),
    ("04", pack("Vernetzte Melder", "Linked alarms", "Bağlı alarm", ar="إنذارات متصلة", fr="Alarmes liées", it="Allarmi collegati", es="Alarmas enlazadas"), "vernetzte-melder"),
]
EXISTING = {
    "cat-31-01": (pack("Sicherheitskameras", "Security cameras", "Güvenlik kamerası", ar="كاميرات أمن", fr="Caméras de sécurité", it="Telecamere sicurezza", es="Cámaras de seguridad"), CAM),
    "cat-31-02": (pack("Alarmanlagen", "Alarm systems", "Alarm sistemi", ar="أنظمة إنذار", fr="Systèmes d'alarme", it="Sistemi allarme", es="Sistemas de alarma"), ALARM),
    "cat-31-03": (pack("Sensoren", "Sensors", "Sensör", ar="حساسات", fr="Capteurs", it="Sensori", es="Sensores"), SENS),
    "cat-31-04": (pack("Türsicherheit", "Door security", "Kapı güvenliği", ar="أمن الباب", fr="Sécurité porte", it="Sicurezza porta", es="Seguridad puerta"), DOOR),
    "cat-31-05": (pack("Tresor & Schloss", "Safes & locks", "Kasa ve kilit", ar="خزائن وأقفال", fr="Coffres et serrures", it="Casseforti e lucchetti", es="Cajas y candados"), SAFE),
    "cat-31-06": (pack("Sicherheits-Zubehör", "Security extras", "Güvenlik aksesuarı", ar="ملحقات أمن", fr="Accessoires sécurité", it="Accessori sicurezza", es="Accesorios seguridad"), ACC),
}
NEW_L2 = [
    ("07", "video-tuerklingeln", pack("Video-Türklingeln", "Video doorbells", "Video kapı zili", ar="جرس فيديو", fr="Sonnettes vidéo", it="Campanelli video", es="Timbres de vídeo"), BELL),
    ("08", "rauch-und-co", pack("Rauch- & CO-Melder", "Smoke & CO alarms", "Duman ve CO", ar="دخان وأول أكسيد", fr="Fumée et CO", it="Fumo e CO", es="Humo y CO"), SMOKE),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-31")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-31-{suffix}"
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
