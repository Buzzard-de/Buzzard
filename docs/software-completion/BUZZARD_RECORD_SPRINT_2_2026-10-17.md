# Buzzard — Record Sprint 2

Tarih: 2026-10-17  
Dal: `cursor/software-completion-local-c293`  
**Push / PR / merge / deploy yapılmadı.**

Satış: KAPALI. Product SoT: PASİF. Canlı ödeme: KAPALI.  
Net kâr tabanı: **€0,50**. €0,10 undercut: **yok**.  
LIVE_VERIFIED: **0**. VERIFIED_100: **0**.  
80 maddelik resmi plan: **yok** — 80-plan yüzdesi uydurulmadı.

---

## 1. Başlangıç branch ve HEAD

| Alan | Değer |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Başlangıç HEAD | `27228952851e9622959c62674ccfa9cc515f0b95` (**doğrulandı**) |
| Origin farkı başlangıç | yerel **6 commit önde** |
| Çalışma ağacı başlangıç | temiz |
| 237 skor | **18141 / 237 = 76.54%** (kayıt doğrulandı) |
| %80 hedef | 18960; kalan başlangıç **819** |

Önceki sprint raporu okundu. Artırılmayan maddeler korundu: **80, 81, 94, 104, 115, 114, 122, 140, 189, 215, 223**.

---

## 2. Bitiş HEAD

`49eb64d2560396f585050e011807a7ccb166ffa2` (origin’den 7 önde). Push yok.

---

## 3. Çalışma ağacı

Başlangıç temiz. Kullanıcı dosyaları silinmedi. `git reset --hard` / `git clean -fd` yok.

---

## 4. İncelenen düşük puanlı maddeler

Hariç tutulan HUMAN/EXTERNAL: 67, 73, 87, 88, 129, 165, 185, 213, 214, 219, 221, 225, 226.

Yerel adaylar ve karar:

| Madde | Puan | A–I özeti | Seçim |
| --- | --- | --- | --- |
| 78 | 60 | Kod var; gelecek timestamp / sourceId çatışması eksik; yerel evet | **seçildi** |
| 91 | 65 | Pazar fiyatı FX/VAT fail-closed eksik; yerel evet | **seçildi** |
| 117 | 70 | getVatContext bilinmeyen pazarı DE’ye düşürüyordu | **seçildi** |
| 135 | 46 | Feed export dry-run zayıf | **seçildi** |
| 152 | 66 | GPS iddiası sevkiyat kapısında ayrı değil | **seçildi** |
| 123–127 | 55 | Sınıflandırma-only; yeni kanal uydurma | seçilmedi |
| 134 | 50 | Crawl yok | seçilmedi |
| 154 | 55 | Önceki GPS turu | yeniden artırılmadı |
| 200 | 40 | Test dosyası ≠ regression ürünü | seçilmedi |
| 210 | 62 | npm audit force yok | seçilmedi |

---

## 5. Seçilen iyileştirmeler

1. Pazar teklifi: bilinmeyen pazar / TRY FX icat yok; dil ≠ pazar.  
2. KDV: bilinmeyen ülke DE oranına düşmesin.  
3. Tedarikçi preview: gelecek timestamp ve aynı sourceId farklı SKU.  
4. Marketplace feed export: live push blok.  
5. ETA + shipmentGate: GPS iddiası telematik olmadan yetkili değil.  
6. Locale fallback `de`, icat yok (puan artışı yok; 118 zaten %80).

---

## 6. Değiştirilen dosyalar

- `server/core/marketEngineRegistry.js`
- `server/lib/software/pricing.js`
- `server/lib/software/orders.js`
- `server/lib/software/supplierFeeds.js`
- `server/lib/software/marketplace.js`
- `server/lib/software/eta.js`
- `server/lib/software/shipmentGate.js`
- `server/lib/software/localeCoverage.js`
- `server/__tests__/buzzardRecordSprint2.test.mjs`
- 237 register, TEST_EVIDENCE, bu rapor

---

## 7. Gerçek kod değişiklikleri

- `quoteForMarket`: UNKNOWN_MARKET, MARKET_FX_UNSUPPORTED, saleApproved yalnızca tam girdide.  
- `getVatContext`: getMarket yoksa rate yok (`UNKNOWN_MARKET`).  
- `createDraft`: `saleApproved !== true` → `precise_price` eksik; ticari sipariş yok.  
- `TIMESTAMP_FUTURE`, `detectSourceIdConflicts`.  
- `exportFeedDryRun` live=true → FEED_EXPORT_LIVE_BLOCKED.  
- `evaluateShipment` / shipmentGate: GPS_CLAIM_WITHOUT_TELEMATICS / GPS_NOT_AUTHORITATIVE.  
- `resolveMessage`: eksik çeviri icat edilmez.

---

## 8–9. Testler

| Komut | Sonuç |
| --- | --- |
| `npx vitest run buzzardRecordSprint2 marketEngine` | **PASS** 20 |
| `softwareCompletion softwareReliabilityBatch dualPaymentAdapters infrastructureAdvancementDay` | **PASS** 101 |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| Playwright | **NOT_RUN** |
| security:audit / canlı HTTP | **NOT_RUN** |

---

## 10. Önceki ve yeni skor

| | Σ | % |
| --- | --- | --- |
| Önceki | 18141 | 76.54% |
| Yeni | **18198** | **76.78%** |
| Δ | +57 | +0.24 pp |
| Hedef 80% | 18960 | 80.00% |
| Kalan | **762** | 3.22 pp |

**%80’e ulaşıldı mı? Hayır.**

---

## 11. Puan artış kanıtı

| Madde | Eski | Yeni | Δ | Gerekçe | Kanıt kapsamı |
| --- | --- | --- | --- | --- | --- |
| 78 | 60 | 72 | +12 | normalizasyon fail-closed | future timestamp + sourceId conflict; **live fetch değil** |
| 91 | 65 | 78 | +13 | pazar fiyat kuralları | XX/TRY fail-closed; DE quote €0.50; **canlı KDV değil** |
| 117 | 70 | 78 | +8 | KDV bilinmeyen pazar | default DE yok; **fiscal LIVE değil** |
| 135 | 46 | 62 | +16 | feed export dry-run | live push blok; **upload değil** |
| 152 | 66 | 74 | +8 | sevkiyat modeli GPS ayrımı | telematics yokken GPS yetkisiz; **canlı carrier değil** |

18141+12+13+8+16+8 = **18198**.

80/81/94/104/115/114/122/140/189/215/223 **değişmedi**.

---

## 12. Hedefe kalan puan

**762** (18960 − 18198).

---

## 13. Canlı doğrulama

LIVE_VERIFIED **0**.

---

## 14. Dış / insan bekleyen

87, 88, 185, SoT, satış, ödeme, listing 129, etiket, restore, Twilio/Realtime, telematik, merge/deploy.

---

## 15. Satış / SoT / ödeme

Hepsi kapalı / pasif.

---

## 16. Push / PR / deploy

**Yapılmadı.**

---

## 17. Sonraki öncelikler

1. Kilitler kapalı kalsın  
2. 185 alert hedefi  
3. TecDoc / Inter-Cars yetkisi  
4. Üretim restore  
5. Playwright 3010  
6. 237 orijinal kriter UNKNOWN  

Kalan 762 puanın çoğu LIVE/HUMAN/EXTERNAL.
