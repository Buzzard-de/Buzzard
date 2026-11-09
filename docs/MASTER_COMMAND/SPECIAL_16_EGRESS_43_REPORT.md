# Egress 4.3 — tam kapsamlı ağ güvenliği doğrulaması

**Zaman:** 1 Kasım 2026, 22:01 Europe/Berlin  
**Dal:** `cursor/egress-43-verify-c293`  
**Taban:** `cursor/egress-42-supplier-c293` @ `63c7ed11`  
**Önceki tur:** Egress 4.2 (`SPECIAL_16_EGRESS_42_REPORT.md`)  
**Push / merge / deploy / satış / Stripe-PayPal / production restore:** yapılmadı  

Uygulama birim testleri **canlı firewall değildir**. Render/WAF gerçek yapılandırma: **BLOCKED**.

16 özel madde kapsam dışı bırakılmadı. Hiçbiri `COMPLETE` değildir.

---

## 1. Sınıflandırma

| Sınıf | Anlam | Sunucu `guardedFetch` geçerli mi? |
| --- | --- | --- |
| Sunucu tarafı | Node API çıkışı (`server/`) | Evet — tek izinli `fetch` `egressGuard.js:36` |
| Tarayıcı tarafı | `lib/**`, `components/**` aynı köken / API `fetch` | Hayır — ayrı `evaluateBrowserConnect` + CSP |
| Üçüncü taraf SDK | CSP `connect-src` GA / GTM / Facebook / TikTok | Hayır — tarayıcı CSP; OpenAI/Stripe yok |
| Harici servis | Render API, GitHub, Upstash, Python intelligence, tedarikçi | Sunucu kapısı veya ayrı yığın |
| Operatör script | `scripts/*` sağlık/smoke `fetch` | Kapı dışı (insan çalıştırır) |
| Giriş | `server/server.js` `http.createServer` | Çıkış değil |

Kök `package.json` bağımlılıklarında **axios / openai / stripe / @anthropic / undici / node-fetch yok**. XMLHttpRequest, WebSocket, EventSource, `https.request` tarama sonucu: **0 eşleşme** (üretim `lib/`, `server/`, `components/`).

---

## 2. Sunucu tarafı envanter (dosya:satır)

| Dosya | Satır | İstemci | Hedef sınıf | Kapı |
| --- | --- | --- | --- | --- |
| `server/lib/security/egressGuard.js` | 36 | `fetch` (`redirect: "manual"`) | tek izinli çıkış | kapı |
| `server/lib/security/egressPolicy.js` | 99–161 | değerlendirici | HTTPS/443, private, rebind, AI, ödeme | politika |
| `server/lib/supplier/realSupplierConnector.js` | 237–238 | `guardedFetch` | tedarikçi; dry-run varsayılan | kapıda |
| `server/lib/redisClient.js` | 26–27 | `guardedFetch` | Upstash REST (host allowlist’te değilse red) | kapıda |
| `server/lib/intelligenceBridge.js` | 76–77 | `guardedFetch` | iç köprü | kapıda |
| `server/lib/guardianBridge.js` | 26–27 | `guardedFetch` | iç köprü | kapıda |
| `server/lib/orchestratorBridge.js` | 26–27 | `guardedFetch` | iç köprü | kapıda |
| `server/lib/commercialIntegrations.js` | 34–35, 94–95, 123 | `guardedFetch` | Stripe/PayPal URL | `PAYMENT_EGRESS_LOCKED` |
| `server/server.js` | 1, ~listen | `http.createServer` | **giriş** + CORS allowlist | çıkış değil |

`server/` altında `egressGuard.js` dışında ham `fetch(` **yok** (egress43 taraması). axios / `http.get` / `https.request` yok.

Tedarikçi canlı host allowlist’e **eklenmedi**. `REAL_SUPPLIER` dry-run + `REAL_SUPPLIER_LIVE_IMPORT` kapalı kalır. Canlı URL listede değilse `supplier_egress_denied`. İşlev kırılmaz; dry-run durur.

---

## 3. Tarayıcı tarafı envanter (dosya:satır)

Hepsi `fetch` → `NEXT_PUBLIC_BUZZARD_API_URL` veya `apiBaseUrl()` + `/api/...`. **Sunucu egress kapısından geçmez.**

### Bileşenler

| Dosya | Satırlar |
| --- | --- |
| `components/MegaMenuSearch.tsx` | 45 |
| `components/admin/AdminContactSubmissionsPanel.tsx` | 26 |
| `components/admin/AdminSeoPanel.tsx` | 32, 45, 59 |

### `lib/**` (61 dosya, 134 çağrı)

`lib/account/client.ts:41`  
`lib/admin/automation.ts:21` · `client.ts:50` · `commerce.ts:26` · `controlCenter.ts:29` · `pimCore.ts:30`  
`lib/advancedSearch/client.ts:20,36` · `storefront.ts:19`  
`lib/ai/client.ts:16,39,53,66` — hedef **kendi** `/api/ai/*` (OpenAI değil)  
`lib/aiCenter/client.ts:20,36,54`  
`lib/analytics/client.ts:35,93` · `foundationAdminClient.ts:28,60` · `analyticsDashboard/client.ts:29,42,89` · `analyticsV39/client.ts:20,32`  
`lib/api/health.ts:29` · `lib/api/intelligence.ts:38`  
`lib/cartCheckout/client.ts:27,43`  
`lib/catalogSeo/client.ts:28,44,66,74,123`  
`lib/categories/visibility-client.ts:13`  
`lib/commerce/client.ts:60`  
`lib/contact/client.ts:20`  
`lib/crmCustomerService/client.ts:20,36` · `crmLoyalty/client.ts:32,48`  
`lib/customerCheckout/client.ts:31,47` · `customerSupport/client.ts:29,45`  
`lib/fulfillmentV33/client.ts:20,32`  
`lib/identitySecurity/client.ts:26,42,64`  
`lib/integrations/client.ts:23,57,68`  
`lib/internationalV37/client.ts:20,32`  
`lib/localizationFeeds/client.ts:28,44,76,89`  
`lib/logistics/client.ts:38,52,65,74,83,91,99,112,124`  
`lib/logisticsFulfillment/client.ts:27,43,53` · `logisticsV34/client.ts:20,32`  
`lib/marketingCenter/client.ts:28,41,97,117` · `marketingLoyalty/client.ts:24,40`  
`lib/marketplaceHub/client.ts:27,43` · `marketplaceV35/client.ts:20,32`  
`lib/masterAdminV40/client.ts:20,32`  
`lib/orderAutomation/client.ts:28` · `orderManagement/client.ts:20,36` · `orderManagementV32/client.ts:20,32`  
`lib/orders/client.ts:24,78,114`  
`lib/paymentsFinance/client.ts:27,43` · `paymentsV36/client.ts:20,32` — **kendi API**, Stripe SDK yok  
`lib/pimCatalog/client.ts:28,44,54,62,74,84` · `productCatalogPim/client.ts:24,40`  
`lib/returnRecovery/client.ts:20,26` · `returnsRma/client.ts:20,36`  
`lib/reviewsRatings/client.ts:20,36` · `storefront.ts:33,55`  
`lib/securityV38/client.ts:20,32`  
`lib/smartMenu/bridge.ts:79` · `useSmartMenuSignals.ts:29`  
`lib/store/client.ts:31,105` · `storefront/client.ts:10`  
`lib/supplierHub/client.ts:34,50,99,121,131` · `supplierIntegrationHub/client.ts:24,40`  
`lib/wmsInventory/client.ts:26,42`

`app/` altında `fetch` yok.

**Bu turda 58+ istemci `browserConnect` ile sarılamadı.** Politika dosyası eklendi; mevcut vitrin/taxonomy `fetch` yolları bilinçli olarak yeniden yazılmadı (kırılma riski).

---

## 4. Tarayıcı: CSP, CORS, proxy, izinler

### CSP (`lib/security.ts` `buildContentSecurityPolicy`, `connect-src` ~125–140)

İzinli: `'self'`, `NEXT_PUBLIC_BUZZARD_API_URL`, `https://buzzard-api.onrender.com`, localhost/127.0.0.1:3000/3001/3004, Google Analytics / GTM, `connect.facebook.net`, `analytics.tiktok.com`.

**Yok:** `api.openai.com`, `api.anthropic.com`, `api.stripe.com`, PayPal.

**Boşluk:** `NEXT_PUBLIC_BUZZARD_API_URL` CSP’ye ham enjekte edilir. Yanlış origin bağlanırsa tarayıcı o origin’e bağlanabilir. `evaluateBrowserConnect` bunu durdurur **yalnızca çağrılırsa**.

`script-src` hâlâ `'unsafe-inline'` + GTM/Facebook/TikTok.

### CORS (`server/server.js` 20–45)

Varsayılan origin: localhost:8000/3000/3001, `https://buzzard24.de`, `https://www.buzzard24.de`, `"null"`. `BUZZARD_CORS_ORIGINS` ile genişler. Yansıyan `*` yok; eşleşmeyen origin’e `Allow-Origin` yazılmaz.

### Tarayıcı politikası (`lib/security/browserConnect.js` / `.ts`)

Sunucu kapısından bağımsız. AI + Stripe/PayPal + `*.googleapis.com` + nip.io/sslip/localtest/localhost. + metadata/IPv6 link-local **red**. `buzzard24.de` / `*.onrender.com` / göreli URL **izin**. GA/GTM/FB/TikTok `THIRD_PARTY_ANALYTICS` (CSP ile hizalı, birinci taraf değil).

4.2’deki tarayıcı `LOCAL_DEV` + `.nip.io` izin **kapatıldı** (`BROWSER_REBIND_DENIED`).

Güvenli backend proxy: tarayıcı istemcileri doğrudan kendi API’ye gider; harici AI/ödeme için proxy **yok** (istenmeden açılmadı).

---

## 5. Gizli / dolaylı / bağımlılık / alternatif yollar

| Yol | Durum |
| --- | --- |
| Node ham `fetch` (`server/` dışı kapı) | Yok (test kanıtı) |
| `BUZZARD_EGRESS_EXTRA_HOSTS` joker/AI/ödeme/IP | 4.2’de süzülür |
| `HTTP_PROXY` / `HTTPS_PROXY` | Hedef URL yine `evaluateEgress`; undici proxy **platforma bağlı** — canlı kanıt yok |
| Redirect takip | `redirect: "manual"`; 3xx → `REDIRECT_DENIED`, ikinci `fetch` yok |
| Upstash Redis | `guardedFetch`; `*.upstash.io` allowlist’te değil → canlı REST **red** (operatör host onayı yok) |
| Python `intelligence/` | `urllib` / `requests` — **Node kapısı yok** (ayrı yığın) |
| `intelligence/live_connectors/{amazon,ebay,google_ads,public_fetch}` | Ham `requests` |
| `intelligence/buzzard_intelligence/gateway.py:174` | `requests.post` |
| `intelligence/buzzard_ki_gesamt/server/lib/intelligenceBridge.js:61` | Kopya yığında ham `fetch` |
| Operatör `scripts/*.mjs` | Kapı dışı; deploy/canlı çağrı bu turda çalıştırılmadı |
| `exports/` | Arşiv kopyaları; taramada atlandı |
| npm SDK (openai/stripe/axios) | Kök kilitte yok |

---

## 6. Senaryo testleri (birim — canlı DNS/resolver yok)

| Senaryo | Sunucu | Tarayıcı | Canlı ağ |
| --- | --- | --- | --- |
| `http://` | `HTTPS_REQUIRED` | CSP `upgrade-insecure-requests` | birim |
| Port ≠ 443 | `PORT_DENIED` | politika host tabanlı | birim |
| `user:pass@` | `URL_USERINFO_DENIED` | — | birim |
| 127.0.0.1 / 10/8 / 192.168 / 172.16 | `PRIVATE_OR_IP_DENIED` | 127 LOCAL_DEV (yalnızca düz localhost) | birim |
| `169.254.169.254` metadata | `PRIVATE_OR_IP_DENIED` | `BROWSER_REBIND_DENIED` | birim |
| `metadata.google.internal` | `PRIVATE_OR_IP_DENIED` | `BROWSER_HOST_DENIED` | birim |
| IPv6 `[::1]` / `fe80::` / `2001:db8::` | red / `PRIVATE_OR_IP_DENIED` | rebind veya deny | birim |
| `127.0.0.1.nip.io` / sslip / localtest | `isRebindLookalike` → private | `BROWSER_REBIND_DENIED` | birim; **gerçek DNS çözümü BLOCKED** |
| 302 → Anthropic (4.2) | `REDIRECT_DENIED`, takip yok | — | sahte fetch |
| 302 → Stripe (4.3) | `REDIRECT_DENIED`, takip yok | — | sahte fetch |
| EXTRA_HOSTS + proxy + AI/ödeme | kilit korunur | `BROWSER_FORBIDDEN_HOST` | birim |
| Allowlist dışı host | `HOST_NOT_ALLOWLISTED` | `BROWSER_HOST_DENIED` | birim |

DNS değişikliği / gerçek rebinding (TTL, A/AAAA flip) **çözülmedi** → **BLOCKED**.

---

## 7. `guardedFetch` atlanamaz mı?

`server/` üretim JS: tek ham `fetch` `egressGuard.js:36`. Köprüler, Redis, tedarikçi, ödeme entegrasyonu `guardedFetch` kullanır.

**Atlanabilir yerler (kabul, gizlenmedi):**

1. Tarayıcı `lib/**` / `components/**` — Node kapısı yok.  
2. Python intelligence / live_connectors.  
3. Operatör scriptleri.  
4. `intelligence/buzzard_ki_gesamt` kopya köprü.  
5. Node yerleşik undici proxy env (hedef yine değerlendirilir; kanıt yok).

---

## 8. Render / WAF

`render.yaml`: web servis, Frankfurt, disk, env bayrakları. **firewall / WAF / ipAllowList alanı yok.**

Render Dashboard, Cloudflare, GitHub org firewall, canlı paket yakalama: bu ortamda **erişim yok**.

**Kanıt durumu: BLOCKED.** Yapılandırılmış gibi gösterilmedi. Madde 15 `realEnvironmentVerification` = BLOCKED.

---

## 9–11. Kilitler ve tedarikçi

- Anthropic / OpenAI / Google AI: sunucu `FORBIDDEN_AI_*`; tarayıcı `FORBIDDEN` + suffix; CSP’de yok.  
- Stripe / PayPal: `PAYMENT_EGRESS_LOCKED`; tarayıcı yasak; `paymentService` disabled; satış kapalı.  
- Tedarikçi: `guardedFetch` + dry-run; canlı host eklenmedi.

---

## 12. Değişen dosyalar (küçük, geri alınabilir)

- `server/lib/security/egressPolicy.js` — `isRebindLookalike` (nip.io, sslip, localtest, `127.0.0.1` gömülü, `localhost.`)  
- `lib/security/browserConnect.js` + `.ts` — ayrı tarayıcı politikası  
- `server/__tests__/egress43.test.mjs`  
- `package.json` `test:master-ecosystem` + egress43  
- `docs/MASTER_COMMAND/SPECIAL_16_TASKS.json` madde 15 test listesi  
- bu rapor  

Vitrin/taxonomy/`lib/**/client.ts` gövdesi **değiştirilmedi**.

---

## Test kanıtı

**18/18 geçti** (1 Kasım 2026, **22:00 Europe/Berlin**):

- egress43: 5  
- egress42: 4  
- remainingLocks: 4  
- Esat: 5  

Başarısız test: **yok**.

Başarısız *canlı* doğrulamalar (test değil, kapsam):

1. Render/WAF içerik listesi — erişim yok → **BLOCKED**.  
2. Gerçek DNS rebinding / AAAA flip — resolver yok → **BLOCKED**.  
3. `HTTP_PROXY` undici davranışı — platform kanıtı yok → **BLOCKED**.  
4. Tarayıcı 134 `fetch` satırı kapıya bağlı değil — politika var, sargı yok → **PARTIAL**.  
5. Python yığını Node kapısının dışında → **PARTIAL**.

---

## 16 madde

Hepsi planda duruyor. Egress (15) birim+kod: `CODE_READY`. Canlı: **BLOCKED**. `COMPLETE` yok.

Vergi ödemesi, satış, merge, deploy yapılmadı. Onay bekleniyor. Push yapılmayacak.
