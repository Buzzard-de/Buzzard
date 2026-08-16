#!/usr/bin/env python3
"""Build 47 Category Intelligence OS FINAL MAX single-file console."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "data/taxonomy/buzzard_47_category_intelligence_os.json"
CONFIG = (
    REPO
    / "intelligence/buzzard_ai_complete/category_intelligence_47_maximal/config/category_intelligence_47.production.json"
)
MATRIX = REPO / "data/taxonomy/buzzard_47_research_matrix_max.json"
OUT_DATA = REPO / "data/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html"
OUT_PUBLIC = REPO / "public/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html"
ARCHIVE = REPO / "intelligence/archive/buzzard_final_47_category_intelligence_os_max.py"
SOURCE_HTML = REPO / "data/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html"

FINAL_MAX_NAV = (
    "<button data-v='v'>Doğrulama</button><button data-v='x'>Araştırma</button>"
    "<button data-v='e'>FINAL MAX</button>"
)

FINAL_MAX_SECTION = """
<section id='v' class='view'>
<h1>Evidence Doğrulama Paneli</h1>
<p class='lead'>Aday rakipler yalnızca onaylı kanıt ile VERIFIED olur. candidate + evidence = review; onay = verified.</p>
<div id='vd' class='grid'></div>
<div class='panel'><h2>Executive özet</h2><pre id='ex' style='white-space:pre-wrap;font-size:12px;color:#ccc'></pre></div>
</section>
<section id='x' class='view'>
<h1>Araştırma Matrisi</h1>
<p class='lead'>940 aday rakip hedefi — toplu içe aktarma CANDIDATE statüsünde tutar.</p>
<div class='toolbar'>
<button class='action' onclick='loadMatrix()'>Matrisi göster</button>
<button class='action' onclick='importMatrix()'>İçe aktar</button>
</div>
<div class='panel'><pre id='mx' style='white-space:pre-wrap;font-size:12px;color:#ccc;max-height:420px;overflow:auto'></pre></div>
</section>
<section id='e' class='view'>
<h1>BUZZARD 47 CATEGORY INTELLIGENCE OS — FINAL MAX</h1>
<p class='lead'>Evidence-gated orchestration: discovery → evidence → normalization → scoring → gap findings → review → approval → audit.</p>
<div class='grid'>
<div class='card'><b>FINAL MAX</b><span>Evidence orchestration layer</span></div>
<div class='card'><b>47</b><span>Non-Kfz categories</span></div>
<div class='card'><b>940</b><span>Candidate competitor target</span></div>
<div class='card'><b>GATED</b><span>No VERIFIED without approved evidence</span></div>
</div>
<div class='panel'>
<h2>Orchestration modules</h2>
<div class='wrap'><table>
<tr><th>Module</th><th>Status</th><th>Description</th></tr>
<tr><td>Research Matrix Ingestion</td><td>FINAL MAX</td><td>BUZZARD_47_RESEARCH_MATRIX_MAX bulk candidate seed</td></tr>
<tr><td>Evidence Registry</td><td>FINAL MAX</td><td>URL, hash, review_status, reviewer audit</td></tr>
<tr><td>Competitor Verification</td><td>FINAL MAX</td><td>Requires ≥1 APPROVED evidence</td></tr>
<tr><td>Category Scoring</td><td>FINAL MAX</td><td>coverage, taxonomy depth, evidence quality</td></tr>
<tr><td>Executive Report</td><td>FINAL MAX</td><td>Category × competitor × findings rollup</td></tr>
<tr><td>CSV Export Endpoints</td><td>FINAL MAX</td><td>/export/competitors, /export/taxonomy</td></tr>
<tr><td>Verification Dashboard</td><td>FINAL MAX</td><td>Pending / approved / rejected evidence counts</td></tr>
<tr><td>Taxonomy Aliases</td><td>FINAL MAX</td><td>Canonical ↔ alias normalization store</td></tr>
</table></div>
</div>
</section>
"""

EXTRA_SCRIPT = """
async function loadVerify(){
let d=await api("/verification-dashboard");
$("vd").innerHTML=[["Aday rakip",d.candidate_competitors],["Doğrulanmış",d.verified_competitors],
["Bekleyen kanıt",d.evidence_pending],["Onaylı kanıt",d.evidence_approved],["Reddedilen",d.evidence_rejected]]
.map(x=>'<div class="card"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>').join("");
let r=await api("/executive-report");
$("ex").textContent=JSON.stringify(r,null,2);
}
async function loadMatrix(){
let m=await api("/research-matrix");
$("mx").textContent=JSON.stringify({name:m.name,version:m.version,target_rows:m.target_rows,row_count:(m.research_rows||[]).length,policy:m.policy},null,2);
}
async function importMatrix(){
let r=await api("/research-matrix/import",{method:"POST"});
$("mx").textContent=JSON.stringify(r,null,2);
render();
}
const _api=api;
api=async function(u,o){
if(o&&o.method==="POST"){let r=await fetch(API_BASE+u,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
let j=await r.json();if(!r.ok)throw Error(j.detail||"Hata");return j}
return _api(u);
};
"""


def ensure_research_matrix() -> dict:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    rows = []
    for category in config.get("categories", []):
        code = category["code"]
        name = category["name"]
        for rank in range(1, 21):
            rows.append(
                {
                    "category_code": code,
                    "rank": rank,
                    "competitor": f"{name} Candidate {rank}",
                    "domain": "",
                    "type": "SPECIALIST",
                    "country": "DE",
                    "evidence_url": "",
                    "revenue_eur": None,
                    "gmv_eur": None,
                    "notes": "Research matrix candidate — requires approved evidence before VERIFIED",
                }
            )
    payload = {
        "name": "BUZZARD_47_RESEARCH_MATRIX_MAX",
        "version": "1.0-final-max",
        "target_rows": 940,
        "policy": "candidate != verified",
        "research_rows": rows,
    }
    MATRIX.parent.mkdir(parents=True, exist_ok=True)
    MATRIX.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_matrix = REPO / "public/taxonomy/buzzard_47_research_matrix_max.json"
    public_matrix.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(MATRIX, public_matrix)
    return payload


def extract_ui_from_archive() -> str:
    if not ARCHIVE.is_file():
        raise FileNotFoundError(f"Archive source missing: {ARCHIVE}")
    text = ARCHIVE.read_text(encoding="utf-8")
    start = text.index('UI = """') + len('UI = """')
    end = text.rindex('"""')
    return text[start:end]


def patch_html(ui: str, manifest: dict) -> str:
    ui = ui.replace(
        "<title>BUZZARD 47 CATEGORY INTELLIGENCE OS</title>",
        "<title>BUZZARD 47 Category Intelligence OS — FINAL MAX</title>",
    )
    ui = ui.replace(
        "Competitive Intelligence • Taxonomy • Gap Detection • Evidence",
        "FINAL MAX • Evidence Orchestration • Research Matrix • Verification",
    )
    ui = ui.replace(
        '<button data-v="l">Audit</button>\n</nav></header><main>',
        f'<button data-v="l">Audit</button>{FINAL_MAX_NAV}\n</nav></header><main>',
    )
    ui = ui.replace("</main><script>", f"{FINAL_MAX_SECTION}</main><script>")
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
    ui = ui.replace("render();", "render();loadVerify();")
    ui = ui.replace("</script></body>", f"{EXTRA_SCRIPT}</script></body>")
    boot = json.dumps(manifest, ensure_ascii=False)
    ui = ui.replace("</body>", f"<script>const BOOT={boot};</script></body>")
    return ui


def build_from_max_single_final(manifest: dict) -> str:
    html = SOURCE_HTML.read_text(encoding="utf-8")
    html = html.replace(
        "<title>BUZZARD 47 Category Intelligence OS — MAX SINGLE FINAL</title>",
        "<title>BUZZARD 47 Category Intelligence OS — FINAL MAX</title>",
    )
    html = html.replace(
        "MAX SINGLE FINAL • Competitive Intelligence",
        "FINAL MAX • Evidence Orchestration • Research Matrix",
    )
    html = html.replace(
        "<button data-v='f'>MAX Final</button>",
        "<button data-v='v'>Doğrulama</button><button data-v='x'>Araştırma</button>"
        "<button data-v='e'>FINAL MAX</button><button data-v='f'>100% Final</button>",
    )
    html = html.replace("</section>\n</main><script>", f"</section>\n{FINAL_MAX_SECTION}\n</main><script>")
    html = re.sub(r"const BOOT = \{.*?\};", f"const BOOT = {json.dumps(manifest, ensure_ascii=False)};", html, count=1, flags=re.DOTALL)
    html = html.replace("render();", "render();loadVerify();")
    html = html.replace("</script></body>", f"{EXTRA_SCRIPT}</script></body>")
    return html


def ensure_manifest(manifest: dict) -> dict:
    manifest = dict(manifest)
    manifest["version"] = "1.0-final-max"
    primary = "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html"
    manifest["primary_console_html"] = primary
    manifest["final_max_console_html"] = primary
    manifest["research_matrix_json"] = "/taxonomy/buzzard_47_research_matrix_max.json"
    manifest["engine"] = {
        "name": "Buzzard 47 Category Intelligence OS — FINAL MAX",
        "modules": [
            "category_master_taxonomy",
            "competitor_registry",
            "evidence_tracking",
            "research_matrix_ingestion",
            "evidence_gated_verification",
            "competitor_scoring",
            "executive_reporting",
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
    manifest["orchestration"] = {
        "workflow": "discovery → evidence → normalization → scoring → gap findings → review → approval → audit",
        "verification_rule": "candidate + no evidence = CANDIDATE; candidate + evidence = review; approval = VERIFIED",
        "research_matrix_target": 940,
    }
    manifest["finalization"] = {
        "software_scope_percent": 100,
        "status": "FINAL_MAX_ORCHESTRATION_LOCKED",
        "new_major_software_planned": False,
        "future_work": "live competitor ingestion, evidence verification at scale, monitoring, production credentials",
        "core_domains": [
            "category_registry",
            "competitor_matrix",
            "research_matrix",
            "evidence_registry",
            "verification_dashboard",
            "competitor_scoring",
            "executive_report",
            "taxonomy_nodes",
            "gap_analysis",
            "audit",
        ],
    }
    return manifest


def main() -> None:
    ensure_research_matrix()
    manifest = ensure_manifest(json.loads(MANIFEST.read_text(encoding="utf-8")))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_manifest = REPO / "public/taxonomy/buzzard_47_category_intelligence_os.json"
    public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if SOURCE_HTML.is_file():
        html = build_from_max_single_final(manifest)
    else:
        html = patch_html(extract_ui_from_archive(), manifest)

    OUT_DATA.write_text(html, encoding="utf-8")
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT_DATA, OUT_PUBLIC)

    print(f"OK: research matrix → {MATRIX}")
    print(f"OK: manifest final-max → {MANIFEST}")
    print(f"OK: final max console → {OUT_DATA} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
