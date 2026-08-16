#!/usr/bin/env python3
"""Build Buzzard Production Bridge MAX SINGLE HTML console."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "data/taxonomy/buzzard_production_bridge_manifest.json"
OUT_DATA = REPO / "data/taxonomy/buzzard_production_bridge_max_single_file.html"
OUT_PUBLIC = REPO / "public/taxonomy/buzzard_production_bridge_max_single_file.html"

HTML = """<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Buzzard Production Bridge — MAX SINGLE</title>
<style>
:root{--b:#070707;--p:#111;--g:#d7af48;--m:#999;--l:#292929}
*{box-sizing:border-box}body{margin:0;background:var(--b);color:#f4f4f4;font:14px system-ui,Arial}
header{position:sticky;top:0;background:#080808f5;border-bottom:1px solid var(--l);z-index:3}
.top{max-width:1200px;margin:auto;padding:16px 20px}.logo{font-size:22px;font-weight:900}
.logo b{color:var(--g)}.tag{color:var(--m);font-size:11px}
main{max-width:1200px;margin:auto;padding:20px}
h1{font-size:28px}.lead{color:var(--m);line-height:1.5}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
.card,.panel{background:var(--p);border:1px solid var(--l);border-radius:12px;padding:14px}
.card b{display:block;color:var(--g);font-size:24px}.card span{color:var(--m);font-size:11px}
.panel{margin-top:12px}.wrap{overflow:auto;border:1px solid var(--l);border-radius:9px}
table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid var(--l);text-align:left;font-size:12px}
th{color:var(--g);background:#151515}
button.action{background:#0d0d0d;color:#fff;border:1px solid #333;border-radius:8px;padding:9px 14px;cursor:pointer}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.ok{color:#7dffb0}.bad{color:#ff8f8f}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
</style></head>
<body><header><div class="top">
<div class="logo"><b>BUZZARD</b> Production Bridge — MAX SINGLE</div>
<div class="tag">Go-Live-Gates · Preflight · Keine erfundenen Credentials</div>
</div></header><main>
<h1>Produktionsreife-Gate</h1>
<p class="lead">Die Bridge prüft Domain, TLS, Datenbank, Zahlung, Versand, Lieferant, E-Mail, Sicherheit, Backup, Monitoring, Rechtliches, Bestelltest, Retoure und DSGVO. Jedes Gate muss bestehen.</p>
<div id="k" class="grid"></div>
<div class="toolbar">
<button class="action" onclick="loadPreflight()">Preflight laden</button>
<button class="action" onclick="savePreflight()">Report speichern</button>
</div>
<div class="panel"><h2>Gates</h2><div class="wrap"><table id="gt"></table></div></div>
<div class="panel"><h2>Rechtsseiten</h2><div class="wrap"><table id="lt"></table></div></div>
<div class="panel"><h2>Umgebung</h2><div class="wrap"><table id="et"></table></div></div>
</main><script>
const API_BASE=(window.BUZZARD_PRODUCTION_BRIDGE_API_BASE||'https://buzzard-api.onrender.com/production/bridge');
const BOOT=__BOOT_JSON__;
async function api(u,m){const o=m?{method:m,headers:{'Content-Type':'application/json'},body:'{}'}:{};const r=await fetch(API_BASE+u,o);const j=await r.json();if(!r.ok)throw Error(j.detail||'Fehler');return j}
function renderPreflight(p){
$("k").innerHTML=[
["Bereitschaft",p.readiness_pct+"%"],
["Bestanden",p.passed+"/"+p.total],
["Go-Live",p.go_live_allowed?"ERLAUBT":"BLOCKIERT"],
["Site",p.site&&p.site.ok?"OK":"BLOCKIERT"]
].map(x=>'<div class="card"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>').join("");
const labels=p.gate_labels||{};
$("gt").innerHTML="<tr><th>Gate</th><th>Status</th><th>Beschreibung</th></tr>"+
Object.entries(p.gates||{}).map(([k,v])=>"<tr><td>"+k+"</td><td class='"+(v?"ok":"bad")+"'>"+(v?"PASS":"BLOCKED")+"</td><td>"+(labels[k]||"")+"</td></tr>").join("");
$("lt").innerHTML="<tr><th>Route</th><th>Status</th><th>Detail</th></tr>"+
(p.legal_routes||[]).map(x=>"<tr><td>"+x.route+"</td><td class='"+(x.ok?"ok":"bad")+"'>"+(x.ok?"OK":"BLOCKED")+"</td><td>"+x.detail+"</td></tr>").join("");
$("et").innerHTML="<tr><th>Variable</th><th>Status</th><th>Detail</th></tr>"+
(p.environment||[]).map(x=>"<tr><td>"+x.gate+"</td><td class='"+(x.ok?"ok":"bad")+"'>"+(x.ok?"OK":"BLOCKED")+"</td><td>"+x.detail+"</td></tr>").join("");
}
async function loadPreflight(){renderPreflight(await api("/preflight"))}
async function savePreflight(){const r=await api("/preflight/save","POST");alert("Report gespeichert: "+(r.report_path||"ok"));renderPreflight(r)}
loadPreflight();
</script></body></html>
"""


def ensure_manifest(manifest: dict) -> dict:
    manifest = dict(manifest)
    manifest["version"] = "1.0-max-single"
    manifest["primary_console_html"] = "/taxonomy/buzzard_production_bridge_max_single_file.html"
    manifest["preflight_json"] = "/taxonomy/buzzard_production_preflight.json"
    manifest["max_single_console_html"] = "/taxonomy/buzzard_production_bridge_max_single_file.html"
    return manifest


def main() -> None:
    manifest = ensure_manifest(json.loads(MANIFEST.read_text(encoding="utf-8")))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_manifest = REPO / "public/taxonomy/buzzard_production_bridge_manifest.json"
    public_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    html = HTML.replace("__BOOT_JSON__", json.dumps(manifest, ensure_ascii=False))
    OUT_DATA.write_text(html, encoding="utf-8")
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT_DATA, OUT_PUBLIC)
    print(f"OK: manifest max-single → {MANIFEST}")
    print(f"OK: production bridge console → {OUT_DATA} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
