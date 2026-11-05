# Güvenlik ve Egress denetimi

Command 2 güncellemesi: `docs/MASTER_COMMAND/2026-11-05/BUZZARD_SECURITY_AND_EGRESS_AUDIT.md`  
Egress 4.4 korundu; allowlist genişletilmedi; WAF BLOCKED; Playwright request 2/2.

**Dal:** `cursor/master-command-unified-c293`  
**Doğrulanan 4.4:** `71c991ad` + bu tur IPv4-mapped / politika parmak izi.  
**Push/merge/deploy yok.**

## Mimari (korundu)

`data/security/egress_policy.v1.json` DENY. Node `guardedFetch`, Python `guarded_request`. Allowlist genişletilmedi (eBay/Amazon/Stripe/AI yok).

## Bu turda eklenen kontroller

- IPv4-mapped IPv6 (`::ffff:127.0.0.1`, `::ffff:169.254.169.254`) private sayılır.  
- `policyFingerprint()` — politika özeti SHA-256.  
- DNS resolve sonrası private IP hâlâ `RESOLVED_IP_DENIED`.  
- Proxy env strip + Python `trust_env=False`.  
- `lib/ai/client.ts` ve `lib/contact/client.ts` → `browserFetch`.

## Kalan browser

~54 dosya hâlâ ham `fetch` ile **kendi API**. Üçüncü taraf SDK yok. Toplu sargı vitrin riski nedeniyle yapılmadı.

## TLS pinning

**Tasarım, uygulama yok.** Otomatik pin sertifika rotasyonunu kırar. Canlı pin **BLOCKED**. Varsayılan Node/Python TLS doğrulaması açık; pin yok.

## Ağ / WAF

`render.yaml` firewall alanı yok. Dashboard erişimi yok → **BLOCKED**.

## DNS TOCTOU

Resolve sonra hostname ile connect. IP pin yok → **PARTIAL**. Canlı rebind **BLOCKED**.

## Telemetri

Varsayılan rıza false. CSP üçüncü taraf yalnızca `NEXT_PUBLIC_*` doluysa.

## Satış / ödeme

`BUZZARD_SALES_ENABLED` / `NEXT_PUBLIC_SALES_ENABLED` varsayılan 0. Stripe/PayPal egress kilit.

## Claude

Entegre değil. `FORBIDDEN_AI_*` + `assertIndependentRuntime`.

## Bulgular

| ID | Açıklama | Sistem | Risk | Senaryo | Etki | Kontrol | Öneri | Durum | Kanıt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EG-01 | Canlı WAF yok | Render | yüksek | doğrudan çıkış | sızıntı | yalnızca uygulama kapısı | operatör WAF | BLOCKED | render.yaml |
| EG-02 | DNS TOCTOU | Node/Python | orta | resolve sonrası flip | SSRF | resolve check | SNI+IP pin (onay) | PARTIAL | birim |
| EG-03 | Ham browser fetch | lib/** | orta | yanlış API origin | veri | CSP + 6 sargılı istemci | kademeli browserFetch | PARTIAL | tarama |
| EG-04 | Python arşiv requests | intelligence/archive | orta | eski script | çıkış | aktif yollar kapıda | arşivi çalıştırma | PARTIAL | tarama |
| EG-05 | chmod 444 ≠ WORM | backup | yüksek | ransomware | yedek silme | yerel prove | object-lock | BLOCKED | copies32110 |
| EG-06 | CORS `"null"` | server.js | düşük | sandbox origin | CSRF yardımcısı | allowlist | `"null"` kaldır (onay) | PARTIAL | kod |
| EG-07 | CSP unsafe-inline | lib/security.ts | orta | XSS | script | CSP diğer kısıtlar | nonce (ayrı iş) | PARTIAL | kod |
| EG-08 | Telefon yok | voice | düşük | sahte 24/7 | alarm ulaşmaz | liveCalls false | SIP onayı | BLOCKED | voiceReadiness |

Fail-open yok: DNS hatası `DNS_RESOLVE_FAILED`; allowlist dışı red.
