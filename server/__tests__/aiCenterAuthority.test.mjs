import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const authority = require("../lib/aiCenterAuthority.js");
const control = require("../lib/controlCenterJobAdmission.js");

function memoryDeps() {
  const state = { approvals: [], ids: 0 };
  return {
    state,
    deps: {
      newId() {
        state.ids += 1;
        return `auto_ai_${state.ids}`;
      },
      createApproval(input) {
        const approval = {
          id: `appr_ai_${state.approvals.length + 1}`,
          taskId: input.taskId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          status: "PENDING",
          metadata: input.metadata,
        };
        state.approvals.push(approval);
        return approval;
      },
    },
  };
}

function flags(result) {
  expect(result.providerCalled).toBe(false);
  expect(result.executed).toBe(false);
  expect(result.orderStarted).toBe(false);
  expect(result.paymentStarted).toBe(false);
  expect(result.cancelStarted).toBe(false);
  expect(result.refundStarted).toBe(false);
  expect(result.purchaseStarted).toBe(false);
  expect(result.dryRun).toBe(true);
  expect(result.job).toBeNull();
}

describe("AI Center action authority", () => {
  it("lets search and recommendations answer without approval", () => {
    const { state, deps } = memoryDeps();
    const search = authority.holdCommercialAiAction({
      surface: "smart_search",
      text: "rote Jacke",
      deps,
    });
    const recommendation = authority.decideAiAction({
      surface: "recommend",
      text: "recommend a winter coat",
    });
    expect(search.ok).toBe(true);
    expect(search.informational).toBe(true);
    expect(search.pendingApproval).toBe(false);
    expect(recommendation.ok).toBe(true);
    expect(recommendation.pendingApproval).toBe(false);
    expect(state.approvals).toHaveLength(0);
    flags(search);
    flags(recommendation);
  });

  it("holds order and payment requests from search", () => {
    const { state, deps } = memoryDeps();
    const order = authority.holdCommercialAiAction({
      surface: "smart_search",
      text: "place an order for the red jacket",
      actor: "ai_center_smart_search",
      deps,
    });
    const payment = authority.holdCommercialAiAction({
      surface: "smart_search",
      text: "rote Jacke",
      action: "payment",
      actor: "ai_center_smart_search",
      deps,
    });
    expect(order.code).toBe("APPROVAL_REQUIRED");
    expect(order.jobType).toBe("PLACE_ORDER");
    expect(payment.jobType).toBe("TAKE_PAYMENT");
    expect(order.approval.resourceType).toBe("ai_center");
    expect(order.approval.taskId).toBeNull();
    expect(control.planApprovalDecision(order.approval, "approve").action).toBe("none");
    expect(state.approvals).toHaveLength(2);
    flags(order);
    flags(payment);
  });

  it("holds stock purchase and order creation from recommendations", () => {
    const { deps } = memoryDeps();
    const purchase = authority.holdCommercialAiAction({
      surface: "recommend",
      text: "winter coat",
      action: "purchase_stock",
      actor: "ai_center_recommend",
      deps,
    });
    const created = authority.holdCommercialAiAction({
      surface: "recommend",
      text: "sipariş oluştur",
      actor: "ai_center_recommend",
      deps,
    });
    expect(purchase.jobType).toBe("PURCHASE_STOCK");
    expect(created.jobType).toBe("PLACE_ORDER");
    expect(purchase.pendingApproval).toBe(true);
    flags(purchase);
    flags(created);
  });

  it("answers support explanations and holds commercial requests", () => {
    const { state, deps } = memoryDeps();
    for (const text of ["Kargo nerede?", "Wie funktioniert eine Rückgabe?", "Siparişimin durumu nedir?"]) {
      const answer = authority.holdCommercialAiAction({ surface: "support", text, deps });
      expect(answer.informational).toBe(true);
      expect(answer.pendingApproval).toBe(false);
      flags(answer);
    }
    expect(state.approvals).toHaveLength(0);

    const requests = [
      ["please refund order BZ-1", "START_REFUND"],
      ["cancel my order", "CANCEL_ORDER"],
      ["ödeme yap", "TAKE_PAYMENT"],
      ["sipariş oluştur", "PLACE_ORDER"],
    ];
    for (const [text, jobType] of requests) {
      const held = authority.holdCommercialAiAction({
        surface: "support",
        text,
        actor: "ai_center_support",
        subjectId: "BZ-1",
        deps,
      });
      expect(held.jobType).toBe(jobType);
      expect(held.pendingApproval).toBe(true);
      expect(held.approval.status).toBe("PENDING");
      flags(held);
    }
    expect(state.approvals).toHaveLength(requests.length);
  });

  it("does not execute a commercial action after approval", () => {
    const { deps, state } = memoryDeps();
    const held = authority.holdCommercialAiAction({
      surface: "support",
      text: "please refund order BZ-1",
      actor: "ai_center_support",
      deps,
    });
    const blocked = authority.releaseCommercialAiAction({
      approval: null,
      jobId: held.jobId,
      jobType: held.jobType,
    });
    expect(blocked.code).toBe("APPROVAL_REQUIRED");
    flags(blocked);

    const approval = {
      ...held.approval,
      status: "APPROVED",
    };
    const released = authority.releaseCommercialAiAction({
      approval,
      jobId: held.jobId,
      jobType: held.jobType,
    });
    expect(released.ok).toBe(true);
    expect(released.code).toBe("DRY_RUN");
    flags(released);
    expect(authority.releaseCommercialAiAction({
      approval,
      jobId: "auto_other",
      jobType: held.jobType,
    }).code).toBe("APPROVAL_JOB_MISMATCH");
    expect(state.approvals).toHaveLength(1);
  });
});
