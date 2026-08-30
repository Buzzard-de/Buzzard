# Part 15 — Verkaufs-Readiness (Go-Live Checkliste)

**Stand:** 30. Aug 2026 · **Sales bleiben AUS bis du explizit freigibst**

Dieses Dokument listet alles, was für **echten Verkauf** fehlt. Der Agent aktiviert **niemals** automatisch Sales.

---

## Fortschritt (typisch)

| Phase | ~% |
|-------|-----|
| Katalog live (Part 14) | **95 %** |
| + Code auf main (PR #273) | **+5 %** |
| + Persistente DB live | **+15 %** |
| + Stripe/PayPal in Render | **+10 %** |
| + Verkauf freigeben (manuell) | **100 %** |

Prüfen:

```bash
npm run finish:production
npm run test:part15
```

---

## Blocker (Pflicht vor Verkauf)

### 1. Persistente Datenbank

```bash
npm run verify:db-persistence
# PASS: path=/var/data/buzzard.db, persistent=true
```

**Render Dashboard → buzzard-api:**
- Plan **Starter**
- Disk **1 GB** → `/var/data`
- Env: `BUZZARD_DB_PATH=/var/data/buzzard.db`
- Env: `BUZZARD_BACKUP_DIR=/var/data/backups`
- **Manual Deploy**

Oder mit API-Key:

```bash
RENDER_API_KEY=rnd_... node scripts/setup-production-remaining.mjs --apply
```

GitHub Actions → **Setup Production Remaining** → `apply_render: true`

Guide: `docs/DB_PERSISTENCE_RENDER_DE.md`

### 2. Zahlungen (Stripe / PayPal)

Render → **buzzard-api** → Environment (sync: false in Blueprint):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

**Noch nicht aktivieren:** `BUZZARD_STRIPE_ENABLED=1` erst mit Sales-Freigabe.

### 3. Redis (empfohlen)

Upstash Free → Render:

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
BUZZARD_RATE_LIMIT_STORE=redis
```

---

## Verkauf aktivieren (nur wenn Part 15 PASS)

**Erst wenn** `npm run test:part15` ohne Blocker durchläuft:

### Render (buzzard-api)

```
BUZZARD_SALES_ENABLED=1
BUZZARD_PAYMENT_ENABLED=1
BUZZARD_STRIPE_ENABLED=1   # wenn Stripe
BUZZARD_PAYPAL_ENABLED=1   # wenn PayPal
```

Go-Live Lock im Admin Control Center aufheben (oder `BUZZARD_GO_LIVE_LOCK=0` nur mit Bewusstsein).

### GitHub Pages (Storefront rebuild)

Workflow **Deploy to GitHub Pages** oder Push auf `main` mit:

```
NEXT_PUBLIC_SALES_ENABLED=1
```

(in `.github/workflows/deploy-pages.yml` oder GitHub Variables)

### Nach Freigabe prüfen

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:production-smoke
curl -s https://buzzard-api.onrender.com/api/commerce/status | jq .salesEnabled
```

Erwartung: `true` — nur wenn du bewusst freigegeben hast.

---

## Was der Agent erledigt hat

- PR #273 gemergt (Katalogmodus, keine Demo/Preise/Warenkorb)
- `test:part15` + `finish:production` Scripts
- Disk-Diagnostik in `/api/health/db`
- Blueprint + Setup-Scripts vorbereitet

## Was nur du tun kannst

1. `RENDER_API_KEY` als GitHub Secret
2. Render Disk + Env (oder `--apply`)
3. Stripe/PayPal Secrets in Render
4. Bewusste Sales-Freigabe (siehe oben)

---

## Gate-Matrix

```
PERSISTENT DB     = REQUIRED
BACKUP /var/data  = REQUIRED
PAYMENT SECRETS   = REQUIRED
REDIS             = RECOMMENDED
SALES             = OFF until manual flip
PART 15 SCRIPT    = npm run test:part15
```
