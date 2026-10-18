# Buzzard — Komut 7–10 Nihai Güvenlik Raporu

Tarih: 2026-10-15  
Mod: YEREL DEPO · KANITA DAYALI · ÜRETİM YOK · DEPLOY YOK · PUSH/PR/MERGE YOK

Bu paket Komut 7 (parola sıfırlama / 2FA / PII izinleri), Komut 8 (Esat Bey 15 alan), Komut 9 (Pusat / Human Approval / Buzzard entegrasyonu) ve Komut 10 (nihai doğrulama) için tek kontrollü çalışmadır.

**Esat Bey %100 değildir. Buzzard %100 değildir. LIVE_VERIFIED iddiası yoktur.**

---

## 1. Başlangıç branch ve HEAD

| Alan | Değer |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` |
| Komut 6 bitiş / Komut 7–10 başlangıç | `1096f29` (`Record KOMUT 6 password-reset and submissions evidence.`) |
| Önceki rapor HEAD varsayımı | Kullanılmadı; `git rev-parse` ile doğrulandı |
| Çalışma ağacı başlangıçta | Temiz (bu pakette kullanıcı dosyası ezilmedi) |
| `git reset --hard` / `git clean -fd` | Kullanılmadı |

Komut 6 kodunun mevcut olduğu doğrulandı: `af95675` (HTTP yanıtında `resetToken` yok) ve `1096f29` (kanıt kaydı).

---

## 2. Bitiş branch ve HEAD

| Alan | Değer |
| --- | --- |
| Branch | `cursor/software-completion-local-c293` (değişmedi) |
| Kod HEAD | `adc36a7` Harden reset tokens, 2FA responses, and Esat Bey gates. |
| Kanıt HEAD | `bba4df1` Record Komut 7–10 Esat Bey and hashed-reset evidence. |
| Bu raporun yerel commit’i | Aşağıdaki git durumuna bakın |
| origin’e göre | `ahead 31` (push yapılmadı) |

---

## 3. Değiştirilen dosyalar (`1096f29..bba4df1`)

| Dosya | Ne değişti |
| --- | --- |
| `server/lib/customerAuth.js` | SHA-256 `tokenHash`; ham token saklanmaz; legacy düz metin tüketilmez |
| `server/lib/identitySecurity.js` | 2FA yanıtında `otpauthUri`; `secretForDevelopment` yok |
| `server/plugins/identitySecurityPlugin.js` | `secret` / `secretForDevelopment` strip |
| `server/lib/routePermissions.js` | `GET /api/submissions` → `security.manage` |
| `server/plugins/contactStoragePlugin.js` | PII listesi `security.manage` |
| `server/lib/pusat/esatSecurity.js` | **yeni** — enjeksiyon, yetki yükseltme, izolasyon, para eylemi, fail-closed |
| `server/lib/pusat/guardian.js` | izolasyon + enjeksiyon + audit fail-closed |
| `server/lib/pusat/lifecycle.js` | Guardian reddi sonrası circuit; para eylemlerinde FINANCIAL_BLOCKED; sınıflı hata anahtarı |
| `server/__tests__/continuousIntegrity253.test.mjs` | hash dosya, `read_only` 403 |
| `server/__tests__/continuousIntegrity254.test.mjs` | **yeni** — token/2FA/Guardian/HAC |
| Register / TEST_EVIDENCE / HANDOVER | yüzde ve kanıt |

---

## 4. Parola sıfırlama token düzeltmesi

**Bulgu (Komut 6 sonrası):** HTTP yanıtına token konmuyordu; depolamada düz metin `token` alanı duruyordu.

**Uygulanan mekanizma:**

- Oluşturma: rastgele token üretilir; saklanan kayıt `{ tokenHash: sha256(hex), customerId, expiresAt, createdAt }`.
- Yeniden yazımda düz metin `token` alanı düşürülür.
- Doğrulama: gelen token hash’lenir; `timingEqualHex` ile `tokenHash` karşılaştırılır.
- Legacy düz metin **onurlandırılmaz** (güvenli geçiş: eski kayıtlar geçersiz sayılır; kullanıcı yeni talep açar). Bu, hash’siz eski token’ların kullanılmasına izin vermekten daha güvenlidir.
- Tek kullanımlılık: başarılı tüketimde kayıt silinir.
- Süre: `expiresAt` geçmişse red.
- API: `resetToken` / `resetTokenForDevelopment` yanıtta yok. Teslimat (e-posta) yapılandırılmamış olsa bile token API’ye geri konmaz.
- Bilinen/bilinmeyen e-posta aynı gövde (hesap varlığı sızıntısı yok).
- HTTP rate limit lookup’tan önce.
- Log’a ham token yazılmaz (testler response gövdesinde token arar).

**Kalan:** Canlı e-posta teslimi yok (credentials + politika). Bu BLOCKED_EXTERNAL / HUMAN tarafındadır; token’ı yanıta koyarak “çözülmüş” sayılmaz.

---

## 5. 2FA sırrı bulguları ve düzeltmeleri

**Akış:** `identitySecurity.setupTwoFactor` TOTP sır üretir ve `otpauthUri` döner. `enrolled: false` — **confirm-enable henüz tamam değil**.

**Düzeltmeler:**

- HTTP yanıtında `secretForDevelopment` ve `secret` yok.
- Plugin kalan sızıntıyı strip eder.
- Kimliksiz kurulum wrap ile 401 (servis alanı).
- 2FA sessizce kapatılmadı; QR provisioning `otpauthUri` ile duruyor.
- Geliştirme kolaylığı için ham sır istemciye gönderilmiyor.

**Kalan:** TOTP sırrının durağan depoda hash’lenmesi isteğe bağlı/ileri iş. Confirm-enable yok. Canlı authenticator doğrulaması yok.

---

## 6. Read-only / PII izin bulguları

Gerçek model (`routePermissions.js` + plugin):

| Route | İzin |
| --- | --- |
| `GET /api/submissions` | **EXACT** `security.manage` |
| Plugin `requirePermission` | `security.manage` |

Test kanıtı (`continuousIntegrity253`):

- Anonim: reddedilir.
- `read_only`: 403.
- `order_manager`: 403 (PII için `orders.read` yetmez).
- `administrator` / `security.manage`: 200 (liste işlevi).

Yetki modeli kanıtsız genişletilmedi; aksine PII `security.read` / `orders.read` yerine `security.manage`’e sıkılaştırıldı.

---

## 7. Esat Bey — 15 alanın durumu

Esat Bey, canlı bir SOC değildir. Yerel Guardian politikasıdır; asıl çağrı yolu `lifecycle.executeTask` → `guardian.evaluate`. Dosya varlığı entegrasyon sayılmaz; 254 testleri çağrı yolunu kullanır.

Hepsi **PARTIAL**. Hiçbiri LIVE_VERIFIED / SANDBOX_VERIFIED değildir.

| Alan | Durum | Kanıt | Kalan |
| --- | --- | --- | --- |
| 1 Sürekli izleme | PARTIAL (~%76, madde 230) | yerel `recordSystemEvent` deny/allow | uzak SOC / SIEM yok |
| 2 Tehdit tespiti | PARTIAL (~%82, 227) | DANGEROUS_PATTERN + prompt injection deny | yıkıcı containment yok (bilinçli) |
| 3 Anomali | PARTIAL (~%68, 229) | rate + izolasyon sezgisel | üretim ML yok |
| 4 Kimlik/yetki | PARTIAL (~%86, 228) | `aiCanExecute`; privilege-escalation keys deny | uzak IdP yok |
| 5 AI ajan güvenliği | PARTIAL (~%86, 233) | tool allow-list; agentId yoksa fail-closed | ajanlar recommendation-only |
| 6 Sırlar | PARTIAL (~%84, 235) | `scanSecrets`; hashed reset | canlı secret rotation HUMAN |
| 7 İzolasyon | PARTIAL (~%78, 231) | `isolateAgent` ek izin vermez | prod kill-switch yok |
| 8 Alarm / olay | PARTIAL (~%48, 234) | deny path test; `liveDispatch: false` | canlı IR tatbikatı yok |
| 9 Audit bütünlüğü | PARTIAL (~%80, 232) | allow-path audit fail → işlem fail-closed | uzak WORM/audit store yok |
| 10 HAC entegrasyonu | PARTIAL (168–182) | self-approve deny (`esat_bey`); input hash bind | canlı insan onayı yapılmadı |
| 11 Güvenlik hafızası | PARTIAL | hafıza politika değiştiremez; prompt ≠ politika | merkezi bellek canlı LLM’siz |
| 12 Bütçe / circuit | PARTIAL | `circuitBreaker.allow` para eylemlerinde FINANCIAL_BLOCKED | uzak bütçe sağlayıcı yok |
| 13 Yedek / DR | HUMAN / PARTIAL | `/tmp` restore fail-closed | üretim restore HUMAN |
| 14 Test / simülasyon | PARTIAL | vitest 253/254 + guardian | canlı kırmızı takım yok |
| 15 Fail-closed mimari | PARTIAL (~%88, 237) | `evaluate` throw → deny; Guardian arıza izin vermez | üretim fail gözlemi yok |

Güvenlik kuralları (kod + test):

- Ajan kendi yetkisini yükseltemez.
- Prompt metni politika değildir.
- Harici içerik sistem talimatı kabul edilmez (`inspectUntrustedPayload`).
- Kritik para eylemi circuit + HAC bağından geçer; otomatik onay yok.
- Onay parametre değişince `input_changed`.
- Süresi dolmuş onay kullanılamaz (önceki HAC davranışı).
- Esat/Guardian kendini onaylayamaz.
- Audit yazımı başarısızsa allow-path fail-closed.
- Circuit gerçek `executeTask` çağrılarını sınırlar.
- İzolasyon ekstra yetki yolu açmaz.

---

## 8. Pusat ve Human Approval Center entegrasyon kanıtları

Pusat koordinatör kalır; Esat savunma katmanıdır.

| Bileşen | Çağrı noktası | Kimlik/yetki | Hata | İnsan onayı | Test | Dış bağımlılık |
| --- | --- | --- | --- | --- | --- | --- |
| Pusat Orchestrator | `executeTask` | employee + Guardian | `publicTaskError` / GUARDIAN_BLOCKED | para/tehlikeli eylem | 254 + 251 | canlı LLM stub |
| AI ajanları | `executeAgent` | allow-list; `recommendationOnly` | fail-closed | self-approve yasak | mevcut | canlı model yok |
| Merkezi hafıza | memory store | SQL yok public hata | redacted | politika değiştiremez | yerel | — |
| Görev / exception | exceptions API | `security.read` GET | classified keys | — | önceki | — |
| Supplier/API/XML | feed preview | sales lock | BLOCKED | PO HUMAN | yerel | Inter-Cars/TecDoc |
| Ürün/kategori | PIM | SoT inactive | 409 satış kapalı | SoT HUMAN 73 | yerel | — |
| Fiyat/stok | pricing/inventory | €0.50 taban | fail-closed VAT | — | yerel | canlı stok 87 |
| Sipariş/iade | OMS/RMA | sales off | estimated ≠ actual | ilk sipariş 225 | yerel | — |
| Finans | payment adapters | live payments off | UNCERTAIN no auto-capture | 182 | yerel | Stripe/PayPal |
| Marketplace | hub 409 | `marketplace_mutations_disabled` | PUBLISH_BLOCKED | 115/129 | yerel | hesaplar |
| Kargo | `purchaseLabel` | her zaman blocked | LABEL_PURCHASE_BLOCKED | 182 | yerel | taşıyıcı anahtar |
| Müşteri hizmetleri | notifications | `sent:false` | BLOCKED | 155/165 | yerel | SMTP |
| Audit | controlCenter events | actor kaydı | audit fail-closed | — | 254 | uzak store yok |
| HAC | consume + hash bind | insan kimliği; AI yasak | REJECTED/EXPIRED/input_changed | **otomatik onay yok** | 254 | gerçek insan yok |

HAC: talep/parametre, onaylayan kimliği, kapsam, süre, parametre değişimi, ret/iptal/timeout, onaysız hassas işlem engeli — yerel yazılımda vardır. Bu oturumda gerçek insan onayı üretilmedi.

---

## 9. Eklenen veya değiştirilen testler

- `server/__tests__/continuousIntegrity253.test.mjs` — hashed dosya; `read_only` 403; `security.manage`.
- `server/__tests__/continuousIntegrity254.test.mjs` — yalnızca `tokenHash`; yanlış/süresi dolmuş/ikinci kullanım; 2FA yetkisiz sır yok; injection/escalation/isolation; money circuit; HAC self-approve + `input_changed`.

Testler geçsin diye gevşetilmedi. `continuousIntegrity251` Title-Case `error:` regex’ine takılınca üretim hatası `publicTaskError` sınıflı anahtara alındı (test gevşetilmedi).

---

## 10. Test komutları ve gerçek sonuçları

| Komut | Çıkış | Sonuç |
| --- | --- | --- |
| Odaklı vitest 253/254/guardian/approval | 0 | 27 passed |
| `npx vitest run` (lifecycle quote düzeltmesi sonrası) | 0 | **111 dosya, 1073 passed, 0 failed** |
| Playwright | atlandı | `:3000` / süreç kilidi; kör öldürme yok. Son kayıt: 107 passed / 12 skipped |
| Canlı e-posta / ödeme / kargo / marketplace | çalıştırılmadı | canlı doğrulama diye gösterilmedi |

---

## 11. TypeScript / lint / build

| Komut | Çıkış | Not |
| --- | --- | --- |
| `npx tsc --noEmit` | 0 | temiz |
| `npx next lint --dir components/account --dir lib/account` | 0 | uyarı/hata yok |
| `next build` | atlandı | `:3000` `.next` sahibi; süreç öldürülmedi |

---

## 12. Kalan kritik güvenlik açıkları / boşluklar

Kritik sızıntı (düz metin reset token depoda; 2FA `secretForDevelopment` HTTP; submissions `orders.read`) bu pakette kapatıldı.

Hâlâ gerçek boşluk:

1. Identity 2FA **confirm-enable** yok (`enrolled: false`).
2. Login/register hâlâ `/api/account/` customer-auth catch-all altında (reset public; login politikası ayrı iş).
3. TOTP sırrı durağan depoda hash’lenmiş değil (HTTP sızıntısı kapatıldı).
4. Canlı e-posta ile reset teslimi yok.
5. Esat uzak SOC / IR tatbikatı yok.
6. Audit uzak bütünlük deposu yok.
7. Anomali sezgisel; ML yok.
8. Orijinal 237 kabul kriteri UNKNOWN — resmi VERIFIED_100 = 0.

---

## 13. BLOCKED_EXTERNAL maddeleri (sayı: 7, değiştirilmedi)

| Madde | Engel |
| --- | --- |
| 87 | Inter-Cars canlı kimlik |
| 88 | TecDoc canlı kimlik |
| 185 | Alarm backend (SMTP/webhook); yerel `liveDispatch: false` |
| 205 / 212 | Bu HEAD için GitHub CI (push yok) |
| 217 | Üretim monitoring probe |
| 220 | Üretim kalıcı disk |

Kanıtsız BLOCKED düşürülmedi.

---

## 14. HUMAN_APPROVAL_REQUIRED maddeleri (sayı: 13, değiştirilmedi)

67 PIM canlı yayın; 73 Product SoT; 115/129 marketplace yayın; 155/165 müşteri mesajı; 182 yüksek etkili katalog/finans/kargo/deploy; 213 prod env; 214 deploy; 219 go-live; 221 DNS; 225 ilk gerçek sipariş; 226 korumalı dala merge.

Bu oturumda hiçbiri otomatik onaylanmadı.

---

## 15. Esat Bey ilerleme yüzdesi

Formül: 237 maddelik aritmetik ortalama; Esat ayrı olarak maddeler **227–237**.

| | Önceki | Yeni | Fark |
| --- | --- | --- | --- |
| Esat Bey (227–237 ortalama) | **71.36%** | **77.82%** | **+6.45 pp** |

Kanıt: guardian/esatSecurity/lifecycle + vitest 254. LIVE_VERIFIED yok. %100 değil.

Madde yüzdeleri (PARTIAL): 227 82 · 228 86 · 229 68 · 230 76 · 231 78 · 232 80 · 233 86 · 234 48 · 235 84 · 236 80 · 237 88.

---

## 16. Buzzard genel ilerleme yüzdesi

Aynı 237 maddelik aritmetik ortalama. Formül değişmedi.

| | Önceki | Yeni | Fark |
| --- | --- | --- | --- |
| Buzzard 237 | **73.20%** | **73.53%** | **+0.33 pp** |

Puan: 17427 / 237. Hedef +0.30 bu paket için karşılandı (78 puan / 237). Kanıtsız VERIFIED_100 yok.

---

## 17. VERIFIED_100 / HUMAN / BLOCKED_EXTERNAL sayıları

| Durum | Sayı | % of 237 |
| --- | --- | --- |
| VERIFIED_100 | **0** | 0.0% |
| PARTIAL | 216 | 91.1% |
| HUMAN_APPROVAL_REQUIRED | **13** | 5.5% |
| BLOCKED_EXTERNAL_DEPENDENCY | **7** | 3.0% |
| NOT_APPLICABLE_WITH_EVIDENCE | 1 | 0.4% |

Toplam 216+13+7+1 = 237.

---

## 18. Çalışma ağacı ve yerel commitler

Komut 7–10 commit’leri (yalnızca yerel):

1. `adc36a7` Harden reset tokens, 2FA responses, and Esat Bey gates.
2. `bba4df1` Record Komut 7–10 Esat Bey and hashed-reset evidence.
3. Bu rapor dosyasının yerel commit’i (push yok).

`git reset --hard` yok. Kullanıcı değişiklikleri korunur. Push/PR/merge yok.

---

## 19. Üretim sistemine dokunuldu mu?

**Hayır.**

- Üretim veritabanı değişmedi.
- Production env/secret değişmedi.
- Deploy yok.
- `BUZZARD_SALES_ENABLED` açılmadı (0).
- `BUZZARD_PRODUCT_SOT_ACTIVE` açılmadı.
- `BUZZARD_LIVE_PAYMENTS` açılmadı.
- Gerçek ödeme, iade, sipariş, kargo etiketi, marketplace ilanı, müşteri mesajı yok.
- Yeni ücretli servis yok.
- Gerçek API anahtarı rapora yazılmadı.

---

## 20. Esat Bey gerçekten %100 mü?

**Hayır.**

Orijinal kabul kriteri UNKNOWN. Canlı SOC, IR tatbikatı, yedek restore, uzak Guardian, secret rotation yok. 15 alanın hepsi PARTIAL. VERIFIED_100 = 0. SANDBOX_VERIFIED / LIVE_VERIFIED yazılmadı.

---

## 21. %100 değilse kalan somut işler (Esat + kimlik)

1. 2FA confirm-enable + isteğe bağlı hashed-at-rest TOTP.
2. Login/register public CSRF politikasının bilinçli ayrıştırılması.
3. Canlı reset e-posta teslimi (credentials + HUMAN).
4. Canlı IR tatbikatı ve olay yönetimi (HUMAN / dış).
5. Üretim yedek restore kanıtı (HUMAN, madde yedek bandı).
6. Uzak telemetry / SIEM.
7. Anomali: üretim-ölçekli model (şu an sezgisel).
8. Audit WORM / uzak bütünlük.
9. Orijinal 237 checklist kaynağı bulunursa resmi kriterlere yeniden hizalama.

---

## 22. Buzzard Orchestrator kalan işler ve kanıt durumu

Pusat yerel yazılımda koordinatör: specialist roster, idempotent dispatch, Guardian bağları, `recommendationOnly`, health `live: false`.

Kalan:

- Canlı LLM sağlayıcı (credentials) — stub.
- Go-live / deploy / DNS / ilk sipariş — HUMAN 213–226.
- Marketplace/carrier/supplier canlı — BLOCKED + HUMAN.
- CI bu HEAD’de — push olmadığı için 205/212 BLOCKED.
- Orijinal 237 kriteri UNKNOWN olduğu için Orchestrator maddeleri VERIFIED_100 olamaz.

**Kilitler:** satış kapalı, SoT inactive, canlı ödeme kapalı.

---

## Sonuç

Komut 7–10 yerel olarak uygulandı ve test edildi. Reset token hash’lendi; 2FA sırrı HTTP’den çıktı; PII `security.manage`; Esat/Guardian `executeTask` yolunda sıkılaştı; HAC self-approve ve input-hash regresyonu var. Vitest 1073/1073. tsc temiz. Build/Playwright atlandı.

Buzzard **73.53%** (önce 73.20%). Esat Bey **77.82%** (önce 71.36%). Esat Bey **%100 değil**. Push / PR / üretim yok.
