# Browser / ağ envanteri — Command 3

**Zaman:** 5 Kasım 2026, Europe/Berlin  
**Dal:** `cursor/master-command-unified-c293`

## Browser fetch

| Durum | Konum |
| --- | --- |
| Tek ham `fetch` (kasitli) | `lib/security/browserFetch.ts` (evaluate sonrası native fetch) |
| Taşınan | `lib/**` client/modüller (~46) + `components/admin/AdminSeoPanel.tsx` + `AdminContactSubmissionsPanel.tsx` + vitrin arama |
| Axios / XHR / WebSocket / EventSource / sendBeacon | TS/TSX taramasında **yok** |
| Service Worker | aktif SW dosyası yok (bu tur) |

Kalan ham fetch, Buzzard `/api/*` + `NEXT_PUBLIC_BUZZARD_API_URL` içindir. Kullanıcı host’u yok. Auth: Bearer sessionStorage. CSRF: bearer + same-site, çift cookie token yok.

Risk: token XSS ile okunabilir; CSP + browserConnect host reddi katmanı.

## Python / diğer

| Çıkış | Durum |
| --- | --- |
| `guarded_request` / `requests` | intelligence/security |
| `urllib.request` | research/engine, archive kopyaları — **canlı araştırma BLOCKED**; guarded değilse risk |
| subprocess/curl | bu turda yeni eklenmedi |

## Egress

Fail-closed: dosya/hash/şekil bozuksa allowlist boş, default DENY. AI ve ödeme son ek listesi korunur. Allowlist genişlemedi.
