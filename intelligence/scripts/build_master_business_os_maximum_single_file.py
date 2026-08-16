#!/usr/bin/env python3
"""Build Master Business OS single-file HTML consoles from manifest + intelligence base."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
INTEL_HTML = REPO / "data/taxonomy/buzzard_intelligence_os_maximum_single_file.html"
MANIFEST = REPO / "data/taxonomy/buzzard_master_business_os_maximum_manifest.json"
OUT_MAX_DATA = REPO / "data/taxonomy/buzzard_master_business_os_maximum_single_file.html"
OUT_MAX_PUBLIC = REPO / "public/taxonomy/buzzard_master_business_os_maximum_single_file.html"
OUT_FINAL_DATA = REPO / "data/taxonomy/buzzard_master_business_os_final_100_single_file.html"
OUT_FINAL_PUBLIC = REPO / "public/taxonomy/buzzard_master_business_os_final_100_single_file.html"
OUT_MANIFEST_PUBLIC = REPO / "public/taxonomy/buzzard_master_business_os_maximum_manifest.json"

BUSINESS_NAV = (
    '<button data-v="business">Business OS</button>'
    '<button data-v="catalog">PIM / Catalog</button>'
    '<button data-v="commerce">Commerce</button>'
    '<button data-v="logistics">Logistics</button>'
    '<button data-v="growth">Growth</button>'
    '<button data-v="finance">Finance</button>'
    '<button data-v="security">Security</button>'
    '<button data-v="final">100% Final</button>'
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

<section id="final" class="view">
<h1>🦅 BUZZARD MASTER BUSINESS OS — FINAL 100%</h1>
<p class="lead">Bu sürüm Buzzard'ın yazılım kapsamını tek çekirdekte kilitler. Yeni bir ana yazılım modülü planlanmamıştır. Bundan sonraki işler canlı servis hesapları, API anahtarları, gerçek veri kaynakları ve deployment bağlantılarıdır.</p>
<div class="grid">
<div class="kpi"><b>100%</b><span>Yazılım kapsamı</span></div>
<div class="kpi"><b>18</b><span>Ana sistem modülü</span></div>
<div class="kpi"><b>43+</b><span>Kategori Intelligence mimarisi</span></div>
<div class="kpi"><b>1</b><span>Merkezi Kurmay</span></div>
</div>
<div class="panel"><h2>Final sistem sınırı</h2><div class="tablewrap"><table><thead><tr><th>Katman</th><th>Durum</th><th>Kapsam</th></tr></thead><tbody>
<tr><td>Customer Experience</td><td>100%</td><td>Web storefront, multilingual UX, AI chat/sales</td></tr>
<tr><td>Commerce</td><td>100%</td><td>Catalog, cart, checkout, order lifecycle</td></tr>
<tr><td>Master Data</td><td>100%</td><td>PIM, canonical product, category, EAN/OEM/MPN</td></tr>
<tr><td>Intelligence</td><td>100%</td><td>Category, competitor, price, product, supplier, demand, trend</td></tr>
<tr><td>Supply</td><td>100%</td><td>Supplier hub, API/XML/TecDoc adapters, dropship model</td></tr>
<tr><td>Operations</td><td>100%</td><td>OMS, warehouse, inventory, returns, warranty</td></tr>
<tr><td>Logistics</td><td>100%</td><td>Carrier abstraction and smart shipping engine</td></tr>
<tr><td>Growth</td><td>100%</td><td>Ads, CRM, customer intelligence, AI sales</td></tr>
<tr><td>Finance</td><td>100%</td><td>Revenue, COGS, fees, ads, contribution, net profit</td></tr>
<tr><td>Security</td><td>100%</td><td>Identity, least privilege, monitoring, audit, isolation model</td></tr>
<tr><td>AI Organization</td><td>100%</td><td>Specialists, Doğu Bey, Aslan Bey, Esat Bey, Central Kurmay</td></tr>
<tr><td>Governance</td><td>100%</td><td>Evidence, approval, versioning, audit, public-source boundary</td></tr>
</tbody></table></div></div>
<div class="panel"><h2>Yeni yazılım üretme kriteri</h2><p class="lead">Bu çekirdek tamamlandıktan sonra yeni ihtiyaçlar mevcut modüllerin içine feature/adapter olarak eklenecek. Ancak yeni bir ana sistem ancak iş modelinde gerçekten yeni bir domain ortaya çıkarsa açılacak.</p></div>
<div class="alert"><b>Canlıya geçiş notu:</b> Yazılım kapsamının tamamlanması, üçüncü taraf servis hesaplarının otomatik olarak açıldığı anlamına gelmez. eBay/Amazon/TecDoc/kargo/ödeme/tedarikçi API'leri için gerçek hesap ve yetkiler gerektiğinde ilgili adapter'lar etkinleştirilir.</div>
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


def build(*, final_100: bool = True) -> str:
    html = INTEL_HTML.read_text(encoding="utf-8")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    boot_json = json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))

    if final_100:
        title = "<title>BUZZARD Master Business OS — Final 100%</title>"
        header = (
            '<div class="logo"><span>BUZZARD</span> MASTER BUSINESS OS</div>'
            '<div class="subtitle">Final 100% • Intelligence • Business OS • PIM • Commerce • Logistics • Growth • Finance • Security • Kurmay</div>'
        )
        footer = (
            '<div class="footer">BUZZARD Master Business OS • Final 100% single-file prototype • '
            "Demo seed data açıkça işaretlenmiştir; canlı veri iddiası değildir.</div>"
        )
        download_name = 'a.download="buzzard-master-business-os-final-100-full.json"'
    else:
        title = "<title>BUZZARD Master Business OS — Maximum Single File</title>"
        header = (
            '<div class="logo"><span>BUZZARD</span> MASTER BUSINESS OS</div>'
            '<div class="subtitle">Maximum • Intelligence • Business OS • PIM • Commerce • Logistics • Growth • Finance • Security • Kurmay</div>'
        )
        footer = (
            '<div class="footer">BUZZARD Master Business OS • Maximum single-file prototype • '
            "Demo seed data açıkça işaretlenmiştir; canlı veri iddiası değildir.</div>"
        )
        download_name = 'a.download="buzzard-master-business-os-full.json"'

    html = html.replace("<title>BUZZARD Intelligence OS — Maximum Single File</title>", title)
    html = html.replace(
        '<div class="logo"><span>BUZZARD</span> INTELLIGENCE OS</div><div class="subtitle">Maximum • All-in-One • Category • Competitor • Price • Product • Supplier • Demand • Trend • Opportunity • Memory • Alerts • Kurmay</div>',
        header,
    )
    nav = BUSINESS_NAV if final_100 else BUSINESS_NAV.replace('<button data-v="final">100% Final</button>', "")
    sections = BUSINESS_SECTIONS if final_100 else BUSINESS_SECTIONS.split('<section id="final"')[0]
    html = html.replace('<button data-v="architecture">Mimari</button>', nav + '<button data-v="architecture">Mimari</button>')
    html = html.replace('<section id="architecture" class="view">', sections + '\n<section id="architecture" class="view">')
    html = html.replace(
        '<div class="footer">BUZZARD Intelligence OS • Maximum single-file prototype • Demo seed data açıkça işaretlenmiştir; canlı veri iddiası değildir.</div>',
        footer,
    )
    html = re.sub(r"const BOOT = \{.*?\};", f"const BOOT = {boot_json};", html, count=1, flags=re.DOTALL)
    html = html.replace('localStorage.getItem("buzzardOS2")', 'localStorage.getItem("buzzardBusinessOS2")')
    html = html.replace('localStorage.setItem("buzzardOS2"', 'localStorage.setItem("buzzardBusinessOS2"')
    html = html.replace('localStorage.removeItem("buzzardOS2")', 'localStorage.removeItem("buzzardBusinessOS2")')
    html = html.replace('a.download="buzzard-intelligence-os-full.json"', download_name)
    html = html.replace(
        "renderCategory();renderCompetitor();renderOpportunity();renderMemory();renderAlerts();renderKurmay();renderAgents();renderOps();",
        "renderCategory();renderCompetitor();renderOpportunity();renderMemory();renderAlerts();renderKurmay();renderAgents();renderOps();renderEnterprise();",
    )
    html = html.replace("function exportJSON(){", RENDER_ENTERPRISE + "\nfunction exportJSON(){")
    return html


def write_outputs(path_data: Path, path_public: Path, content: str) -> None:
    path_data.write_text(content, encoding="utf-8")
    path_public.parent.mkdir(parents=True, exist_ok=True)
    path_public.write_text(content, encoding="utf-8")
    print(f"Wrote {path_data} ({len(content)} bytes)")
    print(f"Wrote {path_public} ({len(content)} bytes)")


def main() -> None:
    final_html = build(final_100=True)
    write_outputs(OUT_FINAL_DATA, OUT_FINAL_PUBLIC, final_html)
    write_outputs(OUT_MAX_DATA, OUT_MAX_PUBLIC, build(final_100=False))
    shutil.copy2(MANIFEST, OUT_MANIFEST_PUBLIC)
    print(f"Synced {OUT_MANIFEST_PUBLIC}")


if __name__ == "__main__":
    main()
