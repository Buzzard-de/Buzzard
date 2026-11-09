# Güvenlik ve Egress — Command 3

**Zaman:** 5 Kasım 2026, Europe/Berlin  
**4.4 korundu.** Allowlist genişlemedi.

Fail-closed: politika okunamaz / `default !== DENY` → boş allowlist.  
DNS çözülemezse `DNS_RESOLVE_FAILED`, bağlanılmaz.  
Redirect takip edilmez (`REDIRECT_DENIED`).  
Proxy env geçici silinir.

| Katman | Durum |
| --- | --- |
| Kod egress | TESTED yerel |
| BrowserFetch | lib clients sarıldı |
| Chromium E2E | 8/8 yerel |
| WAF / Render outbound | BLOCKED — yalnızca render.yaml |
| TLS pinning | REQUIREMENTS_ONLY |
| DNS rebinding canlı | yapılmadı (lab kod testleri var) |

Claude / Stripe / PayPal kapalı.
