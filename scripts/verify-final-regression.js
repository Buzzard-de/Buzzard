#!/usr/bin/env node
"use strict";

const { createFinalRegressionManifest, assertLockedSafety } = require("../server/lib/finalRegressionManifest");
const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("../server/lib/sot/sourceOfTruthRegistry");
const { createGoLiveGate } = require("../server/lib/goLiveGate");
const { createGoLiveActivation } = require("../server/lib/goLiveActivation");
const { BaseSupplierAdapter } = require("../server/lib/supplier/baseAdapter");
const taxProvider = require("../server/lib/commerce/taxProvider");
const shippingProvider = require("../server/lib/commerce/shippingProvider");

function fail(message) {
  console.error("FINAL_REGRESSION: FAIL");
  console.error(message);
  process.exit(1);
}

function main() {
  const env = {
    ...process.env,
    BUZZARD_PRODUCT_SOT_ACTIVE: process.env.BUZZARD_PRODUCT_SOT_ACTIVE || "0",
    BUZZARD_SALES_ENABLED: process.env.BUZZARD_SALES_ENABLED || "0",
    BUZZARD_SUPPLIER_ORDERS_ENABLED: process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED || "0",
    BUZZARD_PAYMENT_LIVE: process.env.BUZZARD_PAYMENT_LIVE || "0",
  };

  const safety = assertLockedSafety(env);
  const manifest = createFinalRegressionManifest({ env });
  const sot = createSourceOfTruthRegistry({ env });
  const owners = {
    [ENTITIES.PRODUCT]: sot.getWriteOwner(ENTITIES.PRODUCT),
    [ENTITIES.ORDER]: sot.getWriteOwner(ENTITIES.ORDER),
    [ENTITIES.AVAILABILITY]: sot.getWriteOwner(ENTITIES.AVAILABILITY),
    [ENTITIES.PRICE]: sot.getWriteOwner(ENTITIES.PRICE),
  };
  if (owners[ENTITIES.PRODUCT] !== ACTORS.PRODUCT_ENGINE) fail("product owner");
  if (owners[ENTITIES.ORDER] !== ACTORS.ORDER_ENGINE) fail("order owner");
  if (owners[ENTITIES.AVAILABILITY] !== ACTORS.AVAILABILITY_ENGINE) fail("availability owner");
  if (owners[ENTITIES.PRICE] !== ACTORS.PRICING_ENGINE) fail("price owner");
  const unique = new Set(Object.values(owners));
  if (unique.size !== 4) fail("duplicate SoT owners");

  for (const actor of [ACTORS.PUSAT, ACTORS.AI, ACTORS.SUPPLIER, ACTORS.MARKETPLACE]) {
    try {
      sot.assertWriteAuthority({ entity: ENTITIES.PRICE, actor });
      fail(`${actor} wrote Price SoT`);
    } catch (error) {
      if (error.code !== "SOT_WRITE_AUTHORITY_VIOLATION") fail(error.code);
    }
  }

  const adapter = new BaseSupplierAdapter({ id: "reg", name: "reg" });
  if (adapter.ordersEnabled !== false) fail("supplier orders enabled");
  if (!taxProvider.calculateTax({ country: "DE", subtotal: 10 }).dryRun) fail("tax not dry-run");
  if (!shippingProvider.calculateShipping({ country: "DE" }).dryRun) fail("shipping not dry-run");

  const goLive = createGoLiveGate({ env, productionSafetyLock: true }).evaluateGoLive();
  if (goLive.status !== "BLOCKED" || goLive.decision !== "NO_GO") fail("go-live must stay blocked");
  const activation = createGoLiveActivation({ env, mutateEnv: false, productionSafetyLock: true });
  const attempt = activation.activateProduction({ approvalId: null, correlationId: "corr_final_reg" });
  if (attempt.ok || env.BUZZARD_SALES_ENABLED === "1") fail("activation must not enable sales");

  console.log("FINAL_REGRESSION: PASS");
  console.log(`groups=${manifest.groups.length}`);
  console.log(`invariants=${manifest.invariants.length}`);
  console.log(`GO_LIVE_READINESS=${goLive.status}`);
  console.log(`PRODUCTION_ACTIVATION=NOT_EXECUTED`);
  console.log(`SALES_STATE=LOCKED`);
  console.log(`PRODUCT_SOT_ACTIVE=${safety.PRODUCT_SOT_ACTIVE}`);
  console.log(`SUPPLIER_ORDER_EXECUTION=${safety.SUPPLIER_ORDER_EXECUTION}`);
  console.log(`PAYMENT_EXECUTION=${safety.PAYMENT_EXECUTION}`);
  console.log(`MARKETPLACE_WRITE=${safety.MARKETPLACE_WRITE}`);
  console.log(`PRODUCTION_WRITES=${safety.PRODUCTION_WRITES}`);
  process.exit(0);
}

main();
