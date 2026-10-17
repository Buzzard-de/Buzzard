import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Pusat agent registry and schemas", () => {
  let pusat;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    pusat.initialize(require("../lib/db").db);
  });

  it("registers all required specialist agents", () => {
    const codes = pusat.agents.listAgents().map((a) => a.code);
    for (const required of [
      "price_assistant",
      "stock_assistant",
      "seo_assistant",
      "customer_assistant",
      "sales_assistant",
      "category_assistant",
      "dogu_bey",
      "esat_bey",
      "aslan_bey",
    ]) {
      expect(codes).toContain(required);
    }
  });

  it("seeds an employee and execute binding for every AGENT_CODES entry", () => {
    const roster = pusat.agents.specialistRosterStatus();
    expect(roster.complete).toBe(true);
    expect(roster.missingEmployees).toEqual([]);
    expect(roster.missingExecute).toEqual([]);
    expect(roster.missingCodes).toEqual([]);
    expect(roster.recommendationOnly).toBe(true);
    expect(roster.liveMutations).toBe(false);

    const listed = pusat.agents.listAgents();
    expect(listed).toHaveLength(Object.keys(pusat.AGENT_CODES).length);
    expect(listed.every((agent) => agent.employeeSeeded && agent.executeBound && agent.recommendationOnly)).toBe(true);

    const db = require("../lib/db").db;
    for (const employeeId of ["price_ai", "product_ai", "order_ai", "category_ai"]) {
      const row = db.prepare("SELECT id, status FROM core_ai_employees WHERE id = ?").get(employeeId);
      expect(row?.id).toBe(employeeId);
    }

    const product = pusat.agents.executeAgent("product_assistant", { sku: "TEST-SKU" });
    expect(product.invented).toBe(false);
    expect(product.activationBlocked).toBe(true);
    const order = pusat.agents.executeAgent("order_assistant", { orderId: "ORD-TEST" });
    expect(order.realSupplierOrder).toBe(false);
    expect(order.salesLocked).toBe(true);
  });

  it("price assistant never invents costs and flags the missing undercut rule", () => {
    const missing = pusat.agents.runPriceAssistant({ salePrice: 10 });
    expect(missing.ok).toBe(false);
    expect(missing.invented).toBe(false);
    const priced = pusat.agents.runPriceAssistant({ supplierCost: 10, shippingCost: 1, salePrice: 10.2 });
    expect(priced.evidence.meetsMinNetProfit).toBe(false);
    expect(priced.evidence.marketUndercutRule.implemented).toBe(false);
    expect(priced.engine).toBe("server/lib/pricing.js");
  });

  it("stock assistant is fail-closed for unknown or stale stock", () => {
    const unknown = pusat.agents.runStockAssistant({ sku: "S1" });
    expect(unknown.failClosed).toBe(true);
    expect(unknown.availabilityClaimAllowed).toBe(false);
    expect(unknown.invented).toBe(false);
    const confirmed = pusat.agents.runStockAssistant({
      sku: "S2",
      stock: 20,
      source: "supplier_feed",
      lastSupplierUpdate: new Date().toISOString(),
    });
    expect(confirmed.failClosed).toBe(false);
    expect(confirmed.availabilityClaimAllowed).toBe(true);
  });

  it("seo assistant proposes gaps without fabricating specs", () => {
    const result = pusat.agents.runSeoAssistant({ sku: "SEO-1", title: "A" });
    expect(result.gaps).toContain("title");
    expect(result.gaps.some((g) => g.startsWith("translations"))).toBe(true);
    expect(result.invented).toBe(false);
  });

  it("customer assistant does not invent order status or refund", () => {
    const none = pusat.agents.runCustomerAssistant({
      message: "I want a refund for order X",
      orderNumber: "ORDER-DOES-NOT-EXIST",
    });
    expect(none.requestType).toBe("refund");
    expect(none.escalate).toBe(true);
    expect(none.order).toBeNull();
    expect(none.orderEvidence).toBe("not_found");
    expect(none.unauthorizedActions).toContain("refund.issue");
  });

  it("sales assistant reports actual order aggregates only", () => {
    const result = pusat.agents.runSalesAssistant({});
    expect(result.figureType).toBe("actual");
    expect(result.invented).toBe(false);
    expect(typeof result.evidence.orderCount).toBe("number");
    expect(result.evidence.margins.available).toBe(false);
  });

  it("category assistant preserves canonical ids and flags ambiguity", () => {
    const ambiguous = pusat.agents.runCategoryAssistant({ legacyId: "not-a-real-legacy-id" });
    expect(ambiguous.ambiguous).toBe(true);
    expect(ambiguous.reviewRequired).toBe(true);
    expect(ambiguous.invented).toBe(false);
  });

  it("Doğu Bey separates facts from hypotheses", () => {
    const result = pusat.agents.runDoguBey({
      question: "Which supplier covers DE brake pads?",
      facts: ["Inter Cars has a DE catalog entry in connector docs"],
      hypotheses: ["They may stock pad XYZ"],
      sources: [{ url: "https://example.invalid/research", note: "fixture" }],
    });
    expect(result.findings.facts[0].kind).toBe("fact");
    expect(result.findings.hypotheses[0].kind).toBe("hypothesis");
  });

  it("Esat Bey evaluates guardian policy", () => {
    const result = pusat.agents.runEsatBey({
      agentId: "price_ai",
      employee: { id: "price_ai", status: "ACTIVE", permissions: ["ai.execute"] },
      action: "price.recommend",
      payload: { sku: "1" },
    });
    expect(result.guardian).toBeTruthy();
  });

  it("Aslan Bey only routes and does not duplicate specialists", () => {
    const result = pusat.agents.runAslanBey({ request: "Please check the selling price" });
    expect(result.suggestedAgent).toBe("price_assistant");
    expect(result.executesSpecialistWork).toBe(false);
  });
});

describe("Pusat business automations", () => {
  let pusat;

  beforeAll(() => {
    pusat = require("../lib/pusat");
  });

  it("product creation stays dry-run and respects sales lock", () => {
    const result = pusat.automations.productCreation({
      sku: "PUSAT-PROD-1",
      title: "Test",
      activate: true,
    });
    expect(result.written).toBe(false);
    expect(result.activation.allowed).toBe(false);
    expect(result.activation.salesEnabled).toBe(false);
  });

  it("supplier import marks mock adapters as not live", () => {
    const result = pusat.automations.supplierImport({ supplierId: "mock" });
    expect(result.live).toBe(false);
    expect(result.mock).toBe(true);
  });

  it("order automation is blocked by the sales lock", () => {
    const result = pusat.automations.orderAutomation({
      paymentStatus: "paid",
      shippingAddress: "x",
      customerId: "c1",
      supplierCost: 10,
      salePrice: 20,
      stock: 5,
      lastSupplierUpdate: new Date().toISOString(),
      source: "feed",
    });
    expect(result.salesLocked).toBe(true);
    expect(result.realSupplierOrder).toBe(false);
    expect(result.ready).toBe(false);
  });

  it("customs automation never claims legal certainty", () => {
    const result = pusat.automations.customsAutomation({
      name: "Bremsscheibe",
      category_id: "automotive",
    });
    expect(result.legalClaim).toBe(false);
    expect(result.reviewRequired).toBe(true);
  });

  it("reporting distinguishes actual measurements", () => {
    const report = pusat.automations.reportingAutomation();
    expect(report.figureType).toBe("actual");
    expect(report.tasks.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(report.estimates)).toBe(true);
  });
});
