#!/usr/bin/env python3
"""Build 47 Category Intelligence OS MAX SINGLE FINAL unified console."""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence/scripts"))
from category_intelligence_47_locale_de import germanize_console_html
MANIFEST = REPO / "data/taxonomy/buzzard_47_category_intelligence_os.json"
SOURCE_HTML = REPO / "data/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html"
OUT_DATA = REPO / "data/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html"
OUT_PUBLIC = REPO / "public/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html"

FINAL_100_SECTION = """
<section id='f' class='view'>
<h1>BUZZARD 47 CATEGORY INTELLIGENCE OS — FINAL 100%</h1>
<p class='lead'>Software scope locked at 100%. Future work: live competitor ingestion, evidence verification at scale, monitoring, production credentials.</p>
<div class='grid'>
<div class='card'><b>100%</b><span>Software scope</span></div>
<div class='card'><b>LOCKED</b><span>FINAL_SOFTWARE_SCOPE_LOCKED</span></div>
<div class='card'><b>0</b><span>New major modules planned</span></div>
<div class='card'><b>GO-LIVE</b><span>Operations boundary defined</span></div>
</div>
</section>
"""


def build_html(manifest: dict) -> str:
    html = SOURCE_HTML.read_text(encoding="utf-8")
    html = html.replace(
        "<title>BUZZARD 47 Category Intelligence OS — MAX FINAL</title>",
        "<title>BUZZARD 47 Category Intelligence OS — MAX SINGLE FINAL</title>",
    )
    html = html.replace(
        "MAX FINAL • Competitive Intelligence",
        "MAX SINGLE FINAL • Competitive Intelligence",
    )
    html = html.replace(
        "<button data-v='l'>Audit</button><button data-v='f'>MAX Final</button>",
        "<button data-v='l'>Audit</button><button data-v='m'>MAX Engine</button><button data-v='f'>100% Final</button>",
    )
    html = html.replace("<section id='f' class='view'>", "<section id='m' class='view'>", 1)
    html = html.replace(
        "<h1>BUZZARD 47 CATEGORY INTELLIGENCE OS — MAX FINAL</h1>",
        "<h1>BUZZARD 47 CATEGORY INTELLIGENCE OS — MAX ENGINE</h1>",
        1,
    )
    html = html.replace("</section>\n</main><script>", f"</section>\n{FINAL_100_SECTION}\n</main><script>")
    boot = json.dumps(manifest, ensure_ascii=False)
    html = re.sub(r"const BOOT = \{.*?\};", f"const BOOT = {boot};", html, count=1, flags=re.DOTALL)
    return germanize_console_html(html)


def ensure_manifest(manifest: dict) -> dict:
    manifest = dict(manifest)
    manifest["version"] = "1.0-max-single-final"
    primary = "/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html"
    manifest["max_single_final_console_html"] = primary
    manifest["engine"] = {
        "name": "Buzzard 47 Category Intelligence OS — MAX SINGLE FINAL",
        "modules": [
            "category_master_taxonomy",
            "competitor_registry",
            "evidence_tracking",
            "taxonomy_nodes",
            "gap_analysis",
            "feature_matrix",
            "opportunity_findings",
            "research_queue",
            "audit_trail",
            "settings_store",
            "rest_api",
            "single_file_console",
        ],
        "verification_policy": "evidence_required",
    }
    manifest["finalization"] = {
        "software_scope_percent": 100,
        "status": "FINAL_SOFTWARE_SCOPE_LOCKED",
        "new_major_software_planned": False,
        "future_work": (
            "production deployment, live competitor ingestion, evidence verification at scale, monitoring"
        ),
        "core_domains": [
            "category_registry",
            "competitor_matrix",
            "taxonomy_nodes",
            "feature_intelligence",
            "gap_analysis",
            "research_queue",
            "audit",
            "evidence",
        ],
    }
    return manifest


def main() -> None:
    manifest = ensure_manifest(json.loads(MANIFEST.read_text(encoding="utf-8")))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_manifest = REPO / "public/taxonomy/buzzard_47_category_intelligence_os.json"
    public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    html = build_html(manifest)
    OUT_DATA.write_text(html, encoding="utf-8")
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT_DATA, OUT_PUBLIC)

    print(f"OK: manifest max-single-final → {MANIFEST}")
    print(f"OK: max single final console → {OUT_DATA} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
