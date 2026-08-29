#!/usr/bin/env node
/**
 * Part 12 — P1 production hardening smoke tests
 * Does NOT enable sales. Verifies P1 blockers addressed.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const API = (process.env.BUZZARD_API_URL || "http://localhost:3001").replace(/\/$/, "");

let passed = 0;
let failed = 0;
let skipped = 0;
const findings = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    if (err.skip) {
      console.log(`○ ${name} — ${err.message}`);
      skipped += 1;
    } else {
      console.log(`✗ ${name} — ${err.message}`);
      failed += 1;
      findings.push({ name, error: err.message });
    }
  }
}

function skip(msg) {
  const e = new Error(msg);
  e.skip = true;
  throw e;
}

async function fetchJson(pathname, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  console.log(`Part 12 smoke → ${API}\n`);

  // --- DB persistence ---
  await test("DB health exposes persistence metadata", async () => {
    const { res, body } = await fetchJson("/api/health/db");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const persistence = body.database?.persistence || body.persistence;
    if (!persistence?.mode) throw new Error("missing persistence.mode");
    if (!body.database?.path && !body.path) throw new Error("missing path");
  });

  await test("dbPaths module resolves canonical path", async () => {
    const dbPaths = require("../server/lib/dbPaths.js");
    const p = dbPaths.resolveDbPath();
    if (!p.endsWith(".db")) throw new Error(`unexpected path ${p}`);
    const info = dbPaths.getPersistenceInfo(p);
    if (!info.mode) throw new Error("missing mode");
  });

  await test("Backup script exists", async () => {
    for (const script of ["scripts/db-backup.mjs", "scripts/backup-db.mjs", "scripts/restore-db.mjs"]) {
      if (!fs.existsSync(path.join(process.cwd(), script))) throw new Error(`missing ${script}`);
    }
  });

  // --- Supplier security (all paths) ---
  await test("Commerce supplier order blocked", async () => {
    const orderService = require("../server/lib/commerce/orderService.js");
    const result = orderService.submitSupplierOrder("p12_test", {});
    if (result.status !== 403) throw new Error(JSON.stringify(result));
  });

  await test("Legacy fulfillment submitSupplierOrder blocked", async () => {
    const fp = require("../server/lib/fulfillmentPipeline.js");
    const result = fp.submitSupplierOrder({ id: "so_test" }, { active: true, auth_type: "none" });
    if (result.ok !== false || !result.blocked) throw new Error(JSON.stringify(result));
  });

  await test("Legacy fulfillment createFulfillments blocked", async () => {
    const fp = require("../server/lib/fulfillmentPipeline.js");
    const results = fp.createFulfillmentsForOrder(
      { orderNumber: "ORD-P12", lines: [{ productId: 1, sku: "X", quantity: 1 }], shippingAddress: {} },
      new Map([[1, { supplier_id: "SUP-INTERNAL-001" }]])
    );
    if (!results[0]?.blocked) throw new Error(JSON.stringify(results));
  });

  await test("Supplier hub createSupplierOrder blocked", async () => {
    const hub = require("../server/lib/supplierHub.js");
    const result = hub.createSupplierOrder({ supplierId: 1, orderNumber: "ORD-P12" });
    if (result.status !== 403 && !result.blocked) throw new Error(JSON.stringify(result));
  });

  await test("Supplier integration hub createSupplierOrder blocked", async () => {
    const hub = require("../server/lib/supplierIntegrationHub.js");
    const result = hub.createSupplierOrder({ supplierCode: "demo", buzzardOrderNumber: "ORD-P12" });
    if (result.status !== 403 && !result.blocked) throw new Error(JSON.stringify(result));
  });

  await test("Unauthenticated supplier-integration-hub orders denied", async () => {
    const { res } = await fetchJson("/api/supplier-integration-hub/orders", {
      method: "POST",
      body: JSON.stringify({ supplierCode: "demo", buzzardOrderNumber: "ORD-P12" }),
    });
    if (res.status !== 403 && res.status !== 401) {
      throw new Error(`expected 401/403 got ${res.status}`);
    }
  });

  // --- Go-live lock ---
  await test("Go-live lock active", async () => {
    const goLive = require("../server/lib/commerce/goLiveApproval.js");
    if (!goLive.PRODUCTION_SAFETY_LOCK) throw new Error("safety lock off");
    const activation = goLive.canActivateSales();
    if (activation.allowed) throw new Error("canActivateSales allowed");
  });

  await test("salesGuard blocks commercial when SALES=0", async () => {
    const salesGuard = require("../server/lib/commerce/salesGuard.js");
    const block = salesGuard.assertCommercialTransactionAllowed({});
    if (!block?.blocked) throw new Error("expected block");
  });

  // --- Taxonomy ---
  await test("53-category canonical taxonomy valid", async () => {
    const taxonomy = require("../server/lib/taxonomyCanonical.js");
    const validation = taxonomy.validateCanonicalTaxonomy();
    if (!validation.ok) throw new Error(validation.issues.join("; "));
  });

  await test("Taxonomy meta documents 53 authoritative", async () => {
    const meta = require("../server/lib/taxonomyCanonical.js").getTaxonomyMeta();
    if (meta.canonical.count !== 53) throw new Error(`count ${meta.canonical.count}`);
    if (!meta.canonical.authoritative) throw new Error("not authoritative");
  });

  // --- Rate limit ---
  await test("Rate limit store info available", async () => {
    const { body } = await fetchJson("/api/security/health");
    const backend = body.protections?.rateLimitBackend || body.rateLimitBackend;
    if (!backend) throw new Error("missing rateLimitBackend");
  });

  await test("Rate limit test mode helper exists", async () => {
    const rl = require("../server/lib/rateLimitStore.js");
    if (typeof rl.isRateLimitDisabled !== "function") throw new Error("missing isRateLimitDisabled");
  });

  // --- Unified auth ---
  await test("Unified auth facade exports requireAuth", async () => {
    const auth = require("../server/core/auth/index.js");
    if (typeof auth.requireAuth !== "function") throw new Error("missing requireAuth");
    if (typeof auth.authenticate !== "function") throw new Error("missing authenticate");
  });

  // --- Commerce safety (regression) ---
  await test("Commercial checkout attempt blocked", async () => {
    const { res, body } = await fetchJson("/api/commerce/checkout/attempt", {
      method: "POST",
      body: JSON.stringify({ orderType: "COMMERCIAL", idempotencyKey: `p12-${Date.now()}` }),
    });
    if (res.status === 429) skip("rate limited");
    if (!res.ok) throw new Error(`status ${res.status}`);
    if (body.commercialOrders !== 0) throw new Error("commercial orders created");
  });

  await test("SALES=0 via commerce status", async () => {
    const { body } = await fetchJson("/api/commerce/status");
    if (body.flags?.salesEnabled !== false) throw new Error("sales enabled");
  });

  // --- Security events ---
  await test("supplier_order_blocked severity CRITICAL", async () => {
    const { EVENT_SEVERITY } = require("../server/lib/securityLog.js");
    if (EVENT_SEVERITY.supplier_order_blocked !== "CRITICAL") throw new Error("wrong severity");
  });

  console.log(`\nPart 12: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (findings.length) {
    console.log("\nFailures:");
    for (const f of findings) console.log(`  - ${f.name}: ${f.error}`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
