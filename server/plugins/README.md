# Buzzard API Plugins

Dieser Ordner enthält Plugins für die lokale Buzzard API.

## Struktur

- `plugins/` enthält einzelne Plugin-Module.
- Jedes Plugin exportiert eine `register(app)` Funktion.

## Beispiel

```js
module.exports = {
  register(app) {
    app.get('/api/hello', (req, res) => {
      res.json({ message: 'Hello from plugin' });
    });
  }
};
```

## Kontakt-Speicher-Plugin

Das Projekt enthält jetzt ein Plugin, das Kontaktanfragen speichert:

- `POST /api/contact` speichert alle Anfragen in `server/data/submissions.json`
- `GET /api/submissions` gibt alle gespeicherten Anfragen zurück

## Product Data Plugin

Das Projekt enthält jetzt ein Produktdaten-Plugin mit folgenden Endpunkten:

- `GET /api/plugin/products` — listet alle Produkte
- `GET /api/plugin/products/:id` — zeigt Details zu einem Produkt

## SQLite Database Plugin (v0.3)

The `databasePlugin.js` module adds a SQLite-backed commerce API using `better-sqlite3`:

- Database file: `server/data/buzzard.db` (auto-created and seeded)
- Disable with `BUZZARD_DB_ENABLED=0`

Auth and catalog:

- `POST /api/auth/register` — register customer (JWT)
- `POST /api/auth/login` — login (JWT)
- `GET /api/me` — current SQLite user profile
- `GET /api/categories` — list categories
- `GET /api/products` — list products (`?q=`, `?category=`)
- `GET /api/products/:id` — product detail
- `POST /api/cart/items`, `GET /api/cart`, `DELETE /api/cart/items/:productId`

SQLite orders and admin (prefixed to avoid conflicts with JSON checkout):

- `POST /api/db/orders` — create order from authenticated cart
- `GET /api/db/orders` — list authenticated user's SQLite orders
- `GET /api/db/admin/orders` — admin order list (JWT admin role)
- `GET /api/db/admin/products` — admin product list
- `PATCH /api/db/admin/products/:id` — update product
- `POST /api/db/admin/shipments` — create mock shipment
- `GET /api/db/status` — SQLite backend status
- `GET /api/orders` — v0.4 alias for authenticated order list (JWT)

Environment variables:

- `JWT_SECRET` or `AUTH_SECRET` — JWT signing secret
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — bootstrap admin user
- `BUZZARD_DB_ENABLED=1` — enable SQLite plugin (default)

See `server/docs/schema-notes.md` for production schema expansion notes.

## Commercial Integrations Plugin (v0.5)

The `commercialIntegrationsPlugin.js` module adds production-oriented adapter boundaries:

- `GET /api/admin/integrations` — credential/config status (admin auth)
- `POST /api/payments/session` — Stripe/PayPal/Klarna adapter boundary
- `POST /api/shipping/label` — DHL/DPD/GLS/UPS label adapter boundary
- `POST /api/tax/quote` — VAT/tax calculation boundary
- `GET /api/fx/rate` — exchange-rate boundary
- `POST /api/suppliers/import` — supplier feed import boundary
- `POST /api/tecdoc/compatibility` — TecDoc compatibility boundary
- `POST /api/dropship/forward` — dropshipping order forwarding boundary
- `POST /api/webhooks/:provider` — webhook stub (501 until configured)

Disable with `BUZZARD_COMMERCIAL_INTEGRATIONS=0`. Adapter logic lives in `server/lib/commercialIntegrations.js`.

## Plugin hinzufügen

Neue Plugins kannst du so anlegen:

1. Erstelle eine Datei in `server/plugins/`, z. B. `myPlugin.js`
2. Exportiere die `register(app)` Funktion:

```js
module.exports = {
  register(app) {
    app.get('/api/plugin/example', (req, res) => {
      res.json({ message: 'Example plugin response' });
    });
  }
};
```

3. Starte den Server neu. Das Plugin wird automatisch geladen.
