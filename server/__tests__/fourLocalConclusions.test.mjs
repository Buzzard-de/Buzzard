import { createRequire } from "node:module";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const controlCenter = require("../lib/controlCenter");
const { createDurableTaskQueue } = require("../lib/pusat/durableTaskQueue");
const { db } = require("../lib/db");
const { isSotActive } = require("../lib/productSot");

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("session stays on the bearer channel", () => {
  it("stores the account token in sessionStorage and does not write a cookie", () => {
    const source = readFileSync(path.join(repoRoot, "lib/store/client.ts"), "utf8");
    expect(source).toContain('const ACCOUNT_TOKEN_KEY = "buzzard_account_token"');
    expect(source).toContain("sessionStorage.setItem(ACCOUNT_TOKEN_KEY, token)");
    expect(source).not.toContain("localStorage.setItem(ACCOUNT_TOKEN_KEY");
    expect(source).not.toContain("document.cookie");
  });
});

describe("the two approval stores do not write each other", () => {
  it("keeps an admin decision in core_approvals and an agent request in orch_approvals", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "buzzard-approvals-"));
    const queue = createDurableTaskQueue({ dbPath: path.join(dir, "orch.sqlite") });
    const admin = controlCenter.createApproval({
      taskId: `admin-${randomBytes(3).toString("hex")}`,
      reason: "admin-only",
      riskLevel: "HIGH",
    });
    const agent = queue.submitApproval({
      taskId: `agent-${randomBytes(3).toString("hex")}`,
      action: "READ",
      requestedBy: "pricing_ai",
      risk: "LOW",
    });
    expect(db.prepare("SELECT status FROM core_approvals WHERE id = ?").get(admin.id).status).toBe("PENDING");
    expect(queue.listApprovals().some((row) => row.id === admin.id)).toBe(false);
    expect(db.prepare("SELECT id FROM core_approvals WHERE id = ?").get(agent.item.id)).toBeUndefined();
    expect(controlCenter.decideApproval(admin.id, "approve", "pricing_ai")).toBeNull();
    expect(db.prepare("SELECT status FROM core_approvals WHERE id = ?").get(admin.id).status).toBe("PENDING");
    expect(queue.decideApproval({ id: agent.item.id, approved: true, actorId: "pricing_ai" }).code).toBe("PERMISSION_DENIED");
    expect(queue.getApproval(agent.item.id).status).toBe("WAITING_APPROVAL");
    queue.close();
  });
});

describe("existing commerce and catalog endpoints", () => {
  let api;
  beforeAll(async () => {
    api = await startIsolatedApi({
      roles: ["administrator"],
      env: { BUZZARD_SALES_ENABLED: "0", BUZZARD_TEST_MODE: "1" },
    });
  }, 60_000);
  afterAll(async () => {
    if (api) await api.stop();
  });

  it("does not accept a cookie as an admin session", async () => {
    const login = await api.request("POST", "/api/admin/login", {
      body: { email: api.accounts.administrator.email, password: api.accounts.administrator.password },
    });
    expect(login.status).toBe(200);
    expect(login.json.token).toBeTruthy();
    expect(login.headers.get("set-cookie")).toBeNull();
    const cookieOnly = await api.request("GET", "/api/admin/me", {
      headers: { cookie: `buzzard_admin_token=${login.json.token}` },
    });
    expect(cookieOnly.status).toBe(401);
    const bearer = await api.request("GET", "/api/admin/me", { token: login.json.token });
    expect(bearer.status).toBe(200);
  });

  it("refuses to publish a product to ACTIVE while sales are off, and leaves SoT inactive", async () => {
    const token = await api.login("administrator");
    const created = await api.request("POST", "/api/admin/pim-core/products", {
      token,
      body: {
        sku: `PUB-${randomBytes(3).toString("hex")}`,
        title: "Publish gate",
        price: 12.5,
        stock: 4,
        status: "READY",
        currency: "EUR",
      },
    });
    expect(created.status).toBe(201);
    const id = created.json.product.id;
    const published = await api.request("PATCH", `/api/admin/pim-core/products/${id}`, {
      token,
      body: { status: "ACTIVE" },
    });
    expect(published.status).toBe(400);
    expect(published.json.message).toMatch(/ACTIVE status not allowed/);
    const stored = new Database(path.join(api.root, "catalog.sqlite"), { readonly: true });
    const row = stored.prepare("SELECT status FROM pim_core_products WHERE id = ?").get(id);
    stored.close();
    expect(row.status).toBe("READY");
    expect(isSotActive()).toBe(false);
  });

  it("writes the server price snapshot and ignores the client price", async () => {
    const token = await api.login("administrator");
    const created = await api.request("POST", "/api/admin/pim-core/products", {
      token,
      body: {
        sku: `SNAP-${randomBytes(3).toString("hex")}`,
        title: "Snapshot",
        price: 12.5,
        stock: 4,
        status: "READY",
        visibility: "PUBLIC",
        currency: "EUR",
      },
    });
    const productId = created.json.product.id;
    const registered = await api.request("POST", "/api/auth/register", {
      body: {
        email: `snap-${randomBytes(3).toString("hex")}@isolated.example`,
        password: `Pw-${randomBytes(9).toString("base64url")}-4k`,
        name: "Snapshot",
      },
    });
    expect(registered.status).toBe(201);
    const customerId = String(registered.json.user.id);
    const cart = await api.request("POST", "/api/commerce/cart", {
      token: registered.json.token,
      body: { customerId },
    });
    expect(cart.status).toBe(200);
    const added = await api.request("POST", `/api/commerce/cart/${cart.json.cart.id}/items`, {
      token: registered.json.token,
      body: { productId, quantity: 2, customerId },
    });
    expect(added.status).toBe(200);
    const line = added.json.items[0];
    expect(line.priceSnapshot).toBe(12.5);
    expect(line.unitPrice).toBe(12.5);
    const tamper = await api.request("POST", `/api/commerce/cart/${cart.json.cart.id}/items`, {
      token: registered.json.token,
      body: { productId, quantity: 1, customerId, clientPrice: 1 },
    });
    expect(tamper.status).toBe(400);
    expect(tamper.json.errorKey || tamper.json.error).toBe("price_tampering");
  });

  it("refuses a tokenless finance intent, a guest order, and a supplier order", async () => {
    const finance = await api.request("POST", "/api/payments-finance/intents", {
      body: { amount: 10, currency: "EUR" },
    });
    expect(finance.status).toBe(401);
    expect(JSON.stringify(finance.json)).not.toMatch(/captured":true|realMoneyMovement":true/);

    const guest = await api.request("POST", "/api/orders", {
      body: { lines: [{ sku: "X", qty: 1 }] },
    });
    expect([401, 403]).toContain(guest.status);

    const supplier = await api.request("POST", "/api/supplier-integration-hub/orders", {
      body: { supplierCode: "ic", buzzardOrderNumber: "BZ-LIVE" },
    });
    expect([401, 403]).toContain(supplier.status);
    const token = await api.login("administrator");
    const adminSupplier = await api.request("POST", "/api/supplier-integration-hub/orders", {
      token,
      body: { supplierCode: "ic", buzzardOrderNumber: "BZ-LIVE" },
    });
    expect(adminSupplier.status).toBe(403);
    expect(adminSupplier.json.realMoneyMovement).not.toBe(true);
    const stored = new Database(path.join(api.root, "catalog.sqlite"), { readonly: true });
    const orders = stored.prepare("SELECT COUNT(*) n FROM supih_orders").get();
    stored.close();
    expect(orders.n).toBe(0);
  });
});
