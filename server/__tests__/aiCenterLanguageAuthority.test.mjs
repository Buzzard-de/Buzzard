import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const authority = require("../lib/aiCenterAuthority.js");
const productAi = require("../lib/productAi.js");
const control = require("../lib/controlCenterJobAdmission.js");

function memoryDeps() {
  const state = { approvals: [] };
  return {
    state,
    deps: {
      newId: () => `auto_lang_${state.approvals.length + 1}`,
      createApproval(input) {
        const approval = {
          id: `appr_lang_${state.approvals.length + 1}`,
          taskId: input.taskId,
          resourceType: input.resourceType,
          status: "PENDING",
          metadata: input.metadata,
        };
        state.approvals.push(approval);
        return approval;
      },
    },
  };
}

function expectSafe(result) {
  expect(result.providerCalled).toBe(false);
  expect(result.executed).toBe(false);
  expect(result.dryRun).toBe(true);
  expect(result.orderStarted).toBe(false);
  expect(result.paymentStarted).toBe(false);
  expect(result.cancelStarted).toBe(false);
  expect(result.refundStarted).toBe(false);
  expect(result.purchaseStarted).toBe(false);
}

describe("AI Center language authority", () => {
  it("classifies commercial phrases in Turkish, German, English, and Arabic", () => {
    const cases = [
      ["support", "please refund order BZ-1", "START_REFUND"],
      ["support", "plase an order for the coat", "PLACE_ORDER"],
      ["support", "cancle my order", "CANCEL_ORDER"],
      ["support", "I want my money back", "START_REFUND"],
      ["recommend", "purchse the stock", "PURCHASE_STOCK"],
      ["smart_search", "could you charge my card", "TAKE_PAYMENT"],
      ["support", "bitte erstatten Sie die Bestellung", "START_REFUND"],
      ["support", "ich möchte bestellen", "PLACE_ORDER"],
      ["support", "bitte stornieren", "CANCEL_ORDER"],
      ["support", "Geld zurück", "START_REFUND"],
      ["support", "ödeme yap", "TAKE_PAYMENT"],
      ["support", "sipariş oluştur", "PLACE_ORDER"],
      ["support", "iade edin lutfen", "START_REFUND"],
      ["recommend", "stok satın al", "PURCHASE_STOCK"],
      ["support", "paramı iade edin", "START_REFUND"],
      ["recommend", "أريد شراء جاكيت", "PURCHASE_STOCK"],
      ["support", "ألغِ الطلب", "CANCEL_ORDER"],
      ["support", "أرجع المبلغ", "START_REFUND"],
      ["smart_search", "ادفع الآن", "TAKE_PAYMENT"],
      ["support", "أريد أن أطلب", "PLACE_ORDER"],
    ];
    for (const [surface, text, jobType] of cases) {
      const decision = authority.decideAiAction({ surface, text });
      expect(decision.commercial, text).toBe(true);
      expect(decision.jobType, text).toBe(jobType);
      expect(decision.pendingApproval).toBe(false);
      expectSafe(decision);
    }
  });

  it("keeps product search and explanations free of approval", () => {
    const phrases = [
      ["smart_search", "rote Jacke"],
      ["smart_search", "mavi ceket beden m"],
      ["recommend", "recommend a winter coat"],
      ["support", "Kargo nerede?"],
      ["support", "Wie funktioniert eine Rückgabe?"],
      ["support", "what is your refund policy"],
      ["support", "ما هي سياسة الإرجاع"],
      ["product_copy", "Baumwolljacke mit Kapuze"],
      ["translate", "Hello, cotton jacket"],
      ["review_sentiment", "The jacket fits well"],
      ["product_ai", "جاكيت أزرق"],
    ];
    for (const [surface, text] of phrases) {
      const decision = authority.decideAiAction({ surface, text });
      expect(decision.ok, text).toBe(true);
      expect(decision.informational, text).toBe(true);
      expect(decision.commercial, text).toBe(false);
      expect(decision.pendingApproval, text).toBe(false);
      expectSafe(decision);
    }
  });

  it("asks for clarification on indirect requests and does not start commerce", () => {
    const { state, deps } = memoryDeps();
    const phrases = ["halleder misin", "mach das bitte", "just do it", "help me with my order", "افعل ذلك"];
    for (const text of phrases) {
      const held = authority.holdCommercialAiAction({ surface: "support", text, deps });
      expect(held.code, text).toBe("CLARIFICATION_REQUIRED");
      expect(held.ambiguous).toBe(true);
      expect(held.pendingApproval).toBe(false);
      expect(held.approval).toBeUndefined();
      expectSafe(held);
    }
    expect(state.approvals).toHaveLength(0);
    const unknown = authority.decideAiAction({ surface: "smart_search", text: "asdf qwerty" });
    expect(unknown.informational).toBe(true);
    expect(unknown.commercial).toBe(false);
    expectSafe(unknown);
  });

  it("routes productAi commercial text to approval and leaves ordinary text dry-run", async () => {
    const { state, deps } = memoryDeps();
    const ordinary = await productAi.enrichProduct({ name: "Baumwolljacke", description: "warm cotton" }, { deps });
    expect(ordinary.informational).toBe(true);
    expect(ordinary.providerCalled).toBe(false);
    expect(ordinary.warnings).toContain("PROVIDER_DISABLED");
    expect(state.approvals).toHaveLength(0);

    const commercial = await productAi.enrichProduct(
      { name: "Jacket", description: "please refund order BZ-9", sku: "SKU-9" },
      { deps }
    );
    expect(commercial.pendingApproval).toBe(true);
    expect(commercial.jobType).toBe("START_REFUND");
    expect(commercial.job).toBeNull();
    expect(commercial.approval.resourceType).toBe("ai_center");
    expect(control.planApprovalDecision(commercial.approval, "approve").action).toBe("none");
    expectSafe(commercial);
    expect(state.approvals).toHaveLength(1);

    const approval = { ...commercial.approval, status: "APPROVED" };
    const released = authority.releaseCommercialAiAction({
      approval,
      jobId: commercial.jobId,
      jobType: commercial.jobType,
    });
    expect(released.code).toBe("DRY_RUN");
    expect(released.ok).toBe(true);
    expectSafe(released);

    const unclear = await productAi.enrichProduct({ name: "Jacket", description: "halleder misin" }, { deps });
    expect(unclear.code).toBe("CLARIFICATION_REQUIRED");
    expect(state.approvals).toHaveLength(1);
  });
});
