#!/usr/bin/env node
"use strict";

const { createExternalIntegrationVerification } = require("../server/lib/externalIntegrationVerification");
const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("../server/lib/sot/sourceOfTruthRegistry");

function main() {
  const env = {
    ...process.env,
    BUZZARD_PRODUCT_SOT_ACTIVE: process.env.BUZZARD_PRODUCT_SOT_ACTIVE || "0",
    BUZZARD_SALES_ENABLED: process.env.BUZZARD_SALES_ENABLED || "0",
    BUZZARD_SUPPLIER_ORDERS_ENABLED: process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED || "0",
    BUZZARD_PAYMENT_LIVE: process.env.BUZZARD_PAYMENT_LIVE || "0",
  };
  const service = createExternalIntegrationVerification({ env, logAudit: () => {} });
  const report = service.getVerificationReport();
  const sot = createSourceOfTruthRegistry({ env });

  if (report.summary.suppliers.FAIL + report.summary.marketplaces.FAIL > 0) {
    console.error("EXTERNAL_INTEGRATION_VERIFICATION: FAIL");
    process.exit(1);
  }
  if (env.BUZZARD_PRODUCT_SOT_ACTIVE === "1" || env.BUZZARD_SALES_ENABLED === "1") {
    console.error("EXTERNAL_INTEGRATION_VERIFICATION: FAIL");
    console.error("safety gates must stay locked during verification");
    process.exit(1);
  }
  try {
    sot.assertWriteAuthority({ entity: ENTITIES.PRICE, actor: ACTORS.PUSAT });
    console.error("EXTERNAL_INTEGRATION_VERIFICATION: FAIL");
    console.error("Pusat write was allowed");
    process.exit(1);
  } catch {
    /* expected */
  }

  const overall =
    report.summary.suppliers.PASS + report.summary.marketplaces.PASS > 0 &&
    report.layers.LIVE_READ_VERIFICATION === "PASS"
      ? "PASS"
      : "CONDITIONAL";

  console.log(`EXTERNAL_INTEGRATION_VERIFICATION: ${overall}`);
  console.log(`suppliers total=${report.summary.suppliers.total} pass=${report.summary.suppliers.PASS} conditional=${report.summary.suppliers.CONDITIONAL} not_configured=${report.summary.suppliers.NOT_CONFIGURED}`);
  console.log(`marketplaces total=${report.summary.marketplaces.total} pass=${report.summary.marketplaces.PASS} conditional=${report.summary.marketplaces.CONDITIONAL}`);
  console.log("PRODUCTION_WRITE_VERIFICATION=NOT_EXECUTED");
  console.log("PRODUCT_SOT_ACTIVE=OFF");
  console.log("SALES=LOCKED");
  process.exit(0);
}

main();
