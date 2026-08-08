# Buzzard Master Implementation

Production-oriented overview of the Buzzard platform after Packages 01–12.

## Architecture

Buzzard is a **Next.js 15 static export storefront** paired with a **Node.js HTTP API** in `server/`.

```
Browser (static HTML/JS)
    ↓ fetch /api/*
server/server.js
    ↓ plugins
server/plugins/*.js
    ↓ lib modules + JSON data stores
data/ + server/data/
```

### Boundaries

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Frontend | `app/`, `components/`, `lib/` | UI, i18n, cart, SEO metadata, marketing events |
| API | `server/server.js`, `server/plugins/` | Auth, orders, logistics, admin, AI, automation |
| Catalog data | `data/buzzard_*.json` | Categories, products, suppliers, shipping |
| Runtime data | `server/data/*.json` | Orders, sessions, fulfillments, automation |
| Admin | `app/admin/` | Operational dashboards |

## Package Dependencies

| Package | Feature | Key paths |
|---------|---------|-----------|
| 01 | Categories | `data/buzzard_categories.json`, `lib/categories/` |
| 02 | Product catalog | `data/buzzard_products.json`, `lib/products/` |
| 03 | Home / navigation | `components/Header.tsx`, mega menu |
| 04 | Checkout / orders | `server/plugins/ordersPlugin.js` |
| 05 | Supplier / admin | `server/plugins/adminCatalogPlugin.js` |
| 06 | Customer account | `server/plugins/customerAccountPlugin.js` |
| 07 | Security | `server/plugins/securityPlugin.js`, `server/lib/security.js` |
| 08 | Multilingual / RTL | `lib/i18n/` (de, en, tr, ar) |
| 09 | Logistics | `server/plugins/logisticsPlugin.js`, fulfillment pipeline |
| 10 | Admin analytics | `server/plugins/analyticsPlugin.js` |
| 11 | SEO / marketing | `lib/seo/`, `lib/marketing/`, sitemap, robots |
| 12 | AI / automation | `server/plugins/aiAutomationPlugin.js`, `components/ai/` |

## Folder Structure

```
app/                 Next.js App Router pages (static export)
components/          React UI (shop, admin, ai, marketing)
lib/                 Shared frontend modules
server/
  server.js          HTTP server entry
  plugins/           Route plugins (auto-loaded)
  lib/               Business logic
  data/              Mutable runtime JSON stores
data/                Master catalog + package specs
styles/              shop.css, admin.css
public/              Static assets, _redirects
```

## Environment Variables

See `.env.example`. Critical groups:

- **Public**: `NEXT_PUBLIC_BUZZARD_API_URL`, `NEXT_PUBLIC_SITE_URL`, marketing IDs
- **Auth**: `AUTH_SECRET`, `SESSION_SECRET`
- **Integrations**: `PAYMENT_PROVIDER_SECRET`, `SUPPLIER_API_SECRET`, SMTP
- **AI / automation**: `BUZZARD_AI_CHAT_ENABLED`, `NEXT_PUBLIC_AI_CHAT_ENABLED`, `BUZZARD_ABANDONED_CART_DELAY_HOURS`
- **Observability**: `ERROR_TRACKING_DSN` (integration hook only)

Never commit production secrets.

## Database Setup

Current implementation uses **JSON file stores** for demo/production bootstrap:

- Catalog: `data/buzzard_products.json`, `data/buzzard_categories.json`
- Runtime: `server/data/orders.json`, sessions, fulfillments, automation

`DATABASE_URL` is reserved for future Postgres migration. Document migrations before switching.

## Authentication

- **Admin**: Bearer token in `Authorization` header → `server/data/admin-sessions.json`
- **Customer**: Same pattern → `server/data/customer-sessions.json`
- **RBAC**: `server/lib/rbac.js` — roles `administrator`, `catalog_manager`, `order_manager`, `read_only`

## AI Services (Package 12)

| Service | Module | Endpoint |
|---------|--------|----------|
| Customer chat | `server/lib/aiChatService.js` | `POST /api/ai/chat` |
| Recommendations | `server/lib/recommendationService.js` | `GET /api/ai/recommendations` |
| Phone assistant | `server/lib/phoneAssistantService.js` | `POST /api/ai/phone/*` |
| Automation | `server/lib/automationEngine.js` | Events from orders/logistics/account |
| Notifications | `server/lib/notificationEngine.js` | Template queue + SMTP hook |

AI chat uses **verified catalog/order lookup only** — no invented stock, prices, or order status. Multilingual: de, tr, en, ar with RTL for Arabic.

Frontend widget: `components/ai/AiChatWidget.tsx` (mounted in `ShopProviders`).

## Automation Events

Idempotent events: `new_order`, `payment_confirmed`, `order_shipped`, `order_delivered`, `low_stock`, `supplier_stock_update`, `supplier_import_failure`, `abandoned_cart`, `new_customer`, `return_request`, `refund`, `review_request`.

Triggers wired in:

- `ordersPlugin.js` — order + payment
- `fulfillmentPipeline.js` — ship + supplier failure
- `logisticsPlugin.js` — delivery, return, refund
- `customerAccountPlugin.js` — registration
- `aiAutomationPlugin.js` — abandoned cart API

Admin: `/admin/automation/` — event log and stats.

## Deployment

### Build

```bash
npm run build
```

Static output in `out/`. API server separate:

```bash
node server/server.js
# or PORT=3001 node server/server.js
```

### Production checklist

See `data/BUZZARD_FINAL_GO_LIVE_CHECKLIST.md`.

### Health checks

- `GET /api/status` — basic liveness
- `GET /api/health` — integrations, data counts, automation stats

## Testing

### End-to-end journey (manual)

1. Browse category → search → product detail
2. Add to cart → checkout → test payment
3. Verify order in admin + customer account
4. Fulfillment / tracking update → delivery → review request event
5. AI chat: product question, order lookup (number + email), escalation
6. All four languages + Arabic RTL

### Security

```bash
npm run security:audit
```

Verify auth, RBAC, rate limits, no secrets in repo.

## Known Limitations

- JSON file storage (not horizontally scalable without migration)
- Payment/supplier integrations run in demo mode without secrets
- AI chat is rule-based by default (`AI_PROVIDER=rules`); LLM hook reserved via env
- Email notifications queue locally unless SMTP configured
- No active backup system unless configured in deployment — see go-live checklist

## Backup / Recovery

Document in deployment runbook:

1. Snapshot `data/` and `server/data/` regularly
2. Store secrets in secret manager only
3. Restore: redeploy build + restore JSON snapshots + verify `/api/health`
