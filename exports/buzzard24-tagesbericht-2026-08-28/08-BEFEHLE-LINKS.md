# 08 — Befehle & Links

---

## Tests (lokal oder nach Deploy)

```bash
npm run verify:go-live
npm run verify:p1
npm run verify:p1:seo
npm run guardian:self-test
npm run catalog:i18n-fill    # i18n erneut füllen
npm run render:preflight
```

## Live-Checks

```bash
curl https://buzzard24.de/api/health 2>/dev/null || curl https://buzzard-api.onrender.com/api/health
curl https://buzzard-api.onrender.com/api/p1/status
curl https://buzzard-api.onrender.com/api/guardian/status
curl https://buzzard-api.onrender.com/api/orchestrator/status
curl https://buzzard-api.onrender.com/api/p1/i18n/gaps
```

## URLs

| Was | URL |
|-----|-----|
| Website | https://buzzard24.de |
| API | https://buzzard-api.onrender.com |
| Admin | https://buzzard24.de/admin/login/ |
| PR #240 | https://github.com/Buzzard-de/Buzzard/pull/240 |
| PR #239 | https://github.com/Buzzard-de/Buzzard/pull/239 |
| Render | https://dashboard.render.com |

## Kontakt (live)

- E-Mail: info@buzzard24.de
- Telefon: +49 151 26219394
