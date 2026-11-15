# Kabul test raporu

**Ortam:** izole Cloud Agent, production yazma yok.  
**Saat dilimi:** Europe/Berlin.

Command 3: `docs/MASTER_COMMAND/2026-11-05-mc3/BUZZARD_ACCEPTANCE_TEST_REPORT.md`  
Command 2: `docs/MASTER_COMMAND/2026-11-05/BUZZARD_ACCEPTANCE_TEST_REPORT.md`

| Komut | Ortam | Tarih | Sonuç | Not |
| --- | --- | --- | --- | --- |
| vitest master-ecosystem | yerel Node | 5 Kas 2026, 07:17 Europe/Berlin | **77/77** | routing include sonrası +3 |
| `vitest lib/i18n/routing.test.ts` | yerel | 07:18 | **3/3** | 30 prefix |
| `python3 intelligence/security/test_egress.py` | yerel | 07:18 | **6/6** | |
| Playwright egress | localhost:3001 | 07:19 | **2/2** | request API |
| Playwright Chromium vitrin | — | 07:20 | BLOCKED | browser binary yok |
| `next lint` | yerel | 07:19 | geçti | |
| `tsc --noEmit` | yerel | 07:19 | geçti | |
| `npm run build` | yerel | 07:19 | geçti | `/pl/` vb. export; retired slug yok |
| `npm audit` / security-check | yerel | 07:19 | 16 CVE + 2 uyarı | force upgrade yok |

Canlı: Render WAF, DNS rebind, TLS pin, Phone, Tax API, sanctions, offsite backup → **BLOCKED**.
