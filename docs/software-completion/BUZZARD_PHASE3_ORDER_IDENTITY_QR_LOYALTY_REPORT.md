# Buzzard Phase 3 — Order Identity + QR Loyalty + Security/Persistence

Sürüm: 3.0  
Tarih: 2026-10-13  
Dal: `cursor/final-completion-execution-c293`  
Başlangıç HEAD: `3d0f56c471d97eec2d83e944db4464657e0d3a89`  
Yazılım sürümü: `1.10.0`

Git push / PR / merge / deploy yok. Port 3000 kesilmedi. `git reset --hard` / `git clean -fd` yok.

Kilitler: `BUZZARD_SALES_ENABLED`, `BUZZARD_PRODUCT_SOT_ACTIVE`, `BUZZARD_LIVE_PAYMENTS` unset.

Durum etiketleri (istenen sözleşme): `NOT_IMPLEMENTED` | `STUB` | `PARTIAL` | `CODE_READY` | `CONFIGURED` | `SANDBOX_VERIFIED` | `LIVE_VERIFIED`

Hiçbir entegrasyon `LIVE_VERIFIED` değildir.

---

## 1. Branch, HEAD, çalışma ağacı

| Alan | Değer |
| --- | --- |
| Branch | `cursor/final-completion-execution-c293` |
| Başlangıç HEAD | `3d0f56c` — raporla eşleşti, ağaç temizdi |
| Faz 2 işi | Mevcut: CORS 3010, `waitForAdminReady`, `orderInventoryBridge`, unsigned isolation, OMS cancel release |
| Kullanıcı değişiklikleri | Korundu |
| Pusat | Tek orkestratör |

---

## 2. Canonical order identity

Durum: **SANDBOX_VERIFIED** (yerel). Mevcut store ID’leri değiştirilmedi.

Kanonik iç kimlik: `bzord_<24 hex>` tabloda `software_order_identities`.

Takma adlar (`software_order_aliases`): `OMS_ID`, `OMS_NUMBER`, `COMMERCE_ID`, `MARKETPLACE_REF`, `SUPPLIER_REF`, `PAYMENT_ORDER_ID`, `LEGACY_RAW`, `CANONICAL`.

Kurallar:

- Aynı `external_ref` iki kanoniğe bağlanamaz (`ALIAS_CONFLICT`).
- Tek çağrıda iki farklı kanonik `AMBIGUOUS_ORDER_IDENTITY`.
- Çözülemeyen ref `UNRESOLVED_ORDER_REF`.
- Olay başka siparişe yazamaz (`ORDER_IDENTITY_MISMATCH`).
- `lookupKeys` consume/release’i tüm alias’larda arar; satırdaki `order_id` olduğu gibi kalır.

Migration riskleri (üretim migrate edilmedi):

- Eski `software_reservations.order_id` / `software_payments.order_id` yeniden yazılmaz; alias bağlanmadan çapraz eşleşme olmaz.
- Salt sayısal OMS id başka sayısal string ile çakışabilir; bağlarken kind zorunlu.
- Marketplace/tedarikçi ref’leri isteğe bağlı ve doğrulanmamış.

---

## 3. Müşteri QR

Durum: **SANDBOX_VERIFIED**

- Token `bzqr_` + 32 hex; payload `{ v:1, t:"c", id }` — PII yok.
- Tarama kimlik doğrulamaz, indirim vermez.
- Yönlendirme allowlist: `/kampanya/qr/`, `/konto/login/`, `/konto/loyalty/`, `/`. Açık yönlendirme kapalı.
- Hesap bilgisi yalnız sahip müşteri oturumu (`revealAccount`).
- İptal: `REVOKED`.

---

## 4. Sipariş / paket QR

Durum: **CODE_READY** / yerel **SANDBOX_VERIFIED**; pazar yeri ekleme politikası **REVIEW_REQUIRED**

Alanlar: canonical order id, package ref, campaign id, channel, attribution source, created_at, eligibility_status.

Amazon / eBay / Kaufland / Allegro paket ekleme: `REVIEW_REQUIRED` (sözleşme doğrulanmadı). Baskı, yayın, mesaj yok.

---

## 5. İndirim uygunluğu ve kullanım

Durum: **SANDBOX_VERIFIED** (canlı kampanya kapalı)

Kampanya kodu `QR_SECOND_PURCHASE`. Durumlar: `NOT_ELIGIBLE`, `PENDING_FIRST_ORDER`, `PENDING_RETURN_WINDOW`, `ELIGIBLE`, `RESERVED`, `REDEEMED`, `EXPIRED`, `REVOKED`.

- QR tarama yetki değil.
- İlk sipariş `PAYMENT_CAPTURED` olmalı.
- Aynı hak iki kez kullanılamaz (unique customer+campaign + redeem çakışması).
- Rezervasyon 15 dk; başarısız checkout `ELIGIBLE`’a döner.
- Idempotent `idempotency_key`.
- İstemci success sayfası yetki değil.
- Canlı sipariş / kasa hareketi yok.

---

## 6. İlk sipariş iptal / iade

Durum: **SANDBOX_VERIFIED**

- İptal → `NOT_ELIGIBLE` / `REVOKED`.
- Açık iade → `PENDING_RETURN_WINDOW`.
- Tamamlanmış iade → `REVOKED`.
- `REDEEMED` sonrası geç iade: otomatik para çekme yok, `REVIEW_REQUIRED`; yasal haklar kısıtlanmaz.
- Başka sipariş olayı bu hakkı bozamaz.

OMS `cancelOrder` ve `returns.openCase` `reevaluateForOrder` çağırır.

---

## 7. €0,50 kâr ve %15 tavan

Durum: **SANDBOX_VERIFIED**

- Tavan %15; `evaluateDiscount` kâr kapısının altına inmez, daha düşük yüzdeyi şeffaf gösterir.
- `pricing.evaluateGivenSale` eksik maliyetle fail-closed.
- Coupon stacking yasak.
- `coversEveryOrderExpense: false` — 0,50 € sipariş düzeyindeki her gideri karşılamaz.
- Rakip fiyat uydurulmaz.

---

## 8. Pazar yeri attribution

Durum: **PARTIAL**

Kaydedilen kaynaklar: `AMAZON`, `EBAY`, `KAUFLAND`, `ALLEGRO`, `OTHER_MARKETPLACE`, `BUZZARD_DIRECT`, `ORGANIC`, `UNKNOWN`.

Amazon/eBay mock; Kaufland/Allegro draft. Canlı operasyon yok. Hepsi “implemented” iddia edilmedi.

---

## 9. Retention analitiği

Durum: **CODE_READY**

Sayılan: QR taramaları, tekrar tarama, unique visitor hash, kayıtlı müşteri QR, hak / kullanım.  
`NULL` / `insufficientData`: completedOrders, qrToOrderConversion, repeatPurchaseRate, CAC, LTV, net kampanya katkısı. Tarama ≠ müşteri/satış.

---

## 10. Fraud / gizlilik / yerelleştirme

Durum: **CODE_READY** (yasal uyum kanıtı yok)

- Çift kullanım, eşzamanlı reserve, sahte token, transfer, geç iade, tarama patlaması (`REVIEW_REQUIRED`, otomatik geri alınmaz).
- Pazarlama onayı ayrı; QR PII taşımaz.
- Landing DE/EN/TR/AR metin + 30 dil `resolveSupportedLocale` (4-dil whitelist yok). AR `rtl`.
- `legalComplianceProven: false`.

---

## 11. Ödeme / stok / sipariş regresyonu

Durum: **SANDBOX_VERIFIED**

| Kontrol | Sonuç |
| --- | --- |
| İmzasız webhook `paid` | `UNSIGNED_WEBHOOK_ISOLATED` |
| Kötü imza | mevcut dual-payment testleri |
| Duplicate event | idempotent |
| Alias consume bir kez | geçti |
| İptal yalnız ACTIVE | geçti; CONSUMED geri verilmez |
| QR ödeme kapısını aşamaz | `QR_SCAN_NOT_AUTHORITY` |
| İndirim kâr kapısını aşamaz | `PROFIT_GATE` / düşürülmüş yüzde |
| İade başka siparişi bozamaz | `ORDER_IDENTITY_MISMATCH` |

Sağlayıcılar açılmadı.

---

## 12. Worker / Pusat

Durum: **SANDBOX_VERIFIED** (mevcut; ikinci orkestratör yok)

`test:ai` 58 geçti. Claim tek, stale lock `RETRYING`, finansal `DEAD_LETTER`. QR olayları `software_loyalty_events` (SQLite). `/tmp` yok.

---

## 13. Admin ve müşteri E2E

`:3010` + API `:3002` (3000 kesilmedi).

| Suite | Sonuç |
| --- | --- |
| Admin + PIM (13) | **13 geçti** |
| Customer: homepage + QR landing | **2 geçti** |
| Customer: warenkorb / checkout | **koşulmadı** (atlanmış ≠ geçti) |

QR sayfa katalog metni gösterir; uydurma fiyat/ürün yok.

---

## 14. Security audit

```
eslint-config-next@15.5.27 → @next/eslint-plugin-next → fast-glob@3.3.1
  → micromatch@4.0.8 → braces@3.0.3
```

GHSA-vfj7-8cjw-p6xm / CVE-2026-93687. npm latest hâlâ `3.0.3`. Yamalı sürüm yok. `overrides` uygulanmadı. `--force` kullanılmadı (Next 14 düşüşü). `security:audit` **exit 1**. HIGH gizlenmedi.

Maruziyet: lint-time glob. Çalışma zamanı ödeme/QR yolu değil.

---

## 15. Render persistence

Durum: **UNKNOWN**

Kod: `BUZZARD_DB_PATH` üretimde zorunlu; `/tmp` reddedilir; blueprint `/var/data/buzzard.db`. Bu ortamda `/var/data` yok. `monitoringReady.renderDisk` ve `productionDb` **UNKNOWN**. Üretim erişimi/değişikliği yok.

---

## 16. Değişen dosyalar

Yeni: `server/lib/software/orderIdentity.js`, `qrLoyalty.js`, `server/__tests__/orderIdentityLoyalty.test.mjs`, `app/kampanya/qr/page.tsx`, `components/campaign/QrCampaignLanding.tsx`, bu rapor.

Güncellenen: `schema.js`, `constants.js`, `index.js`, `orderInventoryBridge.js`, `paymentLifecycle.js`, `pricing.js`, `returns.js`, `orderManagement.js`, `monitoringReady.js`, `softwareCompletionPlugin.js`, `package.json`, `e2e/customer-journey.spec.ts`, `styles/globals.css`.

---

## 17. Test özeti

| Komut | Sonuç |
| --- | --- |
| `test:software` | **137 geçti** |
| `test:unit` | **875 geçti** |
| `test:ai` | **58 geçti** |
| `test:bridge` | **18 geçti** |
| Admin E2E | **13 geçti** |
| Customer E2E (homepage+QR) | **2 geçti** |
| Diğer customer-journey / homepage-viewports | **koşulmadı** |
| lint / typecheck / build | geçti |
| `security:audit` | **exit 1** |

---

## 18. İnsan kararları

1. `braces` yaması yayınlanınca yükseltme.
2. Render disk / `BUZZARD_DB_PATH` canlı kanıtı.
3. Pazar yeri paket-ekleme sözleşmesi.
4. Kampanya hukuki inceleme (pazarlama vs yasal iade).
5. SoT / satış / canlı ödeme — kapalı kalmalı.
6. Push / PR / deploy (bu turda yasak).

---

## 19. Kilitler

Üçü de unset / kapalı. Canlı ödeme, müşteri siparişi, PO, iade ödemesi, etiket, yayın, mesaj yok.

---

## 20. Sıradaki en yüksek yazılım işi

1. **HIGH açık:** braces 3.0.3 — upstream yama yok.  
2. Rezervasyon satırına `canonical_order_id` kolonu (isteğe bağlı, mevcut alias birleşimi çalışıyor).  
3. Koşulmayan customer-journey checkout E2E (katalog/API’ye bağlı).  
4. Render disk kanıtı (dış).
