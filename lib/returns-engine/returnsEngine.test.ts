import { describe, it, expect, beforeEach } from "vitest";
import {
  createReturnRequest,
  approveReturn,
  createReturnAuthorization,
  createReturnShipment,
  recordReturnReceipt,
  completeReturnInspection,
  prepareSupplierReturn,
  rejectSupplierReturn,
  recordSupplierRecovery,
  calculatePartialRecoveryGap,
  requestCustomerRefund,
  processCustomerRefund,
  recordMarketplaceRefund,
  reconcileReturnFinancials,
  getFinalOrderContribution,
  documentEstimatedVsActual,
  evaluateReturnEligibility,
  openReturnDispute,
  closeReturn,
  getReturnEvents,
  getReturnAuditLog,
  receiveReturnWebhook,
  rejectClientReturnModification,
  getCustomerReturn,
  getReturnsAdminOverview,
  canTransitionReturnStatus,
  seedReturnsEngineFixtures,
  createDeliveredOrder,
  buildReturnInput,
  FIXTURE_PRODUCTS,
  TEST_SUPPLIER_POLICY_NO_RECOVERY,
  TEST_SUPPLIER_ID,
  TEST_CUSTOMER_A,
  TEST_CUSTOMER_B,
  setReturnWindowConfig,
  setSupplierPolicy,
  evaluateReturnInventoryOutcome,
} from "./index";

describe("Returns Engine Foundation", () => {
  beforeEach(() => {
    seedReturnsEngineFixtures();
  });

  describe("Return Model & Creation", () => {
    it("creates return request for delivered order", async () => {
      const orderId = await createDeliveredOrder();
      const result = createReturnRequest(buildReturnInput(orderId));
      expect(result.ok).toBe(true);
      expect(result.returnRequest?.status).toBe("REQUESTED");
      expect(result.returnRequest?.returnNumber).toMatch(/^BZ-RET-/);
    });

    it("rejects ineligible return for wrong customer", async () => {
      const orderId = await createDeliveredOrder();
      const input = buildReturnInput(orderId, { customerId: TEST_CUSTOMER_B });
      const result = createReturnRequest(input);
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("INELIGIBLE");
    });
  });

  describe("Eligibility & Return Window", () => {
    it("evaluates eligible return", async () => {
      const orderId = await createDeliveredOrder();
      const eligibility = evaluateReturnEligibility(buildReturnInput(orderId));
      expect(eligibility.outcome).toBe("eligible");
    });

    it("rejects return outside window", async () => {
      setReturnWindowConfig({ returnWindowDays: 14, bySupplier: { TEST_SUPPLIER_ID: 14 } });
      const orderId = await createDeliveredOrder();
      const { getOrder, saveOrder } = await import("@/lib/order-engine");
      const order = getOrder(orderId)!;
      saveOrder({
        ...order,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      });
      const eligibility = evaluateReturnEligibility(buildReturnInput(orderId));
      expect(eligibility.outcome).toBe("ineligible");
      expect(eligibility.reasonCode).toBe("RETURN_WINDOW_EXPIRED");
    });

    it("requires manual review for OTHER reason", async () => {
      const orderId = await createDeliveredOrder();
      const result = createReturnRequest(
        buildReturnInput(orderId, { reason: "OTHER" })
      );
      expect(result.returnRequest?.status).toBe("UNDER_REVIEW");
    });
  });

  describe("Return Status Machine", () => {
    it("allows valid transitions", () => {
      expect(canTransitionReturnStatus("REQUESTED", "APPROVED")).toBe(true);
      expect(canTransitionReturnStatus("APPROVED", "IN_TRANSIT")).toBe(true);
      expect(canTransitionReturnStatus("REFUNDED", "CLOSED")).toBe(true);
      expect(canTransitionReturnStatus("CLOSED", "REFUNDED")).toBe(false);
    });
  });

  describe("Authorization", () => {
    it("creates return authorization number", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      approveReturn(created.returnRequest!.returnId);
      const auth = createReturnAuthorization(created.returnRequest!.returnId);
      expect(auth?.authorizationNumber).toMatch(/^BZ-RET-AUTH-/);
    });
  });

  describe("Return Shipping", () => {
    it("tracks return shipping paid by Buzzard", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      approveReturn(created.returnRequest!.returnId);
      const shipment = createReturnShipment({
        returnId: created.returnRequest!.returnId,
        carrier: "DHL",
        trackingNumber: "RET123",
        cost: 8.99,
        currency: "EUR",
        payer: "BUZZARD",
      });
      expect(shipment?.payer).toBe("BUZZARD");
    });
  });

  describe("Return Receipt", () => {
    it("represents missing items without silent completion", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      const ret = created.returnRequest!;
      recordReturnReceipt({
        returnId: ret.returnId,
        receivedBy: "warehouse",
        packageCondition: "DAMAGED",
        items: ret.items.map((i) => ({
          returnItemId: i.returnItemId,
          expectedQuantity: i.quantity,
          receivedQuantity: 0,
          itemCondition: "DAMAGED",
        })),
      });
      completeReturnInspection(ret.returnId);
      expect(getReturnEvents(ret.returnId).some((e) => e.type === "RETURN_RECEIVED")).toBe(true);
    });
  });

  describe("Supplier Return", () => {
    it("prepares dry-run supplier return", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      approveReturn(created.returnRequest!.returnId);
      const sr = prepareSupplierReturn(created.returnRequest!.returnId);
      expect(sr?.status).toBe("PREPARED");
      expect(sr?.dryRun).toBe(true);
    });

    it("handles supplier rejection", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      approveReturn(created.returnRequest!.returnId);
      const sr = prepareSupplierReturn(created.returnRequest!.returnId)!;
      rejectSupplierReturn(sr.supplierReturnId);
      expect(getReturnEvents(created.returnRequest!.returnId).some((e) => e.type === "SUPPLIER_RETURN_REJECTED")).toBe(true);
    });
  });

  describe("Supplier Recovery", () => {
    it("full supplier refund scenario", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      const ret = created.returnRequest!;
      recordSupplierRecovery({
        returnId: ret.returnId,
        supplierId: ret.items[0].supplierId,
        type: "SUPPLIER_REFUND",
        requestedAmount: 60,
        approvedAmount: 60,
        receivedAmount: 60,
        currency: "EUR",
      });
      const rec = reconcileReturnFinancials(ret.returnId)!;
      expect(rec.actualSupplierRecovery).toBe(60);
    });

    it("partial supplier credit scenario", async () => {
      const gap = calculatePartialRecoveryGap(100, 70);
      expect(gap.unrecoveredAmount).toBe(30);
    });

    it("no supplier recovery scenario", async () => {
      setSupplierPolicy(TEST_SUPPLIER_POLICY_NO_RECOVERY);
      const orderId = await createDeliveredOrder();
      const eligibility = evaluateReturnEligibility(
        buildReturnInput(orderId, { reason: "CUSTOMER_CHANGED_MIND" })
      );
      expect(eligibility.outcome).toBe("ineligible");
    });

    it("does not treat approved as received", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      const recovery = recordSupplierRecovery({
        returnId: created.returnRequest!.returnId,
        supplierId: TEST_SUPPLIER_ID,
        type: "SUPPLIER_CREDIT",
        requestedAmount: 50,
        approvedAmount: 50,
        receivedAmount: 0,
        currency: "EUR",
      });
      expect(recovery.status).toBe("APPROVED");
      expect(recovery.receivedAmount).toBe(0);
    });
  });

  describe("Customer Refund", () => {
    it("processes dry-run customer refund", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      approveReturn(created.returnRequest!.returnId);
      const pending = requestCustomerRefund(created.returnRequest!.returnId)!;
      const refund = processCustomerRefund({
        returnId: created.returnRequest!.returnId,
        approvedAmount: pending.requestedAmount,
      });
      expect(refund?.status).toBe("COMPLETED");
      expect(refund?.dryRun).toBe(true);
    });

    it("handles failed refund", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      requestCustomerRefund(created.returnRequest!.returnId);
      const refund = processCustomerRefund({
        returnId: created.returnRequest!.returnId,
        approvedAmount: 50,
        simulateFailure: true,
      });
      expect(refund?.status).toBe("FAILED");
    });

    it("supports partial refund", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      requestCustomerRefund(created.returnRequest!.returnId);
      const refund = processCustomerRefund({
        returnId: created.returnRequest!.returnId,
        approvedAmount: 40,
      });
      expect(refund?.status).toBe("PARTIALLY_COMPLETED");
    });
  });

  describe("Marketplace Refund", () => {
    it("records marketplace refund foundation", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      const mpRefund = recordMarketplaceRefund({
        returnId: created.returnRequest!.returnId,
        marketplaceId: "TEST_AMAZON",
        orderId,
        requestedAmount: 89.99,
        approvedAmount: 89.99,
        refundedAmount: 85,
        fees: 4.99,
        currency: "EUR",
      });
      expect(mpRefund.dryRun).toBe(true);
    });
  });

  describe("Financial Reconciliation", () => {
    it("calculates buzzard final return impact", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      const ret = created.returnRequest!;
      requestCustomerRefund(ret.returnId);
      processCustomerRefund({ returnId: ret.returnId, approvedAmount: 100 });
      recordSupplierRecovery({
        returnId: ret.returnId,
        supplierId: TEST_SUPPLIER_ID,
        type: "PARTIAL_CREDIT",
        requestedAmount: 70,
        approvedAmount: 70,
        receivedAmount: 70,
        currency: "EUR",
      });
      createReturnShipment({
        returnId: ret.returnId,
        carrier: "DHL",
        trackingNumber: "X",
        cost: 10,
        currency: "EUR",
        payer: "BUZZARD",
      });
      const rec = reconcileReturnFinancials(ret.returnId, { finalize: true })!;
      expect(rec.buzzardFinalReturnImpact).toBeGreaterThan(0);
      expect(rec.estimatedReturnCost).toBeDefined();
      expect(rec.actualReturnCost).toBeDefined();
    });

    it("preserves original margin and calculates final contribution", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      requestCustomerRefund(created.returnRequest!.returnId);
      processCustomerRefund({
        returnId: created.returnRequest!.returnId,
        approvedAmount: 50,
      });
      reconcileReturnFinancials(created.returnRequest!.returnId);
      const impact = getFinalOrderContribution(created.returnRequest!.returnId);
      expect(impact?.originalOrderMargin).toBeDefined();
      expect(impact?.finalOrderContribution).toBe(
        (impact?.originalOrderMargin ?? 0) - (impact?.returnImpact ?? 0)
      );
    });

    it("documents estimated vs actual", () => {
      const doc = documentEstimatedVsActual();
      expect(doc).toContain("expected risk");
      expect(doc).toContain("actual outcome");
    });
  });

  describe("Disputes", () => {
    it("opens supplier dispute foundation", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      const dispute = openReturnDispute({
        returnId: created.returnRequest!.returnId,
        supplierId: TEST_SUPPLIER_ID,
        reason: "Supplier rejected valid return",
        requestedAmount: 60,
        evidence: ["photo_1.jpg"],
      });
      expect(dispute.status).toBe("OPEN");
    });
  });

  describe("Inventory Integration", () => {
    it("does not auto-restock returned units", () => {
      expect(evaluateReturnInventoryOutcome()).toContain("does not auto-restock");
    });
  });

  describe("Idempotency", () => {
    it("returns same return for duplicate idempotency key", async () => {
      const orderId = await createDeliveredOrder();
      const input = buildReturnInput(orderId, { idempotencyKey: "idem_ret_1" });
      const first = createReturnRequest(input);
      const second = createReturnRequest(input);
      expect(second.idempotentReplay).toBe(true);
      expect(second.returnRequest?.returnId).toBe(first.returnRequest?.returnId);
    });

    it("deduplicates webhook events", async () => {
      const payload = { returnId: "ret_test", type: "RETURN_APPROVED" };
      receiveReturnWebhook({
        provider: "marketplace",
        eventType: "RETURN_APPROVED",
        payload,
      });
      const second = receiveReturnWebhook({
        provider: "marketplace",
        eventType: "RETURN_APPROVED",
        payload,
      });
      expect(second.duplicate).toBe(true);
    });
  });

  describe("Security & Customer Isolation", () => {
    it("rejects client financial field modification", () => {
      expect(rejectClientReturnModification({ buzzardLoss: 0 }).allowed).toBe(false);
      expect(rejectClientReturnModification({ supplierCreditAmount: 100 }).allowed).toBe(false);
    });

    it("customer A cannot access customer B return", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      expect(getCustomerReturn(created.returnRequest!.returnId, TEST_CUSTOMER_B)).toBeNull();
    });

    it("customer view excludes internal financials", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      const view = getCustomerReturn(created.returnRequest!.returnId, TEST_CUSTOMER_A)!;
      expect("supplierCreditAmount" in view).toBe(false);
      expect("buzzardLoss" in view).toBe(false);
    });
  });

  describe("Admin", () => {
    it("provides admin overview", async () => {
      const orderId = await createDeliveredOrder();
      createReturnRequest(buildReturnInput(orderId));
      const overview = getReturnsAdminOverview();
      expect(overview.length).toBeGreaterThan(0);
    });
  });

  describe("Events & Audit", () => {
    it("records append-only events", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      expect(getReturnEvents(created.returnRequest!.returnId).some((e) => e.type === "RETURN_REQUESTED")).toBe(true);
      expect(getReturnAuditLog(created.returnRequest!.returnId).length).toBeGreaterThan(0);
    });
  });

  describe("Close Return", () => {
    it("closes return with final reconciliation", async () => {
      const orderId = await createDeliveredOrder();
      const created = createReturnRequest(buildReturnInput(orderId));
      approveReturn(created.returnRequest!.returnId);
      expect(closeReturn(created.returnRequest!.returnId)).toBe(true);
    });
  });

  describe("Multi-Product Fixtures", () => {
    it("supports oil product return", async () => {
      const orderId = await createDeliveredOrder(FIXTURE_PRODUCTS.OIL);
      const result = createReturnRequest(buildReturnInput(orderId));
      expect(result.ok).toBe(true);
    });
  });
});
