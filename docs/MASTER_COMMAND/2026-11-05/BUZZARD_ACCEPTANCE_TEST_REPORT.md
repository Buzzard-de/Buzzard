# Kabul testleri — Command 2

**Zaman:** 5 Kasım 2026, Europe/Berlin  
**Dal:** `cursor/master-command-unified-c293`

| Komut | Sonuç | Not |
| --- | --- | --- |
| `npm run test:master-ecosystem` | 77/77 | routing.test include sonrası +3 = 80 |
| `python3 intelligence/security/test_egress.py` | 6/6 | |
| Playwright egress | 2/2 | request API; Chromium binary yok |
| Playwright master-command | request tabanlı | Chromium yok → page.goto çalışmaz |
| `npm run lint` | geçti | Widerruf Link |
| `npm run typecheck` | geçti | |
| `npm run build` | geçti | locale klasörleri + retired slug yok |
| `npm audit` | 16 açık | force upgrade yok |
| `scripts/security-check.mjs` | 2 uyarı | frontend audit, contact time-trap |
| Secret scan | ham anahtar yok (kod taraması) | |
| Tam vitrin E2E (hesap/admin/RTL viewport) | BLOCKED | Playwright browser binary |
| Restore drill | BLOCKED | offsite/WORM yok |
