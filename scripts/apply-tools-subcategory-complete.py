#!/usr/bin/env python3
"""Complete Werkzeuge & Werkstatt (cat-09) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Tools placeholder L3 replaced with a real product group"})


HAND = [
    ("01", pack("Schraubendreher", "Screwdrivers", "Tornavida", ar="مفكات", fr="Tournevis", it="Cacciaviti", es="Destornilladores"), "schraubendreher"),
    ("02", pack("Zangen", "Pliers", "Pense", ar="كماشات", fr="Pinces", it="Pinze", es="Alicates"), "zangen"),
    ("03", pack("Schraubenschlüssel", "Wrenches", "Anahtar", ar="مفاتيح", fr="Clés", it="Chiavi", es="Llaves"), "schraubenschluessel"),
    ("04", pack("Steckschlüssel", "Sockets", "Lokma", ar="مقابس", fr="Douilles", it="Bussola", es="Vasos"), "steckschluessel"),
    ("05", pack("Hämmer", "Hammers", "Çekiç", ar="مطرقة", fr="Marteaux", it="Martelli", es="Martillos"), "haemmer"),
    ("06", pack("Cuttermesser", "Utility knives", "Maket bıçağı", ar="قواطع", fr="Cutters", it="Cutter", es="Cúter"), "cuttermesser"),
]
POWER = [
    ("01", pack("Bohrmaschinen", "Drills", "Matkap", ar="مثاقب", fr="Perceuses", it="Trapani", es="Taladros"), "bohrmaschinen"),
    ("02", pack("Schlagbohrer", "Hammer drills", "Darbeli matkap", ar="مثاقب طرق", fr="Perceuses à percussion", it="Trapani a percussione", es="Percutores"), "schlagbohrer"),
    ("03", pack("Winkelschleifer", "Angle grinders", "Taşlama", ar="جلخ", fr="Meuleuses", it="Smerigliatrici", es="Amoladoras"), "winkelschleifer"),
    ("04", pack("Stichsägen", "Jigsaws", "Dekupaj", ar="منشار أركت", fr="Scies sauteuses", it="Seghetti", es="Sierras de calar"), "stichsaegen"),
    ("05", pack("Kreissägen", "Circular saws", "Daire testere", ar="منشار دائري", fr="Scies circulaires", it="Seghe circolari", es="Sierras circulares"), "kreissaegen"),
    ("06", pack("Schleifer", "Sanders", "Zımpara", ar="صنفرة", fr="Ponceuses", it="Levigatrici", es="Lijadoras"), "schleifer"),
]
CORDLESS = [
    ("01", pack("Akkubohrer", "Cordless drills", "Akülü matkap", ar="مثاقب بطارية", fr="Perceuses sans fil", it="Trapani a batteria", es="Taladros batería"), "akkubohrer"),
    ("02", pack("Akkuschrauber", "Impact drivers", "Akülü vidalama", ar="مفكات بطارية", fr="Visseuses", it="Avvitatori", es="Atornilladores"), "akkuschrauber"),
    ("03", pack("Akku-Schleifer", "Cordless grinders", "Akülü taşlama", ar="جلخ بطارية", fr="Meuleuses batterie", it="Smerigliatrici batteria", es="Amoladoras batería"), "akku-schleifer"),
    ("04", pack("Akku-Sägen", "Cordless saws", "Akülü testere", ar="مناشير بطارية", fr="Scies batterie", it="Seghe batteria", es="Sierras batería"), "akku-saegen"),
    ("05", pack("Akkus & Ladegeräte", "Batteries & chargers", "Batarya ve şarj", ar="بطاريات", fr="Batteries et chargeurs", it="Batterie e caricatori", es="Baterías y cargadores"), "akkus-und-ladegeraete"),
]
MEASURE = [
    ("01", pack("Maßbänder", "Tape measures", "Metre", ar="أشرطة قياس", fr="Mètres", it="Flessometri", es="Cintas métricas"), "massbaender"),
    ("02", pack("Laser-Entfernungsmesser", "Laser measures", "Lazer metre", ar="ليزر", fr="Télémètres laser", it="Distanzometri", es="Medidores láser"), "laser-entfernungsmesser"),
    ("03", pack("Wasserwaagen", "Spirit levels", "Su terazisi", ar="ميزان ماء", fr="Niveaux", it="Livelle", es="Niveles"), "wasserwaagen"),
    ("04", pack("Messschieber", "Calipers", "Kumpas", ar="قدمة", fr="Pieds à coulisse", it="Calibri", es="Calibres"), "messschieber"),
    ("05", pack("Multimeter", "Multimeters", "Multimetre", ar="ملتيمتر", fr="Multimètres", it="Multimetri", es="Multímetros"), "multimeter"),
]
CUT = [
    ("01", pack("Bohrer", "Drill bits", "Matkap ucu", ar="لقم", fr="Forets", it="Punte", es="Brocas"), "bohrer"),
    ("02", pack("Sägeblätter", "Saw blades", "Testere ağzı", ar="شفرات", fr="Lames", it="Lame", es="Hojas"), "saegeblaetter"),
    ("03", pack("Fräser", "Cutters", "Freze", ar="قواطع", fr="Fraises", it="Frese", es="Fresas"), "fraeser"),
    ("04", pack("Lochsägen", "Hole saws", "Delik testeresi", ar="مناشير ثقوب", fr="Scies-cloches", it="Seghe a tazza", es="Sierras de copa"), "lochsaegen"),
]
FAST = [
    ("01", pack("Schrauben", "Screws", "Vida", ar="براغي", fr="Vis", it="Viti", es="Tornillos"), "schrauben"),
    ("02", pack("Muttern", "Nuts", "Somun", ar="صواميل", fr="Écrous", it="Dadi", es="Tuercas"), "muttern"),
    ("03", pack("Dübel", "Wall plugs", "Dübel", ar="مسامير جدار", fr="Chevilles", it="Tasselli", es="Tacos"), "duebel"),
    ("04", pack("Unterlegscheiben", "Washers", "Pul", ar="حلقات", fr="Rondelles", it="Rondelle", es="Arandelas"), "unterlegscheiben"),
    ("05", pack("Nieten", "Rivets", "Perçin", ar="برشام", fr="Rivets", it="Rivetti", es="Remaches"), "nieten"),
    ("06", pack("Anker", "Anchors", "Ankraj", ar="مراسي", fr="Ancrages", it="Ancoranti", es="Anclajes"), "anker"),
]
IRON = [
    ("01", pack("Scharniere", "Hinges", "Menteşe", ar="مفصلات", fr="Charnières", it="Cerniere", es="Bisagras"), "scharniere"),
    ("02", pack("Beschläge", "Fittings", "Aksesuar", ar="تجهيزات", fr="Ferrures", it="Ferramenta", es="Herrajes"), "beschlaege"),
    ("03", pack("Vorhängeschlösser", "Padlocks", "Asma kilit", ar="أقفال", fr="Cadenas", it="Lucchetti", es="Candados"), "vorhaengeschloesser"),
    ("04", pack("Ketten", "Chains", "Zincir", ar="سلاسل", fr="Chaînes", it="Catene", es="Cadenas"), "ketten"),
]
SHOP = [
    ("01", pack("Werkbänke", "Workbenches", "Tezgah", ar="طاولات عمل", fr="Établis", it="Banchi", es="Bancos"), "werkbaenke"),
    ("02", pack("Schraubstöcke", "Vises", "Mengene", ar="ملزم", fr="Étaux", it="Morse", es="Tornillos de banco"), "schraubstoecke"),
    ("03", pack("Werkstattwagen", "Tool trolleys", "Alet arabası", ar="عربات", fr="Servantes", it="Carrelli", es="Carros"), "werkstattwagen"),
    ("04", pack("Aufbewahrung", "Storage", "Depolama", ar="تخزين", fr="Rangement", it="Stoccaggio", es="Almacenaje"), "aufbewahrung"),
]
EXISTING = {
    "cat-09-01": (pack("Handwerkzeuge", "Hand tools", "El aletleri", ar="أدوات يدوية", fr="Outils à main", it="Utensili manuali", es="Herramientas manuales"), HAND),
    "cat-09-02": (pack("Elektrowerkzeuge", "Power tools", "Elektrikli el aleti", ar="أدوات كهربائية", fr="Outils électriques", it="Elettroutensili", es="Herramientas eléctricas"), POWER),
    "cat-09-03": (pack("Akku-Werkzeuge", "Cordless tools", "Akülü alet", ar="أدوات بطارية", fr="Outils sans fil", it="Utensili a batteria", es="Herramientas a batería"), CORDLESS),
    "cat-09-04": (pack("Messwerkzeuge", "Measuring tools", "Ölçüm aleti", ar="أدوات قياس", fr="Outils de mesure", it="Strumenti di misura", es="Herramientas de medición"), MEASURE),
    "cat-09-05": (pack("Schneiden & Bohren", "Cutting & drilling", "Kesme ve delme", ar="قطع وثقب", fr="Coupe et perçage", it="Taglio e foratura", es="Corte y taladro"), CUT),
    "cat-09-06": (pack("Befestigungstechnik", "Fasteners", "Bağlantı elemanı", ar="مثبتات", fr="Fixations", it="Fissaggi", es="Fijaciones"), FAST),
    "cat-09-07": (pack("Eisenwaren", "Ironmongery", "Hırdavat", ar="حديديات", fr="Quincaillerie", it="Ferramenta", es="Cerrajería"), IRON),
    "cat-09-08": (pack("Werkstattausrüstung", "Workshop equipment", "Atölye ekipmanı", ar="معدات ورشة", fr="Équipement atelier", it="Attrezzatura officina", es="Equipo taller"), SHOP),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-09")
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
