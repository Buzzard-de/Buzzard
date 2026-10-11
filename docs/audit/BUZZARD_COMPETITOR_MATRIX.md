# Buzzard — Competitor Matrix

**Audit date:** 2026-10-11  
**Excluded (per brief):** Amazon, eBay, Temu, AliExpress.  
**Method:** Official developer / seller documentation first. Third-party integrator pages used only when labelled. Internal competitor systems are **not** inferred.  
**Confidence:** HIGH = official docs; MEDIUM = official marketing + partial API docs; LOW = third-party integrator only; DOĞRULANAMADI = claim not evidenced.

Buzzard comparison column refers to **`main` / live production**, not unmerged PRs.

---

## Comparison dimensions (used in gaps)

1. Category coverage  
2. Product catalog / data quality  
3. Supplier network  
4. Marketplace infrastructure  
5. Listing automation  
6. Stock / price sync  
7. Order management  
8. Payments  
9. Returns  
10. Shipping / tracking  
11. Multi-language / multi-country  
12. VAT / local market rules  
13. Search / filters  
14. Personalization  
15. AI operations  
16. Customer-service automation  
17. Price optimization  
18. Security / fraud  
19. Seller tools  
20. Mobile UX  
21. Analytics  
22. Workflow automation  
23. Operational efficiency  
24. Human-labor reduction potential  

---

## Matrix

| Rakip | Hedef pazarlar | Kategori kapsamı | Kanıtlanmış altyapı özellikleri | Buzzard'da karşılığı | Buzzard'daki eksik | Kaynaklar | Kanıt güveni |
|-------|----------------|------------------|--------------------------------|----------------------|--------------------|-----------|--------------|
| **Allegro** | PL + CZ/SK/HU marketplaces (`allegro-pl/cz/sk/hu`) | Broad C2C/B2C marketplace | REST API: product offers, stock/price commands, orders, Ship with Allegro, OAuth | Market metadata only; no Allegro client | Offer/order/shipment API, Smart! classification, multi-marketplace publish | https://developer.allegro.pl/documentation ; https://allegro.com/partners/certified-integrators/terms | HIGH |
| **OTTO Market** | DE (OTTO.de sellers) | Broad DE assortment | Seller API: products, availability, orders v4, shipments, returns warehouse scopes, ads scope, Partner Connect OAuth | DE market config only | Products/orders/shipments/returns connectors, sandbox | https://api.otto.market/docs/sellers-integration ; https://api.otto.market/docs/category/functional-interfaces | HIGH |
| **Kaufland** | DE storefront (+ other Kaufland storefronts in API `storefront=`) | Broad marketplace | Seller API v2: units/inventory, CSV import-files, orders, send/cancel, tickets, HMAC auth, **playground** | DE metadata only | Units/orders/tickets API, CSV import, playground soak | https://sellerapi.kaufland.com/?page=rest-api ; https://sellerapi.kaufland.com/?page=inventory | HIGH |
| **bol.com** | NL + BE | Broad; strong in electronics/books | Retailer API v10/v11: offers, stock (incl. reservation/`managedByRetailer`), FBR vs FBB, orders/shipments, FBB replenishment | NL market metadata | Offer API, stock reservation model, FBB (N/A if dropship-only) | https://api.bol.com/retailer/public/Retailer-API/v11/functional/offer-api/offer-api.html ; orders-shipments docs | HIGH |
| **eMAG** | RO/BG/HU (marketplace sites) | Broad CEE | Marketplace API v4.5.1: product/offer upload, stock/price/VAT/status sync, order import; docs state **no test environment** | Not in market-engine extensions | Entire connector + documentation process | https://marketplace.emag.ro/infocenter/.../api-documentation ; https://marketplace.emag.hu/infocenter/emag-academy/api-documentation/ | HIGH |
| **Cdiscount / Octopia** | FR Cdiscount (`SalesChannelId: CDISFR`) + Octopia multi-channel | Broad FR + Octopia network | Seller API v2: OAuth, offer packages (JSON upsert/update/delete), orders, shipments, returns; Octopia claims 14k+ sellers / 50M+ SKUs (marketing — treat SKU counts as **unverified internally**) | FR metadata only | Octopia offer/order/return APIs | https://developer.octopia-io.net/home/ ; https://developer.octopia-io.net/api-reference/offer-management/offer-management-json/ | HIGH (API); MEDIUM (scale claims) |
| **Alza / AlzaTrade** | CZ/SK/HU/AT and Alza shops | Electronics-led + marketplace | AlzaTrade API (OAuth client-credentials, orders, listings/categories/templates). Distinct from Alza **Drop API** | No Alza connector | Auth + listings + orders; decide Trade vs Drop | https://www.alza.cz/alzatrade-api ; https://marketplaceapi.alza.cz/swagger/index.html | HIGH |
| **Galaxus / Digitec** | CH (+ DE/AT shops) | Broad general merchandise | Official merchant programme: **CSV/FTP partial** or **XML complete** automation for product/order/returns; Partner Portal. Selective onboarding | No Galaxus connector | Feed/XML + order/return automation | https://www.galaxus.ch/en/page/join-our-merchant-programme-12462 | HIGH (official). Third-party “REST api.galaxus.ch” claims = **DOĞRULANAMADI** |
| **ManoMano** | FR/ES/IT/DE/UK DIY | DIY / home improvement | Public Partners API portal | No connector; Buzzard has construction/DIY taxonomy in intelligence packages | Partners API listing/order (details beyond portal existence = **DOĞRULANAMADI** without OpenAPI pull) | https://www.manomano.dev/ | MEDIUM |
| **Skroutz** | GR (+ Skroutz Marketplace / Smart Cart) | Price-comparison + marketplace | Orders API, Returns API, webhooks, Fulfilled by Skroutz, Skroutz Last Mile vouchers | No connector | Smart Cart accept/reject, returns webhooks, FBS (G if no warehouse) | https://developer.skroutz.gr/smart_cart/ ; https://developer.skroutz.gr/smart_cart/orders_api/ | HIGH |
| **Fnac Darty** | FR (Fnac + Darty) | Culture, tech, appliances | Offers API + Products FRA API v2 (Shop ID). Primary detailed how-to found via integrator (BeezUP), not first-party OpenAPI | No connector | Official partner API access; do not implement from integrator-only field maps | https://help.beezup.com/en/articles/7945672-darty-products-publication | LOW–MEDIUM (integrator). First-party OpenAPI **DOĞRULANAMADI** in this pass |
| **Zalando** | Multi-EU fashion | Fashion / lifestyle | zDirect / Partner APIs: orders, announced returns, ZFS stock movements, Connected Retail Order Events | No connector; fashion not Buzzard’s first catalog | Full fashion partner stack | https://docs.partner-solutions.zalan.do/en/oea/index.html ; https://partner.zalando.com/ | HIGH for fashion APIs. Fit for Buzzard multi-category **early = düşük öncelik** |
| **Fruugo** | 40+ country claim (seller marketing) | Cross-border general | Seller API + webhooks for product data; specialist-led validation; integration partners | No connector | Product/order API via official specialist path | https://sell.fruugo.com/en/integrating-with-fruugo-api-integration/ | MEDIUM (seller marketing + API mention) |
| **OnBuy** | UK + EU storefronts (seller marketing) | General marketplace | Seller REST commonly documented as `/v2/products`, `/v2/listings` | No connector | Official current OpenAPI not pulled this pass | Third-party mentions only this pass | **DOĞRULANAMADI** (official current docs not fetched) |

### Other EU multi-category platforms noted (not full rows)

| Platform | Why relevant | Official proof this pass | Buzzard |
|----------|--------------|--------------------------|---------|
| **idealo / billiger-style** | Price comparison, not full checkout marketplace | Not researched as seller API here | Price-undercut rule would need such feeds — **NS-07** |
| **About You / Zalando-like** | Fashion | Not required now | G / late P9 |
| **Real / Kaufland heritage** | Absorbed into Kaufland marketplace | Use Kaufland API | Same as Kaufland |

---

## Cross-cutting proven competitor capabilities vs Buzzard

| Capability | Proven at (examples) | Buzzard `main` |
|------------|----------------------|----------------|
| OAuth/HMAC seller API | Allegro, OTTO, bol, Octopia, Alza, Kaufland | Not implemented per channel |
| Offer create/update + stock/price commands | Allegro, Kaufland units, bol offers, Octopia packages | Local job queue only |
| Order ingest + accept/reject/ship | All HIGH-confidence rows | Dry-run checkout; 0 orders |
| Returns API / announced returns | OTTO returns warehouse, Skroutz Returns, Zalando announced-returns, Galaxus XML returns | RMA DB only; Recovery API missing |
| Sandbox / playground | Kaufland playground; OTTO sandbox mention; Zalando sandbox token URL | No marketplace sandbox |
| Fulfillment-by-platform warehouse | bol FBB, Skroutz FBS, Zalando ZFS | **G** unless model changes |
| Multi-country VAT / channel IDs | Allegro additionalMarketplaces; Octopia SalesChannelId; eMAG VAT fields | Display VAT yes; channel publish no |
| Mobile consumer apps | All major consumer brands (marketing) | Responsive web + phone CSS; **no native app** (not required) |
| Public AI-ops claims | **DOĞRULANAMADI** as internal implementation for all rows | Simulation orchestrator |

---

## What we did **not** claim

- Competitor GMV, revenue rank, or employee counts (out of scope; several marketing figures left unverified).
- That a competitor “has no AI” or “has no personalization” — internals not visible → **DOĞRULANAMADI**.
- That Galaxus exposes `https://api.galaxus.ch/marketplace/` — only seen on a third-party integrator page.
- That OnBuy’s current official API contract is `/v2/products` — not fetched from OnBuy first-party docs this pass.
- That Fnac Darty field maps from BeezUP are the official contract.
