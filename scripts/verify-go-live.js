#!/usr/bin/env node
"use strict";

const { createGoLiveGate } = require("../server/lib/goLiveGate");
const { createGoLiveActivation } = require("../server/lib/goLiveActivation");

function main() {
  const env = {
    ...process.env,
    BUZZARD_PRODUCT_SOT_ACTIVE: process.env.BUZZARD_PRODUCT_SOT_ACTIVE || "0",
    BUZZARD_SALES_ENABLED: process.env.BUZZARD_SALES_ENABLED || "0",
    BUZZARD_SUPPLIER_ORDERS_ENABLED: process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED || "0",
    BUZZARD_PAYMENT_LIVE: process.env.BUZZARD_PAYMENT_LIVE || "0",
  };

  if (env.BUZZARD_SALES_ENABLED === "1" || env.BUZZARD_PRODUCT_SOT_ACTIVE === "1") {
    console.error("GO_LIVE_READINESS: BLOCKED");
    console.error("validator refuses to run while sales or exclusive Product SoT is enabled");
    process.exit(1);
  }

  const gate = createGoLiveGate({ env, productionSafetyLock: true, logAudit: () => {} });
  const report = gate.evaluateGoLive();
  const activation = createGoLiveActivation({ env, mutateEnv: false, productionSafetyLock: true });

  if (activation.getState().state === "ACTIVE") {
    console.error("GO_LIVE_READINESS: BLOCKED");
    console.error("validator must not leave activation ACTIVE");
    process.exit(1);
  }

  const readiness = report.status === "PASS" ? "PASS" : "BLOCKED";
  console.log(`GO_LIVE_READINESS: ${readiness}`);
  console.log(`decision=${report.decision} lifecycle=${report.lifecycle}`);
  console.log(`blockers=${report.blockers.map((row) => row.id).join(",") || "none"}`);
  console.log("PRODUCTION_ACTIVATION=NOT_EXECUTED");
  console.log("SALES_STATE=LOCKED");
  console.log("PRODUCT_SOT_ACTIVE=OFF");
  console.log("SUPPLIER_ORDER_EXECUTION=OFF");
  console.log("PAYMENT_EXECUTION=OFF");
  console.log("MARKETPLACE_WRITE=OFF");
  console.log("PRODUCTION_WRITES=NOT_EXECUTED");
  process.exit(0);
}

main();
