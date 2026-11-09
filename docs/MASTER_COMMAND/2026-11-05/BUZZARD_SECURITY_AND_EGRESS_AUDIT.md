# Güvenlik ve Egress — Command 2

**Zaman:** 5 Kasım 2026, Europe/Berlin  
**Dal:** `cursor/master-command-unified-c293`  
**Commit tabanı:** `97972f58` + bu tur değişiklikleri (commit henüz yazılmadan)

## Korunan 4.4

Ortak `egress_policy.v1.json`, guardedFetch, guarded_request, IPv4-mapped, fingerprint, proxy, redirect, private/metadata. Allowlist genişletilmedi.

## Browser envanter

- `browserFetch` sarılan vitrin/arama/hesap/ticaret istemcileri: inventory v2.
- ~48 modül `client.ts` hâlâ raw `fetch` → Buzzard `/api/*`.
- Kullanıcı girdili host yok (örneklenen dosyalar).
- CSRF: bearer + same-site; çift cookie token yok.

## Ağ

| Kontrol | Durum |
| --- | --- |
| Kod egress | TESTED (yerel) |
| Render/WAF | BLOCKED — canlı yapılandırma yok |
| TLS pinning | REQUIREMENTS_ONLY |
| DNS TOCTOU | kodda resolved-IP kapısı var; canlı kanıt yok |
| Playwright Chromium | BLOCKED (binary yok); request API 2/2 |

## AI / ödeme

Claude yok. Stripe/PayPal kilit. Sales kapalı.
