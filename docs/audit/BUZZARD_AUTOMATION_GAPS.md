# Buzzard — Automation Gaps (Human Labor Reduction)

**Audit date:** 2026-10-11  
**Rule:** No invented headcount or cost savings. Measure later with real volumes.  
**Linked engines:** see `BUZZARD_CURRENT_STATE.md` and `BUZZARD_GAP_ANALYSIS.md`.

Buzzard’s strategy is to automate safely. Today almost every operational task is **manual or simulation-only**, because there is no live supplier, no ACTIVE catalog, and no commercial orders.

---

## Task-by-task

| İş | Bugün | Sorumlu motor | İnsan onayı? | İnsan zorunlu olduğu durumlar | Eksik API / veri | Yanlış karar riski | Başarı nasıl ölçülür |
|----|-------|---------------|--------------|-------------------------------|------------------|--------------------|----------------------|
| Ürün verisi toplama / temizleme | **Manuel** + dry-run PIM pipeline | PIM validation (`productValidation*.js`) + Product AI (stub) | Evet — publish | Identifier clash, image rights, unsafe claims | Live supplier feed (GAP-02) | Wrong GTIN/title → returns, legal | % staging PASS; duplicate rate; **no volume yet** |
| Tedarikçi araştırması | **Manuel** | Supplier hub registry; intelligence supplier_match (offline) | Evet | Contract, sanctions, quality | Company/registry APIs **DOĞRULANAMADI** in use | Onboard fraud supplier | Time-to-qualified-supplier (not measured) |
| Ürün eşleştirme | **Kısmi** (identifier detector, not live volume) | `productDuplicateDetector.js`, `supplierMappingService.js` | Evet on low confidence | Ambiguous MPN/brand | GTIN coverage from supplier | Merge distinct SKUs | Match precision/recall on labelled set (**no labelled prod set**) |
| Fiyat güncelleme | **Manuel / CLI** | Node markup helpers; Python ProfitEngine **not on cart** | Evet below floor | Loss-leading, MAP, channel rules | Unified pricing service (GAP-03); lawful comparable feed (GAP-04) | Sell at loss or uncompetitive | % SKUs meeting €0.50; undercut only if source exists |
| Stok kontrolü | **Kısmi / simulated** | `stockSync.js` dry-run; cart check no reservation | Evet on mismatch | Supplier stale stock | Live stock API + reservation (P-07) | Oversell → cancel | Oversell count; sync age (no live SLA) |
| Sipariş yönlendirme | **Manuel / blocked** | Order engine + `searchSourcing` | Evet first N orders | Multi-supplier conflict, customs | Supplier order API (GAP-06) | Double-order supplier | First-pass route success; duplicate order = 0 |
| Kargo takibi | **Simülasyon** | Logistics DB + DEMO tracking | Evet on delay/lost | Exception, claims | Carrier events (GAP-09). GPS **yalnızca taşıyıcı verirse** | Fake location → trust loss | % orders with real tracking URL |
| Müşteri soruları | **Kısmi** (rule chat) | `aiChatService.js` | Evet for refunds/complaints | Abuse, legal, angry VIP | Order/PIM tools + optional LLM | Wrong promise | Containment rate **after** real tickets exist (0 tickets live) |
| İade değerlendirme | **Kısmi / admin-only** | RMA; Recovery API missing | **Evet her zaman** dispute/abuse | Fraud, used-return, supplier denial | GAP-07; do not auto-confirm supplier credit | Pay customer, never recover | Recovery ratio Confirmed/Expected |
| SEO / ürün içerik | **Kısmi** (templates, feeds empty) | storefront SEO + Product AI stub | Evet before publish | Trademark, medical claims | Real product corpus | Misleading content | Feed acceptance; **Merchant Center empty until products** |
| Marketplace listeleme | **Manuel / yok** | Hub job queue, no API | Evet first listings | Category mapping rejects (eMAG docs: human documentation team) | GAP-08 | Channel suspension | % offers accepted by channel sandbox |
| Ülke / VAT kuralları | **Kısmi display** | `market-engine` VAT | Evet before multi-country sales | IOSS, B2B reverse charge edge | Tax provider (GAP-14) | Tax liability | Accountant-signed DE invoice; other markets gated |
| Finansal mutabakat | **Manuel / yok** | paymentsFinance tables | Evet | Chargebacks, fees | PSP settlement API (NS-13) | Books ≠ PSP | Unreconciled € = 0 |
| Anomali tespiti | **Kısmi** (guardian costs, readiness gates) | Guardian + security logs | Evet | Novel fraud | Durable guardian DB (B-10); rules on real volume | Missed abuse / false block | Precision on labelled incidents (**none live**) |
| Raporlama | **Kısmi** (admin analytics plugins, 6 analytics “orders” vs 0 commerce orders — treat as **non-authoritative**) | analytics plugins | Hayır for read | Interpreting empty/demo metrics | Single SoT for orders | Bad decisions from demo KPIs | Reports match `commerce_orders` count (today 0) |

---

## Current automation level (honest)

| Seviye | Görevler |
|--------|----------|
| Uçtan uca otomatik | **Yok** (sales off, supplier dry-run, payments mock) |
| Kısmen otomatik | PIM validation, checkout dry-run + idempotency, rule-based chat, readiness gates, backup **files** |
| Manuel | Supplier choose, catalog populate, pricing policy unify, channel list, carrier, returns recovery, VAT filing, CS exceptions |
| Simulation only | Python orchestrator agents, phone assistant, marketplace sync jobs, DEMO tracking |

---

## Human-approval policy (keep)

Do **not** automate without approval when:

1. Enabling sales or live import flags  
2. First live supplier order  
3. Refunds and supplier-recovery mismatches  
4. Price below €0.50 net (once enforced)  
5. Publishing product content that can be legally sensitive  
6. Any AI action that spends money or emails a customer a promise  

`PRODUCTION_SAFETY_LOCK` and `BUZZARD_SALES_ENABLED=0` already encode this. Do not weaken them to “save labor.”

---

## What to build first for automation (same IDs as roadmap)

1. **P1** SoT + validation (makes every later agent useful)  
2. **P2** Supplier normalize (removes catalog typing)  
3. **P3** Price/stock guards (removes spreadsheet pricing)  
4. **P4** Order/pay/return loop (removes copy-paste fulfillment)  
5. Only then **P5–P7** channel + carrier + AI tools  

Success metrics stay **undefined in euros** until GAP-01 has real SKUs and GAP-05 has real (even sandbox) orders.
