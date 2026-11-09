# Egress / ağ denetimi

Default DENY korundu. Allowlist genişlemedi.

Doğrulanan: IPv4/IPv6/mapped, private, loopback, metadata, multicast, extraHosts wildcard red, proxy env strip, redirect her hop DENY, DNS fail → bağlanma yok, policy fail-closed.

Claude / Stripe / PayPal kod+health flag kapalı.

Ham yollar: `browserFetch.ts` native fetch (evaluate sonrası). Python `urllib` research/archive — canlı araştırma iddiası yok. Axios/XHR/WS taraması boş.

WAF: ayrı rapor, BLOCKED.
