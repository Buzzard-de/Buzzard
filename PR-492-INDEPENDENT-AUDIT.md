# PR #492 — Bağımsız teknik inceleme

**PR:** https://github.com/Buzzard-de/Buzzard/pull/492  
**Head:** `cursor/master-ecosystem-c293` @ `fa9b3dcb`  
**Base:** `cursor/pusat-idempotency-c293` @ `67d82d41`  
**İnceleme zamanı:** 1 Kasım 2026, 00:58 Europe/Berlin  
**İnceleyen:** ayrı oturum / bağımsız denetim (merge veya deploy yok)

**Karar:** **NEEDS_APPROVAL** — inceleme PR’ı. Canlıya alma, squash merge, production restore, satış veya ödeme aktivasyonu **yapılmadı ve önerilmez.**

Durum etiketleri: COMPLETE | CODE_READY | PARTIAL | BLOCKED | NEEDS_APPROVAL

---

## 1. PR dosya envanteri

29 dosya, +1966 / −1. Yeni npm bağımlılığı yok.

| Dosya | Tür | Not |
| --- | --- | --- |
| `docs/MASTER_COMMAND/*` | doküman | Envanter ve aşama iddiaları |
| `package.json` | script | `backup:prove`, `test:master-ecosystem`, CI listesine 4 test |
| `scripts/prove-backup-restore.mjs` | script | Yalnızca temp dizin |
| `server/lib/survival/*` | yeni | 3-2-1-1-0 yerel kopya + prove |
| `server/lib/pusat/{council,memory,meetings,humanApproval,doguResearch,categoryExperts}.js` | yeni | Pusat runtime’a **bağlı değil** |
| `server/lib/commerce/{ab27Tax,ab27Logistics,marginEngine}.js` | yeni | `taxProvider.js` değiştirilmedi |
| `server/lib/security/{egressPolicy,secureMessaging,deviceStandard}.js` | yeni | Ağ katmanına **bağlı değil** |
| `server/lib/ai/independentCapabilities.js` + `aiProviders.js` | yeni + 5 satır | Dış provider reddi |
| `server/lib/privacy/legalDisclosure.js` | yeni | Metin yardımcıları |
| `server/lib/marketing/influencerIdentities.js` | yeni | Taslak kimlikler |
| `server/lib/voice/voiceReadiness.js` | yeni | Ortam kontrolü |
| `server/plugins/ecosystemPlugin.js` | yeni | `GET /api/health/ecosystem` (auth yok) |
| 4 `server/__tests__/*` | yeni | 19 birim testi (ayrı koşumda geçti) |

**Uyumluluk (mevcut mimari):** **CODE_READY**

- Pusat yazma reddi ve satış kapısı **değiştirilmedi**.
- `restore-db.mjs` / `restoreSafety.js` production koruması duruyor.
- Mevcut `taxProvider.js` (8 ülke) ve 48’lik master JSON’a dokunulmadı.
- Risk: `aiProviders.executeWithProvider` artık `anthropic` / `claude` / `openai` / `google` için `EXTERNAL_AI_FORBIDDEN` döner. Stub varsayılanı bozulmaz. İleride bu isimlerle iskelet bağlamak isteyen kod kırılır (kasıtlı, Claude yasağına uygun; OpenAI/Google yasağı komuttan daha geniş).

---

## 2. 48 master vs “50 kategori” vs shop / main

Tek bir “tam 50 L1 master” dosyası **bu PR tabanında veya `origin/main` mapping’inde yok.** Komuttaki 50 sayısı mevcut kaynaklarla birebir örtüşmez.

| Kaynak | L1 sayısı | Kimlik | Dal |
| --- | --- | --- | --- |
| `data/taxonomy/buzzard_master_48_main_categories_de.json` | **48** | `bz.01`–`bz.48` | PR tabanı ve main mapping kaynağı |
| `data/buzzard_categories.json` | **53** | `cat-01`–`cat-53` | Bu PR tabanı (shop menü) |
| `data/taxonomy/master_shop_l1_mapping.json` | **53** eşleme | shop → bz.* | Bu taban ve `origin/main` **aynı 53** |
| `origin/main` `data/i18n/category-mains.json` | **56** | `cat-01`–`cat-56` | Main vitrin i18n |
| PR `categoryExperts.js` | 48’i “korundu” sayar | yalnızca 5 uzman AI | Yeni kod |

`cat-50` **master ağaç değil**, shop L1 “Geschenke, Blumen & Anlässe” (`bz.41`).

Main’de **bu tabanda olmayan** üç ek vitrin L1:

| ID | Main adı | Bu taban |
| --- | --- | --- |
| cat-54 | Reifen und Felgen | yok |
| cat-55 | Baumaschinen und Ersatzteile | yok |
| cat-56 | Nutztierhaltung & Viehzucht | yok |

48 master kodunun tümü shop eşlemesinde `unmapped_master_codes: []`. Yani 48 **silinmiş değil**; shop 53, vitrin i18n 56’ya büyümüş.

**Bulgu — kategori modeli:** **PARTIAL**  
PR, 48 JSON’u korur ama 53 shop / 56 main hub’ı uzman kadroya yansıtmaz. “50 kategori korundu” iddiası kanıtlanamaz.

### Kayıpsız birleştirme planı (kod uygulanmadı)

1. **Kaynak gerçeği ayır:** `bz.*` = 48’lik master (isim/kod silinmez). `cat-*` = vitrin L1 (slug/URL silinmez).
2. **Önce main’i referans al:** `category-mains.json` + hub dalları (`cursor/construction-livestock-hubs-c293`, `cursor/vehicle-hubs-tires-c293`, `cursor/machinery-hub-search-c293`) `cat-54..56` ve arama çerçevelerini taşır.
3. **Eşlemeyi genişlet, daraltma:** Yeni shop L1 için `master_shop_l1_mapping.json`’a satır ekle (ör. lastik → `bz.01`, iş makinesi → `bz.04` veya yeni `bz.49+` **yalnızca onay sonrası**). Mevcut `cat-01`–`cat-53` slug’larını değiştirme.
4. **Bu PR’ı main’e rebase/merge etme:** Taban `pusat-idempotency`; main’den onlarca commit geride. Kategori birleşimi **ayrı dalda**, cherry-pick veya mapping-only PR ile.
5. **Doğrulama:** 48 `bz` + 53 `cat` + 3 hub = hiçbiri kayıp; yönlendirmeler (`category_legacy_redirects`) durur.
6. **Uzman AI:** her L1 için zorunlu yeni model yok; hub’lar mevcut `automotive_ai` / `construction_ai` / `agriculture_ai` altına bağlanabilir.

**Bu plan:** **NEEDS_APPROVAL** (ayrı iş; #492 içinde yapılmadı).

---

## 3. 4 locale vs 30 locale

Bu PR tabanı: `lib/i18n/types.ts` → `de | en | tr | ar`. RTL: yalnızca `ar`.

`origin/main` `lib/i18n/supported-locales.json` (30 dil):

`de en tr ar fr nl bg hr el cs da et fi hu it lv lt lb mt pl pt ro sk sl es ca eu gl sv ga`

**Bu tabanda eksik 26 dosya:** `fr nl bg hr el cs da et fi hu it lv lt lb mt pl pt ro sk sl es ca eu gl sv ga`  
Ayrıca main’de olan `supported-locales.json`, `catalogLoader.ts`, `localeCompletion.test.ts`, `international/*` yok.

Main notu: URL önekleri hâlâ `/de|en|tr|ar/`; diğer diller `?lang=` / `buzzard_locale`.

#492 locale dosyası eklemez. **30 dil: PARTIAL (taban geride) / bu PR için NOT_STARTED.**

---

## 4. Yedekleme, bütünlük, restore güvenliği

### Mevcut (PR öncesi) — korunmuş

- `scripts/db-backup.mjs`: kopya + `PRAGMA integrity_check` + sidecar.
- `scripts/restore-db.mjs`: production / `/var/data` için `BUZZARD_ALLOW_PRODUCTION_RESTORE=1`; küçük dosya reddi; pre-restore kopya.
- `restoreSafety.js`: VALIDATE → REVIEW → explicit action; `autoRestore: false`.

**Restore güvenliği (eski katman):** **COMPLETE** (kod + guard; canlı DR değil).

### PR’ın eklediği

`createCopies` bir kaynak dosyayı dört yuvaya yazar; `proveRestore` **temp sqlite** üzerinde işaretçi satırı geri yükler. `/var/data` ve `server/data/buzzard.db` reddedilir. Production restore script’i çağrılmaz.

**Yerel prove:** **COMPLETE** (bu oturum: `ok: true`, `productionTouched: false`, `zeroVerifyErrors: true`).

---

## 5. 3-2-1-1-0 — gerçek vs iskelet

| Kural | Durum | Gerçek mi? |
| --- | --- | --- |
| 3 kopya | CODE_READY | Aynı makinede primary + mirror + gzip. Bağımsız sistem değil. |
| 2 ortam türü | PARTIAL | filesystem + gzip. Aynı disk; teyp/nesne deposu yok. |
| 1 offsite | BLOCKED | `BUZZARD_OFFSITE_BACKUP_DIR` yoksa `OFFSITE_UNCONFIGURED`. Ayarlansa bile başka bir host zorunlu değil. |
| 1 immutable / offline | PARTIAL | `chmod 444` + aynı ada ikinci yazmayı reddet. WORM/object-lock/air-gap yok; root silebilir. |
| 0 doğrulama hatası | CODE_READY | SHA-256 + gzip round-trip + prove’da PRAGMA. Yalnızca o dosya. |
| 10 alan (DB, katalog, sipariş, …) | PARTIAL | `DATA_AREAS` listesi. `createCopies` tek dosya alır; otomatik 10’lu yedek yok. |
| Anahtarların ayrı saklanması | PARTIAL | İsim filtresi + `keys-NOT-IN-DATA-BACKUP/README.txt`. Kasa yok. |
| Cron / Render / mevcut `backupAutomation` bağlantısı | NOT_STARTED | Eski tek-disk yedek hâlâ asıl yol. |
| Canlı DR / RPO-RTO onayı | NEEDS_APPROVAL | Metin önerisi; SLA değil. |

**3-2-1-1-0 üretim iddiası:** **PARTIAL**. Yerel kanıt var; şema tamamlanmış sayılmaz.

---

## 6. Pusat, hafıza, toplantı, Doğu Bey

Yeniden çalıştırılan birim testleri + süreç içi sonda (00:58 Europe/Berlin):

- Toplantı açılışı: `pusat,dogu_bey` — çalıştı.
- Kişisel hafıza: `dogu_bey` → `pusat` = `PERSONAL_MEMORY_DENIED`.
- Doğu: kaynaksız tamamlamada `UNVERIFIED`.
- Kişisel sınıflandırma paylaşımı: `false`.

**CODE_READY (süreç içi).** Değil:

- `server/lib/pusat/runtime.js` bu modülleri **import etmez**.
- Hafıza/toplantı/rapor **yeniden başlatınca silinir** (SQLite yok).
- Doğu **ağ araştırması yapmaz**; kaynak çağıran tarafından verilir.
- `screenTrade` her seferinde **yeni** `createApprovalCenter()` açar; onay kuyruğu kalıcı değil.
- 7/24 kurul toplantısı yok.

Esat `soleDefense: false` — doğru niyet; Esat canlı izleme değil.

---

## 7. HMAC mesajlaşma ≠ E2E şifreleme

**COMPLETE (belgeleme + kod davranışı).**

`createMessenger`:

- Gövde **düz metin** olarak süreç belleğinde (`archive`) durur.
- `HMAC-SHA256` bütünlük içindir (değişiklik tespiti), gizlilik değildir.
- `send()` `e2e: false` döner; `e2eAssessment.endToEnd === false`.
- Sunucu (veya `BUZZARD_MSG_HMAC` / varsayılan sır sahibi) her mesajı okuyabilir ve sahte HMAC üretebilir.

Varsayılan sır kaynakta: `"dev-only-not-for-production"`. Üretimde set edilmezse mesajlar taklit edilebilir.

**Kalıntı riskler (E2E olsa bile):** uç cihaz, dışa aktarma, yedek, bildirim, sunucu belleği. WhatsApp yok — doğru.

Bunu “uçtan uca şifreli iç haberleşme” diye sunmak **yanlış** olur.

---

## 8. Güvenlik, yetki, sızıntı, dış bağlantı

| Konu | Durum | Kanıt |
| --- | --- | --- |
| Satış / ödeme yazma | COMPLETE (kapalı kaldı) | Pusat `WRITE_ACTIONS` + sales gate testleri (phase 3 geçti) |
| Dış üretim AI | COMPLETE (red) | `claude` / `anthropic` yasak; test geçti |
| Egress / DLP | PARTIAL | Allowlist **değerlendirici**; `fetch`/HTTP’ye bağlı değil. Canlı çıkış kanıtı yok. |
| `/api/health/ecosystem` | PARTIAL | Auth yok. Düşük hassasiyet (üyelik sayısı, voice missing env **isimleri**). Numara sızdırmaz. |
| HMAC varsayılan sır | PARTIAL | Kaynakta sabit; üretim sırrı yok |
| AB27 yaptırım | CODE_READY (dürüst) | `sanctionsCleared: false`; yüksek tutar / AB dışı → HUMAN_REVIEW (kalıcı kuyruk yok) |
| KDV snapshot | PARTIAL | 2026-10-22 tablo; beyana uygun değil |
| Tax Connect | BLOCKED | `NOT_CONNECTED` |
| Ses | BLOCKED | SIP/STT/TTS yok |
| `npm audit --omit=dev` | PARTIAL | sharp / source-map-js / postcss (yüksek/kritik). Bu PR eklemedi. `npm audit fix` uygulanmadı (onay). |

Veri sızıntısı: yeni kod müşteri/sipariş dışarı göndermez. **“Canlıda veri çıkmıyor” iddiası BLOCKED** — egress yalnızca kâğıt üzerinde.

---

## 9. Test sonuçları (yeniden koşum)

| Koşum | Sonuç | Saat (Europe/Berlin) |
| --- | --- | --- |
| 4 yeni ecosystem dosyası (önceki oturum) | 19/19 geçti | ~00:30 |
| `node scripts/prove-backup-restore.mjs` | ok, productionTouched false | 00:58 |
| Pusat/Doğu/mesaj sonda | beklenen redler | 00:58 |
| `test:unit:ci` (bu PR’ın genişlettiği set) | **66 geçti, 2 kaldı** / 13 dosya | 00:58 |

**Başarısız (bu PR’ın yeni dosyaları değil):**

1. `pusatIdempotency` → `runtime-ping-1` **sabit** anahtar + süreç `db` tekili. İkinci koşuda `first.replayed === true`. İzolasyon hatası; #492 `runtime.js` değiştirmedi.
2. `masterIntegrationPhase2` → `database is locked` (paralel vitest + paylaşılan sqlite). Kırılgan altyapı.

**Yeni 19 test:** yeniden CI içinde geçti.  
**E2E / yük / ödeme sandbox / mobil / a11y / canlı DR:** çalıştırılmadı → **NOT_STARTED**.

---

## 10. Kod kalitesi ve üretim hazırlığı

**Kalite:** **CODE_READY** — küçük CommonJS modüller, mevcut eklenti yükleyiciye uyum, yeni bağımlılık yok. Zayıf noktalar: bellek içi durum, `screenTrade` içinde atılan onay merkezi, sağlık ucu auth’suz, kategori/locale geriliği.

**Üretim hazırlığı:** **NEEDS_APPROVAL** ve fiilen **PARTIAL**.

Gitmeyin çünkü:

- Offsite / WORM / kasa yok.
- Kurulu Pusat’a bağlı değil.
- 30 locale ve cat-54..56 bu tabanda yok.
- CI’da 2 flaky/lock test.
- Ses ve Tax Connect BLOCKED.
- Satış bilinçli kapalı.

---

## 11. Bulgu özeti

| ID | Bulgu | Durum |
| --- | --- | --- |
| F1 | Pusat yazmaları ve satış kapalı kaldı | COMPLETE |
| F2 | Temp DB geri yükleme prove | COMPLETE |
| F3 | HMAC ≠ E2E; kod da öyle diyor | COMPLETE |
| F4 | Claude/dış provider reddi | COMPLETE |
| F5 | Eski restore guard’ları duruyor | COMPLETE |
| F6 | 3-2-1-1-0 kısmen yerel, offsite yok | PARTIAL |
| F7 | 10 yedek alanı yalnızca isim | PARTIAL |
| F8 | Kurulu/hafıza/toplantı/Doğu süreç içi, runtime’a bağlı değil | CODE_READY |
| F9 | 48 master ≠ 50; shop 53; main i18n 56 | PARTIAL |
| F10 | 4 vs 30 locale | PARTIAL |
| F11 | Egress bağlanmamış | PARTIAL |
| F12 | HMAC varsayılan sır | PARTIAL |
| F13 | Health ecosystem auth’suz | PARTIAL |
| F14 | Sabit idempotency anahtarı testi | PARTIAL |
| F15 | Paylaşılan DB kilit flaky | PARTIAL |
| F16 | Offsite + kasa + DR | BLOCKED |
| F17 | SIP/STT/TTS | BLOCKED |
| F18 | Tax Connect / canlı yaptırım | BLOCKED |
| F19 | Merge / deploy / satış | NEEDS_APPROVAL |
| F20 | 48+53+3 hub kayıpsız birleşim | NEEDS_APPROVAL |

Kanıta dayalı tamamlanma (16 alanlık komut, bu PR): **~30–35%**. “Ekosistem üretimde” **değil**.

---

## 12. Ayrı görev listesi (düzeltmeler — bu PR’da uygulanmadı)

Öncelik sırası. Her biri izole dal. Satış/ödeme/production restore yok.

1. **T-ISO** — `runtime-ping-1` yerine benzersiz idempotency anahtarı; Pusat testini paylaşılan DB’ye bağımlı bırakma.  
2. **T-LOCK** — phase2 envanter testini bellek DB veya seri koşu ile kilitsizleştir.  
3. **T-HMAC** — varsayılan sırrı üretimde reddet; `BUZZARD_MSG_HMAC` yoksa mesajlaşma kapansın.  
4. **T-HEALTH** — `/api/health/ecosystem` için mevcut admin auth veya daha sığ public gövde.  
5. **T-WIRE** — Kurulu/onay/Doğu’yu isteğe bağlı, bayraklı Pusat okuma eylemlerine bağla; yazma açma.  
6. **T-MEM** — Hafıza/toplantı için sqlite tablo (mevcut `db` şemasına uyumlu), süreç ötesi kalıcılık.  
7. **T-32110** — `backupAutomation` + alan listesini bağla; offsite hedefi env + ayrı medya; WORM’u belgele (kod iddiası değil).  
8. **T-CAT** — 48 `bz` + 53 `cat` + main `cat-54..56` eşleme PR’ı; slug silme yok.  
9. **T-I18N** — 30 locale’i main’den bu tabana taşımak **ayrı** entegrasyon; #492 ile squash etme.  
10. **T-EGRESS** — Allowlist’i gerçek HTTP sarmalayıcıya bağla; bağlanmadan “çıkış yok” deme.  
11. **T-APPROVAL** — Lojistik HUMAN_REVIEW’i kalıcı Human Approval Center’a yaz.  
12. **T-VOICE / T-TAX** — hesap/anahtar olmadan iskelet genişletme; BLOCKED kalsın.  
13. **T-AUDIT-DEPS** — sharp/postcss/source-map-js: `npm audit fix` yalnızca onay + regresyon sonrası.  
14. **T-MERGE** — #492’yi main’e değil, gözden geçirilmiş pusat tabanına; canlı deploy ayrı onay.

---

## 13. Bu incelemede yapılmayanlar

- Merge, deploy, production restore, satış, ödeme, ücretli API.
- Canlı Render/Pages değişikliği.
- 48/53/56 ağacının bu PR’da yeniden yazılması.
- Flaky testlerin bu oturumda kod ile “düzeltilmiş gösterilmesi”.

**Sonraki oturum:** `docs/MASTER_COMMAND/MASTER_TASKS.json` + yukarıdaki T-* listesi.
