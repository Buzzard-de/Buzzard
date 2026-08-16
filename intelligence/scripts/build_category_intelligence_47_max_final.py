#!/usr/bin/env python3
"""Build 47 Category Intelligence OS MAX FINAL single-file HTML console."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "data/taxonomy/buzzard_47_category_intelligence_os.json"
OUT_DATA = REPO / "data/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html"
OUT_PUBLIC = REPO / "public/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html"
ARCHIVE = REPO / "intelligence/archive/buzzard_47_category_intelligence_os_max_final.py"

FINAL_NAV = "<button data-v='f'>MAX Final</button>"

FINAL_SECTION = """
<section id='f' class='view'>
<h1>BUZZARD 47 CATEGORY INTELLIGENCE OS — MAX FINAL</h1>
<p class='lead'>Maximum core engine: evidence-backed competitor registry, taxonomy nodes, feature matrix, gap analysis, research queue, audit trail, and Kurmay dashboard. Software scope complete.</p>
<div class='grid'>
<div class='card'><b>MAX</b><span>Maximum core engine</span></div>
<div class='card'><b>47</b><span>Non-Kfz categories</span></div>
<div class='card'><b>940</b><span>Competitor target</span></div>
<div class='card'><b>EVIDENCE</b><span>No VERIFIED without source</span></div>
</div>
<div class='panel'>
<h2>Engine modules</h2>
<div class='wrap'><table>
<tr><th>Module</th><th>Status</th><th>Description</th></tr>
<tr><td>Category Master Taxonomy</td><td>MAX</td><td>47 mains synced from Master Taxonomy 48</td></tr>
<tr><td>Competitor Registry</td><td>MAX</td><td>20 slots per category, rank + verification</td></tr>
<tr><td>Evidence / Source Tracking</td><td>MAX</td><td>URL, confidence, verified flags</td></tr>
<tr><td>Taxonomy Nodes</td><td>MAX</td><td>Main / sub / sub-sub paths with normalization</td></tr>
<tr><td>Gap Analysis</td><td>MAX</td><td>Common, rare, Buzzard-missing candidates</td></tr>
<tr><td>Feature Matrix</td><td>MAX</td><td>competitor_features with notes</td></tr>
<tr><td>Opportunity Findings</td><td>MAX</td><td>Scored proposals with audit trail</td></tr>
<tr><td>Research Queue</td><td>MAX</td><td>Priority tasks + assigned_agent</td></tr>
<tr><td>Audit Trail</td><td>MAX</td><td>Actor / action / entity logging</td></tr>
<tr><td>Settings Store</td><td>MAX</td><td>Scope, target, verification policy</td></tr>
<tr><td>REST API</td><td>MAX</td><td>/category-intelligence-47</td></tr>
<tr><td>Dashboard Console</td><td>MAX</td><td>Single-file HTML + manifest BOOT</td></tr>
</table></div>
</div>
</section>
"""

BOOT_SCRIPT = """
<script>
const BOOT = __BOOT_JSON__;
</script>
"""


def extract_ui_from_archive() -> str:
    if not ARCHIVE.is_file():
        raise FileNotFoundError(f"Archive source missing: {ARCHIVE}")
    text = ARCHIVE.read_text(encoding="utf-8")
    start = text.index('UI = """') + len('UI = """')
    end = text.rindex('"""')
    return text[start:end]


def patch_html(ui: str) -> str:
    ui = ui.replace(
        "<title>BUZZARD 47 CATEGORY INTELLIGENCE OS</title>",
        "<title>BUZZARD 47 Category Intelligence OS — MAX FINAL</title>",
    )
    ui = ui.replace(
        "Competitive Intelligence • Taxonomy • Gap Detection • Evidence",
        "MAX FINAL • Competitive Intelligence • Taxonomy • Gap Detection • Evidence",
    )
    ui = ui.replace(
        '<button data-v="l">Audit</button>\n</nav></header><main>',
        f'<button data-v="l">Audit</button>{FINAL_NAV}\n</nav></header><main>',
    )
    ui = ui.replace("</main><script>", f"{FINAL_SECTION}</main><script>")
    ui = re.sub(
        r"async function api\(u\)\{let r=await fetch\(u\)",
        "const API_BASE=(window.BUZZARD_CAT47_API_BASE||'https://buzzard-api.onrender.com/category-intelligence-47');"
        "async function api(u){let r=await fetch(API_BASE+u)",
        ui,
        count=1,
    )
    replacements = {
        '"/api/summary"': '"/summary"',
        '"/api/categories"': '"/categories"',
        '"/api/audit"': '"/audit"',
        '"/api/categories/"': '"/categories/"',
        '"/api/analysis/"': '"/analysis/"',
    }
    for old, new in replacements.items():
        ui = ui.replace(old, new)
    return ui


def ensure_manifest(manifest: dict) -> dict:
    manifest = dict(manifest)
    manifest["version"] = "1.0-max-final"
    manifest["max_final_console_html"] = "/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html"
    manifest["engine"] = {
        "name": "Buzzard 47 Category Intelligence OS — MAX FINAL CORE",
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
            "dashboard_console",
        ],
        "verification_policy": "evidence_required",
    }
    if "finalization" not in manifest:
        manifest["finalization"] = {
            "software_scope_percent": 100,
            "status": "FINAL_SOFTWARE_SCOPE_LOCKED",
            "new_major_software_planned": False,
        }
    return manifest


def main() -> None:
    ARCHIVE.write_bytes(
        Path("/home/ubuntu/.cursor/projects/workspace/uploads/BUZZARD_47_CATEGORY_INTELLIGENCE_OS_MAX_FINAL_4177.py").read_bytes()
    )
    manifest = ensure_manifest(json.loads(MANIFEST.read_text(encoding="utf-8")))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_manifest = REPO / "public/taxonomy/buzzard_47_category_intelligence_os.json"
    public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    html = patch_html(extract_ui_from_archive())
    html = html.replace("</body>", BOOT_SCRIPT.replace("__BOOT_JSON__", json.dumps(manifest, ensure_ascii=False)) + "</body>")

    OUT_DATA.write_text(html, encoding="utf-8")
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT_DATA, OUT_PUBLIC)

    base_html = patch_html(extract_ui_from_archive())
    base_path = REPO / "data/taxonomy/buzzard_47_category_intelligence_os.html"
    base_path.write_text(base_html, encoding="utf-8")
    shutil.copy2(base_path, REPO / "public/taxonomy/buzzard_47_category_intelligence_os.html")

    print(f"OK: manifest max-final → {MANIFEST}")
    print(f"OK: max final console → {OUT_DATA} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
