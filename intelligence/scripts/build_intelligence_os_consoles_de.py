#!/usr/bin/env python3
"""Germanize remaining Intelligence OS taxonomy HTML consoles."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence/scripts"))
from kfz_taxonomy_locale_de import germanize_kfz_html

TARGETS = [
    "buzzard_intelligence_os_all_in_one.html",
    "buzzard_intelligence_os_maximum_single_file.html",
    "buzzard_master_business_os_maximum_single_file.html",
    "buzzard_master_business_os_final_100_single_file.html",
    "buzzard_master_kfz_intelligence_os.html",
]

EXTRA = (
    ("Intelligence OS", "Intelligence OS"),
    ("Business OS", "Business OS"),
    ("Merkez", "Zentrale"),
    ("Kategoriler", "Kategorien"),
    ("Rakipler", "Wettbewerber"),
    ("Analiz", "Analyse"),
    ("Gap Analizi", "Gap-Analyse"),
    ("Modüller", "Module"),
    ("Kurmay", "Kommando"),
    ("Yönetim", "Steuerung"),
    ("Durum", "Status"),
    ("Kapsam", "Umfang"),
)


def germanize(path: Path) -> str:
    html = path.read_text(encoding="utf-8")
    html = germanize_kfz_html(html)
    for old, new in EXTRA:
        html = html.replace(old, new)
    return html


def main() -> None:
    for name in TARGETS:
        src = REPO / "data/taxonomy" / name
        if not src.exists():
            src = REPO / "public/taxonomy" / name
        if not src.exists():
            print(f"SKIP: {name}")
            continue
        html = germanize(src)
        out_data = REPO / "data/taxonomy" / name
        out_public = REPO / "public/taxonomy" / name
        out_data.write_text(html, encoding="utf-8")
        out_public.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(out_data, out_public)
        print(f"OK: {name} → DE ({out_public.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
