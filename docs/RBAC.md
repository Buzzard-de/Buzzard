# Buzzard RBAC

**Stand:** Part 12 — Global Authorization + Nav Filtering

## Part 12 additions

- Supplier integration hub `POST /orders` requires admin auth (was public)
- Supplier orders require `supplier_order` feature flag — not granted via admin role alone when SALES=0
- AI employees cannot inherit supplier submission permissions from admin realm

## Rollen

Definiert in `server/lib/rbac.js` → `PERMISSIONS`

| Rolle | Wildcard |
|-------|----------|
| administrator / super_admin | `*` |
| admin | Breites Set (users, categories, ai, system, security, …) |
| catalog_manager | products, categories, suppliers, seo, ai.read |
| order_manager | orders, logistics, ai.read |
| staff | Lesen + audit |
| read_only | Nur Lesen |
| ai_agent | ai.read, ai.execute |

## Permission-Format

`resource.action` — z.B. `products.read`, `system.configure`, `security.manage`

## Global Route Map

`server/lib/routePermissions.js`:

- **EXACT** — spezifische Routes (Control Center, AI, …)
- **PREFIX** — `/api/admin/products` → products.read/write
- **Default GET** — authenticated (any admin role)
- **Default WRITE** — system.configure

## Durchsetzung

1. `server.js` → `wrapRouteHandler()` bei Route-Registrierung
2. Plugin-interne Checks (zusätzlich, nicht stattdessen)

## AI Permissions

AI Employees haben eigene Permission-Listen.  
Blockiert für AI: `*`, `system.configure`, `security.manage`, `users.write`, …

Prüfung: `aiCanExecute(employeePermissions, requiredPermission)`

## API

```javascript
const { can, requirePermission } = require("./lib/rbac");
can("read_only", "products.read"); // true
can("read_only", "system.configure"); // false
```

## Nav vs Backend

Admin-Nav wird clientseitig nach Rolle gefiltert (`lib/admin/navPermissions.mjs`).  
Backend blockiert unauthorized Requests weiterhin mit 403 — Nav allein ist kein Schutz.

Audit: `npm run test:rbac-audit`
