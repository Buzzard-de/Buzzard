#!/usr/bin/env python3
"""Build buzzard_master_business_os_maximum_single_file.html from manifest + intelligence base."""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
INTEL_HTML = REPO / "data/taxonomy/buzzard_intelligence_os_maximum_single_file.html"
MANIFEST = REPO / "data/taxonomy/buzzard_master_business_os_maximum_manifest.json"
OUT_DATA = REPO / "data/taxonomy/buzzard_master_business_os_maximum_single_file.html"
OUT_PUBLIC = REPO / "public/taxonomy/buzzard_master_business_os_maximum_single_file.html"

BUSINESS_NAV = (
    '<button data-v="business">Business OS</button>'
    '<button data-v="catalog">PIM / Catalog</button>'
    '<button data-v="commerce">Commerce</button>'
    '<button data-v="logistics">Logistics</button>'
    '<button data-v="growth">Growth</button>'
    '<button data-v="finance">Finance</button>'
    '<button data-v="security">Security</button>'
)

BUSINESS_SECTIONS = """
<section id="business" class="view">
<h1>BUZZARD Business OS</h1>
<p class="lead">Kfz ile sınırlı olmayan, Buzzard'ın tüm kategorilerini taşıyacak merkezi işletim katmanı. Her modül aynı müşteri, ürün, sipariş, tedarikçi ve finans veri kimliklerini kullanır.</p>
<div class="grid" id="enterpriseModules"></div>
<div class="panel"><h2>Buzzard şirket veri akışı</h2><div class="pipeline" id="businessPipeline"></div></div>
</section>

<section id="catalog" class="view">
<h1>Master Catalog / PIM</h1>
<p class="lead">Buzzard'ın bütün ürünlerinin tek canonical kaynağı. Kfz uyumluluğu gibi özel bilgiler ürün ana verisinden ayrı domain olarak tutulur.</p>
<div class="grid">
<div class="kpi"><b>EAN / GTIN</b><span>Global ürün kimliği</span></div>
<div class="kpi"><b>OEM / MPN</b><span>Parça üretici kimlikleri</span></div>
<div class="kpi"><b>Attributes</b><span>Teknik özellikler</span></div>
<div class="kpi"><b>Media</b><span>Görsel / video / doküman</span></div>
</div>
<div class="panel"><h2>Canonical Product modeli</h2><div class="tablewrap"><table><thead><tr><th>Katman</th><th>Örnek</th><th>Amaç</th></tr></thead><tbody>
<tr><td>Product ID</td><td>PRD-000001</td><td>Buzzard iç kimlik</td></tr>
<tr><td>Identity</td><td>EAN / GTIN / MPN / OEM</td><td>Duplicate önleme</td></tr>
<tr><td>Category</td><td>CAT-01 / SUB / LEAF</td><td>Canonical taxonomy</td></tr>
<tr><td>Attributes</td><td>5W-30 / 5L / material...</td><td>Filtreleme ve arama</td></tr>
<tr><td>Compatibility</td><td>VEH / TEC / OEM</td><td>Kfz özel domain</td></tr>
<tr><td>Commercial</td><td>cost / price / margin</td><td>Satış ve kârlılık</td></tr>
<tr><td>Channel</td><td>web / eBay / Amazon</td><td>Marketplace mapping</td></tr>
</tbody></table></div></div>
</section>

<section id="commerce" class="view">
<h1>Commerce Control Center</h1>
<p class="lead">Ürün → fiyat → sepet → ödeme → sipariş → fulfillment → müşteri döngüsünün merkezi.</p>
<div class="grid">
<div class="kpi"><b>Storefront</b><span>Multilingual web commerce</span></div>
<div class="kpi"><b>Checkout</b><span>Payment / fraud checks</span></div>
<div class="kpi"><b>OMS</b><span>Order orchestration</span></div>
<div class="kpi"><b>Marketplace</b><span>Channel sync</span></div>
</div>
<div class="panel"><h2>Order lifecycle</h2><div class="pipeline" id="orderPipeline"></div></div>
</section>

<section id="logistics" class="view">
<h1>Smart Logistics & Warehouse</h1>
<p class="lead">Tedarikçi dropship'ten kendi depomuzdaki ürüne kadar tüm fulfillment senaryolarını tek karar motorunda birleştirir.</p>
<div class="grid">
<div class="kpi"><b>Stock</b><span>On-hand / reserved / available</span></div>
<div class="kpi"><b>Replenishment</b><span>Minimum stock / forecast</span></div>
<div class="kpi"><b>Carrier</b><span>DHL / DPD / GLS / Hermes / UPS</span></div>
<div class="kpi"><b>Returns</b><span>RMA / warranty</span></div>
</div>
<div class="panel"><h2>Shipping decision</h2><div class="tablewrap"><table><thead><tr><th>Girdi</th><th>Karar</th></tr></thead><tbody>
<tr><td>Destination</td><td>Ülke / bölge / posta kodu</td></tr><tr><td>Package</td><td>Ölçü / ağırlık / adet</td></tr><tr><td>Service</td><td>Standard / Express</td></tr><tr><td>Carrier</td><td>En uygun fiyat + SLA</td></tr><tr><td>Fulfillment</td><td>Warehouse / Supplier dropship</td></tr>
</tbody></table></div></div>
</section>

<section id="growth" class="view">
<h1>Growth & Customer Intelligence</h1>
<p class="lead">Reklam, müşteri, satış ve AI destekli büyüme motorları.</p>
<div class="grid">
<div class="module"><h3>Advertising Intelligence</h3><p>ROAS, CAC, conversion, product-level profitability.</p></div>
<div class="module"><h3>CRM Intelligence</h3><p>Segment, LTV, repeat purchase, churn risk.</p></div>
<div class="module"><h3>AI Sales</h3><p>Ürün bulma, alternatif, cross-sell ve upsell.</p></div>
<div class="module"><h3>AI Customer Service</h3><p>Çok dilli chat, e-posta ve telefon.</p></div>
</div>
<div class="panel"><h2>Growth loop</h2><div class="pipeline" id="growthPipeline"></div></div>
</section>

<section id="finance" class="view">
<h1>Finance & Profit OS</h1>
<p class="lead">Ciroyu değil gerçek kârlılığı yönetir. Ürün, sipariş, kanal, ülke ve kategori seviyesinde maliyetleri birleştirir.</p>
<div class="grid">
<div class="kpi"><b>Revenue</b><span>Net sales</span></div>
<div class="kpi"><b>Gross Margin</b><span>Product economics</span></div>
<div class="kpi"><b>Contribution</b><span>After variable costs</span></div>
<div class="kpi"><b>Net Profit</b><span>Company-level result</span></div>
</div>
<div class="panel"><h2>Profit waterfall</h2><div class="pipeline" id="financePipeline"></div></div>
</section>

<section id="security" class="view">
<h1>Security & Defense — Esat Bey</h1>
<p class="lead">Savunma odaklı güvenlik katmanı: saldırı yapmak değil, tehditleri tespit etmek, önlemek, izole etmek ve yönetime bildirmek.</p>
<div class="grid">
<div class="kpi"><b>Identity</b><span>Access / MFA / roles</span></div>
<div class="kpi"><b>Monitoring</b><span>Logs / anomalies</span></div>
<div class="kpi"><b>Isolation</b><span>Compromise containment</span></div>
<div class="kpi"><b>Audit</b><span>Immutable event trail</span></div>
</div>
<div class="panel"><h2>Defense loop</h2><div class="pipeline" id="securityPipeline"></div></div>
</section>
"""

RENDER_ENTERPRISE = """
function renderEnterprise(){
 const el=$("enterpriseModules");
 if(!el)return;
 el.innerHTML=(BOOT.enterprise_modules||[]).map(m=>'<div class="kpi"><b style="font-size:17px">'+esc(m[1])+' '+esc(m[0])+'</b><span>'+esc(m[2])+'</span><div class="flex" style="margin-top:10px"><span class="badge '+(m[3]==="KFZ"?"blue":m[3]==="SECURITY"?"red":"gold")+'">'+esc(m[3])+'</span></div></div>').join("");
 $("businessPipeline").innerHTML=["Customer","Catalog","Intelligence","Supplier","Price","Commerce","Order","Warehouse","Shipping","Marketing","Finance","Kurmay"].map((x,i)=>'<div class="step"><b>'+String(i+1).padStart(2,"0")+'</b>'+x+'</div>').join("");
 $("orderPipeline").innerHTML=["Cart","Checkout","Payment","Fraud","Order","Supplier/Stock","Fulfillment","Carrier","Tracking","Delivered","Review","Repeat"].map((x,i)=>'<div class="step"><b>'+String(i+1).padStart(2,"0")+'</b>'+x+'</div>').join("");
 $("growthPipeline").innerHTML=["Traffic","Ad","Visit","Search","Product","Cart","Order","Retention","LTV"].map((x,i)=>'<div class="step"><b>'+String(i+1).padStart(2,"0")+'</b>'+x+'</div>').join("");
 $("financePipeline").innerHTML=["Gross Sales","Returns","Net Sales","COGS","Shipping","Fees","Ads","Contribution","Overhead","Net Profit"].map((x,i)=>'<div class="step"><b>'+String(i+1).padStart(2,"0")+'</b>'+x+'</div>').join("");
 $("securityPipeline").innerHTML=["Identity","Monitor","Detect","Score","Alert","Isolate","Investigate","Recover","Audit"].map((x,i)=>'<div class="step"><b>'+String(i+1).padStart(2,"0")+'</b>'+x+'</div>').join("");
}
"""


def build() -> str:
    html = INTEL_HTML.read_text(encoding="utf-8")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    boot_json = json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))

    html = html.replace(
        "<title>BUZZARD Intelligence OS — Maximum Single File</title>",
        "<title>BUZZARD Master Business OS — Maximum Single File</title>",
    )
    html = html.replace(
        '<div class="logo"><span>BUZZARD</span> INTELLIGENCE OS</div><div class="subtitle">Maximum • All-in-One • Category • Competitor • Price • Product • Supplier • Demand • Trend • Opportunity • Memory • Alerts • Kurmay</div>',
        '<div class="logo"><span>BUZZARD</span> MASTER BUSINESS OS</div><div class="subtitle">Maximum • Intelligence • Business OS • PIM • Commerce • Logistics • Growth • Finance • Security • Kurmay</div>',
    )
    html = html.replace(
        '<button data-v="architecture">Mimari</button>',
        BUSINESS_NAV + '<button data-v="architecture">Mimari</button>',
    )
    html = html.replace(
        '<section id="architecture" class="view">',
        BUSINESS_SECTIONS + "\n<section id=\"architecture\" class=\"view\">",
    )
    html = html.replace(
        '<div class="footer">BUZZARD Intelligence OS • Maximum single-file prototype • Demo seed data açıkça işaretlenmiştir; canlı veri iddiası değildir.</div>',
        '<div class="footer">BUZZARD Master Business OS • Maximum single-file prototype • Demo seed data açıkça işaretlenmiştir; canlı veri iddiası değildir.</div>',
    )
    html = re.sub(
        r"const BOOT = \{.*?\};",
        f"const BOOT = {boot_json};",
        html,
        count=1,
        flags=re.DOTALL,
    )
    html = html.replace('localStorage.getItem("buzzardOS2")', 'localStorage.getItem("buzzardBusinessOS2")')
    html = html.replace('localStorage.setItem("buzzardOS2"', 'localStorage.setItem("buzzardBusinessOS2"')
    html = html.replace('localStorage.removeItem("buzzardOS2")', 'localStorage.removeItem("buzzardBusinessOS2")')
    html = html.replace(
        'a.download="buzzard-intelligence-os-full.json"',
        'a.download="buzzard-master-business-os-full.json"',
    )
    html = html.replace(
        "renderCategory();renderCompetitor();renderOpportunity();renderMemory();renderAlerts();renderKurmay();renderAgents();renderOps();",
        "renderCategory();renderCompetitor();renderOpportunity();renderMemory();renderAlerts();renderKurmay();renderAgents();renderOps();renderEnterprise();",
    )
    html = html.replace("function exportJSON(){", RENDER_ENTERPRISE + "\nfunction exportJSON(){")
    return html


def main() -> None:
    output = build()
    OUT_DATA.write_text(output, encoding="utf-8")
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    OUT_PUBLIC.write_text(output, encoding="utf-8")
    print(f"Wrote {OUT_DATA} ({len(output)} bytes)")
    print(f"Wrote {OUT_PUBLIC} ({len(output)} bytes)")


if __name__ == "__main__":
    main()
