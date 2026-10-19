#!/usr/bin/env python3
"""Complete Arbeitskleidung & Arbeitsschutz (cat-08) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Workwear placeholder L3 replaced with a real product group"})


SHOES = [
    ("01", pack("S1", "S1", "S1", ar="S1", fr="S1", it="S1", es="S1"), "s1"),
    ("02", pack("S1P", "S1P", "S1P", ar="S1P", fr="S1P", it="S1P", es="S1P"), "s1p"),
    ("03", pack("S2", "S2", "S2", ar="S2", fr="S2", it="S2", es="S2"), "s2"),
    ("04", pack("S3", "S3", "S3", ar="S3", fr="S3", it="S3", es="S3"), "s3"),
    ("05", pack("SRC", "SRC", "SRC", ar="SRC", fr="SRC", it="SRC", es="SRC"), "src"),
    ("06", pack("Stahlkappe", "Steel toe", "Çelik burun", ar="مقدمة فولاذية", fr="Embout acier", it="Puntale acciaio", es="Puntera acero"), "stahlkappe"),
]
CLOTHES = [
    ("01", pack("Latzhosen", "Bibs", "Askılı tulum", ar="صدرية", fr="Salopettes", it="Salopette", es="Petos"), "latzhosen"),
    ("02", pack("Bundhosen", "Work trousers", "İş pantolonu", ar="بناطيل عمل", fr="Pantalons travail", it="Pantaloni lavoro", es="Pantalones trabajo"), "bundhosen"),
    ("03", pack("Arbeitsjacken", "Work jackets", "İş ceketi", ar="سترات عمل", fr="Vestes travail", it="Giacche lavoro", es="Chaquetas trabajo"), "arbeitsjacken"),
    ("04", pack("Polos", "Polos", "Polo", ar="بولو", fr="Polos", it="Polo", es="Polos"), "polos"),
]
HIVIS = [
    ("01", pack("Warnwesten", "Hi-vis vests", "İkaz yeleği", ar="سترات عاكسة", fr="Gilets HV", it="Gilet HV", es="Chalecos HV"), "warnwesten"),
    ("02", pack("Warnjacken", "Hi-vis jackets", "İkaz ceketi", ar="سترات عاكسة", fr="Vestes HV", it="Giacche HV", es="Chaquetas HV"), "warnjacken"),
    ("03", pack("Warnhosen", "Hi-vis trousers", "İkaz pantolonu", ar="بناطيل عاكسة", fr="Pantalons HV", it="Pantaloni HV", es="Pantalones HV"), "warnhosen"),
    ("04", pack("Overalls", "Coveralls", "Tulum", ar="أفرول", fr="Combinaisons", it="Tute", es="Monos"), "overalls"),
]
GLOVES = [
    ("01", pack("Nitril", "Nitrile", "Nitril", ar="نتريل", fr="Nitrile", it="Nitrile", es="Nitrilo"), "nitril"),
    ("02", pack("Schnittschutz", "Cut protection", "Kesilme koruması", ar="مقاومة القطع", fr="Anti-coupure", it="Antitaglio", es="Anticorte"), "schnittschutz"),
    ("03", pack("Leder", "Leather", "Deri", ar="جلد", fr="Cuir", it="Pelle", es="Cuero"), "leder"),
    ("04", pack("Chemikalienschutz", "Chemical", "Kimyasal", ar="كيميائي", fr="Chimique", it="Chimici", es="Químicos"), "chemikalienschutz"),
]
HEAD = [
    ("01", pack("Bauhelme", "Hard hats", "Baret", ar="خوذ", fr="Casques", it="Elmetti", es="Cascos"), "bauhelme"),
    ("02", pack("Anstoßkappen", "Bump caps", "Çarpma şapkası", ar="قبعات", fr="Casquettes anti-heurt", it="Cappellini", es="Gorras anti-golpe"), "anstosskappen"),
    ("03", pack("Helmzubehör", "Helmet accessories", "Baret aksesuarı", ar="ملحقات", fr="Accessoires casque", it="Accessori elmetto", es="Accesorios casco"), "helmzubehoer"),
    ("04", pack("Kinnriemen", "Chin straps", "Çene kayışı", ar="أحزمة ذقن", fr="Jugulaires", it="Sottogola", es="Barbuquejos"), "kinnriemen"),
]
EYE = [
    ("01", pack("Schutzbrillen", "Safety glasses", "Koruyucu gözlük", ar="نظارات", fr="Lunettes", it="Occhiali", es="Gafas"), "schutzbrillen"),
    ("02", pack("Vollsichtbrillen", "Goggles", "Kapalı gözlük", ar="واقيات", fr="Lunettes masque", it="Occhiali a maschera", es="Gafas panorámicas"), "vollsichtbrillen"),
    ("03", pack("Gesichtsschutz", "Face shields", "Yüz siperi", ar="واقي وجه", fr="Écrans faciaux", it="Visiera", es="Pantallas"), "gesichtsschutz"),
    ("04", pack("Schweißerschutz", "Welding visors", "Kaynak siperi", ar="لحام", fr="Soudure", it="Saldatura", es="Soldadura"), "schweisserschutz"),
]
EAR = [
    ("01", pack("Kapselgehörschutz", "Earmuffs", "Kulaklık", ar="واقيات أذن", fr="Casques antibruit", it="Cuffie", es="Orejeras"), "kapselgehoerschutz"),
    ("02", pack("Gehörschutzstöpsel", "Earplugs", "Kulak tıkacı", ar="سدادات", fr="Bouchons", it="Tappi", es="Tapones"), "gehoerschutzstoepsel"),
    ("03", pack("Bügelgehörschutz", "Banded plugs", "Bandlı tıkac", ar="سدادات سماعة", fr="Arceaux", it="Archetto", es="Arco"), "buegelgehoerschutz"),
    ("04", pack("Elektronisch", "Electronic", "Elektronik", ar="إلكتروني", fr="Électronique", it="Elettronico", es="Electrónico"), "elektronisch"),
]
RESP = [
    ("01", pack("FFP2", "FFP2", "FFP2", ar="FFP2", fr="FFP2", it="FFP2", es="FFP2"), "ffp2"),
    ("02", pack("FFP3", "FFP3", "FFP3", ar="FFP3", fr="FFP3", it="FFP3", es="FFP3"), "ffp3"),
    ("03", pack("Halbmasken", "Half masks", "Yarım maske", ar="أقنعة نصفية", fr="Demi-masques", it="Semimaschere", es="Semimáscaras"), "halbmasken"),
    ("04", pack("Filter", "Filters", "Filtre", ar="فلاتر", fr="Filtres", it="Filtri", es="Filtros"), "filter"),
]
KNEE = [
    ("01", pack("Knieschoner", "Knee pads", "Dizlik", ar="واقيات ركبة", fr="Genouillères", it="Ginocchiere", es="Rodilleras"), "knieschoner"),
    ("02", pack("Gel-Einlagen", "Gel inserts", "Jel ped", ar="جل", fr="Inserts gel", it="Inserti gel", es="Gel"), "gel-einlagen"),
    ("03", pack("Schaumstoff", "Foam pads", "Köpük", ar="رغوة", fr="Mousse", it="Schiuma", es="Espuma"), "schaumstoff"),
    ("04", pack("Knietaschen", "Knee pockets", "Diz cebi", ar="جيوب ركبة", fr="Poches genoux", it="Tasche ginocchia", es="Bolsillos rodilla"), "knietaschen"),
]
ACC = [
    ("01", pack("Erste Hilfe", "First aid", "İlk yardım", ar="إسعاف", fr="Premiers secours", it="Primo soccorso", es="Primeros auxilios"), "erste-hilfe"),
    ("02", pack("Warnband", "Warning tape", "İkaz bandı", ar="شريط تحذير", fr="Ruban de signalisation", it="Nastro", es="Cinta"), "warnband"),
    ("03", pack("Schilder", "Signs", "Tabela", ar="لافتات", fr="Panneaux", it="Segnali", es="Señales"), "schilder"),
    ("04", pack("Fanggurte", "Lanyards", "Emniyet kayışı", ar="أحزمة", fr="Longe", it="Funi", es="Eslingas"), "fanggurte"),
]
EXISTING = {
    "cat-08-01": (pack("Sicherheitsschuhe", "Safety shoes", "İş ayakkabısı", ar="أحذية سلامة", fr="Chaussures de sécurité", it="Scarpe antinfortunistiche", es="Calzado de seguridad"), SHOES),
    "cat-08-02": (pack("Arbeitskleidung", "Workwear", "İş kıyafeti", ar="ملابس عمل", fr="Vêtements de travail", it="Abbigliamento da lavoro", es="Ropa de trabajo"), CLOTHES),
    "cat-08-03": (pack("Warnschutz", "Hi-vis clothing", "İkaz giysisi", ar="ملابس عاكسة", fr="Haute visibilité", it="Alta visibilità", es="Alta visibilidad"), HIVIS),
    "cat-08-04": (pack("Schutzhandschuhe", "Safety gloves", "Koruyucu eldiven", ar="قفازات", fr="Gants de protection", it="Guanti", es="Guantes"), GLOVES),
    "cat-08-05": (pack("Kopfschutz", "Head protection", "Baş koruma", ar="حماية الرأس", fr="Protection tête", it="Protezione capo", es="Protección cabeza"), HEAD),
    "cat-08-06": (pack("Augenschutz", "Eye protection", "Göz koruma", ar="حماية العين", fr="Protection yeux", it="Protezione occhi", es="Protección ocular"), EYE),
    "cat-08-07": (pack("Gehörschutz", "Hearing protection", "Kulak koruma", ar="حماية السمع", fr="Protection auditive", it="Protezione udito", es="Protección auditiva"), EAR),
    "cat-08-08": (pack("Atemschutz", "Respiratory protection", "Solunum koruma", ar="حماية تنفسية", fr="Protection respiratoire", it="Protezione respiratoria", es="Protección respiratoria"), RESP),
    "cat-08-09": (pack("Knieschutz", "Knee protection", "Diz koruma", ar="حماية الركبة", fr="Protection genoux", it="Protezione ginocchia", es="Protección rodilla"), KNEE),
    "cat-08-10": (pack("Sicherheitszubehör", "Safety accessories", "İş güvenliği aksesuarı", ar="ملحقات سلامة", fr="Accessoires sécurité", it="Accessori sicurezza", es="Accesorios seguridad"), ACC),
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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-08")
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
