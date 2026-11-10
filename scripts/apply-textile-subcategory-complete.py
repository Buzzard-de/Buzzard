#!/usr/bin/env python3
"""Complete textile L2/L3 hubs: replace placeholder leaves and add missing apparel groups."""
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


def pack(de: str, en: str, tr: str, **more: str) -> dict[str, str]:
    row = {loc: en for loc in LOCALES}
    row.update({"de": de, "en": en, "tr": tr, **more})
    return row


def node(cid: str, order: int, labels: dict[str, str], slug: str, url: str, level: int, children: list, **extra) -> dict:
    NEW_LABELS[cid] = labels
    out = {
        "id": cid,
        "menu_order": order,
        "name": labels["de"],
        "slug": slug,
        "url": url,
        "level": level,
        "children": children,
    }
    out.update(extra)
    return out


def l3(parent_id: str, parent_url: str, suffix: str, labels: dict[str, str], slug: str, **extra) -> dict:
    cid = f"{parent_id}-{suffix}"
    return node(cid, int(suffix), labels, slug, f"{parent_url}/{slug}", 3, [], **extra)


def remember_redirect(old_url: str, new_url: str) -> None:
    old = old_url if old_url.endswith("/") else old_url + "/"
    new = new_url if new_url.endswith("/") else new_url + "/"
    if old == new:
        return
    REDIRECTS.append(
        {
            "from": old,
            "to": new,
            "permanent": True,
            "note": "Textile placeholder L3 replaced with a real product group",
        }
    )


WOMEN_EXTRA = [
    ("15", pack("Sportbekleidung", "Sportswear", "Spor giyim", ar="ملابس رياضية", fr="Vêtements de sport", it="Abbigliamento sportivo", es="Ropa deportiva", pl="Odzież sportowa", nl="Sportkleding"), "sportbekleidung"),
    ("16", pack("Blazer & Sakko", "Blazers", "Blazer", ar="بليزر", fr="Blazers", it="Blazer", es="Blazers", pl="Marynarki"), "blazer-und-sakko"),
    ("17", pack("Westen", "Vests", "Yelek", ar="صديري", fr="Gilets", it="Gilet", es="Chalecos", pl="Kamizelki"), "westen"),
    ("18", pack("Jumpsuits & Overalls", "Jumpsuits", "Tulum / tulum etek", ar="جمبسوت", fr="Combinaisons", it="Tute intere", es="Monos", pl="Kombinezony"), "jumpsuits"),
    ("19", pack("Tuniken", "Tunics", "Tunik", ar="تونيك", fr="Tuniques", it="Tuniche", es="Túnicas", pl="Tuniki"), "tuniken"),
]

MEN_EXTRA = [
    ("16", pack("Westen", "Vests", "Yelek", ar="صديري", fr="Gilets", it="Gilet", es="Chalecos"), "westen"),
    ("17", pack("Sakko & Blazer", "Jackets & blazers", "Ceket / blazer", ar="جاكيت رسمي", fr="Vestes de costume", it="Giacche", es="Chaquetas de traje"), "sakko-und-blazer"),
    ("18", pack("Nachtwäsche", "Sleepwear", "Pijama", ar="ملابس نوم", fr="Vêtements de nuit", it="Pigiami", es="Ropa de dormir"), "nachtwaesche"),
]

KIDS_EXTRA = [
    ("11", pack("Jacken", "Jackets", "Ceket", ar="جاكيت أطفال", fr="Vestes", it="Giacche", es="Chaquetas"), "jacken"),
    ("12", pack("Sportbekleidung", "Sportswear", "Spor giyim", ar="ملابس رياضية للأطفال", fr="Vêtements de sport", it="Abbigliamento sportivo", es="Ropa deportiva"), "sportbekleidung"),
    ("13", pack("Badebekleidung", "Swimwear", "Mayo", ar="ملابس سباحة", fr="Maillots", it="Costumi", es="Baño"), "badebekleidung"),
    ("14", pack("Mützen & Sets", "Hats & sets", "Bere ve set", ar="قبعات وطقم", fr="Bonnets et sets", it="Cappelli e set", es="Gorros y sets"), "muetzen-und-sets"),
]

BABY_EXTRA = [
    ("09", pack("Mützen & Set", "Hats & sets", "Bere ve set", ar="قبعات الرضع", fr="Bonnets bébé", it="Cuffie neonato", es="Gorros bebé"), "muetzen-und-sets"),
    ("10", pack("Erstausstattung", "Starter sets", "Hastane çıkışı", ar="طقم المولود", fr="Trousseau de naissance", it="Corredino", es="Canastilla"), "erstausstattung"),
]

UNDERWEAR_EXTRA = [
    ("07", pack("Strumpfhosen", "Tights", "Külotlu çorap", ar="جوارب طويلة", fr="Collants", it="Collant", es="Medias", pl="Rajstopy"), "strumpfhosen"),
    ("08", pack("Shapewear", "Shapewear", "Toparlayıcı iç giyim", ar="ملابس داخلية مشكلة", fr="Gainants", it="Modellanti", es="Fajas"), "shapewear"),
    ("09", pack("Nachtwäsche-Basics", "Sleep basics", "İç pijama", ar="أساسيات النوم", fr="Basiques nuit", it="Intimo notte", es="Básicos de noche"), "nachtwaesche-basics"),
]

HOME_L3 = [
    ("01", pack("Bettwäsche", "Bed linen", "Nevresim", ar="مفروشات السرير", fr="Linge de lit", it="Biancheria da letto", es="Ropa de cama", pl="Pościel", nl="Beddengoed"), "bettwaesche"),
    ("02", pack("Handtücher & Badetextilien", "Towels & bath textiles", "Havlu ve banyo tekstili", ar="مناشف وحمام", fr="Serviettes et bain", it="Asciugamani", es="Toallas", pl="Ręczniki"), "handtuecher-und-badetextilien"),
    ("03", pack("Tischwäsche", "Table linen", "Masa örtüsü", ar="مفارش المائدة", fr="Linge de table", it="Tovaglie", es="Mantelería", pl="Obrasy"), "tischwaesche"),
    ("04", pack("Küchentextilien", "Kitchen textiles", "Mutfak tekstili", ar="منسوجات المطبخ", fr="Textiles de cuisine", it="Tessili cucina", es="Textiles de cocina", pl="Tekstylia kuchenne"), "kuechentextilien"),
    ("05", pack("Vorhänge", "Curtains", "Perde", ar="ستائر", fr="Rideaux", it="Tende", es="Cortinas", pl="Zasłony"), "vorhaenge"),
    ("06", pack("Decken & Kissen", "Blankets & cushions", "Battaniye ve yastık", ar="بطانيات ووسائد", fr="Plaids et coussins", it="Coperte e cuscini", es="Mantas y cojines", pl="Koce i poduszki"), "decken-und-kissen"),
    ("07", pack("Badematten", "Bath mats", "Banyo paspası", ar="سجادة حمام", fr="Tapis de bain", it="Tappetini bagno", es="Alfombrillas de baño"), "badematten"),
]

SOCK_L3 = [
    ("01", pack("Damensocken", "Women's socks", "Kadın çorabı", ar="جوارب نسائية", fr="Chaussettes femme", it="Calze donna", es="Calcetines de mujer"), "damensocken"),
    ("02", pack("Herrensocken", "Men's socks", "Erkek çorabı", ar="جوارب رجالية", fr="Chaussettes homme", it="Calze uomo", es="Calcetines de hombre"), "herrensocken"),
    ("03", pack("Kindersocken", "Kids' socks", "Çocuk çorabı", ar="جوارب أطفال", fr="Chaussettes enfant", it="Calze bambino", es="Calcetines infantiles"), "kindersocken"),
    ("04", pack("Sportsocken", "Sports socks", "Spor çorabı", ar="جوارب رياضية", fr="Chaussettes sport", it="Calze sportive", es="Calcetines deportivos"), "sportsocken"),
    ("05", pack("Thermosocken", "Thermal socks", "Termal çorap", ar="جوارب حرارية", fr="Chaussettes thermiques", it="Calze termiche", es="Calcetines térmicos"), "thermosocken"),
    ("06", pack("Kniestrümpfe", "Knee-highs", "Dizaltı çorap", ar="جوارب للركبة", fr="Mi-bas", it="Gambaletti", es="Medias hasta la rodilla"), "kniestruempfe"),
]

ACCESSORY_L3 = [
    ("01", pack("Schals & Tücher", "Scarves", "Şal ve fular", ar="أوشحة", fr="Écharpes", it="Sciarpe", es="Bufandas", pl="Szaliki"), "schals-und-tuecher"),
    ("02", pack("Mützen & Caps", "Hats & caps", "Bere ve şapka", ar="قبعات", fr="Bonnets et casquettes", it="Cappelli", es="Gorras", pl="Czapki"), "muetzen-und-caps"),
    ("03", pack("Handschuhe", "Gloves", "Eldiven", ar="قفازات", fr="Gants", it="Guanti", es="Guantes", pl="Rękawiczki"), "handschuhe"),
    ("04", pack("Gürtel", "Belts", "Kemer", ar="أحزمة", fr="Ceintures", it="Cinture", es="Cinturones", pl="Paski"), "guertel"),
    ("05", pack("Krawatten & Fliegen", "Ties & bow ties", "Kravat ve papyon", ar="ربطات عنق", fr="Cravates", it="Cravatte", es="Corbatas"), "krawatten-und-fliegen"),
    ("06", pack("Stofftaschen", "Textile bags", "Kumaş çanta", ar="حقائب قماشية", fr="Sacs en tissu", it="Borse in tessuto", es="Bolsas de tela"), "stofftaschen"),
]

WORK_L3 = [
    ("01", pack("Arbeitsjacken", "Work jackets", "İş ceketi", ar="سترات عمل", fr="Vestes de travail", it="Giacche da lavoro", es="Chaquetas de trabajo"), "arbeitsjacken"),
    ("02", pack("Arbeitshosen", "Work trousers", "İş pantolonu", ar="بناطيل عمل", fr="Pantalons de travail", it="Pantaloni da lavoro", es="Pantalones de trabajo"), "arbeitshosen"),
    ("03", pack("Warnschutz", "High-visibility wear", "İkaz giysisi", ar="ملابس عاكسة", fr="Haute visibilité", it="Alta visibilità", es="Alta visibilidad"), "warnschutz"),
    ("04", pack("Fleece & Softshell", "Fleece & softshell", "Polar ve softshell", ar="fleece وسوفتشل", fr="Polaire et softshell", it="Pile e softshell", es="Forro y softshell"), "fleece-und-softshell"),
    ("05", pack("Outdoorhosen", "Outdoor trousers", "Outdoor pantolon", ar="بناطيل خارجية", fr="Pantalons outdoor", it="Pantaloni outdoor", es="Pantalones outdoor"), "outdoorhosen"),
    ("06", pack("Regenbekleidung", "Rainwear", "Yağmurluk", ar="ملابس مطر", fr="Imperméables", it="Antipioggia", es="Ropa de lluvia"), "regenbekleidung"),
]

SWIM_L3 = [
    ("01", pack("Damen-Bademode", "Women's swimwear", "Kadın mayo", ar="ملابس سباحة نسائية", fr="Maillots femme", it="Costumi donna", es="Baño mujer"), "damen-bademode"),
    ("02", pack("Herren-Bademode", "Men's swimwear", "Erkek mayo", ar="ملابس سباحة رجالية", fr="Maillots homme", it="Costumi uomo", es="Baño hombre"), "herren-bademode"),
    ("03", pack("Kinder-Bademode", "Kids' swimwear", "Çocuk mayo", ar="ملابس سباحة أطفال", fr="Maillots enfant", it="Costumi bambino", es="Baño infantil"), "kinder-bademode"),
    ("04", pack("Strandtextilien", "Beach textiles", "Plaj tekstili", ar="منسوجات الشاطئ", fr="Textiles de plage", it="Tessili da spiaggia", es="Textiles de playa"), "strandtextilien"),
]

SLEEP_L3 = [
    ("01", pack("Pyjamas", "Pyjamas", "Pijama takımı", ar="بيجامات", fr="Pyjamas", it="Pigiami", es="Pijamas"), "pyjamas"),
    ("02", pack("Nachthemden", "Nightdresses", "Gecelik", ar="قمصان نوم", fr="Chemises de nuit", it="Camicie da notte", es="Camisones"), "nachthemden"),
    ("03", pack("Loungewear", "Loungewear", "Ev giyimi", ar="ملابس منزلية", fr="Homewear", it="Abbigliamento casa", es="Ropa de estar"), "loungewear"),
    ("04", pack("Bademäntel", "Bathrobes", "Bornoz", ar="أرواب حمام", fr="Peignoirs", it="Accappatoi", es="Albornoces"), "bademaentel"),
]

SPORT_L3 = [
    ("01", pack("Sportshirts", "Sports shirts", "Spor tişört", ar="قمصان رياضية", fr="Maillots sport", it="Maglie sportive", es="Camisetas deportivas"), "sportshirts"),
    ("02", pack("Tights & Leggings", "Tights & leggings", "Tayt", ar="ليقنز", fr="Leggings", it="Leggings", es="Mallas"), "tights-und-leggings"),
    ("03", pack("Trainingsjacken", "Training jackets", "Eşofman üstü", ar="جاكيت تدريب", fr="Vestes de training", it="Felpe da allenamento", es="Chaquetas de chándal"), "trainingsjacken"),
    ("04", pack("Trainingsanzüge", "Tracksuits", "Eşofman takımı", ar="بدلة رياضية", fr="Survêtements", it="Tute", es="Chándals"), "trainingsanzuege"),
    ("05", pack("Sport-Unterwäsche", "Sports underwear", "Spor iç giyim", ar="ملابس داخلية رياضية", fr="Sous-vêtements sport", it="Intimo sportivo", es="Ropa interior deportiva"), "sport-unterwaesche"),
]

MATERNITY_L3 = [
    ("01", pack("Umstandskleider", "Maternity dresses", "Hamile elbise", ar="فساتين حمل", fr="Robes de grossesse", it="Vestiti premaman", es="Vestidos premamá"), "umstandskleider"),
    ("02", pack("Umstandshosen", "Maternity trousers", "Hamile pantolon", ar="بناطيل حمل", fr="Pantalons de grossesse", it="Pantaloni premaman", es="Pantalones premamá"), "umstandshosen"),
    ("03", pack("Umstandsshirts", "Maternity tops", "Hamile bluz", ar="بلوزات حمل", fr="Hauts de grossesse", it="Maglie premaman", es="Tops premamá"), "umstandsshirts"),
    ("04", pack("Still- & Umstandsunterwäsche", "Nursing & maternity underwear", "Emzirme iç giyim", ar="ملابس داخلية للرضاعة", fr="Lingerie maternité", it="Intimo allattamento", es="Lencería premamá"), "still-und-umstandsunterwaesche"),
]

NEW_L2 = [
    ("10", "bademode", pack("Bademode", "Swimwear", "Mayo ve bikini", ar="ملابس السباحة", fr="Maillots de bain", it="Costumi da bagno", es="Baño", pl="Stroje kąpielowe", nl="Zwemkleding"), SWIM_L3),
    ("11", "nachtwaesche-und-loungewear", pack("Nachtwäsche & Loungewear", "Sleepwear & loungewear", "Pijama ve ev giyimi", ar="ملابس النوم والمنزل", fr="Nuit et homewear", it="Notte e casa", es="Noche y homewear", pl="Piżamy i homewear"), SLEEP_L3),
    ("12", "sportbekleidung", pack("Sportbekleidung", "Sportswear", "Spor giyim", ar="الملابس الرياضية", fr="Vêtements de sport", it="Abbigliamento sportivo", es="Ropa deportiva", pl="Odzież sportowa"), SPORT_L3),
    ("13", "umstandsmode", pack("Umstandsmode", "Maternity wear", "Hamile giyim", ar="ملابس الحمل", fr="Maternité", it="Premaman", es="Premamá", pl="Odzież ciążowa"), MATERNITY_L3),
]

NAME_FIXES = {
    "cat-01-01-01": "Kleid",
    "cat-01-01-02": "Bluse",
    "cat-01-01-03": "Hemd",
    "cat-01-01-04": "T-Shirt",
    "cat-01-01-06": "Strickjacke",
    "cat-01-01-08": "Hose",
    "cat-01-01-09": "Jeans",
    "cat-01-01-10": "Rock",
    "cat-01-01-14": "Anzug & Set",
    "cat-01-02-01": "T-Shirt",
    "cat-01-02-03": "Hemd",
    "cat-01-02-05": "Strickjacke",
    "cat-01-02-07": "Hose",
    "cat-01-02-08": "Jeans",
    "cat-01-02-09": "Leinenhose",
    "cat-01-02-11": "Anzug",
    "cat-01-03-01": "T-Shirt",
    "cat-01-03-02": "Pullover",
    "cat-01-03-04": "Hose",
    "cat-01-03-05": "Jeans",
    "cat-01-03-07": "Kleid & Rock",
    "cat-01-04-05": "Babyhose",
    "cat-01-04-06": "Babypullover",
    "cat-01-04-07": "Babykleid",
    "cat-01-04-08": "Babymantel",
    "cat-01-05-01": "BH",
    "cat-01-05-02": "Slip",
    "cat-01-05-04": "Unterhemd",
    "cat-01-05-06": "Kinderunterwäsche",
}


def replace_l3_group(parent: dict, specs: list[tuple[str, dict, str]]) -> None:
    existing = {child["id"]: child for child in parent.get("children") or []}
    rebuilt = []
    for suffix, labels, slug in specs:
        cid = f"{parent['id']}-{suffix}"
        old = existing.get(cid)
        extra = {}
        if old:
            extra["legacy_name"] = old.get("legacy_name") or old.get("name")
            extra["legacy_slug"] = old.get("slug")
            extra["legacy_slug_path"] = old.get("legacy_slug_path")
            extra["legacy_url"] = old.get("legacy_url")
            remember_redirect(old["url"], f"{parent['url']}/{slug}")
        rebuilt.append(l3(parent["id"], parent["url"], suffix, labels, slug, **extra))
    parent["children"] = rebuilt


def append_l3(parent: dict, specs: list[tuple[str, dict, str]]) -> None:
    have = {c["id"] for c in parent.get("children") or []}
    for suffix, labels, slug in specs:
        cid = f"{parent['id']}-{suffix}"
        if cid in have:
            continue
        parent["children"].append(l3(parent["id"], parent["url"], suffix, labels, slug))


def apply_name_fixes(nodes: list) -> None:
    for n in nodes:
        if n["id"] in NAME_FIXES:
            n["name"] = NAME_FIXES[n["id"]]
        for child in n.get("children") or []:
            apply_name_fixes([child])


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    tree = json.loads(TREE_PATH.read_text(encoding="utf-8"))
    redirects = json.loads(REDIRECTS_PATH.read_text(encoding="utf-8"))

    textile = next(c for c in catalog["categories"] if c["id"] == "cat-01")
    by_id = {c["id"]: c for c in textile["children"]}

    apply_name_fixes([textile])

    append_l3(by_id["cat-01-01"], WOMEN_EXTRA)
    append_l3(by_id["cat-01-02"], MEN_EXTRA)
    append_l3(by_id["cat-01-03"], KIDS_EXTRA)
    append_l3(by_id["cat-01-04"], BABY_EXTRA)
    append_l3(by_id["cat-01-05"], UNDERWEAR_EXTRA)

    replace_l3_group(by_id["cat-01-06"], HOME_L3)
    replace_l3_group(by_id["cat-01-07"], SOCK_L3)
    replace_l3_group(by_id["cat-01-08"], ACCESSORY_L3)
    by_id["cat-01-08"]["name"] = "Accessoires"
    NEW_LABELS["cat-01-08"] = pack(
        "Accessoires",
        "Accessories",
        "Aksesuar",
        ar="إكسسوارات",
        fr="Accessoires",
        it="Accessori",
        es="Accesorios",
        pl="Akcesoria",
        nl="Accessoires",
    )
    replace_l3_group(by_id["cat-01-09"], WORK_L3)
    NEW_LABELS["cat-01-07"] = pack(
        "Socken & Strümpfe",
        "Socks & hosiery",
        "Çorap",
        ar="جوارب",
        fr="Chaussettes",
        it="Calze",
        es="Calcetines",
        pl="Skarpetki",
        nl="Sokken",
    )
    by_id["cat-01-07"]["name"] = "Socken & Strümpfe"

    existing_l2 = {c["id"] for c in textile["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-01-{suffix}"
        if cid in existing_l2:
            continue
        url = f"{textile['url']}/{slug}"
        hub = node(cid, int(suffix), labels, slug, url, 2, [])
        for item in children:
            hub["children"].append(l3(cid, url, item[0], item[1], item[2]))
        textile["children"].append(hub)

    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    tree.update(NEW_LABELS)
    for cid, german in NAME_FIXES.items():
        if cid in tree and tree[cid].get("de") != german:
            tree[cid]["de"] = german
    TREE_PATH.write_text(json.dumps(tree, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    seen = {(item.get("from"), item.get("to")) for item in redirects}
    for item in REDIRECTS:
        key = (item["from"], item["to"])
        if key not in seen:
            redirects.append(item)
            seen.add(key)
    REDIRECTS_PATH.write_text(json.dumps(redirects, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    l2 = textile["children"]
    l3n = sum(len(c.get("children") or []) for c in l2)
    print("L2", len(l2), "L3", l3n, "labels", len(NEW_LABELS), "redirects", len(REDIRECTS))


if __name__ == "__main__":
    main()
