"""Write lib/categories/translations/catalog-locale.json from the explicit tables."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from catalog_locale_countries import COUNTRIES, EU_CODES
from catalog_locale_data import LOCALES, MAINS
from catalog_locale_textile import TEXTILE

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "data/buzzard_categories.json").read_text())
OUT = ROOT / "lib/categories/translations/catalog-locale.json"

# German catalog strings that must be translated for every other locale.
GERMAN_SOURCES = {
    "Damenbekleidung", "Herrenbekleidung", "Kinderbekleidung", "Babybekleidung",
    "Unterwäsche", "Haushaltstextilien", "Socken", "Taschen & Accessoires",
    "Arbeits- & Outdoor-Textilien", "Strickjacke", "Jogginganzug", "Sport Bekleidung",
    "Schule Bekleidung", "Wickelbody", "Thermo-Unterwäsche", "Kinder Innen Bekleidung",
    "Zubehör",
}
# Shared international words, or a normal word that matches the old source.
SAME_WORD_OK = {
    ("nl", "Baby Mont"),
    ("pt", "Pijama"),
    ("ro", "Pijama"),
    ("es", "Pijama"),
    ("ca", "Pijama"),
    ("eu", "Pijama"),
    ("lb", "Jogginganzug"),
    ("fr", "Jean"),
}


CLOTHING_OUTSIDE_TEXTILE = {"cat-14-06-02", "cat-17-01-05", "cat-17-01-06", "cat-17-01-07"}


def textile_nodes():
    found = []

    def walk(nodes):
        for node in nodes:
            node_id = str(node.get("id", ""))
            if node_id in CLOTHING_OUTSIDE_TEXTILE or (node_id.startswith("cat-01-") and node.get("name") in TEXTILE):
                found.append(node)
            walk(node.get("children") or [])

    walk(CATALOG["categories"])
    return found


def main():
    missing = []
    textile = {}
    for node in textile_nodes():
        if node["id"] in MAINS:
            continue
        phrase = TEXTILE.get(node["name"])
        if not phrase:
            missing.append(f"{node['id']} {node['name']}")
            continue
        textile[node["id"]] = phrase
    if missing:
        raise SystemExit("missing textile phrases:\n" + "\n".join(missing))

    mains = [c["id"] for c in CATALOG["categories"]]
    absent = [cid for cid in mains if cid not in MAINS]
    if absent:
        raise SystemExit("missing mains: " + ", ".join(absent))
    if len(EU_CODES) != 27:
        raise SystemExit(f"EU count {len(EU_CODES)}")
    for code in EU_CODES:
        if code not in COUNTRIES:
            raise SystemExit(f"missing country {code}")

    problems = []
    for node in textile_nodes():
        if node["id"] in MAINS:
            continue
        source = node["name"]
        for locale in LOCALES:
            text = textile[node["id"]][locale]
            if not text.strip():
                problems.append(f"empty {locale} {node['id']}")
            if locale != "tr" and text == source and source not in GERMAN_SOURCES and TEXTILE[source]["de"] != source and (locale, source) not in SAME_WORD_OK:
                problems.append(f"{locale} {node['id']} still has Turkish source {source}")
            if locale != "de" and text == source and source in GERMAN_SOURCES and (locale, source) not in SAME_WORD_OK:
                problems.append(f"{locale} {node['id']} still has German source {source}")
    if problems:
        raise SystemExit("mixed labels:\n" + "\n".join(problems))

    payload = {"mains": MAINS, "textile": textile}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    countries_out = ROOT / "lib/market/country-names.json"
    countries_out.write_text(
        json.dumps({"eu": EU_CODES, "names": COUNTRIES}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote {OUT} mains={len(MAINS)} textile={len(textile)} countries={len(COUNTRIES)}")


if __name__ == "__main__":
    main()
