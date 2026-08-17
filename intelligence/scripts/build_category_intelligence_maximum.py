#!/usr/bin/env python3
"""Build Buzzard Category Intelligence MAXIMUM single-file HTML console."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CANONICAL = REPO / "data/taxonomy/buzzard_master_48_main_categories_de.json"
SOURCE = REPO / "intelligence/archive/buzzard_category_intelligence_maximum_source.html"
OUT_DATA = REPO / "data/taxonomy/buzzard_category_intelligence_maximum_single_file.html"
OUT_PUBLIC = REPO / "public/taxonomy/buzzard_category_intelligence_maximum_single_file.html"
REVIEW_NUMS = [23, 24, 25, 26, 47]


def build() -> str:
    payload = json.loads(CANONICAL.read_text(encoding="utf-8"))
    names = [item["name"] for item in payload["categories"]]
    main_count = len(names)
    html = SOURCE.read_text(encoding="utf-8")
    html = html.replace('lang="tr"', 'lang="de"')
    html = html.replace(
        "<br>50 Hauptkategorien<br>",
        f"<br>{main_count} Hauptkategorien<br>",
    )
    html = html.replace(
        "50*100)+'%'",
        f"{main_count}*100)+'%'",
    )
    start = html.index("const names=")
    suffix = html[html.index("let saved=", start) :]
    html = (
        html[:start]
        + "const names="
        + json.dumps(names, ensure_ascii=False)
        + ";const REVIEW="
        + json.dumps(REVIEW_NUMS)
        + ";\n"
        + suffix
    )
    html = html.replace(
        "[20,23,24,25,26,47].includes(i+1)?'review':'draft'",
        "REVIEW.includes(i+1)?'review':'draft'",
    )
    OUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    OUT_DATA.write_text(html, encoding="utf-8")
    shutil.copy2(OUT_DATA, OUT_PUBLIC)
    return f"OK: category intelligence maximum console → {OUT_DATA} ({OUT_DATA.stat().st_size} bytes)"


if __name__ == "__main__":
    print(build())
