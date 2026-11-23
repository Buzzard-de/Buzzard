import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_ROUTE_TABLE } from "./support/adminRouteTable.mjs";
import { ALL_ROLES, startIsolatedApi } from "./support/isolatedApi.mjs";
import { tempDataDir } from "./support/freshServerLib.mjs";

const require = createRequire(import.meta.url);
const { can } = require("../lib/rbac.js");
const { ADMIN_MODULE_PREFIX, ADMIN_OPERATIONS, BACK_OFFICE_RECORDS, PUBLIC_ROUTES, WEBHOOK_ROUTES } = require("../lib/routePermissions.js");
const Database = require("better-sqlite3");

const WRITE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const key = (route) => `${route.method} ${route.path}`;
const concrete = (routePath) =>
  routePath
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "x1" : segment))
    .join("/");

/**
 * POST routes that a read permission may call: they compute a report or run a
 * dry run and change no business data (verified below against the database).
 */
const DIAGNOSTIC_POSTS = new Set([
  "POST /api/admin/release/validate",
  "POST /api/admin/release/final-validate",
  "POST /api/admin/release/final-go-live/validate",
  "POST /api/admin/release/final-prelaunch/validate",
  "POST /api/admin/release/final-operational-readiness/validate",
  "POST /api/admin/release/final-launch-governance/validate",
  "POST /api/admin/release/final-control-recovery/validate",
  "POST /api/admin/release/final-prelaunch-control/validate",
  "POST /api/admin/release/final-launch-control/validate",
  "POST /api/admin/release/final-production-governance/validate",
  "POST /api/admin/operations/part27-validate",
  "POST /api/admin/catalog/product-quality/evaluate",
  "POST /api/admin/suppliers/:id/validate",
  "POST /api/admin/suppliers/:id/dry-run",
]);

/**
 * Every write route that has no back-office policy, with the reason it may
 * exist. A new write route without an entry here fails the suite.
 *
 *   customer   the handler requires the signed-in customer (anonymous → 401, back-office session → 401/403)
 *   signed-in  any signed-in identity, for its own record or a calculation only (anonymous → 401)
 *   auth       sign-in, sign-up and password recovery; public by nature, rate limited and locked per account
 *   guest      guest action of the storefront; validated input, rate limited, no access to other people's data
 *   gated      would create an order or payment; refused while sales are locked
 */
const OTHER_WRITES = {
  "POST /api/account/register": "auth",
  "POST /api/account/login": "auth",
  "POST /api/account/logout": "auth",
  "POST /api/account/password-reset/request": "auth",
  "POST /api/account/password-reset/confirm": "auth",
  "POST /api/auth/register": "auth",
  "POST /api/auth/login": "auth",
  "POST /api/identity-security/auth/register": "auth",
  "POST /api/identity-security/auth/verify-email": "auth",
  "POST /api/identity-security/auth/login": "auth",
  "POST /api/identity-security/auth/refresh": "auth",
  "POST /api/identity-security/auth/password-reset-request": "auth",
  "POST /api/identity-security/auth/password-reset": "auth",

  "PUT /api/account/profile": "customer",
  "POST /api/account/addresses": "customer",
  "PUT /api/account/addresses/:id": "customer",
  "DELETE /api/account/addresses/:id": "customer",
  "PUT /api/account/wishlist": "customer",
  "POST /api/account/wishlist/toggle": "customer",
  "PUT /api/account/preferences": "customer",
  "POST /api/account/deletion-request": "customer",
  "POST /api/account/orders/:orderNumber/returns": "customer",
  "PUT /api/customer/crm/profile": "customer",
  "POST /api/customer/loyalty/redeem": "customer",
  "POST /api/customer/cart/abandoned": "customer",
  "POST /api/customer/cart/recovered": "customer",
  "POST /api/customer/addresses": "customer",
  "PATCH /api/customer/addresses/:id": "customer",
  "DELETE /api/customer/addresses/:id": "customer",
  "POST /api/customer/wishlist/:productId": "customer",
  "DELETE /api/customer/wishlist/:productId": "customer",
  "POST /api/customer/reviews": "customer",
  "PUT /api/customer/checkout/draft": "customer",
  "POST /api/customer/notifications/:id/read": "customer",
  "POST /api/customer/support/tickets": "customer",
  "POST /api/customer/support/tickets/:id/messages": "customer",
  "POST /api/customer/email/inbound/process": "guest",
  "POST /api/customer/email/inbound/batch": "guest",
  "PATCH /api/me": "customer",
  "POST /api/cart/items": "customer",
  "PATCH /api/cart/items/:productId": "customer",
  "PUT /api/cart/sync": "customer",
  "DELETE /api/cart/items/:productId": "customer",
  "POST /api/db/orders": "customer",
  "PATCH /api/db/admin/products/:id": "customer",
  "PATCH /api/db/admin/orders/:orderNumber/status": "customer",
  "POST /api/db/admin/shipments": "customer",
  "POST /api/identity-security/auth/logout": "customer",
  "PATCH /api/identity-security/account": "customer",
  "POST /api/identity-security/account/addresses": "customer",
  "DELETE /api/identity-security/account/addresses/:id": "customer",
  "POST /api/identity-security/account/2fa/setup": "customer",
  "POST /api/identity-security/account/2fa/disable": "customer",
  "POST /api/identity-security/privacy/request": "customer",
  "POST /api/logistics-fulfillment/returns": "signed-in",
  "POST /api/returns-rma/returns": "customer",
  "POST /api/payments/session": "signed-in",
  "POST /api/tax/quote": "signed-in",

  "POST /api/advanced-search/:sku/click": "guest",
  "POST /api/ai/chat": "guest",
  "POST /api/ai/phone/verify-order": "guest",
  "POST /api/ai/phone/order-status": "guest",
  "POST /api/ai/phone/escalate": "guest",
  "POST /api/cart/abandoned": "guest",
  "POST /api/analytics/events": "guest",
  "POST /api/cart-checkout/carts": "signed-in",
  "POST /api/cart-checkout/carts/:token/items": "signed-in",
  "PATCH /api/cart-checkout/carts/:token/items/:sku": "signed-in",
  "POST /api/cart-checkout/carts/:token/coupon": "signed-in",
  "POST /api/orders/dry-rehearsal": "guest",
  "POST /api/marketplace/connectors/:id/publish": "gated",
  "POST /api/storefront/textile/sandbox/session": "guest",
  "POST /api/cart-checkout/sessions/:token/validate": "signed-in",
  "POST /api/commerce/cart": "signed-in",
  "POST /api/commerce/cart/:id/items": "signed-in",
  "PATCH /api/commerce/cart/:id/items/:itemId": "signed-in",
  "DELETE /api/commerce/cart/:id/items/:itemId": "signed-in",
  "POST /api/commerce/cart/:id/clear": "signed-in",
  "POST /api/commerce/cart/:id/validate": "signed-in",
  "POST /api/commerce/coupons/validate": "guest",
  "POST /api/commerce/cart/:id/coupon": "signed-in",
  "DELETE /api/commerce/cart/:id/coupon": "signed-in",
  "POST /api/commerce/checkout/start": "signed-in",
  "POST /api/commerce/checkout/:id/validate": "signed-in",
  "POST /api/commerce/checkout/:id/complete": "signed-in",
  "POST /api/commerce/checkout/attempt": "signed-in",
  "POST /api/tecdoc/compatibility": "guest",
  "POST /api/contact": "guest",
  "POST /api/customer/coupons/validate": "guest",
  "POST /api/customer/checkout/quote": "guest",
  "POST /api/checkout/quote": "guest",
  "POST /api/marketing-center/conversion": "guest",
  "POST /api/marketing-center/events": "guest",
  "POST /api/marketing-loyalty/campaigns/:code/apply": "guest",
  "POST /api/reviews-ratings/reviews": "guest",
  "POST /api/reviews-ratings/reviews/:id/helpful": "guest",
  "POST /api/reviews-ratings/reviews/:id/report": "guest",

  "POST /api/cart-checkout/sessions": "gated",
  "POST /api/cart-checkout/sessions/:token/complete": "gated",
  "POST /api/intelligence/storefront/cart": "gated",
  "POST /api/intelligence/storefront/cart/:cartId/items": "gated",
  "POST /api/intelligence/storefront/cart/:cartId/checkout": "gated",
  "POST /api/orders": "gated",


};

/** Records that could be read by id without a session before this sprint. */
const FORMERLY_OPEN_READS = [
  "/api/crm-customer-service/customers/1",
  "/api/crm-customer-service/tickets/TCK-1",
  "/api/order-management/orders/BZ-1",
  "/api/order-management/customer/1/orders",
  "/api/returns-rma/returns/RMA-1",
  "/api/marketing-loyalty/1",
  "/api/marketing-loyalty/preferences/1",
];

/** Routes guarded by a back-office session (as opposed to public routes and signed webhooks). */
const backOffice = (route) => Boolean(route.policy && !route.policy.public && !route.policy.webhook);

let api;
let inventory;
const tokens = {};
const matrix = [];

async function call(route, token, body = {}) {
  const init = { token };
  if (WRITE.has(route.method)) init.body = body;
  const res = await api.request(route.method, concrete(route.path), init);
  return { status: res.status, errorKey: res.json?.errorKey ?? res.json?.error ?? res.json?.code ?? null };
}

function tableCounts(dbFile) {
  const db = new Database(dbFile, { readonly: true });
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
    const counts = {};
    for (const { name } of tables) {
      if (/audit|_log|_logs|security_event|rate_limit|metric|telemetry/i.test(name)) continue;
      counts[name] = db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n;
    }
    return counts;
  } finally {
    db.close();
  }
}

beforeAll(async () => {
  const root = tempDataDir("inventory");
  const out = path.join(root, "routes.json");
  mkdirSync(path.join(root, "data"), { recursive: true });
  execFileSync(process.execPath, [fileURLToPath(new URL("./support/routeInventory.cjs", import.meta.url)), out], {
    env: { ...process.env, BUZZARD_DATA_DIR: path.join(root, "data"), BUZZARD_DB_PATH: path.join(root, "catalog.sqlite"), BUZZARD_E2E_DB: "1", NODE_ENV: "test" },
    stdio: "pipe",
  });
  inventory = JSON.parse(readFileSync(out, "utf8"));

  api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
  for (const role of ALL_ROLES) {
    const account = api.accounts[role];
    const res = await api.request("POST", "/api/admin/login", { body: { email: account.email, password: account.password } });
    expect(res.status, `login ${role}`).toBe(200);
    tokens[role] = res.json.token;
  }
}, 120_000);

afterAll(async () => {
  if (process.env.BUZZARD_ROUTE_MATRIX_OUT && matrix.length) {
    writeFileSync(process.env.BUZZARD_ROUTE_MATRIX_OUT, JSON.stringify(matrix, null, 1));
  }
  await api?.stop();
});

describe("route table", () => {
  it("lists exactly the registered back-office routes outside /api/admin", () => {
    const expected = inventory
      .filter(
        (route) =>
          ADMIN_MODULE_PREFIX.some((entry) => route.path.startsWith(entry.prefix)) ||
          key(route) in ADMIN_OPERATIONS ||
          key(route) in BACK_OFFICE_RECORDS
      )
      .map(key)
      .sort();
    expect(ADMIN_ROUTE_TABLE.map(([method, route]) => `${method} ${route}`).sort()).toEqual(expected);
  });

  it("has 79 routes that the first patch closed and 16 that this sprint closed", () => {
    expect(ADMIN_ROUTE_TABLE.filter((row) => row[5] === "closed-2026-11-17")).toHaveLength(79);
    expect(ADMIN_ROUTE_TABLE.filter((row) => row[5] === "closed-2026-11-18")).toHaveLength(16);
    expect(ADMIN_ROUTE_TABLE).toHaveLength(102);
  });

  it("matches the central policy and the read/write class of every row", () => {
    for (const [method, route, permission, kind] of ADMIN_ROUTE_TABLE) {
      const registered = inventory.find((entry) => entry.method === method && entry.path === route);
      expect(registered.policy, `${method} ${route}`).toEqual({ permission });
      expect(kind, `${method} ${route}`).toBe(WRITE.has(method) ? "write" : "read");
    }
  });
});

describe.each(ADMIN_ROUTE_TABLE)("%s %s (%s, %s)", (method, routePath, permission, kind, group, since) => {
  const route = { method, path: routePath };

  it("refuses anonymous, forged and signed-out callers and applies the permission to every role", async () => {
    const row = { method, path: routePath, group, since, authentication: "admin session", permission, class: kind, results: {} };

    const anonymous = await call(route, null);
    expect(anonymous).toEqual({ status: 401, errorKey: "admin.auth.required" });
    row.results.anonymous = anonymous.status;

    const forged = await call(route, "f".repeat(64));
    expect(forged).toEqual({ status: 401, errorKey: "admin.auth.required" });
    row.results.invalidToken = forged.status;

    for (const role of ALL_ROLES) {
      const result = await call(route, tokens[role]);
      row.results[role] = result.status;
      if (can(role, permission)) {
        expect(result.status, `${role} holds ${permission}`).not.toBe(401);
        // A 403 here may only be a business lock of the handler, never the permission check.
        if (result.status === 403) expect(result.errorKey, role).not.toBe("admin.auth.forbidden");
      } else {
        expect(result, `${role} lacks ${permission}`).toEqual({ status: 403, errorKey: "admin.auth.forbidden" });
      }
    }

    if (kind === "write" && !permission.endsWith(".read")) expect(row.results.read_only).toBe(403);
    matrix.push(row);
  });
});

describe("every route with a back-office policy", () => {
  it("is refused without a session, and with a session that lacks the permission", async () => {
    const guarded = inventory.filter(backOffice);
    expect(guarded.length).toBeGreaterThanOrEqual(474);
    const failures = [];
    for (const route of guarded) {
      const anonymous = await call(route, null);
      if (anonymous.status !== 401) failures.push(`${key(route)} anonymous → ${anonymous.status}`);
      for (const role of ALL_ROLES) {
        if (!route.policy.permission || can(role, route.policy.permission)) continue;
        const result = await call(route, tokens[role]);
        if (result.status !== 403) failures.push(`${key(route)} ${role} → ${result.status}`);
      }
    }
    expect(failures).toEqual([]);
  }, 300_000);

  it("covers everything under /api/admin and /api/security/admin except sign-in and sign-out", () => {
    const open = inventory
      .filter((route) => route.path.startsWith("/api/admin/") || route.path.startsWith("/api/security/admin"))
      .filter((route) => !route.policy || route.policy.public)
      .map(key)
      .sort();
    expect(open).toEqual(["POST /api/admin/login", "POST /api/admin/login/2fa", "POST /api/admin/logout"]);
  });

  it("lists as public only health, status and sign-in routes", () => {
    for (const entry of PUBLIC_ROUTES) {
      expect(entry, entry).toMatch(
        /^(GET \/api\/(health(\/[a-z0-9-]+)?|status|categories\/visibility|catalog\/health|storefront\/health|commerce\/(status|readiness|shipping\/methods)|security\/health|p1\/status)|POST \/api\/admin\/(login|login\/2fa|logout))$/
      );
    }
  });
});

describe("the read-only role", () => {
  it("reaches no write route except the listed dry-run diagnostics", async () => {
    const reached = [];
    for (const route of inventory.filter((entry) => WRITE.has(entry.method) && backOffice(entry))) {
      const result = await call(route, tokens.read_only);
      if (result.status !== 403 && result.status !== 401) reached.push(key(route));
    }
    // The barcode lookup is a POST that only reads (logistics.read).
    expect(reached.sort()).toEqual([...DIAGNOSTIC_POSTS, "POST /api/wms-inventory/scan"].sort());
  }, 120_000);

  it("changes no business table through those diagnostics", async () => {
    const dbFile = path.join(api.root, "catalog.sqlite");
    const before = tableCounts(dbFile);
    for (const entry of DIAGNOSTIC_POSTS) {
      const [method, routePath] = entry.split(" ");
      const result = await call({ method, path: routePath }, tokens.read_only, { records: [{ sku: "SYN-1", name: "Synthetic" }], limit: 1 });
      expect(result.status, entry).toBeLessThan(500);
    }
    expect(tableCounts(dbFile)).toEqual(before);
  }, 120_000);

  it("cannot change its own password without the current one", async () => {
    const result = await call({ method: "POST", path: "/api/admin/account/password" }, tokens.read_only, { newPassword: "Whatever-Value-2026-x" });
    expect(result).toEqual({ status: 401, errorKey: "admin.auth.invalid" });
  });
});

describe("webhook routes", () => {
  it("are behind the signature gate, where no session of any role is a credential", async () => {
    const webhooks = inventory.filter((route) => route.policy?.webhook);
    expect(webhooks.map(key).sort()).toEqual(Object.keys(WEBHOOK_ROUTES).sort());
    expect(webhooks).toHaveLength(8);
    for (const route of webhooks) {
      for (const token of [null, ...ALL_ROLES.map((role) => tokens[role])]) {
        const result = await call(route, token);
        // This instance has no webhook secrets: the gate refuses before anything else.
        expect(result, key(route)).toEqual({ status: 503, errorKey: "webhook.notConfigured" });
      }
    }
  });
});

describe("write routes without a back-office policy", () => {
  const unguardedWrites = () => inventory.filter((route) => WRITE.has(route.method) && !route.policy);

  it("are all classified, and nothing classified has disappeared", () => {
    expect(unguardedWrites().map(key).sort()).toEqual(Object.keys(OTHER_WRITES).sort());
  });

  it("refuse anonymous callers where the customer has to be signed in, and an admin session is not a customer", async () => {
    const failures = [];
    for (const route of unguardedWrites().filter((entry) => OTHER_WRITES[key(entry)] === "customer")) {
      const anonymous = await call(route, null);
      if (anonymous.status !== 401) failures.push(`${key(route)} anonymous → ${anonymous.status}`);
      const withAdmin = await call(route, tokens.read_only);
      if (withAdmin.status !== 401 && withAdmin.status !== 403) failures.push(`${key(route)} read_only admin → ${withAdmin.status}`);
    }
    expect(failures).toEqual([]);
  }, 120_000);

  it("refuse anonymous callers where any signed-in identity may act for itself", async () => {
    for (const route of unguardedWrites().filter((entry) => OTHER_WRITES[key(entry)] === "signed-in")) {
      expect((await call(route, null)).status, key(route)).toBe(401);
    }
    // A payment session is also refused for a signed-in caller while sales are locked.
    const payment = await call({ method: "POST", path: "/api/payments/session" }, tokens.administrator, { provider: "stripe", amount: 1 });
    expect(payment).toEqual({ status: 403, errorKey: "sales_disabled" });
  });

  it("refuse order and payment creation while sales are locked", async () => {
    for (const route of unguardedWrites().filter((entry) => OTHER_WRITES[key(entry)] === "gated")) {
      const result = await call(route, null);
      expect(result.status, key(route)).toBe(403);
    }
  });

  it("answer guest actions with a client error or a result, never with a server error", async () => {
    for (const route of unguardedWrites().filter((entry) => ["guest", "auth"].includes(OTHER_WRITES[key(entry)]))) {
      const result = await call(route, null);
      expect(result.status, key(route)).toBeLessThan(500);
    }
  }, 120_000);
});

describe("records by id", () => {
  it.each(FORMERLY_OPEN_READS)("GET %s needs a session with orders.read", async (route) => {
    expect((await api.request("GET", route)).status).toBe(401);
    expect((await api.request("GET", route, { token: tokens.ai_agent })).status).toBe(403);
    expect((await api.request("GET", route, { token: tokens.catalog_manager })).status).toBe(403);
    const allowed = await api.request("GET", route, { token: tokens.order_manager });
    expect([200, 404]).toContain(allowed.status);
  });
});
