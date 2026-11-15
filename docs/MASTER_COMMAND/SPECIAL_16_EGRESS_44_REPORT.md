# Egress 4.4 — çok katmanlı ağ güvenliği

**Zaman:** 1 Kasım 2026, 22:32 Europe/Berlin  
**Dal:** `cursor/egress-44-multilayer-c293`  
**Taban:** `cursor/egress-43-verify-c293` @ `d1c637a4`  
**Önceki:** 4.2 `63c7ed11` · 4.3 `d1c637a4` · `SPECIAL_16_EGRESS_43_REPORT.md`  
**Push / merge / deploy / satış / Stripe-PayPal / production restore / canlı firewall değişikliği:** yapılmadı  

**COMPLETE iddia edilmez.** Uygulama testi canlı firewall değildir.

---

## Egress mimarisi

```
                    DENY by default
 data/security/egress_policy.v1.json   (Node + Python ortak)
           │                    │
           ▼                    ▼
 server/lib/security/*     intelligence/security/*
 evaluateEgress            evaluate_egress
 guardedFetch              guarded_request
 DNS lookup → IP check     getaddrinfo → IP check
 redirect: manual          allow_redirects=False
 proxy env stripped        trust_env=False + proxies=None
 Esat + SECURITY_ALERT     EgressDenied
           │
           ▼
 lib/security/browserConnect + browserFetch
 CSP connect-src (telemetry IDs yoksa üçüncü taraf yok)
```

Rollback: bu dalı silmek veya `git revert` ile 4.4 commit’ini geri almak. 4.3 `d1c637a4` durur. Production’a dokunulmadı.

---

## Tam ağ envanteri (özet)

Tarama (`fetch` / `requests` / `urllib` / axios / XHR / WS / EventSource); `node_modules` ve `exports/` hariç.

| Sınıf | Çağrı | Kapı |
| --- | ---: | --- |
| Sunucu Node `server/` | 1 ham `fetch` (`egressGuard.js:36`) | evet |
| Tarayıcı `lib/` + `components/` | 134 orijinal `fetch` + merkezi `browserFetch` | kısmi (4 çekirdek sarıldı) |
| Python live_connectors | ebay / amazon / google_ads / public_fetch | evet |
| Python intelligence gateway + website_monitoring | 2 yol sarıldı | evet |
| Python arşiv / maximal kopyalar | onlarca `urllib`/`requests` | **hayır** (kopya yığın) |
| Operatör `scripts/*.mjs` | ~64 `fetch` | kapı dışı (insan) |
| axios / XHR / WebSocket / EventSource | 0 | — |
| npm openai / stripe / axios | 0 | — |

### Sunucu

| Dosya | Satır | Protokol | Hedef | Veri | Yetki | Kontrol |
| --- | --- | --- | --- | --- | --- | --- |
| `egressGuard.js` | 36 | HTTPS | allowlist | sınıflı payload | sunucu | kapı + DNS + redirect |
| `realSupplierConnector.js` | 237 | HTTPS | tedarikçi URL | feed/ping | dry-run | guardedFetch; host listede değil |
| `redisClient.js` | 26 | HTTPS | Upstash REST | komut | token env | allowlist’te değil → red |
| `*Bridge.js` | 26–77 | HTTPS | iç Render | durum | sunucu | kapı |
| `commercialIntegrations.js` | 34–123 | HTTPS | Stripe/PayPal | ödeme | kilit | `PAYMENT_EGRESS_LOCKED` |
| `server.js` | createServer | HTTP giriş | CORS listesi | — | giriş | çıkış değil |

### Python (aktif yollar)

| Dosya | Önce | Sonra |
| --- | --- | --- |
| `live_connectors/public_fetch.py` | `requests.get` any URL + redirect | `guarded_get` DENY |
| `live_connectors/ebay.py` | `api.ebay.com` | `guarded_*`; host onaylı değil → red |
| `live_connectors/amazon_creators.py` | Amazon token/API | aynı |
| `live_connectors/google_ads.py` | `*.googleapis.com` | AI suffix → `EXTERNAL_AI_EGRESS_DENIED` |
| `buzzard_intelligence/gateway.py` | harici chat POST | `guarded_post` |
| `website_monitoring/.../monitor.py` | any URL + redirect | `guarded_get` |

eBay/Amazon default allowlist’te **yok**. Credential olsa bile ağ kapalı (dry-run/test korunur). Google Ads `googleapis.com` kasıtlı kilit (Google AI ailesi gevşetilmedi).

---

## 134 tarayıcı `fetch` sonucu

Orijinal 61 dosya / 134 çağrı incelendi. Hepsi `NEXT_PUBLIC_BUZZARD_API_URL` / `apiBaseUrl()` + `/api/...`. **Tarayıcıda Stripe/OpenAI SDK yok.**

Sınıflandırma (yol + satır):

| Veri sınıfı | Çağrı | Üçüncü taraf? |
| --- | ---: | --- |
| Kendi Buzzard API | 56 | hayır |
| Admin / PIM / tedarikçi (Authorization) | 40 | hayır |
| Sipariş / sepet / checkout (oturum) | 20 | hayır |
| Birinci taraf analytics API | 10 | hayır |
| Hesap / müşteri / CRM | 7 | hayır |
| Kendi `/api/ai` | 3 | hayır (OpenAI değil) |

**Merkezi katmana taşınan çekirdekler:**  
`lib/commerce/client.ts`, `lib/admin/client.ts`, `lib/account/client.ts`, `lib/store/client.ts` → `browserFetch` → `evaluateBrowserConnect`.

Diğer 50+ istemci hâlâ ham `fetch` ile **aynı kendi API**. Vitrin kırılmasın diye toplu yeniden yazılmadı. Politika + CSP ikinci katman.

Risk: `NEXT_PUBLIC_BUZZARD_API_URL` yanlış origin. `browserFetch` bunu durdurur (çekirdeklerde). Ham `fetch` kalanlarda CSP + CORS.

CSRF: cookie-less `Authorization` bearer (sessionStorage). XSS: CSP `script-src` hâlâ `'unsafe-inline'` → **PARTIAL**. SSRF: tarayıcı kullanıcının tarayıcısından; sunucu kapısı ayrı. API anahtarı tarayıcıda yok (yalnızca `NEXT_PUBLIC_*` ve oturum token).

---

## Üçüncü taraf analitik

`MarketingScripts.tsx`: GTM/GA4 yalnızca `hasAnalyticsConsent`; Meta pixel yalnızca `hasMarketingConsent`. **TikTok inject yok** (ID alanı var, script yok).

Varsayılan env ID’leri boş. 4.4: CSP `connect-src` / `script-src` / `img-src` GA/FB/TikTok’u **yalnızca ilgili `NEXT_PUBLIC_*` doluysa** ekler. `evaluateBrowserConnect` aksi halde `BROWSER_TELEMETRY_OFF`.

Gönderilen veri (ID varsa, rıza sonrası): dataLayer olay adı, `anonymize_ip: true` (GA4). Satın alma/PII: script tarafında kart/IBAN yok; `purchase` olayı isim olarak var (`lib/marketing/events.ts`) — rıza + ID olmadan ağ yok.

Hukuk: rıza deposu `buzzard_consent_v1`; varsayılan analytics/marketing **false**. Canlı KVKK denetimi **BLOCKED**.

CORS: `*` yok; origin yansıması yalnızca allowlist (`server.js` 20–45). `"null"` hâlâ listede → **PARTIAL**.

---

## DNS / proxy / redirect (izole birim)

| Senaryo | Sonuç | Canlı? |
| --- | --- | --- |
| nip.io / sslip / localtest | private | birim |
| Çözülen IP 169.254.169.254 | `RESOLVED_IP_DENIED`, ağ yok | sahte DNS |
| Multicast 224/4, IPv6 `ff` | private | birim |
| 302 → Anthropic / Stripe | `REDIRECT_DENIED` | sahte fetch |
| EXTRA_HOSTS + HTTP_PROXY + AI | kilit | birim |
| Python public_fetch example.com | `HOST_NOT_ALLOWLISTED` | birim |
| Python 302 → Anthropic | `REDIRECT_DENIED` | mock |
| Lookup → bağlan arası TOCTOU | hostname ile connect | **PARTIAL** (IP pin / custom agent yok) |
| Gerçek resolver flip / AAAA | — | **BLOCKED** |
| TLS pin / canlı sertifika | — | **BLOCKED** |
| Host header ≠ bağlantı IP | pin yok | **PARTIAL** |

Üretim sistemine saldırı testi uygulanmadı.

---

## Gözlemlenebilirlik

- `egressAudit()`: url/host/code/classification; token/body yazılmaz.  
- Esat `watchEgress` (AI/ödeme → ISOLATE).  
- Pusat: `exceptionBus` `SECURITY_ALERT` (AI/ödeme red). db yoksa yutulur.  
- Log imza/WORM yok → **PARTIAL**.  
- Python `AUDIT` bellek; Esat’a bağlı değil → **PARTIAL**.

---

## Render / WAF

`render.yaml`: firewall / WAF / ipAllowList **yok**. Dashboard erişimi yok.

**BLOCKED.** Yapılandırılmış gibi gösterilmedi. Canlı değişiklik yok.

---

## Test sonuçları (ayrı)

| Paket | Sonuç | Zaman (Europe/Berlin) |
| --- | --- | --- |
| egress44.test.mjs | 6/6 geçti | 1 Kas 2026, 22:29 |
| egress43.test.mjs | 5/5 geçti | 22:29 |
| egress42.test.mjs | 4/4 geçti | 22:29 |
| esatBey.test.mjs | 5/5 geçti | 22:29 |
| remainingLocks.test.mjs | 4/4 geçti | 22:29 |
| special16Phase4.test.mjs | 6/6 geçti | 22:29 |
| **Node toplam** | **30/30** | |
| `intelligence.security.test_egress` | 6/6 geçti | 22:30 |
| live_connectors registry | geçti | 22:30 |
| Playwright vitrin E2E | **çalıştırılmadı** | PARTIAL |
| Bağımsız dış güvenlik incelemesi | **yok** | BLOCKED |

Başarısız birim testi: **yok**.

---

## Değişen dosyalar

- `data/security/egress_policy.v1.json` — ortak politika  
- `server/lib/security/egressPolicy.js` — JSON + multicast + resolved IP  
- `server/lib/security/egressGuard.js` — DNS, proxy strip, Pusat  
- `intelligence/security/*` — Python kapı + test  
- `intelligence/live_connectors/{public_fetch,ebay,amazon_creators,google_ads}.py`  
- `intelligence/buzzard_intelligence/gateway.py`  
- `intelligence/website_monitoring/connectors/monitor.py`  
- `lib/security/{browserConnect,browserFetch,security.ts}`  
- `lib/{commerce,admin,account,store}/client.ts` — merkezi sargı  
- `server/__tests__/egress4{2,3,4}.test.mjs`  
- `package.json`, `SPECIAL_16_TASKS.json`  
- bu rapor  

Tedarikçi host eklenmedi. Satış/ödeme açılmadı.

---

## BLOCKED / PARTIAL / kalan risk

| Madde | Durum |
| --- | --- |
| Canlı Render/WAF | **BLOCKED** |
| Gerçek DNS rebind / TLS canlı | **BLOCKED** |
| 50+ tarayıcı istemci ham `fetch` | **PARTIAL** |
| Python arşiv / maximal kopyalar | **PARTIAL** |
| Operatör scriptleri | **PARTIAL** |
| DNS TOCTOU (resolve≠connect) | **PARTIAL** |
| CSP `'unsafe-inline'` | **PARTIAL** |
| CORS `"null"` | **PARTIAL** |
| Log WORM / Python→Esat | **PARTIAL** |
| Upstash / tedarikçi canlı host | allowlist dışı (kasıtlı) |
| Madde 15 COMPLETE | **hayır** |

---

## 16 madde

Hepsi planda. Madde 15: birim `TEST_PASSED`, canlı **BLOCKED**, kabul `CODE_READY`. Madde 16 DR dosyalarına dokunulmadı. Hiçbir madde `COMPLETE` değil.

---

## Sonraki aşama (onay sonrası öneri)

1. Kalan `lib/**/client.ts` ham `fetch` → `browserFetch` (küçük gruplar, vitrin regresyon).  
2. Operatör scriptleri için aynı kapı (isteğe bağlı).  
3. Python arşiv yığınlarını çalıştırılmayacak işaretle veya sil.  
4. Canlı WAF kanıtı (Süleyman / Render hesap).  
5. DNS pin (SNI + bağlanılan IP) ancak TLS kırılmadan — ayrı onay.

**Duruldu. Yeni onay bekleniyor.**
