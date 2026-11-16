import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dbPath = require.resolve("../lib/db.js");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    db: {
      prepare() {
        throw new Error("DB_OPEN_FORBIDDEN");
      },
    },
  },
};

const authority = require("../lib/aiCenterAuthority.js");
const productAi = require("../lib/productAi.js");
const aiCenter = require("../lib/aiCenter.js");

function memoryDeps() {
  const state = { approvals: [] };
  return {
    state,
    deps: {
      newId: () => `auto_close_${state.approvals.length + 1}`,
      createApproval(input) {
        const approval = {
          id: `appr_close_${state.approvals.length + 1}`,
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

function expectNoCommerce(result) {
  expect(result.providerCalled).toBe(false);
  expect(result.executed).toBe(false);
  expect(result.dryRun).toBe(true);
  expect(result.orderStarted).toBe(false);
  expect(result.paymentStarted).toBe(false);
  expect(result.cancelStarted).toBe(false);
  expect(result.refundStarted).toBe(false);
  expect(result.purchaseStarted).toBe(false);
}

describe("AI Center closure verification", () => {
  it("does not mark indirect, typo, or ambiguous commercial text as INFO", () => {
    const commercial = [
      "order this",
      "refund it",
      "refnd my order",
      "purchace this",
      "chekout now",
      "bestell das",
      "geld zurueck",
      "iade eder misin",
      "siparisimi iptal eder misin",
      "ارجاع المبلغ",
      "ادفع",
      "اطلب هذا",
    ];
    for (const text of commercial) {
      const decision = authority.decideAiAction({ surface: "support", text });
      expect(decision.informational, text).toBe(false);
      expect(decision.commercial, text).toBe(true);
      expect(decision.code, text).not.toBe("INFO");
      expectNoCommerce(decision);
    }
    const ambiguous = ["bir sey yap", "kannst du das machen", "can you handle this", "lutfen ilgilen", "halleder misin"];
    for (const text of ambiguous) {
      const decision = authority.decideAiAction({ surface: "support", text });
      expect(decision.informational, text).toBe(false);
      expect(decision.code, text).toBe("CLARIFICATION_REQUIRED");
      expect(decision.pendingApproval, text).toBe(false);
      expectNoCommerce(decision);
    }
  });

  it("keeps ordinary search and policy questions informational", () => {
    for (const text of ["rote Jacke", "mavi ceket", "what is your refund policy", "Kargo nerede?"]) {
      const decision = authority.decideAiAction({ surface: "smart_search", text });
      expect(decision.informational, text).toBe(true);
      expect(decision.commercial, text).toBe(false);
      expect(decision.code, text).toBe("INFO");
    }
  });

  it("screens enrichProduct, product copy, translation, and review text without a provider or database", async () => {
    const { state, deps } = memoryDeps();
    const ordinaryProduct = await productAi.enrichProduct({ name: "Baumwolljacke", description: "warm cotton" }, { deps });
    expect(ordinaryProduct.informational).toBe(true);
    expect(ordinaryProduct.warnings).toContain("PROVIDER_DISABLED");
    expectNoCommerce(ordinaryProduct);

    const copy = aiCenter.generateProductCopy({ product: "please refund order BZ-1", deps });
    expect(copy.pendingApproval).toBe(true);
    expect(copy.jobType).toBe("START_REFUND");
    expect(copy.job).toBeNull();
    expectNoCommerce(copy);

    const plainCopy = aiCenter.generateProductCopy({ product: "Baumwolljacke", deps });
    expect(plainCopy.informational).toBe(true);
    expect(plainCopy.pendingApproval).toBe(false);
    expectNoCommerce(plainCopy);

    const translated = aiCenter.translate({ text: "cotton jacket", targetLanguage: "de", deps });
    expect(translated.informational).toBe(true);
    expectNoCommerce(translated);

    const commercialTranslation = aiCenter.translate({ text: "cancle my order", targetLanguage: "tr", deps });
    expect(commercialTranslation.commercial).toBe(true);
    expect(commercialTranslation.informational).toBe(false);
    expect(commercialTranslation.pendingApproval).toBe(true);
    expectNoCommerce(commercialTranslation);

    const review = aiCenter.analyzeReviewSentiment({ review: "The jacket fits well", deps });
    expect(review.informational).toBe(true);
    expectNoCommerce(review);

    const unclearReview = aiCenter.analyzeReviewSentiment({ review: "just do it", deps });
    expect(unclearReview.code).toBe("CLARIFICATION_REQUIRED");
    expect(unclearReview.informational).toBe(false);
    expectNoCommerce(unclearReview);

    const released = authority.releaseCommercialAiAction({
      approval: { ...copy.approval, status: "APPROVED" },
      jobId: copy.jobId,
      jobType: copy.jobType,
    });
    expect(released.code).toBe("DRY_RUN");
    expectNoCommerce(released);
    expect(state.approvals.length).toBeGreaterThan(0);
  });
});
