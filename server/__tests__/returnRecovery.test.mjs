import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

function loadEngine() {
  return require("../core/returnRecovery/index.js");
}

function baseCase(overrides = {}) {
  return {
    orderId: `ORD-${crypto.randomBytes(3).toString("hex")}`,
    orderLineId: `LINE-${crypto.randomBytes(3).toString("hex")}`,
    productId: "prod-brake-pad",
    supplierId: "supplier-dry",
    supplierOrderId: "SO-123",
    reason: "WRONG_PRODUCT_SENT",
    unitPrice: 100,
    quantity: 1,
    currency: "EUR",
    customerShippingRefund: 0,
    ...overrides,
  };
}

describe("Return Recovery Engine", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_PAYMENTS_ENABLED = "0";
    process.env.BUZZARD_PAYMENTS_FINANCE = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "0";
    const engine = loadEngine();
    engine.__resetForTests();
  });

  it("1. creates return case", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-create-1" });
    expect(rc.id).toMatch(/^rc_/);
    expect(rc.status).toBe("REQUESTED");
    expect(rc.orderId).toBeTruthy();
  });

  it("2. prevents duplicate return for same order line", () => {
    const engine = loadEngine();
    const body = baseCase();
    engine.createReturnCase(body, { idempotencyKey: "idem-dup-1" });
    expect(() =>
      engine.createReturnCase(body, { idempotencyKey: "idem-dup-2" })
    ).toThrow(/already exists/i);
  });

  it("3. calculates customer refund separately", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(
      baseCase({ unitPrice: 80, customerShippingRefund: 10, deductionAmount: 5 }),
      { idempotencyKey: "idem-refund-calc" }
    );
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    const { customerRefund } = engine.calculateRefundForCase(rc.id);
    expect(customerRefund.productRefundAmount).toBe(80);
    expect(customerRefund.shippingRefundAmount).toBe(10);
    expect(customerRefund.deductionAmount).toBe(5);
    expect(customerRefund.totalRefundAmount).toBe(85);
  });

  it("4. calculates supplier recovery", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase({ reason: "SUPPLIER_ERROR" }), {
      idempotencyKey: "idem-sup-calc",
    });
    const recovery = engine.calculateSupplierRecovery(rc);
    expect(recovery.liability).toBe("SUPPLIER");
    expect(recovery.totalExpectedRecovery).toBeGreaterThan(0);
  });

  it("5. customer refund is not equal to supplier refund by default", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(
      baseCase({
        reason: "CUSTOMER_CHANGE_OF_MIND",
        unitPrice: 120,
        customerShippingRefund: 15,
        supplierRefundAmount: 50,
      }),
      { idempotencyKey: "idem-neq" }
    );
    const customer = engine.calculateCustomerRefund(rc);
    const supplier = engine.calculateSupplierRecovery(rc);
    expect(customer.totalRefundAmount).not.toBe(supplier.totalExpectedRecovery);
    expect(customer.totalRefundAmount).toBe(135);
    expect(supplier.liability).toBe("CUSTOMER");
  });

  it("6. supplier recovery stays pending until confirmed", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-pending" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-1" });
    const claim = engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-1" });
    expect(claim.status).toBe("SUPPLIER_LIVE_DISABLED");
    expect(claim.diagnosticOnly).toBe(true);
    const updated = engine.getReturnCase(rc.id);
    expect(updated.supplierRecoveryConfirmed).toBe(0);
    expect(updated.supplierRecoveryStatus).toBe("PENDING");
  });

  it("7. confirms supplier recovery", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-confirm" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-2" });
    engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-2" });
    const result = engine.confirmSupplierRecovery(
      rc.id,
      { type: "REFUND", confirmedAmount: 80, reference: "SR-001" },
      { idempotencyKey: "confirm-1" }
    );
    expect(result.confirmedAmount).toBe(80);
    expect(result.returnCase.supplierRecoveryConfirmed).toBe(80);
  });

  it("8. supports partial supplier recovery", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase({ unitPrice: 120 }), {
      idempotencyKey: "idem-partial",
    });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "DAMAGED", resellable: false });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-3" });
    engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-3" });
    engine.confirmSupplierRecovery(
      rc.id,
      { type: "REFUND", confirmedAmount: 70 },
      { idempotencyKey: "confirm-partial" }
    );
    const reconciled = engine.reconcileReturn(engine.getReturnCase(rc.id));
    expect(reconciled.customerRefund).toBe(120);
    expect(reconciled.supplierRecoveryConfirmed).toBe(70);
    expect(reconciled.unrecoveredAmount).toBe(50);
  });

  it("9. handles credit note flow when verified", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-cn" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-4" });
    engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-4" });
    const result = engine.confirmSupplierRecovery(
      rc.id,
      {
        type: "CREDIT_NOTE",
        confirmedAmount: 80,
        reference: "CN-2026-001",
        verified: true,
      },
      { idempotencyKey: "cn-verify" }
    );
    expect(result.returnCase.creditNotes?.[0]?.creditNoteStatus).toBe("VERIFIED");
    expect(result.returnCase.supplierRecoveryConfirmed).toBe(80);
  });

  it("10. rejects duplicate credit note", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-dup-cn" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-5" });
    engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-5" });
    engine.confirmSupplierRecovery(
      rc.id,
      { type: "CREDIT_NOTE", confirmedAmount: 80, reference: "CN-DUP", verified: true },
      { idempotencyKey: "cn-1" }
    );
    expect(() =>
      engine.confirmSupplierRecovery(
        rc.id,
        { type: "CREDIT_NOTE", confirmedAmount: 80, reference: "CN-DUP", verified: true },
        { idempotencyKey: "cn-2" }
      )
    ).toThrow(/Duplicate credit note/);
  });

  it("11. assigns supplier liability for supplier error", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase({ reason: "SUPPLIER_ERROR" }), {
      idempotencyKey: "idem-liab-sup",
    });
    expect(rc.supplierLiability).toBe("SUPPLIER");
    expect(rc.decisionStatus).toBe("RESOLVED");
  });

  it("12. assigns customer liability for change of mind", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase({ reason: "CUSTOMER_CHANGE_OF_MIND" }), {
      idempotencyKey: "idem-liab-cust",
    });
    expect(rc.supplierLiability).toBe("CUSTOMER");
    expect(rc.customerLiability).toBe("CUSTOMER");
  });

  it("13. marks unknown liability for product defect", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase({ reason: "PRODUCT_DEFECT" }), {
      idempotencyKey: "idem-liab-unknown",
    });
    expect(rc.supplierLiability).toBe("UNKNOWN");
    expect(rc.decisionStatus).toBe("REVIEW_REQUIRED");
  });

  it("14. requires inspection before refund calculation", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-insp-req" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    expect(() => engine.calculateRefundForCase(rc.id)).toThrow(/Inspection required/);
  });

  it("15. marks resellable product after inspection", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-resell" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    const inspected = engine.inspectReturn(rc.id, { condition: "NEW", resellable: true });
    expect(inspected.inspection.resellable).toBe(true);
  });

  it("16. marks non-resellable product after inspection", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-non-resell" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    const inspected = engine.inspectReturn(rc.id, {
      condition: "NOT_RESALEABLE",
      resellable: false,
    });
    expect(inspected.inspection.resellable).toBe(false);
  });

  it("17. tracks return shipping fields", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(
      baseCase({
        returnShippingCost: 12.5,
        returnShippingPaidBy: "CUSTOMER",
        returnLabelRequired: true,
        returnLabelProvider: "DHL",
      }),
      { idempotencyKey: "idem-ship" }
    );
    expect(rc.returnShippingCost).toBe(12.5);
    expect(rc.returnShippingPaidBy).toBe("CUSTOMER");
    expect(rc.returnLabelRequired).toBe(true);
  });

  it("18. blocks customer refund execution when payments OFF", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-pay-gate" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    const result = engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-blocked" });
    expect(result.blocked).toBe(true);
    expect(result.status).toBe("REFUND_EXECUTION_BLOCKED");
    expect(result.refundInstruction.execution).toBe("BLOCKED");
  });

  it("19. blocks supplier live API when disabled", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-sup-gate" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-6" });
    const claim = engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-gate" });
    expect(claim.diagnosticOnly).toBe(true);
    expect(claim.claim.status).toBe("SUPPLIER_LIVE_DISABLED");
  });

  it("20. payment gate reflects disabled state", () => {
    const engine = loadEngine();
    expect(engine.isPaymentsEnabled()).toBe(false);
    expect(engine.assertRefundExecutionAllowed().blocked).toBe(true);
  });

  it("21. idempotency replays create return", () => {
    const engine = loadEngine();
    const key = "idem-replay-create";
    const a = engine.createReturnCase(baseCase(), { idempotencyKey: key });
    const b = engine.createReturnCase(
      baseCase({ orderId: "OTHER", orderLineId: "OTHER" }),
      { idempotencyKey: key }
    );
    expect(a.id).toBe(b.id);
    expect(b.idempotencyReplay).toBe(true);
  });

  it("22. writes audit log entries", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-audit" });
    engine.approveReturn(rc.id);
    const audit = engine.listAuditForCase(rc.id);
    expect(audit.some((e) => e.action === "RETURN_CREATED")).toBe(true);
    expect(audit.some((e) => e.action === "RETURN_APPROVED")).toBe(true);
    expect(JSON.stringify(audit)).not.toContain("apiKey");
  });

  it("23. RBAC permissions exist for returns", () => {
    const { can, PERMISSIONS } = require("../lib/rbac.js");
    expect(can("admin", "returns.read")).toBe(true);
    expect(can("order_manager", "returns.refund")).toBe(true);
    expect(can("read_only", "returns.write")).toBe(false);
    expect(PERMISSIONS.admin.includes("returns.close")).toBe(true);
  });

  it("24. reconciles with confirmed recovery only", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase({ unitPrice: 100 }), {
      idempotencyKey: "idem-recon",
    });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-7" });
    engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-recon" });
    const beforeConfirm = engine.reconcileReturn(engine.getReturnCase(rc.id));
    expect(beforeConfirm.supplierRecoveryExpected).toBe(100);
    expect(beforeConfirm.supplierRecoveryConfirmed).toBe(0);
    expect(beforeConfirm.unrecoveredAmount).toBe(100);
    engine.confirmSupplierRecovery(
      rc.id,
      { type: "REFUND", confirmedAmount: 80 },
      { idempotencyKey: "confirm-recon" }
    );
    const afterConfirm = engine.reconcileReturn(engine.getReturnCase(rc.id));
    expect(afterConfirm.unrecoveredAmount).toBe(20);
    expect(afterConfirm.buzzardNetImpact).toBe(20);
  });

  it("25. prevents double recovery booking for same claim idempotency", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-no-double" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-8" });
    engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-no-double" });
    const first = engine.confirmSupplierRecovery(
      rc.id,
      { type: "REFUND", confirmedAmount: 50 },
      { idempotencyKey: "confirm-no-double" }
    );
    const second = engine.confirmSupplierRecovery(
      rc.id,
      { type: "REFUND", confirmedAmount: 50 },
      { idempotencyKey: "confirm-no-double" }
    );
    expect(first.returnCase.id).toBe(second.returnCase.id);
    expect(second.idempotencyReplay).toBe(true);
  });

  it("26. safety status keeps publish/sales off", () => {
    const engine = loadEngine();
    const safety = engine.getSafetyStatus();
    expect(safety.salesEnabled).toBe(false);
    expect(safety.paymentsEnabled).toBe(false);
    expect(safety.supplierLiveEnabled).toBe(false);
    expect(safety.diagnosticOnly).toBe(true);
  });

  it("27. does not auto-activate stock or publish", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-no-publish" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    const inspected = engine.inspectReturn(rc.id, { condition: "NEW", resellable: true });
    expect(inspected.stockReactivated).toBeUndefined();
    expect(inspected.published).toBeUndefined();
  });

  it("28. supplier connector remains dry-run", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-dry-sup" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-req-9" });
    const claim = engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "claim-dry" });
    expect(claim.claim?.diagnosticOnly || claim.diagnosticOnly).toBe(true);
  });

  it("29. payment connector remains dry-run", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(baseCase(), { idempotencyKey: "idem-dry-pay" });
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id);
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true });
    engine.calculateRefundForCase(rc.id);
    const refund = engine.requestCustomerRefund(rc.id, { idempotencyKey: "ref-dry" });
    expect(refund.blocked).toBe(true);
    expect(refund.refundInstruction.execution).toBe("BLOCKED");
  });

  it("30. full integration flow", () => {
    const engine = loadEngine();
    const rc = engine.createReturnCase(
      baseCase({
        reason: "WRONG_PRODUCT_SENT",
        unitPrice: 100,
        supplierShippingRecovery: 5,
      }),
      { idempotencyKey: "flow-create" }
    );
    engine.approveReturn(rc.id);
    engine.receiveReturn(rc.id, { returnTrackingNumber: "RET-TRACK-1" });
    engine.inspectReturn(rc.id, { condition: "RESELLABLE", resellable: true, inspectedBy: "qa@test" });
    engine.calculateRefundForCase(rc.id);
    const refundReq = engine.requestCustomerRefund(rc.id, { idempotencyKey: "flow-refund" });
    expect(refundReq.blocked).toBe(true);
    const claim = engine.createSupplierRecoveryClaim(rc.id, { idempotencyKey: "flow-claim" });
    expect(claim.diagnosticOnly).toBe(true);
    engine.confirmSupplierRecovery(
      rc.id,
      { type: "REFUND", confirmedAmount: 80, reference: "SUP-REF-1" },
      { idempotencyKey: "flow-confirm" }
    );
    const { reconciliation } = engine.reconcileReturnCase(rc.id);
    expect(reconciliation.customerRefund).toBe(100);
    expect(reconciliation.supplierRecoveryConfirmed).toBe(80);
    expect(reconciliation.unrecoveredAmount).toBe(20);
    const closed = engine.closeReturnCase(rc.id);
    expect(closed.status).toBe("CLOSED");
  });
});
