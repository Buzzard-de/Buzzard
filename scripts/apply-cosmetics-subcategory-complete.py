#!/usr/bin/env python3
"""Complete Kosmetik & Körperpflege (cat-02) L2/L3 hubs."""
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
        REDIRECTS.append({"from": old, "to": new, "permanent": True, "note": "Cosmetics placeholder L3 replaced with a real product group"})


SKIN = [
    ("01", pack("Gesichtscreme", "Face cream", "Yüz kremi", ar="كريم وجه", fr="Crème visage", it="Crema viso", es="Crema facial"), "gesichtscreme"),
    ("02", pack("Gesichtsreinigung", "Cleansers", "Yüz temizleyici", ar="منظف وجه", fr="Nettoyants", it="Detergenti viso", es="Limpiadores"), "gesichtsreinigung"),
    ("03", pack("Seren & Ampullen", "Serums", "Serum", ar="سيروم", fr="Sérums", it="Sieri", es="Sérums"), "seren-und-ampullen"),
    ("04", pack("Augenpflege", "Eye care", "Göz bakımı", ar="عناية بالعين", fr="Soin des yeux", it="Contorno occhi", es="Contorno de ojos"), "augenpflege"),
    ("05", pack("Gesichtsmasken", "Face masks", "Yüz maskesi", ar="أقنعة وجه", fr="Masques", it="Maschere viso", es="Mascarillas"), "gesichtsmasken"),
    ("06", pack("Toner & Essenz", "Toner & essence", "Tonik", ar="تونر", fr="Toniques", it="Tonici", es="Tónicos"), "toner-und-essenz"),
]
HAIR = [
    ("01", pack("Shampoo", "Shampoo", "Şampuan", ar="شامبو", fr="Shampoing", it="Shampoo", es="Champú"), "shampoo"),
    ("02", pack("Haarspülung", "Conditioner", "Saç kremi", ar="بلسم", fr="Après-shampoing", it="Balsamo", es="Acondicionador"), "haarspuelung"),
    ("03", pack("Haarmasken", "Hair masks", "Saç maskesi", ar="ماسك شعر", fr="Masques capillaires", it="Maschere capelli", es="Mascarillas capilares"), "haarmasken"),
    ("04", pack("Haarseren", "Hair serums", "Saç serumu", ar="سيروم شعر", fr="Sérums capillaires", it="Sieri capelli", es="Sérums capilares"), "haarseren"),
    ("05", pack("Haaröle", "Hair oils", "Saç yağı", ar="زيت شعر", fr="Huiles capillaires", it="Oli capelli", es="Aceites capilares"), "haaroele"),
    ("06", pack("Styling", "Styling", "Şekillendirici", ar="تصفيف", fr="Coiffage", it="Styling", es="Peinado"), "styling"),
]
MAKEUP = [
    ("01", pack("Foundation", "Foundation", "Fondöten", ar="فاونديشن", fr="Fond de teint", it="Fondotinta", es="Base de maquillaje"), "foundation"),
    ("02", pack("Concealer", "Concealer", "Kapatıcı", ar="كونسيلر", fr="Correcteur", it="Correttore", es="Corrector"), "concealer"),
    ("03", pack("Puder", "Powder", "Pudra", ar="بودرة", fr="Poudre", it="Cipria", es="Polvos"), "puder"),
    ("04", pack("Rouge & Bronzer", "Blush & bronzer", "Allık", ar="أحمر خدود", fr="Blush", it="Fard", es="Colorete"), "rouge-und-bronzer"),
    ("05", pack("Mascara", "Mascara", "Maskara", ar="ماسكارا", fr="Mascara", it="Mascara", es="Máscara"), "mascara"),
    ("06", pack("Eyeliner", "Eyeliner", "Eyeliner", ar="آيلاينر", fr="Eye-liner", it="Eyeliner", es="Delineador"), "eyeliner"),
    ("07", pack("Lidschatten", "Eyeshadow", "Far", ar="ظلال عيون", fr="Fards à paupières", it="Ombretti", es="Sombras"), "lidschatten"),
    ("08", pack("Lippenstift", "Lipstick", "Ruj", ar="أحمر شفاه", fr="Rouge à lèvres", it="Rossetto", es="Pintalabios"), "lippenstift"),
]
PERFUME = [
    ("01", pack("Damenparfum", "Women's perfume", "Kadın parfüm", ar="عطر نسائي", fr="Parfum femme", it="Profumo donna", es="Perfume de mujer"), "damenparfum"),
    ("02", pack("Herrenparfum", "Men's fragrance", "Erkek parfüm", ar="عطر رجالي", fr="Parfum homme", it="Profumo uomo", es="Perfume de hombre"), "herrenparfum"),
    ("03", pack("Unisex-Düfte", "Unisex fragrances", "Unisex parfüm", ar="عطر للجنسين", fr="Parfums unisexes", it="Profumi unisex", es="Perfumes unisex"), "unisex-duefte"),
    ("04", pack("Eau de Parfum", "Eau de Parfum", "EDP", ar="أو دو بارفان", fr="Eau de Parfum", it="Eau de Parfum", es="Eau de Parfum"), "eau-de-parfum"),
    ("05", pack("Eau de Toilette", "Eau de Toilette", "EDT", ar="أو دو تواليت", fr="Eau de Toilette", it="Eau de Toilette", es="Eau de Toilette"), "eau-de-toilette"),
    ("06", pack("Körpersprays", "Body sprays", "Vücut spreyi", ar="بخاخ جسم", fr="Brumes corporelles", it="Body spray", es="Sprays corporales"), "koerpersprays"),
]
ORAL = [
    ("01", pack("Zahnpasta", "Toothpaste", "Diş macunu", ar="معجون أسنان", fr="Dentifrice", it="Dentifricio", es="Pasta de dientes"), "zahnpasta"),
    ("02", pack("Zahnbürsten", "Toothbrushes", "Diş fırçası", ar="فرش أسنان", fr="Brosses à dents", it="Spazzolini", es="Cepillos de dientes"), "zahnbruesten"),
    ("03", pack("Mundspülung", "Mouthwash", "Gargara", ar="غسول فم", fr="Bains de bouche", it="Collutori", es="Enjuagues"), "mundspuelung"),
    ("04", pack("Zahnseide", "Dental floss", "Diş ipi", ar="خيط أسنان", fr="Fil dentaire", it="Filo interdentale", es="Hilo dental"), "zahnseide"),
    ("05", pack("Zahnaufhellung", "Whitening", "Beyazlatma", ar="تبييض", fr="Blanchiment", it="Sbiancamento", es="Blanqueamiento"), "zahnaufhellung"),
]
BODY = [
    ("01", pack("Duschgel", "Shower gel", "Duş jeli", ar="جل استحمام", fr="Gels douche", it="Docciaschiuma", es="Gel de ducha"), "duschgel"),
    ("02", pack("Bodylotion", "Body lotion", "Vücut losyonu", ar="لوشن جسم", fr="Laits corporels", it="Latte corpo", es="Loción corporal"), "bodylotion"),
    ("03", pack("Deodorants", "Deodorants", "Deodorant", ar="مزيل عرق", fr="Déodorants", it="Deodoranti", es="Desodorantes"), "deodorants"),
    ("04", pack("Handcreme", "Hand cream", "El kremi", ar="كريم يدين", fr="Crèmes mains", it="Crema mani", es="Crema de manos"), "handcreme"),
    ("05", pack("Seife", "Soap", "Sabun", ar="صابون", fr="Savons", it="Saponi", es="Jabones"), "seife"),
]
SHAVE = [
    ("01", pack("Rasierer", "Razors", "Tıraş makinesi", ar="شفرات حلاقة", fr="Rasoirs", it="Rasoio", es="Cuchillas"), "rasierer"),
    ("02", pack("Rasierschaum", "Shaving foam", "Tıraş köpüğü", ar="رغوة حلاقة", fr="Mousse à raser", it="Schiuma da barba", es="Espuma de afeitar"), "rasierschaum"),
    ("03", pack("Aftershave", "Aftershave", "Aftershave", ar="بعد الحلاقة", fr="Aftershave", it="Aftershave", es="Aftershave"), "aftershave"),
    ("04", pack("Bartpflege", "Beard care", "Sakal bakımı", ar="عناية باللحية", fr="Soin barbe", it="Cura barba", es="Cuidado de barba"), "bartpflege"),
]
HYGIENE = [
    ("01", pack("Damenhygiene", "Feminine care", "Kadın hijyeni", ar="عناية نسائية", fr="Hygiène féminine", it="Igiene intima donna", es="Higiene femenina"), "damenhygiene"),
    ("02", pack("Intimpflege", "Intimate care", "İntim bakım", ar="عناية حميمة", fr="Soin intime", it="Igiene intima", es="Cuidado íntimo"), "intimpflege"),
    ("03", pack("Taschentücher", "Tissues", "Kağıt mendil", ar="مناديل", fr="Mouchoirs", it="Fazzoletti", es="Pañuelos"), "taschentuecher"),
    ("04", pack("Feuchttücher", "Wet wipes", "Islak mendil", ar="مناديل مبللة", fr="Lingettes", it="Salviette", es="Toallitas"), "feuchttuecher"),
]
SUN = [
    ("01", pack("Sonnencreme Gesicht", "Face sunscreen", "Yüz güneş kremi", ar="واقي شمس للوجه", fr="Solaire visage", it="Solare viso", es="Protector facial"), "sonnencreme-gesicht"),
    ("02", pack("Sonnencreme Körper", "Body sunscreen", "Vücut güneş kremi", ar="واقي شمس للجسم", fr="Solaire corps", it="Solare corpo", es="Protector corporal"), "sonnencreme-koerper"),
    ("03", pack("After-Sun", "After-sun", "After sun", ar="بعد الشمس", fr="Après-soleil", it="Dopo sole", es="After sun"), "after-sun"),
    ("04", pack("Selbstbräuner", "Self-tan", "Oto bronz", ar="تسمير ذاتي", fr="Autobronzant", it="Autoabbronzante", es="Autobronceador"), "selbstbraeuner"),
]
NAIL = [
    ("01", pack("Nagellack", "Nail polish", "Oje", ar="طلاء أظافر", fr="Vernis", it="Smalto", es="Esmalte"), "nagellack"),
    ("02", pack("Nagelpflege", "Nail care", "Tırnak bakımı", ar="عناية بالأظافر", fr="Soin des ongles", it="Cura unghie", es="Cuidado de uñas"), "nagelpflege"),
    ("03", pack("Nagellackentferner", "Polish remover", "Aseton", ar="مزيل طلاء", fr="Dissolvant", it="Acetone", es="Quitaesmalte"), "nagellackentferner"),
    ("04", pack("Maniküre-Sets", "Manicure sets", "Manikür seti", ar="طقم مانيكير", fr="Sets manucure", it="Set manicure", es="Sets de manicura"), "manikuere-sets"),
]
EXISTING = {
    "cat-02-01": (pack("Hautpflege", "Skincare", "Cilt bakımı", ar="العناية بالبشرة", fr="Soin de la peau", it="Skincare", es="Cuidado de la piel"), SKIN),
    "cat-02-02": (pack("Haarpflege", "Hair care", "Saç bakımı", ar="العناية بالشعر", fr="Soin des cheveux", it="Cura capelli", es="Cuidado del cabello"), HAIR),
    "cat-02-03": (pack("Make-up", "Makeup", "Makyaj", ar="مكياج", fr="Maquillage", it="Make-up", es="Maquillaje"), MAKEUP),
    "cat-02-04": (pack("Parfum", "Fragrance", "Parfüm", ar="عطور", fr="Parfums", it="Profumi", es="Perfumes"), PERFUME),
    "cat-02-05": (pack("Mund- & Zahnpflege", "Oral care", "Ağız bakımı", ar="العناية بالفم", fr="Hygiène bucco-dentaire", it="Igiene orale", es="Higiene bucal"), ORAL),
    "cat-02-06": (pack("Körperpflege", "Body care", "Vücut bakımı", ar="العناية بالجسم", fr="Soin du corps", it="Cura corpo", es="Cuidado corporal"), BODY),
    "cat-02-07": (pack("Rasur & Herrenpflege", "Shaving & men's care", "Tıraş ve erkek bakımı", ar="حلاقة وعناية رجالية", fr="Rasage", it="Rasatura", es="Afeitado"), SHAVE),
    "cat-02-08": (pack("Persönliche Hygiene", "Personal hygiene", "Kişisel hijyen", ar="نظافة شخصية", fr="Hygiène personnelle", it="Igiene personale", es="Higiene personal"), HYGIENE),
}
NEW_L2 = [
    ("09", "sonnenpflege", pack("Sonnenpflege", "Sun care", "Güneş bakımı", ar="العناية من الشمس", fr="Solaire", it="Solari", es="Solar"), SUN),
    ("10", "nagelpflege", pack("Nagelpflege", "Nail care", "Tırnak bakımı", ar="العناية بالأظافر", fr="Ongles", it="Unghie", es="Uñas"), NAIL),
]


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
    cat = next(c for c in catalog["categories"] if c["id"] == "cat-02")
    by_id = {c["id"]: c for c in cat["children"]}
    for cid, (labels, specs) in EXISTING.items():
        hub = by_id[cid]
        hub["name"] = labels["de"]
        NEW_LABELS[cid] = labels
        replace_l3_group(hub, specs)
    existing = {c["id"] for c in cat["children"]}
    for suffix, slug, labels, children in NEW_L2:
        cid = f"cat-02-{suffix}"
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
