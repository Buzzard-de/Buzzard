#!/usr/bin/env python3
"""Build German KFZ taxonomy HTML/JSON consoles for data/ and public/."""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence/scripts"))
from kfz_taxonomy_locale_de import apply_main_names_de, germanize_kfz_html

TREE_JSON = REPO / "data/taxonomy/buzzard_master_kfz_category_tree_v1.json"
TREE_HTML_SRC = REPO / "data/taxonomy/buzzard_master_kfz_category_tree_v1.html"
OS_HTML_SRC = REPO / "data/taxonomy/buzzard_master_kfz_intelligence_os.html"


def _replace_embedded_data(html: str, key: str, payload) -> str:
    pattern = rf"const {key}\s*=\s*\["
    match = re.search(pattern, html)
    if not match:
        raise ValueError(f"embedded {key} not found")
    start = match.start()
    depth = 0
    i = match.end() - 1
    while i < len(html):
        ch = html[i]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
        i += 1
    else:
        raise ValueError(f"unclosed array for {key}")
    return html[:start] + f"const {key} = " + json.dumps(payload, ensure_ascii=False) + html[end:]


def build_tree() -> str:
    data = json.loads(TREE_JSON.read_text(encoding="utf-8"))
    data["language"] = "de"
    apply_main_names_de(data["categories"])
    TREE_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    html = TREE_HTML_SRC.read_text(encoding="utf-8")
    html = _replace_embedded_data(html, "DATA", data["categories"])
    html = germanize_kfz_html(html)

    out_data = TREE_HTML_SRC
    out_public = REPO / "public/taxonomy/buzzard_master_kfz_category_tree_v1.html"
    out_data.write_text(html, encoding="utf-8")
    shutil.copy2(TREE_JSON, REPO / "public/taxonomy/buzzard_master_kfz_category_tree_v1.json")
    out_public.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out_data, out_public)
    return f"OK: kfz tree DE → {out_public}"


def build_intelligence_os() -> str:
    html = OS_HTML_SRC.read_text(encoding="utf-8")
    os_json_path = REPO / "data/taxonomy/buzzard_master_kfz_intelligence_os.json"
    if os_json_path.exists():
        os_data = json.loads(os_json_path.read_text(encoding="utf-8"))
        taxonomy = os_data.get("taxonomy", [])
        apply_main_names_de(taxonomy)
        html = _replace_embedded_data(html, "DATA", taxonomy)
    html = germanize_kfz_html(html)

    out_data = OS_HTML_SRC
    out_public = REPO / "public/taxonomy/buzzard_master_kfz_intelligence_os.html"
    out_data.write_text(html, encoding="utf-8")
    shutil.copy2(out_data, out_public)
    return f"OK: kfz intelligence os DE → {out_public}"


def main() -> None:
    print(build_tree())
    print(build_intelligence_os())


if __name__ == "__main__":
    main()
