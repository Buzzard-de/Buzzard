# Egress 4.2 — tedarikçi ve doğrudan ağ denetimi

**Zaman:** 1 Kasım 2026, 21:50 Europe/Berlin  
**Dal:** `cursor/egress-42-supplier-c293`  
**Taban:** `cursor/special-16-command-c293` @ `52ba2c2b`  
**Push / merge / deploy / satış / Stripe-PayPal:** yapılmadı  

Uygulama testleri **canlı firewall değildir**. Gerçek ağ/firewall doğrulama: **BLOCKED**.

## Envanter — sunucu çıkışı

| Dosya | Satır (yaklaşık) | İstemci | Sınıf | 4.2 sonrası |
| --- | --- | --- | --- | --- |
| `server/lib/security/egressGuard.js` | fetch | tek izinli çıkış | kapı | `redirect: manual`; 3xx takip yok |
| `server/lib/supplier/realSupplierConnector.js` | ~237 | fetch | tedarikçi | `guardedFetch`; dry-run varsayılan |
| `server/lib/redisClient.js` | REST | guardedFetch | altyapı | 4.1’den beri kapıda |
| `server/lib/intelligenceBridge.js` | guardedFetch | iç | kapıda |
| `server/lib/guardianBridge.js` | guardedFetch | iç | kapıda |
| `server/lib/orchestratorBridge.js` | guardedFetch | iç | kapıda |
| `server/lib/commercialIntegrations.js` | Stripe/PayPal | ödeme | `EGRESS_DENIED` / `PAYMENT_EGRESS_LOCKED` |
| `server/server.js` | `http.createServer` | **giriş** | sunucu; çıkış değil |
| axios / `https.request` / `http.get` (server/) | — | yok | — |

Tedarikçi XML/CSV: `feedFormat` env; HTTP gövdesi `fetchWithRetry` ile. Ayrı XML istemcisi yok.

## Envanter — tarayıcı / aynı köken (sunucu egress değil)

`lib/**/client.ts` (admin, sipariş, PIM, lojistik, …) `fetch` ile kendi API. Node egress kapısından geçmez. Risk: tarayıcı kullanıcısı. Bu turda yeniden yazılmadı.

`realSupplierConnector` dry-run + `REAL_SUPPLIER_LIVE_IMPORT` kapalı kalırsa ağ yok. Canlı URL allowlist’te değilse `supplier_egress_denied`. **Tedarikçi host’u listeye eklenmedi** (onaysız genişletme yok). Canlı import için operatör host onayı gerekir — işlev kırılmaz, dry-run durur.

## Değişen dosyalar

- `server/lib/security/egressPolicy.js` — HTTPS, 443, userinfo, private/loopback/link-local/metadata/IP, ödeme host her zaman kilit, extra host wildcard/IP/AI/ödeme red
- `server/lib/security/egressGuard.js` — redirect takip yok
- `server/lib/supplier/realSupplierConnector.js` — guardedFetch
- `server/__tests__/egress42.test.mjs` — yeni
- bu rapor

## Test

**28/28 geçti** (1 Kasım 2026, **21:48 Europe/Berlin**): egress42 4, remainingLocks 4, special16 6, Esat 5, ecosystemSecurity 9. Başarısız yok.

Engellenen senaryolar (birim):

- `http://`  
- port ≠ 443  
- `user:pass@`  
- 127.0.0.1, 10/8, 192.168/16, 169.254.169.254, localhost  
- 302 → `api.anthropic.com` takip edilmez  
- `EXTRA_HOSTS=*.openai.com,api.stripe.com` + `HTTP_PROXY` yine AI/ödeme kilit  

DNS rebinding canlı çözülmedi (gerçek resolver yok) → **BLOCKED** (yalnızca IP/localhost birim).

## Kalan risk

- `lib/**` tarayıcı fetch  
- Python `intelligence/` ayrı yığın  
- Render/WAF kanıtı yok  
- Tedarikçi canlı host allowlist’te değil  
- Node `HTTP_PROXY` undici davranışı platforma bağlı; hedef URL yine değerlendirilir  

16 madde kapsam dışı bırakılmadı. Vergi/satış/ödeme kapalı.
