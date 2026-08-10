# Buzzard Soft Launch — Agent-Ready Checklist

This document lists everything implemented in code for a **catalog-mode soft launch** (no real sales, no new products). Prices and checkout remain disabled until you explicitly enable them.

## Current mode

| Setting | Value | Effect |
|---------|-------|--------|
| `NEXT_PUBLIC_SALES_ENABLED` | `0` | No prices in UI, no checkout/cart header |
| `BUZZARD_SALES_ENABLED` | `0` | API rejects live payment capture |
| Product catalog | 15 demo products | Fixed demo set — no new SKUs added |

## What is ready (code complete)

### Storefront
- Product detail pages with **reviews UI** (`ProductReviews`) wired to `/api/reviews-ratings/*`
- **Advanced search autocomplete** in header (API + local fallback)
- **hreflang/canonical fix** — no double-domain alternate URLs
- Sales gate unchanged — catalog mode only

### Backend
- **Unified coupons** via `server/lib/coupons.js` (SQLite + fallback, codes: `WELCOME10`, `BUZZARD5`)
- **Stripe Checkout Session** adapter (fetch-based, activates when `STRIPE_SECRET_KEY` is set)
- **PayPal order** adapter (activates when PayPal credentials are set)
- Integration status endpoint: `GET /api/admin/integrations`

### Operations
- `node scripts/db-backup.mjs` — SQLite backup
- `node scripts/sync-search-index.mjs` — sync existing catalog → `srch_products`
- `node scripts/smoke-core.mjs` — extended API smoke tests
- `node scripts/render-preflight.mjs` — Render deploy checks

## What still needs you

| Item | Why |
|------|-----|
| Render API live | Deploy `buzzard-api` on Render (Dashboard or `RENDER_API_KEY`) |
| Persistent disk (paid) | Free tier resets SQLite on redeploy — set `BUZZARD_DB_PATH=/var/data/buzzard.db` |
| `STRIPE_SECRET_KEY` | Real payments (keep sales OFF until ready) |
| PayPal credentials | Optional second payment method |
| Cloudflare DNS | Point `buzzard24.de` / protect origin |
| Supplier / TecDoc | Real catalog beyond 15 demo products |

## Enable sales (when ready — do NOT do this for soft launch)

1. Set `BUZZARD_SALES_ENABLED=1` on Render API
2. Set `NEXT_PUBLIC_SALES_ENABLED=1` in GitHub Pages deploy workflow
3. Configure `STRIPE_SECRET_KEY` (+ webhook secret)
4. Run full checkout test on staging first

## Quick verification

```bash
# Local
npm run dev:all
node scripts/sync-search-index.mjs
node scripts/smoke-core.mjs

# Production frontend (catalog mode)
curl -sI https://buzzard24.de/ | head -1

# Production API (when deployed)
curl -s https://buzzard-api.onrender.com/api/health
```

## Coupon codes (demo)

| Code | Type | Value | Min. order |
|------|------|-------|------------|
| WELCOME10 | percent | 10% | €30 |
| BUZZARD5 | fixed | €5 | €50 |

Coupons validate in checkout flow but **cannot complete real purchases** while sales mode is off.
