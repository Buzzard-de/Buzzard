#!/usr/bin/env node
/**
 * Return & Recovery Engine smoke test
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

process.env.BUZZARD_SALES_ENABLED = "0";
process.env.BUZZARD_PAYMENTS_ENABLED = "0";
process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";

const engine = require("../server/core/returnRecovery/index.js");
engine.__resetForTests();

const rc = engine.createReturnCase(
  {
    orderId: "SMOKE-ORD-1",
    orderLineId: "SMOKE-LINE-1",
    productId: "prod-smoke",
    supplierId: "supplier-dry",
    reason: "WRONG_PRODUCT_SENT",
    unitPrice: 50,
    quantity: 1,
    currency: "EUR",
  },
  { idempotencyKey: "smoke-create" }
);

engine.approveReturn(rc.id);
engine.receiveReturn(rc.id);
engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
engine.calculateRefundForCase(rc.id);
const refund = engine.requestCustomerRefund(rc.id, { idempotencyKey: "smoke-refund" });
const claim = engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "smoke-claim" });
const safety = engine.getSafetyStatus();

const vitest = spawnSync("npx", ["vitest", "run", "returnRecovery"], {
  stdio: "inherit",
  cwd: new URL("..", import.meta.url).pathname,
});

const ok =
  refund.blocked === true &&
  claim.diagnosticOnly === true &&
  safety.paymentsEnabled === false &&
  vitest.status === 0;

console.log(
  JSON.stringify(
    {
      engine: "return_recovery",
      returnCaseId: rc.id,
      refundBlocked: refund.blocked,
      supplierDiagnosticOnly: claim.diagnosticOnly,
      safety,
      testsPassed: vitest.status === 0,
      ok,
    },
    null,
    2
  )
);

process.exit(ok ? 0 : 1);
