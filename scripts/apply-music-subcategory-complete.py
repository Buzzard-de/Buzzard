#!/usr/bin/env python3
"""Complete Musik & Musikinstrumente (cat-48) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Music placeholder L3 replaced with a real product group"})


GIT = [
    ("01", pack("E-Gitarren", "Electric guitars", "Elektro gitar", ar="قيثارات كهربائية", fr="Guitares électriques", it="Chitarre elettriche", es="Guitarras eléctricas"), "e-gitarren"),
    ("02", pack("Westerngitarren", "Acoustic guitars", "Akustik gitar", ar="قيثارات صوتية", fr="Guitares acoustiques", it="Chitarre acustiche", es="Guitarras acústicas"), "westerngitarren"),
    ("03", pack("Bässe", "Basses", "Bas", ar="باص", fr="Basses", it="Bassi", es="Bajos"), "baesse"),
    ("04", pack("Ukulelen", "Ukuleles", "Ukulele", ar="يوكوليلي", fr="Ukulélés", it="Ukulele", es="Ukeleles"), "ukulelen"),
]
KEYS = [
    ("01", pack("Digitalpianos", "Digital pianos", "Dijital piyano", ar="بيانو رقمي", fr="Pianos numériques", it="Pianoforti digitali", es="Pianos digitales"), "digitalpianos"),
    ("02", pack("Keyboards", "Keyboards", "Klavye", ar="كيبورد", fr="Claviers", it="Tastiere", es="Teclados"), "keyboards"),
    ("03", pack("Synthesizer", "Synthesizers", "Synthesizer", ar="سينث", fr="Synthés", it="Sintetizzatori", es="Sintetizadores"), "synthesizer"),
    ("04", pack("MIDI-Controller", "MIDI controllers", "MIDI kontrol", ar="تحكم MIDI", fr="Contrôleurs MIDI", it="Controller MIDI", es="Controladores MIDI"), "midi-controller"),
]
DRUM = [
    ("01", pack("E-Drums", "E-drums", "Elektronik davul", ar="طبول إلكترونية", fr="Batteries électroniques", it="Batterie elettroniche", es="Baterías electrónicas"), "e-drums"),
    ("02", pack("Akustik-Sets", "Acoustic kits", "Akustik set", ar="طقم صوتي", fr="Kits acoustiques", it="Kit acustici", es="Kits acústicos"), "akustik-sets"),
    ("03", pack("Cymbals", "Cymbals", "Zil", ar="صنج", fr="Cymbales", it="Piatti", es="Platillos"), "cymbals"),
    ("04", pack("Percussion", "Percussion", "Perküsyon", ar="إيقاع", fr="Percussion", it="Percussioni", es="Percusión"), "percussion"),
]
ACC = [
    ("01", pack("Saiten", "Strings", "Tel", ar="أوتار", fr="Cordes", it="Corde", es="Cuerdas"), "saiten"),
    ("02", pack("Plektren", "Picks", "Pena", ar="ريش", fr="Médiator", it="Plettri", es="Púas"), "plektren"),
    ("03", pack("Kapodaster", "Capos", "Kapo", ar="كابو", fr="Capodastres", it="Capotasti", es="Cejillas"), "kapodaster"),
    ("04", pack("Stimmgeräte", "Tuners", "Akort", ar="موالفات", fr="Accordeurs", it="Accordatori", es="Afinadores"), "stimmgeraete"),
]
DJ = [
    ("01", pack("DJ-Controller", "DJ controllers", "DJ kontrol", ar="تحكم DJ", fr="Contrôleurs DJ", it="Controller DJ", es="Controladores DJ"), "dj-controller"),
    ("02", pack("Mischpulte", "Mixers", "Mikser", ar="خلاطات", fr="Mixeurs", it="Mixer", es="Mesas mezcla"), "mischpulte"),
    ("03", pack("Kopfhörer", "Headphones", "Kulaklık", ar="سماعات", fr="Casques", it="Cuffie", es="Auriculares"), "kopfhoerer"),
    ("04", pack("DJ-Software", "DJ software", "DJ yazılım", ar="برمجيات DJ", fr="Logiciels DJ", it="Software DJ", es="Software DJ"), "dj-software"),
]
REC = [
    ("01", pack("Kondensatormikrofone", "Condenser mics", "Kondensatör mik", ar="ميكروفونات مكثفة", fr="Micros condensateur", it="Microfoni condensatore", es="Micros condensador"), "kondensatormikrofone"),
    ("02", pack("Dynamische Mikrofone", "Dynamic mics", "Dinamik mik", ar="ميكروفونات ديناميكية", fr="Micros dynamiques", it="Microfoni dinamici", es="Micros dinámicos"), "dynamische-mikrofone"),
    ("03", pack("Audio-Interfaces", "Audio interfaces", "Ses kartı", ar="واجهات صوت", fr="Interfaces audio", it="Interfacce audio", es="Interfaces audio"), "audio-interfaces"),
    ("04", pack("Popfilter", "Pop filters", "Pop filtre", ar="فلتر بوب", fr="Filtres anti-pop", it="Filtri pop", es="Filtros pop"), "popfilter"),
]
STAND = [
    ("01", pack("Gitarrenständer", "Guitar stands", "Gitar sehpası", ar="حوامل قيثارة", fr="Supports guitare", it="Supporti chitarra", es="Soportes guitarra"), "gitarrenstaender"),
    ("02", pack("Keyboardständer", "Keyboard stands", "Klavye sehpası", ar="حوامل كيبورد", fr="Supports clavier", it="Supporti tastiera", es="Soportes teclado"), "keyboardstaender"),
    ("03", pack("Mikrofonstative", "Mic stands", "Mikrofon sehpası", ar="حوامل ميكروفون", fr="Pieds micro", it="Aste microfono", es="Soportes micro"), "mikrofonstative"),
    ("04", pack("Notenständer", "Music stands", "Nota sehpası", ar="حوامل نوتة", fr="Pupitres", it="Leggii", es="Atriles"), "notenstaender"),
]
WIND = [
    ("01", pack("Saxophone", "Saxophones", "Saksafon", ar="ساكسفون", fr="Saxophones", it="Sassofoni", es="Saxofones"), "saxophone"),
    ("02", pack("Flöten", "Flutes", "Flüt", ar="فلوت", fr="Flûtes", it="Flauti", es="Flautas"), "floeten"),
    ("03", pack("Klarinetten", "Clarinets", "Klarnet", ar="كلارينيت", fr="Clarinettes", it="Clarinetti", es="Clarinetes"), "klarinetten"),
    ("04", pack("Mundharmonikas", "Harmonicas", "Mızıka", ar="هارمونيكا", fr="Harmonicas", it="Armoniche", es="Armónicas"), "mundharmonikas"),
]
EXISTING = {
    "cat-48-01": (pack("Gitarren & Bässe", "Guitars & basses", "Gitar ve bas", ar="قيثارات وباص", fr="Guitares et basses", it="Chitarre e bassi", es="Guitarras y bajos"), GIT),
    "cat-48-02": (pack("Tasteninstrumente", "Keyboards", "Tuşlu çalgılar", ar="لوحات مفاتيح", fr="Claviers", it="Tastiere", es="Teclados"), KEYS),
    "cat-48-03": (pack("Schlagzeug & Percussion", "Drums & percussion", "Davul ve perküsyon", ar="طبول وإيقاع", fr="Batterie et percussion", it="Batteria e percussioni", es="Batería y percusión"), DRUM),
    "cat-48-04": (pack("Musikzubehör", "Music accessories", "Müzik aksesuarı", ar="ملحقات موسيقى", fr="Accessoires musique", it="Accessori musica", es="Accesorios música"), ACC),
}
NEW_L2 = [
    ("05", "dj-und-controller", pack("DJ & Controller", "DJ & controllers", "DJ ve kontrol", ar="DJ وتحكم", fr="DJ et contrôleurs", it="DJ e controller", es="DJ y controladores"), DJ),
    ("06", "mikrofon-und-recording", pack("Mikrofon & Recording", "Mics & recording", "Mikrofon ve kayıt", ar="مايك وتسجيل", fr="Micros et enregistrement", it="Microfoni e recording", es="Micros y grabación"), REC),
    ("07", "stative-und-hardware", pack("Stative & Hardware", "Stands & hardware", "Sehpa ve donanım", ar="حوامل وأجهزة", fr="Pieds et hardware", it="Stativi e hardware", es="Soportes y hardware"), STAND),
    ("08", "blasinstrumente", pack("Blasinstrumente", "Wind instruments", "Nefesli", ar="آلات نفخ", fr="Instruments à vent", it="Fiati", es="Viento"), WIND),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-48")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-48-{suffix}"
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
