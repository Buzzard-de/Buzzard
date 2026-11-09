# Aşama 1 — 16 özel madde envanteri

**Zaman:** 1 Kasım 2026, 15:00 Europe/Berlin  
**Dal:** `cursor/special-16-inventory-c293` (taban: `cursor/master-ecosystem-c293` @ `223de8c1`)  
**PR #492:** [NEEDS_APPROVAL](https://github.com/Buzzard-de/Buzzard/pull/492) — merge/deploy yok  
**Satış:** `BUZZARD_SALES_ENABLED` kapalı  
**Push:** bu aşamada yapılmadı (kullanıcı onayı bekleniyor)

Bu dosya **yalnızca incelemedir**. Çalışan vitrin, kategori JSON, restore guard ve satış kapısı değiştirilmedi.

Önceki `MASTER_TASKS.json` 16 alanı **farklı bir komuttur** (hayatta kalma / Pusat / pazarlama). Bu belgedeki 16 madde **yeni bağlayıcı listedir**. İkisini birleştirmiyorum.

Durumlar: `NOT_STARTED` | `COMMAND_GIVEN` | `CODE_READY` | `PARTIAL` | `BLOCKED` | `TEST_FAILED` | `TEST_PASSED` | `SECURITY_REVIEW` | `LIVE_VERIFIED` | `NEEDS_APPROVAL` | `COMPLETE`

`COMPLETE` yalnızca kabul + gerçek ortam doğrulaması için.

---

## Git ve repo

| Öğe | Değer |
| --- | --- |
| İnceleme HEAD | `223de8c1` |
| #492 taban | `cursor/pusat-idempotency-c293` @ `67d82d41` |
| #492 karar | NEEDS_APPROVAL |
| Eski 16-alan envanter | `docs/MASTER_COMMAND/PHASE1_INVENTORY.md` (31 Eki 2026) |
| Bağımsız denetim | `PR-492-INDEPENDENT-AUDIT.md` |
| Scorecard | `softwarePercent` 100 / `goLivePercent` 69 / `completeClaim` false |

Korunan çalışan sistemler (yeniden yazılmayacak):

- `server/lib/pusat/runtime.js` — yazma reddi, satış kapısı
- `scripts/restore-db.mjs` + `restoreSafety.js` — production restore kapalı
- `data/buzzard_categories.json` — `cat-01`–`cat-53` (silinmez)
- `data/taxonomy/buzzard_master_48_main_categories_de.json` — `bz.01`–`bz.48` (silinmez)
- `server/lib/commerce/taxProvider.js` — 8 ülke temeli (dokunulmadı)
- `lib/i18n/locales/*.ts` — 30 katalog

---

## Kategori ve locale (PR #492 denetim)

| Kaynak | Sayı | Silindi mi? |
| --- | --- | --- |
| Master `bz.01`–`bz.48` | 48 | Hayır |
| Shop `cat-01`–`cat-53` | 53 | Hayır |
| Hub eklentisi `cat-54`–`cat-56` | 3 (lastik, iş makinesi, hayvan) | Hayır; additive JSON |
| Mapping `master_shop_l1_mapping.json` | 56 satır | Kayıpsız eşleme var |
| Onaylı “50 L1 master” dosyası | **Yok** | 50 sayısı mevcut kaynakla örtüşmez |
| UI locale katalogları | 30 (`supported-locales.json`) | URL öneki 4: `/de\|en\|tr\|ar/` |
| Kategori çevirisi | 4 (`de en tr ar`) | 26 dilde kategori etiketi yok |

Çakışma: `lib/smartMenu/bridge.ts` `cat-01` → `bz.11`; mapping `cat-01` → `bz.17`. Veri silinmeden raporlanacak.

---

## 16 madde — mevcut kod vs eksik

### 1. Tekstil AI — NOT_STARTED (ürün) / taxonomy PARTIAL

**Var:** `cat-01` Textil ağacı; `textile_ai` kurul üyesi (`bz.17`); kampanya satırı `lib/navigation/home-config.ts`; genel kategori sayfası; kombin slug’u kategori adı olarak.

**Yok:** tekstil ana sayfası, slayt/video, ölçü/fotoğraf, yaş/meslek kombin, sanal giyinme, açı render, gizlilik kutusu. Repoda `*.mp4` / try-on yok.

**Kabul (sonra):** ayrı hub sayfası + slayt + ölçü opt-in + gizlilik metni + try-on iskeleti. Canlı kamera/AR olmadan `LIVE_VERIFIED` yok.

### 2. AB-27 kargo — PARTIAL / CODE_READY (ekran)

**Var:** `server/lib/commerce/ab27Logistics.js` (27 kural, `quoteLane`, `liveCarrier: false`); `logisticsFulfillment.js` (ayrı etiket/takip DB); `data/buzzard_europe_shipping.json`.

**Yok:** canlı taşıyıcı API/XML/CSV/webhook, gerçek fiyat, etiket basımı, adres doğrulama servisi, iade taşıyıcı, Pusat’a bağlı sevkiyat yazması.

**Kabul:** canlı fiyat olmadan `COMPLETE` yok. İskelet + kuyruk `CODE_READY` olabilir.

### 3. Yaptırım / ticaret uyum — PARTIAL

**Var:** `screenTrade` her zaman `sanctionsCleared: false`; EUR-Lex / sanctionsmap URL; yüksek tutar / AB dışı → `HUMAN_REVIEW`; `pusat_trade_holds`.

**Yok:** AB/BM/DE canlı liste, ürün/menşe/transit/alıcı/tedarikçi/son kullanıcı eşleştirme, çift kullanımlı tarama, otomatik durdur + kalıcı insan kuyruğu (kısmen hold var).

### 4. Gizlilik / ülke dosyası — PARTIAL

**Var:** `legalDisclosure.js`; GDPR export/silme hazırlığı; Pusat kişisel bellek izolasyonu.

**Yok:** 27 ülke dosya ayrımı, kurum kimliği doğrulama, sahte evrak/phishing motoru, bağlayıcı karar vs belirsizlik ayrımı.

### 5. 26 ülke vergi havuzu + ödeme yasağı — PARTIAL

**Var:** AB27 KDV snapshot (27 ülke); `taxProvider` 8 ülke; ödeme sandbox capture reddi; satış kilidi.

**Yok:** Almanya dışı 26 ayrı havuz hesabı; **net gelirin %25 rezervi** (kodda yok; `returnReserve` varsayılan 0); “26 ülkede ödeme aracı yok” kuralı ayrı motor değil.

### 6. AB-27 millî / özel gün — NOT_STARTED

**Var:** lojistik yorumu; ürün kategorisi `bz.41` “Özel Günler” (takvim değil).

**Yok:** 27 ülke takvimi, kaynak doğrulama, ana sayfa banner/slayt/video, önizleme/kapatma/telif.

### 7. Tax Connect — BLOCKED (canlı) / CODE_READY (kuyruk)

**Var:** `taxConnect.js` yerel kuyruk; `submitFiling` her zaman `TAX_CONNECT_BLOCKED`.

**Yok:** vergi dairesi API, beyan, borç, iade, resmi yazışma. Yetki olmadan bağlantı iddiası yok (doğru).

### 8. Doğu Bey — CODE_READY

**Var:** `doguResearch.js` SOURCED/UNVERIFIED; `durable.js` `pusat_research`; `runtime.js` `RESEARCH_*`; kategori talebi birim testleri.

**Yok:** ağ araştırması, 7/24 host, Intelligence Python bağlantısı. Bağımsız iş akışı testi: süreç içi evet, canlı hayır.

### 9. 7/24 telefon AI — BLOCKED

**Var:** `voiceReadiness.js` (5 env yoksa BLOCKED); `signaling.js` (yerel WebRTC oda); `Buzzard/voice.py` (ayrı :8787).

**Yok:** SIP, STT, TTS, yönlendirme, konferans, konuşmacı/rol, acil arama, kullanıcıya ulaşma. Gerçek görüşme testi yok.

### 10. Güvenli kurul mesajı — PARTIAL

**Var:** HMAC bütünlük (`secureMessaging.js`); X25519+GCM kutu (`e2eBox.js`); arşivde düz metin yok (test). HMAC **E2E diye sunulmuyor**.

**Yok:** cihaz kimliği, Esat zorunlu denetim kuyruğu, yedek anahtar kasası, üretim HMAC sırrı (yoksa kapanır — sonraki iş).

### 11. Laptop / cihaz — CODE_READY (liste)

**Var:** `deviceStandard.js` (TPM, Secure Boot, MFA, kurtarma, remote lock).

**Yok:** BitLocker adı; gerçek cihaz attestasyonu; kayıp prosedürü runbook’u cihazda çalıştırılmış değil.

### 12. Uygulama / kabul testleri — PARTIAL

**Var:** ecosystem birim testleri; scorecard; 19+5 test geçmişi; CI’da eski 2 kırılgan test (idempotency anahtarı / sqlite kilit) — #492 `runtime.js` değiştirmediği halde tabanda vardı; sonraki committe anahtar rastgeleleştirildi.

**Yok:** 16 madde × (birim + entegrasyon + güvenlik + canlı) ayrı kayıt; e2e/yük/ödeme/DR.

### 13. Bağımsız Claude yetenekleri — COMPLETE (yasak) / PARTIAL (yetenek)

**Var:** `independentCapabilities.js` + `aiProviders.js` anthropic/claude/openai/google reddi. Test geçti.

**Yok:** Claude’un yararlı genel yeteneklerinin Buzzard-owned model/runtime kopyası. Harici entegrasyon **yapılmayacak**.

### 14. Cursor bakım — PARTIAL

**Var:** `docs/MASTER_COMMAND/*`; export paketleri; izole dal kuralı.

**Yok:** tek SOP (hata → yama → bağımlılık → test → doküman); Cursor sınırları canlı ölçülmedi.

### 15. İç AI gizlilik / egress — CODE_READY (değerlendirici)

**Var:** `egressPolicy.js` allowlist + sınıflı red.

**Yok:** `fetch` sarmalayıcı; canlı Render firewall kanıtı; DLP ürünü. “Veri çıkmıyor” **BLOCKED**.

### 16. İş sürekliliği 3-2-1-1-0 — PARTIAL

**Var:** yerel 3 kopya + gzip + SHA-256; temp DB prove (`productionTouched: false`); bağımsız dizin offsite **kodu**; `chmod 444` yuvası.

**Yok:** uzak kasa; gerçek WORM/object-lock (`chmod 444` root silebilir); 10 alan cron; RPO/RTO onaylı SLA; fidye/bölge kesinti tatbikatı.

---

## Eşleştirme özeti (Aşama 2 taslağı)

| # | Madde | Eski komut alanı | Durum | Fazla / çakışma |
| --- | --- | --- | --- | --- |
| 1 | Tekstil AI | yok (kategori AI kısmi) | NOT_STARTED | Taksonomi var, ürün yok |
| 2 | AB27 kargo | alan 5 | PARTIAL | İki lojistik yığını (AB27 vs fulfillment) |
| 3 | Yaptırım | alan 5 | PARTIAL | Canlı feed yok |
| 4 | Ülke dosyası | alan 6 | PARTIAL | Phishing yok |
| 5 | Vergi havuzu %25 | alan 7 | PARTIAL | 27 KDV ≠ 26 havuz |
| 6 | Millî gün | yok | NOT_STARTED | `bz.41` kategori karışmasın |
| 7 | Tax Connect | alan 7 | BLOCKED | Kuyruk ≠ bağlantı |
| 8 | Doğu Bey | alan 3 | CODE_READY | Ağ yok |
| 9 | Telefon | alan 9 | BLOCKED | signaling ≠ SIP |
| 10 | Mesaj | alan 10 | PARTIAL | HMAC ≠ E2E iddiası yasak |
| 11 | Cihaz | alan 11 | CODE_READY | Attestation yok |
| 12 | Kabul testi | alan 16 | PARTIAL | 16×4 matris yok |
| 13 | Bağımsız AI | alan 12 | PARTIAL | Yasak COMPLETE |
| 14 | Cursor bakım | alan 13 | PARTIAL | SOP yok |
| 15 | Egress | alan 14 | CODE_READY | HTTP bağlı değil |
| 16 | DR | alan 1 | PARTIAL | Offsite BLOCKED |

Pazarlama influencer (eski alan 15) **bu 16 maddede yok**. Silinmedi; kapsam dışı bırakıldı.

---

## Aşama 3 — izole plan (uygulanmadı)

Her iş ayrı dal: `cursor/special-16-<konu>-c293`. #492’ye squash yok. Veri silme yok.

1. **T-TRACK** — `SPECIAL_16_TASKS.json` 10 alan (bu commit).
2. **T-CAT-REPORT** — 48/53/56 eşleme raporu + `smartMenu` çakışması (silmeden).
3. **T-I18N-KEYS** — 30 katalog vs 4 kategori çevirisi boşluk listesi.
4. **T-HMAC-PROD** — HMAC sırrı yoksa mesaj kapa (üretim).
5. **T-EGRESS-WRAP** — HTTP sarmalayıcı; canlı iddia yok.
6. **T-TAX-POOL** — 26 havuz + %25 rezerv **muhasebe kaydı** (ödeme aracı yok).
7. **T-SANCTION** — statik resmi URL + eşleşme kuyruğu; canlı API yok.
8. **T-HOLIDAY** — 27 gün veri iskeleti + önizleme; yayın `NEEDS_APPROVAL`.
9. **T-TEXTILE** — hub sayfa + ölçü opt-in + gizlilik; try-on yerel iskelet.
10. **T-DEVICE-RUNBOOK** — BitLocker/TPM prosedür metni + evaluator eşlemesi.
11. **T-ACCEPT** — 16 madde kabul dosyası.
12. **T-32110** — offsite env + WORM belgesi; production restore yasak.
13. **T-VOICE / T-TAX-LIVE** — hesap yoksa BLOCKED kalsın.
14. **T-492** — #492 NEEDS_APPROVAL kalsın.

Öncelik: güvenlik + süreklilik (15, 16, 10, 11, 3, 4) → vergi/kargo (5, 7, 2) → Doğu/test (8, 12, 14, 13) → vitrin (1, 6) → telefon (9).

---

## Yasaklar (bu oturum)

Merge, deploy, production restore, canlı satış, ödeme, veri silme, Claude entegrasyonu, onaysız push: **yapılmadı**.

## Sonraki

Kullanıcı onayı: (a) bu envanteri kabul, (b) Aşama 4 koduna geç, (c) push/PR. Onaysız kod yığını başlamaz.
