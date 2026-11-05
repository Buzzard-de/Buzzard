# Render / WAF / firewall

**LIVE_VERIFIED:** hayır. **BLOCKED.**

`render.yaml` dört web servisi tanımlar (api, intelligence, orchestrator, guardian). Bu outbound firewall, WAF kuralı veya DNS rebinding koruması kanıtı değildir.

Gereksinim (uygulanmadı):

* Render outbound allowlist (yalnızca buzzard24.de / kendi API).  
* Metadata 169.254.169.254 ve IPv6 link-local ağ reddi.  
* Cloudflare/WAF managed rules + bot.  
* TLS 1.2+, HSTS (edge).  
* Secret’lar dashboard’da; git’te yok.

Canlı hesapta değişiklik yapılmadı.
