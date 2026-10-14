# Buzzard Phase 2 — Admin Auth + Security + Order/Inventory

Sürüm: 2.0  
Tarih: 2026-10-13  
Dal: `cursor/final-completion-execution-c293`  
Beklenen başlangıç HEAD: `e72ae8b8a7e0c5dc679cd6657800f516206509a5`  
Yerel uygulama commit: `c83018ed1121e1826690022e150af7bc1880805f` (rapor + iptal kancası commit’i bunu izler)  
Yazılım sürümü: `1.9.1`

Bu rapor uygulama + doğrulama kanıtıdır. Mock test canlı entegrasyon sayılmaz. Atlanan test başarılı sayılmaz. Git push / PR / merge / deploy yapılmadı. Port 3000 kesilmedi.

Kilitler bu koşu boyunca:

- `BUZZARD_SALES_ENABLED` = unset (satış kapalı)
- `BUZZARD_PRODUCT_SOT_ACTIVE` = unset (SoT inactive)
- `BUZZARD_LIVE_PAYMENTS` = unset (canlı ödeme kapalı)

Durum etiketleri: `VERIFIED_COMPLETE` | `CODE_READY_UNVERIFIED` | `PARTIAL` | `SKELETON_OR_STUB` | `NOT_STARTED` | `BLOCKED_EXTERNAL` | `UNKNOWN`

---

## 1. Gerçek branch, HEAD ve çalışma ağacı

| Alan | Değer |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| Remote ile ilişki | origin’den **3 local commit önde** (push yok) |
| Başlangıç HEAD | `e72ae8b8a7e0c5dc679cd6657800f516206509a5` |
| Uygulama HEAD (rapordan önce) | `c83018ed1121e1826690022e150af7bc1880805f` |
| Kullanıcı değişiklikleri | Korundu. `git reset --hard` / `git clean -fd` kullanılmadı. |
| Pusat | Tek orkestratör. İkinci orkestratör yok. |

Önceki yerel commit’ler (itilmedi): `26b9bc4` unsigned webhook izolasyonu, `e72ae8b` rapor SHA sabitleme.

---

## 2. Düzeltilen sorunlar ve değiştirilen dosyalar

### P0 — Admin E2E oturum

Kök neden uygulama auth’unu kapatmak değildi. `seedAdminSession` token’ı `sessionStorage` + `__BUZZARD_API_URL__` ile basıyordu; `AdminGuard` `fetchAdminMe` CORS yüzünden düşüyordu. Playwright storefront `http://localhost:3010` iken API `:3001` eski süreçte çalışıyordu ve `corsOrigins` 3010’u kabul etmiyordu. Hızlı testler yönlendirmeden önce gövdede `BUZZARD` / `PIM` yakalıyordu.

Düzeltme:

- `server/lib/corsOrigins.js` — loopback `3010` ve `3002` eklendi. Üretimde loopback hâlâ `BUZZARD_ALLOW_LOOPBACK_CORS=1` olmadan kapalı.
- `e2e/helpers/adminAuth.ts` — `waitForAdminReady`: `.admin-loading` gizlenene kadar bekle; `/admin/login/` yönünde oturum kaybını fail et.
- `e2e/admin.spec.ts`, `e2e/admin-pim-core.spec.ts` — her korumalı `goto` sonrası `waitForAdminReady`.
- E2E yeni API ile koşuldu: `PLAYWRIGHT_WEB_PORT=3010`, `PLAYWRIGHT_API_PORT=3002`. Port 3000 bırakıldı.

Kimlik doğrulama kapatılmadı. Admin endpoint’leri herkese açılmadı. Unauth software API testleri hâlâ 401.

### P0 — Ödeme webhook + stok tüketimi

- Resmî yol değişmedi: `POST /api/commerce/webhooks/:provider` → `dualPaymentEngine`.
- Eski `/api/webhooks/payment` ve finance webhook imzasız kayıtta kalır; `paid` yazmaz.
- Yeni `server/lib/software/orderInventoryBridge.js`:
  - `commitOnCapturedPayment` yalnız `official === true` ve `PAYMENT_CAPTURED` + `captured === true`.
  - İmzasız / yetkisiz → `UNVERIFIED_WEBHOOK`, consume = 0, sevkiyat yok.
  - İkinci consume duplicate.
  - `releaseOnCancel` `CONSUMED` satırı serbest bırakmaz.
- `dualPaymentEngine.handleWebhook` doğrulanmış + uygulanan + captured olayda `commitOnCapturedPayment` çağırır. `shipmentAuthorized` her zaman `false` (satış kilidi).
- `orderManagement.cancelOrder` ve `commerce/orderService.transitionOrderStatus(CANCELLED)` ACTIVE rezervasyonu serbest bırakır.

### P1 — SoT / worker

- `productMigrationPlan.verifyDryRunGuards` eklendi. Yazma, birleştirme, SoT açma yok.
- Pusat `recoverAbandoned` → `jobQueue.releaseStaleLocks`. Çöken worker kilidi `RETRYING`; finansal iş `DEAD_LETTER`. Test edildi.

### Değiştirilen dosyalar

| Dosya | Değişiklik |
| --- | --- |
| `server/lib/corsOrigins.js` | 3010/3002 loopback origin |
| `server/__tests__/corsOrigins.test.mjs` | 3010 testi |
| `e2e/helpers/adminAuth.ts` | `waitForAdminReady` |
| `e2e/admin.spec.ts` | oturum bekleme + Control Center `h1` |
| `e2e/admin-pim-core.spec.ts` | her senaryoda `waitForAdminReady` |
| `scripts/e2e-webserver.mjs` | API port logu doğru portu yazar |
| `server/lib/software/orderInventoryBridge.js` | **yeni** consume/release köprüsü |
| `server/lib/software/index.js` | export |
| `server/lib/software/constants.js` | `1.9.1` |
| `server/lib/commerce/providers/dualPaymentEngine.js` | captured sonrası consume |
| `server/lib/orderManagement.js` | iptalde release |
| `server/lib/commerce/orderService.js` | `CANCELLED` geçişinde release |
| `server/lib/pim/productMigrationPlan.js` | dry-run koruma kontrolü |
| `server/__tests__/softwareMasterCompletion.test.mjs` | köprü, iptal, SoT, worker recover |
| `server/__tests__/dualPaymentAdapters.test.mjs` | resmi webhook consume bir kez |

---

## 3. Test sonuçları

Hepsi bu turdaki son kod üzerinde çalıştırıldı (iptal kancası sonrası software yeniden koşuldu).

| Komut | Sonuç | Not |
| --- | --- | --- |
| `npm run test:software` | **129 geçti / 0 fail / 0 skip** | İlk koşu. İptal kancası sonrası aynı suite 34/34 (master+dual) yeniden geçti |
| `npm run test:unit` | **867 geçti / 0 fail** | 69 dosya |
| `npm run test:ai` | **58 geçti** | Pusat worker/onay/otomasyon |
| `npm run test:bridge` | **18 geçti** | desktopBridge |
| Admin E2E (`admin.spec.ts` + `admin-pim-core.spec.ts`) | **13 geçti / 0 fail** | `:3010` + API `:3002` |
| `npm run lint` | geçti | next lint, uyarı yok |
| `npm run typecheck` | geçti | `tsc --noEmit` |
| `npm run build` | geçti | Next production build |
| `npm run security:audit` | **exit 1** | braces; başarı sayılmadı |

Diğer Playwright projeleri (customer-journey, homepage, commerce) bu turda koşulmadı → **atlanmış**, başarılı değil.

---

## 4. Admin E2E oturum sonucu — `VERIFIED_COMPLETE` (yerel E2E)

Önceki doğrulama: 5 geçti / 8 fail. Bu tur: **13/13 geçti**.

| Test | Sonuç | Önceki kök neden |
| --- | --- | --- |
| PIM Core page loads | geçti | CORS + yönlirmeden önce metin eşleşmesi |
| Product list demo SKU `BZ-CORE-DEMO-001` | geçti | oturum kaybı → login sayfası |
| Validate / Validation Overall\|PASS\|WARNING\|FAIL | geçti | oturum kaybı |
| Import dry-run | geçti | oturum kaybı |
| Brands / Buzzard Demo | geçti | oturum kaybı |
| Admin login page loads | geçti | zaten geçiyordu |
| Unauth Control Center → login | geçti | zaten geçiyordu |
| Login formu session token | geçti | tarayıcı `fetch` CORS 3010 |
| Authenticated dashboard | geçti | `fetchAdminMe` CORS |
| Control Center `h1` | geçti | oturum kaybı / gevşek `body` assert |
| Sessions | geçti | oturum kaybı |
| nav.cc-tabs Onaylar / Commerce / Workers / Entegrasyonlar | geçti | oturum kaybı |
| Unauth `/api/admin/software/*` 401 | geçti | zaten geçiyordu |

Güvenlik etkisi: Auth hâlâ zorunlu. CORS genişlemesi yalnız belgelenmiş loopback portları (`3000/3001/3002/3010/3040/8000`). Üretim origin listesi değişmedi. Token hâlâ `sessionStorage` bearer; HttpOnly cookie’ye geçilmedi (`PARTIAL` / mevcut mimari).

---

## 5. Ödeme webhook güvenliği — `VERIFIED_COMPLETE` (yerel) / canlı `BLOCKED_EXTERNAL`

| Kontrol | Sonuç |
| --- | --- |
| Eski `/api/webhooks/payment` | `UNSIGNED_WEBHOOK_ISOLATED`, `paid` yazmaz, fulfillment kuyruğu yok |
| Finance webhook | intent durumunu değiştirmez |
| Resmî yol | `/api/commerce/webhooks/:provider` + dual engine |
| Stripe | HMAC `t,v1`; kötü imza `WEBHOOK_SIGNATURE_INVALID`; durum değişmez |
| PayPal | inject `verifyFn`; `FAILURE` kabul edilmez. Canlı sertifika doğrulaması yok → `CODE_READY_UNVERIFIED` |
| Duplicate event | ikinci uygulamaz (`duplicate: true`) |
| Out-of-order | captured sonrası stale authorized reddedilir |
| Tutar / para birimi | create sırasında tamper fail-closed; webhook mismatch ayrı testte |
| Timeout | `PROVIDER_TIMEOUT_NOT_SUCCESS` / reconciliation; başarı değil |
| İmza fail | ödeme durumu + stok değişmez |
| Stripe/PayPal DB `enabled` | 0 bırakıldı |
| Canlı ödeme | açılmadı. Sağlayıcı doğrulanmış işaretlenmedi |

Gerçek ödeme yok. Secret üretilmedi.

---

## 6. Stok ve sipariş yaşam döngüsü — `PARTIAL` → consume bağlandı

Harita (mevcut kod):

1. Sipariş oluşturma — OMS `orderManagement.createOrder` / commerce `createOrderFromCheckout` (ticari sipariş satış kilidinde blok).
2. Ödeme oluşturma — dual engine, sunucu tutarı.
3. Risk — `paymentRisk` + `shipmentGate`.
4. Rezervasyon — `inventory.reserve` (stale/unknown/estimate fail-closed).
5. Tüketim — **yalnız resmi captured webhook** → `commitOnCapturedPayment`.
6. Fulfillment / sevkiyat — `shipmentGate` satış kilidi + capture + risk; `shipmentAuthorized: false`.
7. İptal — OMS `cancelOrder` ve commerce `CANCELLED` ACTIVE rezervasyonu serbest bırakır; `CONSUMED` bırakılmaz.

| Senaryo | Durum |
| --- | --- |
| Ödeme başarılı görünmeden consume | Engelli (`PAYMENT_NOT_CAPTURED` / `UNVERIFIED_WEBHOOK`) |
| Aynı sipariş ikinci consume | Duplicate, stok ikinci kez düşmez |
| İptal → release | OMS + commerce cancel bağlı; test edildi |
| Consume sonrası release | `skippedConsumed`; `ALREADY_CONSUMED` |
| Eşzamanlı oversell | `INSUFFICIENT_STOCK` |
| Kısmi fulfillment / çoklu tedarikçi | Plan modeli `liveBound: false`, PO yok — **desteklenmiyor (canlı)** |
| Sevkiyat kesinleşmesi | Satış kilidi + gate; etiket yok |

Desteklenmeyen / açık boşluklar:

- Rezervasyon `order_id` sözleşmesi OMS numeric id / `order_number` / commerce `ord_*` arasında henüz tekilleşmedi.
- Kısmi tüketim satır bazında yok; rezervasyon satırı ya ACTIVE ya CONSUMED.
- Canlı tedarikçi PO, iade ödemesi, taşıyıcı etiket yok.

---

## 7. Worker / Pusat / scheduler — `VERIFIED_COMPLETE` (yerel)

- `claimAndExecute` aynı işi ikinci worker’a vermez.
- Claim sonrası çökme: kilit TTL dolunca `releaseStaleLocks` → `RETRYING`; finansal → `DEAD_LETTER`.
- Timeout / retry / backoff: `pusat/exceptions.backoffMs`, `lifecycle` timeout race, `maxRetries`.
- Idempotency: `core_ai_tasks.idempotency_key` + job claim kilidi.
- Scheduler → Pusat: `schedulerBridge` `taskId` ile `AI_TASK`.
- Circuit breaker OPEN iken finansal `allow=false`.
- SQLite: `core_background_jobs` / `core_ai_tasks`. `/tmp` kullanılmıyor.
- İkinci orkestratör yok.

---

## 8. Security audit ve kalan riskler

```
eslint-config-next@15.5.27
  → @next/eslint-plugin-next@15.5.27
    → fast-glob@3.3.1
      → micromatch@4.0.8
        → braces@3.0.3
```

Advisory: **GHSA-vfj7-8cjw-p6xm / CVE-2026-93687** (stack-exhaustion DoS, nested brace patterns).

| Seçenek | Karar |
| --- | --- |
| Kurulu sürüm kapsamda mı? | Evet. npm’de latest hâlâ `braces@3.0.3`. Yamalı sürüm **yok**. |
| `overrides` | Güvenli değil: yamalı paket yok; uydurma sürüm sabitlemesi yapılmadı. |
| `npm audit fix --force` | **Kullanılmadı.** `eslint-config-next@14.2.35` + Next 14 kırıcı düşüş öneriyor. |
| eslint-config-next 16 | Major; bu turda alınmadı. Zincir yine braces 3.0.3 taşıyabilir. |

`security:audit` **exit 1**. Bu bir başarı değildir.

Maruziyet: lint-time `fast-glob` / geliştirici deseni. Çalışma zamanı ödeme veya admin auth yolu değil. Yine de HIGH olarak açık kalır.

Diğer: admin token `sessionStorage` (XSS’te sızabilir) — mevcut mimari, bu turda cookie’ye taşınmadı.

---

## 9. SoT migration planı — `CODE_READY_UNVERIFIED`, SoT **INACTIVE**

Beş depo tarandı (yazılmadı, birleştirilmedi):

| Depo | Writer / reader | Kimlik |
| --- | --- | --- |
| `pim_core_products` | `productCore` (aday, seçilmedi) | sku, ean, gtin, title, price, status |
| `pim30_products` | `productCatalogPim` | sku, barcode→ean, selling_price |
| `pim_products` | `pimCatalog` | sku, ean, gtin, price |
| `products` | genel tablo | sku, name, price_eur, active |
| `data/buzzard_products.json` | `productStore` | sku, ean/gtin, name, price |

Eşleşme anahtarları: aynı store içinde `sku` / `ean`; store’lar arası `skuInMultipleStores` + `attributeConflicts` (ean/fiyat). Otomatik merge yok (`fail-closed per store`).

Dry-run: `simulateProductMigration` + `verifyDryRunGuards` → `written: false`, `activated: false`, `backupRollback` mevcut, SoT env kapalı.

Geri dönüş: SQLite dosyası + `data/buzzard_products.json` kopyası. Üretim restore bu simülasyondan yapılmaz.

İnsan onayları (yapılmadı): kanonik store seçimi, migration penceresi, SoT aktivasyonu, satış açma.

---

## 10. Tedarikçi, fiyat, iade, pazar yeri, kargo eksikleri

| Alan | Durum |
| --- | --- |
| Tedarikçi seçimi | maliyet + stok + teslimat + güvenilirlik; eksik metrik `INCOMPLETE_METRICS` fail-closed; PO yok |
| Min net kâr €0,50 | korundu |
| Rakip fiyat | uydurulmaz; boş liste |
| İptal / tedarikçi alacağı / müşteri iadesi / para iadesi | ayrı modeller; hiçbiri para hareketi yapmaz |
| Pazar yeri | taslak/mock; `PUBLISH_BLOCKED`; canlı yayın kapalı |
| Kargo | imza doğrulama contract; GPS uydurulmaz; canlı taşıyıcı yok |
| Müşteri e-posta/SMS/telefon | gönderilmedi; consent gate kapalı |
| Webhook → takip → bildirim | kopuk; bildirim yolu yok |

---

## 11. İnsan müdahalesi gerekenler

1. Yamalı `braces` yayınlanınca override veya eslint-config-next yükseltmesi.
2. Render Postgres / persistent disk kanıtı (bu ortamda yok).
3. Stripe/PayPal secret, webhook endpoint, sağlayıcı `enabled` — **yalnız bilinçli canlı karar**.
4. Product SoT kanonik store + backup penceresi.
5. Satış kilidinin ayrı, bilinçli açılması.
6. Git push / PR / deploy — bu turda yasaklandığı için yapılmadı.
7. Admin cookie/CSRF sertleştirmesi (mevcut sessionStorage mimarisi).

---

## 12. Kilitlerin son durumu

| Kilitle | Durum |
| --- | --- |
| `BUZZARD_SALES_ENABLED` | unset / kapalı |
| `BUZZARD_PRODUCT_SOT_ACTIVE` | unset / inactive |
| `BUZZARD_LIVE_PAYMENTS` | unset / kapalı |

Sağlayıcılar etkinleştirilmedi. Canlı ödeme, müşteri siparişi, tedarikçi PO, iade ödemesi, kargo etiketi, pazar yeri yayını, müşteri mesajı yok.

---

## 13. Bir sonraki en yüksek öncelikli iş

1. **Açık HIGH:** `braces@3.0.3` / CVE-2026-93687 — upstream yama yok; `--force` kırıcı. İnsan + yayın beklenmeli.
2. **İşlevsel boşluk:** rezervasyon `order_id` sözleşmesini OMS id / order_number / commerce id arasında tekilleştirmek (consume bağlandı; kimlik hâlâ çok biçimli).
3. **Dış kanıt:** Render DB + disk + backup (`UNKNOWN`).
4. SoT ve satış hâlâ ayrı insan kararları; yazılım bunları açmamalı.

---

## Güvenlik etkisi özeti

- Auth kapatılmadı; admin API 401 koruması duruyor.
- CORS yalnız ek loopback test portları; üretim origin’leri aynı.
- İmzasız webhook hâlâ ödeme/stok değiştiremez.
- Consume yalnız resmi captured olayda.
- Consume edilmiş stok iptalde geri verilmez.
- Audit HIGH gizlenmedi.
- Secret, canlı sağlayıcı, satış, SoT, deploy yok.
