#!/usr/bin/env python3
"""Complete Bücher, Medien & Unterhaltung (cat-49) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Books media placeholder L3 replaced with a real product group"})


BOOKS = [
    ("01", pack("Belletristik", "Fiction", "Kurgu", ar="روايات", fr="Fiction", it="Narrativa", es="Ficción"), "belletristik"),
    ("02", pack("Sachbücher", "Non-fiction", "Kurgu dışı", ar="غير روائي", fr="Essais", it="Saggistica", es="No ficción"), "sachbuecher"),
    ("03", pack("Kinderbücher", "Children's books", "Çocuk kitabı", ar="كتب أطفال", fr="Livres enfants", it="Libri bambini", es="Libros infantiles"), "kinderbuecher"),
    ("04", pack("Ratgeber", "Guides", "Rehber", ar="أدلة", fr="Guides", it="Guide", es="Guías"), "ratgeber"),
]
FILM = [
    ("01", pack("Blu-ray", "Blu-ray", "Blu-ray", ar="بلو راي", fr="Blu-ray", it="Blu-ray", es="Blu-ray"), "blu-ray"),
    ("02", pack("DVD", "DVD", "DVD", ar="دي في دي", fr="DVD", it="DVD", es="DVD"), "dvd"),
    ("03", pack("4K UHD", "4K UHD", "4K UHD", ar="4K", fr="4K UHD", it="4K UHD", es="4K UHD"), "4k-uhd"),
    ("04", pack("Serien-Boxen", "TV box sets", "Dizi kutusu", ar="مسلسلات", fr="Coffrets séries", it="Box serie", es="Packs series"), "serien-boxen"),
]
MG = [
    ("01", pack("Vinyl", "Vinyl", "Plak", ar="فينيلي", fr="Vinyles", it="Vinili", es="Vinilos"), "vinyl"),
    ("02", pack("CDs", "CDs", "CD", ar="أقراص", fr="CD", it="CD", es="CDs"), "cds"),
    ("03", pack("PC-Spiele", "PC games", "PC oyunu", ar="ألعاب كمبيوتر", fr="Jeux PC", it="Giochi PC", es="Juegos PC"), "pc-spiele"),
    ("04", pack("Konsolenspiele", "Console games", "Konsol oyunu", ar="ألعاب منصات", fr="Jeux console", it="Giochi console", es="Juegos consola"), "konsolenspiele"),
]
MAG = [
    ("01", pack("Zeitschriften", "Magazines", "Dergi", ar="مجلات", fr="Magazines", it="Riviste", es="Revistas"), "zeitschriften"),
    ("02", pack("Zeitungen", "Newspapers", "Gazete", ar="صحف", fr="Journaux", it="Quotidiani", es="Periódicos"), "zeitungen"),
    ("03", pack("Jahresabos", "Subscriptions", "Abonelik", ar="اشتراكات", fr="Abonnements", it="Abbonamenti", es="Suscripciones"), "jahresabos"),
    ("04", pack("Sonderhefte", "Special issues", "Özel sayı", ar="أعداد خاصة", fr="Numéros spéciaux", it="Numeri speciali", es="Números especiales"), "sonderhefte"),
]
AUDIO = [
    ("01", pack("Hörbücher", "Audiobooks", "Sesli kitap", ar="كتب صوتية", fr="Livres audio", it="Audiolibri", es="Audiolibros"), "hoerbuecher"),
    ("02", pack("Podcast-Boxen", "Podcast boxes", "Podcast kutusu", ar="بودكاست", fr="Coffrets podcast", it="Box podcast", es="Packs podcast"), "podcast-boxen"),
    ("03", pack("Hörspiele", "Audio dramas", "Radyo tiyatrosu", ar="مسرحيات صوتية", fr="Pièces audio", it="Radiodrammi", es="Radioteatro"), "hoerspiele"),
    ("04", pack("Sprachkurse Audio", "Language audio", "Dil sesi", ar="دورات صوتية", fr="Cours audio", it="Corsi audio", es="Cursos audio"), "sprachkurse-audio"),
]
EREADER = [
    ("01", pack("E-Reader-Hüllen", "E-reader cases", "E-kitap kılıfı", ar="أغطية قارئ", fr="Étuis liseuse", it="Cover e-reader", es="Fundas e-reader"), "e-reader-huellen"),
    ("02", pack("Displayschutz", "Screen protectors", "Ekran koruyucu", ar="واقي شاشة", fr="Protection écran", it="Pellicole", es="Protectores"), "displayschutz"),
    ("03", pack("Ladegeräte", "Chargers", "Şarj", ar="شواحن", fr="Chargeurs", it="Caricatori", es="Cargadores"), "ladegeraete"),
    ("04", pack("Leselampen", "Reading lights", "Okuma lambası", ar="أضواء قراءة", fr="Lampes lecture", it="Luci lettura", es="Luces lectura"), "leselampen"),
]
COMIC = [
    ("01", pack("Comics", "Comics", "Çizgi roman", ar="قصص مصورة", fr="BD", it="Fumetti", es="Cómics"), "comics"),
    ("02", pack("Manga", "Manga", "Manga", ar="مانغا", fr="Manga", it="Manga", es="Manga"), "manga"),
    ("03", pack("Graphic Novels", "Graphic novels", "Grafik roman", ar="روايات مصورة", fr="Romans graphiques", it="Graphic novel", es="Novelas gráficas"), "graphic-novels"),
    ("04", pack("Sammelbände", "Omnibuses", "Derleme", ar="مجلدات", fr="Intégrales", it="Raccolte", es="Integrales"), "sammelbaende"),
]
LEARN = [
    ("01", pack("Lehrbücher", "Textbooks", "Ders kitabı", ar="كتب دراسية", fr="Manuels", it="Manuali", es="Libros de texto"), "lehrbuecher"),
    ("02", pack("Sprachkurse", "Language courses", "Dil kursu", ar="دورات لغة", fr="Cours de langue", it="Corsi lingua", es="Cursos idioma"), "sprachkurse"),
    ("03", pack("Prüfungsvorbereitung", "Exam prep", "Sınav hazırlık", ar="تحضير امتحان", fr="Préparation examens", it="Preparazione esami", es="Preparación exámenes"), "pruefungsvorbereitung"),
    ("04", pack("Nachschlagewerke", "Reference", "Başvuru", ar="مراجع", fr="Ouvrages référence", it="Opere consultazione", es="Obras consulta"), "nachschlagewerke"),
]
EXISTING = {
    "cat-49-01": (pack("Bücher", "Books", "Kitap", ar="كتب", fr="Livres", it="Libri", es="Libros"), BOOKS),
    "cat-49-02": (pack("Filme & Serien", "Films & series", "Film ve dizi", ar="أفلام ومسلسلات", fr="Films et séries", it="Film e serie", es="Películas y series"), FILM),
    "cat-49-03": (pack("Musik & Games", "Music & games", "Müzik ve oyun", ar="موسيقى وألعاب", fr="Musique et jeux", it="Musica e giochi", es="Música y juegos"), MG),
    "cat-49-04": (pack("Zeitschriften & Medien", "Magazines & media", "Dergi ve medya", ar="مجلات وإعلام", fr="Magazines et médias", it="Riviste e media", es="Revistas y medios"), MAG),
}
NEW_L2 = [
    ("05", "hoerbuecher", pack("Hörbücher", "Audiobooks", "Sesli kitap", ar="كتب صوتية", fr="Livres audio", it="Audiolibri", es="Audiolibros"), AUDIO),
    ("06", "e-reader-zubehoer", pack("E-Reader-Zubehör", "E-reader extras", "E-kitap aksesuarı", ar="ملحقات قارئ", fr="Accessoires liseuse", it="Accessori e-reader", es="Accesorios e-reader"), EREADER),
    ("07", "comics-und-manga", pack("Comics & Manga", "Comics & manga", "Çizgi roman ve manga", ar="قصص ومانغا", fr="BD et manga", it="Fumetti e manga", es="Cómics y manga"), COMIC),
    ("08", "lernmedien", pack("Lernmedien", "Learning media", "Öğrenme medyası", ar="وسائط تعليم", fr="Médias éducatifs", it="Media didattici", es="Medios educativos"), LEARN),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-49")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-49-{suffix}"
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
