# Buzzard — Complete Software Inventory & Status

Date: 2026-10-16  
READ-ONLY. No code/git/production/sales/SoT/payment changes.  
HEAD: `b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54`  
Companion: `BUZZARD_ORCHESTRATOR_DEEP_AUDIT_2026-10-16.md`

Untracked önceki raporlar korundu. Bu dosya önceden **ABSENT**.

**Yüzde kuralı:** Bileşen-özel resmi kriter envanteri yoksa **YÜZDE HESAPLANAMADI — KRİTER ENVANTERİ EKSİK**. İstisna: 237 register’dan **açık pay/payda** (Esat 11 madde; Pusat band 35–55). Kod varlığı ≠ çalışma; unit ≠ üretim.

---

## 1. Yönetici özeti

Kanonik AI yolu **Node Pusat** (`server/lib/pusat/`). `software/` **ikinci orchestrator değil**. İsteğe bağlı Python `orchestratorBridge` **senkron değil**, varsayılan kapalı.

Ajanlar **18 kod**, hepsi `execute` bağlı, hepsi **`recommendationOnly`**. Guardian **`executeTask` üzerinde** çalışır; her HTTP’de değil.

Önceki Pusat %92/%95 **sistem skoru olarak doğrulanamadı**. Esat **83.73%** (921/11) register aritmetiği. Üretim kanıtı **yok**.

---

## 2. Kanonik envanter (tekilleştirilmiş)

Aynı şeyi iki isimle saymama: Task Orchestrator = Pusat lifecycle; Product AI = `product_ai` ajanı; Security AI = Esat/Guardian; Category AI = `category_ai`.

| # | Kanonik ad | Yollar | Sorumluluk | Bağımlı olduğu | Ona bağımlı | I/O | Test | Çalışma kanıtı | Dış | İnsan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pusat Orchestrator | `server/lib/pusat/*`, `pusatPlugin.js` | Görev submit/execute | db, controlCenter, Guardian, HAC, agents | software facade, admin API | submit/execute HTTP admin | pusat* vitest (16.10 kısmen 99) | Yerel kod; **prod yok** | opsiyonel orch URL, LLM | CRITICAL/SENSITIVE |
| 2 | Esat/Guardian | `pusat/guardian.js`, `esatSecurity.js` | executeTask kapısı | rbac, securityLog | lifecycle | evaluate in-process | 99 içinde Guardian | executeTask yolu | SOC yok | — |
| 3 | HAC | `pusat/approval.js` | Onay token | hash, TTL | lifecycle consume | request/decide/consume | pusatApprovalExceptions | yerel | — | gerçek insan yok |
| 4 | AI Memory | `pusat/memory.js` | görev/ajan bellek | sqlite | agents, lifecycle | writeMemory | pusatMemoryGuardian (tarihsel) | yerel | — | — |
| 5 | Specialist agents (18) | `pusat/agents.js` | öneri | pricing, stock, pim, taxonomy | executeTask | executeAgent | roster kod | recommendationOnly | LLM stub | live mutation yok |
| 6 | Product Engine | `productStore`, `pimCatalog`, `productCatalogPim` | katalog yazma | db, writeBoundary | storefront | HTTP admin | productArchitecture | SoT off | — | SoT 73 |
| 7 | Product SoT | `productArchitecture`, flags | tek yazıcı | — | tüm katalog | inactive | tests SoT false | **kapalı** | — | **73** |
| 8 | Supplier Integration | `supplierHub`, `realSupplierConnector`, `supplierFeeds` | feed/PO | salesGuard | inventory | preview | softwareCompletion | PO blok | IC/TecDoc | PO HUMAN |
| 9 | Pricing Engine | `pricing.js`, `software/pricing.js` | kâr €0.50 | cost input | agents, checkout | quote | 99 kâr kesit | yerel formül | canlı cost yok | — |
| 10 | Inventory Engine | `software/inventory.js`, WMS plugin | rezerv | orders | checkout | reserve | 99 | yerel | canlı feed yok | — |
| 11 | Order Engine | `orderService`, `software/orders.js` | sipariş | salesGuard | returns, ship | HTTP | 99 non-commercial | satış off | — | 225 |
| 12 | Returns Engine | `returnsRma.js`, `software/returns.js` | RMA | orders | finance | HTTP | unit tarihsel | para yok | — | refund HUMAN |
| 13 | Marketplace Engine | `software/marketplace.js` | taslak | sales off | channels | draft 409 publish | 99 unpublished | **PUBLISH_BLOCKED** | vendor | 115/129 |
| 14 | Market Engine | `lib/market-engine`, `global_countries_35.json` | 35 pazar | i18n | VAT/UI | config | marketEngine.test (bu oturum yok) | kod | — | tax advisor |
| 15 | VAT | commercialIntegrations tax | vergi | tax API env | checkout | calculateTax | — | provider yok | tax API | — |
| 16 | Customer Engine | account, CRM plugins | hesap | auth | orders | HTTP | — | yerel | — | — |
| 17 | Phone assistant | `phoneAssistantService.js` | sipariş JSON | aiChat findOrder | public POST | HTTP | telephone audit | **telefon değil** | — | yetki |
| 18 | Voice/STT/TTS/Realtime/WebRTC/avatar | `software/voice.js` | interface | env hints | health | mockSession | 99 live false | **blocked** | paid APIs | — |
| 19 | Notifications | `notificationEngine.js` | kuyruk | SMTP env | automation | queue | — | **sendMail yok** | SMTP | 155/165 |
| 20 | Carriers | `software/carriers.js` | takip | — | orders | scan | 99 label block | etiket yok | carrier keys | ship HUMAN |
| 21 | AuthZ | `globalAuthMiddleware`, identity 2FA | oturum/RBAC | jwt | tüm /api | cookies | 99 401 | yerel | HTTPS prod | 213 |
| 22 | Logging/alerts | `securityLog`, `localAlerts` | olay | — | admin | file | localAlerts test tarihsel | dispatch false | webhook | 185 |
| 23 | CI | `.github/workflows/ci.yml` | kalite | GitHub | — | Actions | #430 rollup [] | **bu SHA yok** | — | push/PR |
| 24 | Storefront/i18n | `app/`, `lib/i18n` 30 dil | UI | catalog | müşteri | HTTP/static | E2E bu oturum yok | katalog modu | — | — |
| 25 | Taxonomy/catalog | master **48** L1, shop **53** | menü | JSON | UI | /kategorie | — | 48≠50≠53 | — | — |
| 26 | Payments | `dualPaymentEngine`, `secureCommerce` | ödeme | sales | checkout | webhook | 99 unsigned | **sales off** | Stripe/PayPal | live pay |
| 27 | Search | `software/search.js` | SQL search | db | storefront | query | — | OpenSearch live false | OS | — |
| 28 | Control Center | `controlCenter.js` | görev/çalışan kayıt | db | Pusat | CRUD | pusat tests | yerel | — | — |
| 29 | Job worker | `pusat/worker.js`, jobQueue | kuyruk | Pusat | background | claim | 99 worker | yerel | — | — |
| 30 | Software facade | `server/lib/software/` | motor sarmal | Pusat canonical | health | API software | softwareCompletion | not 2nd orch | — | — |
| 31 | Remote Python orch | `orchestratorBridge.js`, intelligence FastAPI | opsiyonel HTTP | URL | health only | /health | — | **NOT_CONFIGURED** | URL | — |
| 32 | Desktop bridge | `desktop-bridge/` | masaüstü | Pusat iddiası | — | local | — | SoT false | — | — |
| 33 | Analytics | `analyticsEngine.js` | KPI | orders | admin | SQL | — | satış yok | — | — |
| 34 | QR/loyalty | `software/qrLoyalty.js` | kampanya | — | CX | — | — | — | — | legal |
| 35 | WMS | `wmsInventoryPlugin` | depo | inventory | — | — | 99 WMS ayrı tablo | — | — | — |
| 36 | Inter-Cars class | `connectorInventory.js` | etiket | — | supplier health | — | honesty test | **HTTP yok** | sözleşme | 87 |
| 37 | TecDoc mock | `tecdocAdapter.js` | fitment mock | — | PIM | lookup mock | — | **no live calls** | lisans | 88 |
| 38 | Restore/backup | `backup-db.mjs`, restoreGuard | yedek | disk | ops | script | scratch tarihsel | prod restore yok | Render | 220/AD |

**Ek bulunan, ayrı “ürün” sayılmayan:** onlarca `*Plugin.js` (aynı motorların HTTP yüzeyi); `intelligence/buzzard_ki_gesamt` kopyaları; `exports/` arşiv. **Uygulanmış gibi listelenmedi:** `handleRequest`; canlı Twilio; canlı Realtime istemcisi.

**Bileşen sayısı (tablo 1–38):** **38** kanonik. Ajan 18’i satır 5’te gruplandı.

---

## 3–4. Durum ve yüzde

| Bileşen | Kod durumu | Tamamlanma % | Çalışan (yerel) | Eksik | Test | Dış | İnsan | Sonraki |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pusat | CODE_READY | Band 35–55 **85.1%** = 1787/21 established-scope; genel %92 **DOĞRULANAMADI** | submit/execute/HAC/Guardian | handleRequest, prod, Python sync | 16.10 99 kısmen | orch URL | CRITICAL | bkz. deep audit |
| Guardian/Esat | PARTIAL | **83.73%** = 921/11 | evaluate on executeTask | SOC, her HTTP | 99 Guardian | SIEM | — | prod değil |
| HAC | CODE_READY | YÜZDE HESAPLANAMADI — KRİTER ENVANTERİ EKSİK | self-approve yok, consume action | gerçek onay | 99 | — | evet | insan bağla |
| Memory | CODE_READY | YÜZDE HESAPLANAMADI | write/read yerel | uzak | tarihsel | — | — | retention |
| 18 ajan | PARTIAL | YÜZDE HESAPLANAMADI | recommendation execute | live mutation, LLM | roster kod | OpenAI | — | stub kal |
| Product Engine | PARTIAL | YÜZDE HESAPLANAMADI | çoklu store | tek SoT | architecture | — | 73 | migrasyon |
| SoT | BLOCKED_HUMAN | 0 canlı | inactive | aktivasyon | SoT false test | — | **73** | açma |
| Supplier | PARTIAL | YÜZDE HESAPLANAMADI | CSV preview | live PO/IC | 99 | 87/88 | PO | sözleşme |
| Pricing | CODE_READY | YÜZDE HESAPLANAMADI | €0.50 kural | canlı cost | 99 | — | — | cost feed |
| Inventory | PARTIAL | YÜZDE HESAPLANAMADI | yerel rezerv | sync | 99 | — | — | — |
| Orders | PARTIAL | YÜZDE HESAPLANAMADI | iptal/idempotent non-comm | live order | 99 | — | 225 | satış sonra |
| Returns | PARTIAL | YÜZDE HESAPLANAMADI | RMA kayıt | para | — | — | refund | — |
| Marketplace | PARTIAL | YÜZDE HESAPLANAMADI | draft | publish | 99 | vendor | 129 | — |
| Market 35 | CODE_READY | YÜZDE HESAPLANAMADI | JSON 35 | canlı vergi | test dosyası | — | tax | — |
| VAT | PARTIAL | YÜZDE HESAPLANAMADI | adapter | provider | — | tax API | — | — |
| Customer | PARTIAL | YÜZDE HESAPLANAMADI | hesap | — | — | — | — | — |
| Phone | STUB | YÜZDE HESAPLANAMADI | JSON verify | PSTN | telephone audit | Twilio | — | bağlama |
| Voice* | STUB | YÜZDE HESAPLANAMADI | mock blocked | media | 99 | paid | — | çağrı yok |
| Notify | PARTIAL | YÜZDE HESAPLANAMADI | kuyruk | send | — | SMTP | 155 | nodemailer yok |
| Carriers | PARTIAL | YÜZDE HESAPLANAMADI | scan | label | 99 | keys | ship | — |
| Auth | CODE_READY | YÜZDE HESAPLANAMADI | RBAC/2FA yerel | prod HTTPS | 99 | — | 213 | — |
| Log/alert | PARTIAL | YÜZDE HESAPLANAMADI | file | dispatch | tarihsel | 185 | hedef | — |
| CI | BLOCKED_EXTERNAL | 205=20% 212=0% register | ci.yml main | bu SHA | rollup [] | GitHub | 205 | insan |
| Storefront | PARTIAL | YÜZDE HESAPLANAMADI | UI kod | E2E bu oturum | — | — | — | — |
| Catalog 48/53 | PARTIAL | YÜZDE HESAPLANAMADI | JSON | 50 hedef çelişki | — | — | — | — |
| Payments | PARTIAL | YÜZDE HESAPLANAMADI | unsigned fail | live | 99 | Stripe | live pay | — |
| Search | PARTIAL | YÜZDE HESAPLANAMADI | SQL | OS live | — | — | — | — |
| Control Center | CODE_READY | YÜZDE HESAPLANAMADI | task rows | — | pusat | — | — | — |
| Worker | CODE_READY | YÜZDE HESAPLANAMADI | claim | — | 99 | — | — | — |
| Software facade | CODE_READY | YÜZDE HESAPLANAMADI | wrap | — | softwareCompletion | — | — | — |
| Python orch | STUB | YÜZDE HESAPLANAMADI | URL boş | sync | — | URL | — | kapalı tut |
| Desktop | PARTIAL | YÜZDE HESAPLANAMADI | local | — | — | — | — | — |
| Analytics | PARTIAL | YÜZDE HESAPLANAMADI | SQL | canlı satış | — | — | — | — |
| QR/loyalty | PARTIAL | YÜZDE HESAPLANAMADI | kod | legal | — | — | — | — |
| WMS | PARTIAL | YÜZDE HESAPLANAMADI | tablo | — | 99 | — | — | — |
| Inter-Cars | BLOCKED_EXTERNAL | register 40% | class only | API | honesty | sözleşme | 87 | — |
| TecDoc | BLOCKED_EXTERNAL | register 40% | mock | live | — | lisans | 88 | — |
| Backup | PARTIAL | YÜZDE HESAPLANAMADI | script | prod restore | tarihsel | disk | 220 | — |

**Durum sayımı (38 satır):** VERIFIED **0** · CODE_READY **9** (Pusat, HAC, Memory, Pricing, Market35, Auth, CC, Worker, facade) · PARTIAL **21** · STUB **3** (Phone, Voice*, Python orch) · NOT_IMPLEMENTED **0** (handleRequest Pusat içinde yok; ayrı satır değil) · BLOCKED_EXTERNAL **4** (CI, IC, TecDoc; Voice dış paid STUB) · BLOCKED_HUMAN **1** (SoT) · BLOCKED_PRODUCTION_ACCESS **0** ayrı satır (Backup/CI prod disk 220 register’da).

Not: SoT BLOCKED_HUMAN; disk 220 Backup satırında PARTIAL+insan. CI BLOCKED_EXTERNAL.

**Yüzdesi formülle gösterilen:** Esat 83.73%; Pusat band 85.1%; IC/TecDoc/CI register maddeleri. Diğerleri hesaplanamadı.

---

## 5. Pusat

Bkz. `BUZZARD_ORCHESTRATOR_DEEP_AUDIT_2026-10-16.md`.

---

## 6. Guardian

- **Pusat entegrasyon:** `lifecycle.executeTask` → `guardian.evaluate` **kod yolu mevcut**.  
- **Her HTTP:** hayır.  
- **HAC:** `requireApproval` / SENSITIVE / CRITICAL.  
- **AuthN/Z:** RBAC `aiCanExecute`; employee yoksa fail. Least privilege: ajan izin listeleri dar.  
- **Webhook imza:** ödeme imza testleri 99’da; Guardian Twilio imzası **yok**.  
- **Log:** `logSecurityEvent` deny.  
- **Prod:** yok.  
- **%83.73:** 227–237 Σ 921 / 11 — **DOĞRULANDI** (register). LIVE_VERIFIED değil.

---

## 7. AI ajanları

Hepsi `agents.js`. Üretim = **hayır**. Model = **stub**. HAC = SENSITIVE action ise. Bellek = `remember` isteğe bağlı.

| Kod | Görev | Bağlantı | Girdi şema (özet) | Mock | Yetki | Test | Eksik | Prod |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| price_assistant | kâr/fiyat önerisi | executeTask | cost/price | formül gerçek, cost icat yok | products/prices.read | 99 kâr | canlı cost | hayır |
| stock_assistant | stok fail-closed | executeTask | sku | yerel stockEngine | products.read | — | canlı feed | hayır |
| seo_assistant | seo öneri | executeTask | — | — | — | — | içerik kalite | hayır |
| customer_assistant | destek öneri | executeTask | — | — | — | — | send | hayır |
| sales_assistant | analiz öneri | executeTask | — | satış icat yok | — | — | canlı KPI | hayır |
| category_assistant | map | executeTask | id | taxonomy | categories.read | — | 48/53 | hayır |
| product_assistant | PIM validate | executeTask | product | SoT açmaz | products.read | — | SoT | hayır |
| order_assistant | inspect | executeTask | order | PO yok | orders.read | Guardian PO deny 99 | yazma | hayır |
| dogu_bey | kurmay | executeTask | — | — | — | — | belirsiz | hayır |
| esat_bey | güvenlik ajan kimliği | executeTask | action | Guardian ayrı | security.read | — | SOC | hayır |
| aslan_bey | varsayılan triage | executeTask | request | default classify | ai.read | — | — | hayır |
| supplier_assistant | feed | executeTask | — | preview | — | — | IC | hayır |
| customs_assistant | gümrük öneri | executeTask | — | — | — | — | canlı GTIP | hayır |
| returns_assistant | iade öneri | executeTask | orderNumber | — | orders.read | — | credit | hayır |
| shipping_assistant | kargo öneri | executeTask | orderId | etiket yok | orders.read | — | label | hayır |
| marketplace_assistant | listing öneri | executeTask | — | publish yok | products.read | — | 129 | hayır |
| localization_assistant | i18n | executeTask | locale | — | — | — | — | hayır |
| software_health_assistant | health oku | executeTask | — | — | ai.read | — | prod | hayır |

**Tekrar:** category_assistant vs taxonomy dosyaları; esat_bey ajan vs guardian.js (ajan kimliği ≠ evaluate()). **Kullanılmayan HTTP:** çoğu ajan yalnız görev yolu.

---

## 8. Bağlantı akışları

| Akış | Durum | Onay | Test |
| --- | --- | --- | --- |
| 1 Müşteri → Pusat → ajan | **Eksik/kısmi:** chat/phone Pusat’a gitmez; admin submit eder | — | — |
| 2 Pusat → Guardian → HAC | **Kodlanmış + birim test** executeTask | HAC | 99 |
| 3 Ürün → Engine → SoT | **SoT kopuk** (inactive) | 73 | architecture |
| 4 Tedarikçi → inv | **Preview kod**; live **stub/blocked** | PO | 99 |
| 5 Maliyet → fiyat → marketplace | **Fiyat kod**; marketplace publish **blok** | 129 | 99 |
| 6 Sipariş → tedarikçi | **salesGuard blok** | 225 | 99 |
| 7 Sipariş → kargo | **etiket blok**; takip scan | ship | 99 |
| 8 İade → kredi | **kayıt var; para yok** | refund | — |
| 9 Hata → log → alert | **log var; dispatch yok** | 185 | localAlerts tarihsel |
| 10 Telefon → STT → Pusat → TTS | **Eksik** (stub zinciri) | — | telephone audit |
| 11 Marketplace → sipariş → bildirim | **publish+send yok** | 129, 155 | — |

---

## 9. Test

Bu envanter oturumunda **yeni test koşulmadı**. 16.10: 3 dosya **99 passed** (verification: 72+18+9 `it`). Tam vitest/tsc/lint/build/Playwright/CI **yok**.

---

## 10. Üretim kanıtı eksikleri

Disk 220, CI 205/212, monitoring 217, canlı ödeme, SoT, SMTP send, Twilio, LLM live, Python orch, HTTPS cookie.

---

## 11–12. Satış öncesi vs sonra

**A zorunlu:** Auth/HTTPS; salesGuard kalır ta ki insan açsın; ödeme imza; SoT veya dürüst tek yazıcı; prod disk; yedek; sipariş e-postası yasal asgari; fiyat/stok yalanı yok (cost/stock kaynağı); CI; HAC para/PO/publish. **Satış bu görevde açılmadı.**

**B sonra:** ses/Realtime/avatar, IC/TecDoc canlı, SOC, 5 marketplace canlı, Datadog, 50. kategori.

---

## 13–14. Ücretsiz / maliyet

Ücretsiz: CI mevcut, health, log alert, LLM stub, mock session.  
Maliyet **bilinmiyor:** IC, TecDoc, Twilio, OpenAI Realtime, STT/TTS.  
Render disk: blueprint 1GB; canlı **doğrulanamadı**; zaten faturadaysa yeni 0.  
İnsan emeği ≠ abonelik.

---

## 15. Öncelikli 20 eksik

1. CI bu SHA  
2. Public phone yetkisi  
3. Prod disk kanıtı  
4. SMTP send veya dürüst “mail yok”  
5. SoT plan  
6. Payment sandbox (charge yok)  
7. SENSITIVE action denetimi  
8. Chat→Pusat yokluğunu belgele veya bağla  
9. Python orch kapalı tut  
10. Cost feed  
11. Stok dürüstlüğü  
12. HAC insan  
13. 155/165 politika  
14. Label politika  
15. TecDoc lisans kararı  
16. IC kararı  
17. Alert hedef  
18. 217 probe  
19. Cookie prod  
20. 48 vs 53 vs 50 belgeleme  

---

## 16. Geliştirme sırası

CI → disk/health → phone authz → mail dürüstlüğü → ödeme sandbox → SoT plan → tedarikçi lisans **isteğe bağlı** → satış bayrağı **en son**.

---

## 17. İnsan onayı

Register 67,73,115,129,155,165,182,213,214,219,221,225,226 + 87,88,185,205,212,217,220.

---

## 18. Bilinmeyenler

Özgün 237; Pusat %92 sistem iddiası kaynağı; canlı Render; LLM prod; 1084 vitest bu SHA; 50 kategori kaynağı.

Satış, ödeme, SoT **kapalı**.
