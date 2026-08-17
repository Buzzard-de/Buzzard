#!/usr/bin/env python3
"""Build 47 Category Intelligence OS Final 100% single-file HTML console."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence/scripts"))
from category_intelligence_47_locale_de import germanize_console_html
MANIFEST = REPO / "data/taxonomy/buzzard_47_category_intelligence_os.json"
BASE_HTML = REPO / "data/taxonomy/buzzard_47_category_intelligence_os.html"
OUT_DATA = REPO / "data/taxonomy/buzzard_47_category_intelligence_os_final_100_single_file.html"
OUT_PUBLIC = REPO / "public/taxonomy/buzzard_47_category_intelligence_os_final_100_single_file.html"

FINAL_NAV = "<button data-v='f'>100% Final</button>"

FINAL_SECTION = """
<section id='f' class='view'>
<h1>BUZZARD 47 CATEGORY INTELLIGENCE OS — FINAL 100%</h1>
<p class='lead'>47 Kategorien × 20 Wettbewerber = 940 Wettbewerber-Ziel. Der Software-Umfang ist gesperrt; künftig nur noch Live-Daten, Nachweise und Betrieb.</p>
<div class='grid'>
<div class='card'><b>100%</b><span>Software-Umfang</span></div>
<div class='card'><b>47</b><span>Kategorien (ohne KFZ)</span></div>
<div class='card'><b>940</b><span>Wettbewerber-Ziel</span></div>
<div class='card'><b>LOCKED</b><span>FINAL_SOFTWARE_SCOPE_LOCKED</span></div>
</div>
<div class='panel'>
<h2>12 Ebenen — abgeschlossen</h2>
<div class='wrap'><table>
<tr><th>Ebene</th><th>Status</th><th>Umfang</th></tr>
<tr><td>Category Registry</td><td>100%</td><td>47 Hauptkategorien, Master-Taxonomie-Sync</td></tr>
<tr><td>Competitor Matrix</td><td>100%</td><td>20 Wettbewerber / Kategorie, Ranking + Verifizierung</td></tr>
<tr><td>Taxonomy Nodes</td><td>100%</td><td>Wettbewerber- + Buzzard-Knotenvergleich</td></tr>
<tr><td>Evidence Model</td><td>100%</td><td>URL, Confidence, Verified-Flag</td></tr>
<tr><td>Feature Intelligence</td><td>100%</td><td>Gemeinsame Merkmalserkennung</td></tr>
<tr><td>Gap Analysis</td><td>100%</td><td>Gemeinsam, einzigartig, Buzzard-Lücken</td></tr>
<tr><td>Research Queue</td><td>100%</td><td>Priorisierte Recherche-Aufgaben</td></tr>
<tr><td>Audit Trail</td><td>100%</td><td>Akteur, Aktion, Entity-Log</td></tr>
<tr><td>Kurmay Dashboard</td><td>100%</td><td>Zentrale KPIs + Kategorie / Wettbewerber / Analyse</td></tr>
<tr><td>API Layer</td><td>100%</td><td>/category-intelligence-47 REST</td></tr>
<tr><td>Static Console</td><td>100%</td><td>Single-File HTML + Manifest</td></tr>
<tr><td>Governance</td><td>100%</td><td>Nur öffentliche Quellen, Nachweis erforderlich</td></tr>
</table></div>
</div>
<p class='lead' style='margin-top:14px'>Nächste Schritte: Live-Wettbewerber-Ingestion, Nachweis-Verifizierung im Maßstab, Monitoring, Production-Credentials.</p>
</section>
"""

BOOT_SCRIPT = """
<script>
const BOOT = __BOOT_JSON__;
</script>
"""


def load_base_html() -> str:
    if BASE_HTML.is_file():
        text = BASE_HTML.read_text(encoding="utf-8").strip()
        if text.startswith('"') and text.endswith('"'):
            text = json.loads(text)
        return text
    raise FileNotFoundError(f"Base HTML missing: {BASE_HTML}")


def build_html(manifest: dict) -> str:
    html = load_base_html()
    html = html.replace(
        "<title>BUZZARD 47 CATEGORY INTELLIGENCE OS</title>",
        "<title>BUZZARD 47 Category Intelligence OS — Final 100%</title>",
    )
    html = html.replace(
        "<div class='tag'>Competitive Intelligence • Taxonomy • Gap Detection • Evidence</div>",
        "<div class='tag'>Final 100% • Competitive Intelligence • Taxonomy • Gap Detection • Evidence</div>",
    )
    html = html.replace(
        "<button data-v='l'>Audit</button></nav>",
        f"<button data-v='l'>Audit</button>{FINAL_NAV}</nav>",
    )
    html = html.replace("</main>", f"{FINAL_SECTION}</main>")
    boot = BOOT_SCRIPT.replace("__BOOT_JSON__", json.dumps(manifest, ensure_ascii=False))
    html = html.replace("</body>", f"{boot}</body>")
    return germanize_console_html(html)


def ensure_manifest_finalization(manifest: dict) -> dict:
    manifest = dict(manifest)
    manifest["version"] = "1.0-final-100"
    manifest["final_console_html"] = "/taxonomy/buzzard_47_category_intelligence_os_final_100_single_file.html"
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
    manifest = ensure_manifest_finalization(json.loads(MANIFEST.read_text(encoding="utf-8")))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_manifest = REPO / "public/taxonomy/buzzard_47_category_intelligence_os.json"
    public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    html = build_html(manifest)
    OUT_DATA.write_text(html, encoding="utf-8")
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT_DATA, OUT_PUBLIC)

    # Fix base HTML if it was JSON-quoted
    base = load_base_html()
    if BASE_HTML.read_text(encoding="utf-8").strip().startswith('"'):
        BASE_HTML.write_text(base, encoding="utf-8")
        shutil.copy2(BASE_HTML, REPO / "public/taxonomy/buzzard_47_category_intelligence_os.html")

    print(f"OK: manifest finalization → {MANIFEST}")
    print(f"OK: final 100 console → {OUT_DATA} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
