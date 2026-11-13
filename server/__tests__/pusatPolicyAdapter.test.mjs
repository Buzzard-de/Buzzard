import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const adapter = require("../lib/pusatPolicyAdapter.js");
const phoneAssistant = require("../lib/phoneAssistantService.js");
const { classifyAction } = require("../lib/pusat/actionPolicy.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");

const dbPath = path.join(process.cwd(), "server/data/buzzard.db");
const ordersPath = path.join(process.cwd(), "server/data/orders.json");
const originalRead = phoneAssistant.getVerifiedOrderStatus;

const EXPECTED_WRITE_MAP = {
  CHANGE_ORDER: "SALES_WRITE",
  CANCEL_ORDER: "ORDER_CANCEL",
  CREATE_RETURN: "CUSTOMER_REFUND",
  REFUND_HIGH_VALUE: "CUSTOMER_REFUND",
  CANCEL_HIGH_VALUE_ORDER: "ORDER_CANCEL",
  SUPPLIER_PURCHASE: "PURCHASE_ANYTHING",
  MARKETPLACE_ORDER: "SALES_WRITE",
  REAL_PAYMENT_CAPTURE: "LIVE_PAYMENT",
};

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(dbPath);
const ordersBefore = fileMark(ordersPath);

afterEach(() => {
  phoneAssistant.getVerifiedOrderStatus = originalRead;
});

describe("pusatPolicyAdapter", () => {
  it("reads a verified order through the phone assistant without storing it", async () => {
    const seen = [];
    phoneAssistant.getVerifiedOrderStatus = (input) => {
      seen.push(input);
      return {
        ok: true,
        verified: true,
        orderNumber: input.orderNumber,
        status: "paid",
        statusLabel: "Bezahlt",
        trackingNumber: null,
        trackingCarrier: null,
        message: "Bestellung B-1001: Bezahlt",
        escalate: false,
        paymentStatus: "captured",
      };
    };

    const result = await adapter.executeReadOnlyBuzzardAction(
      "GET_ORDER",
      { orderNumber: "B-1001", email: "buyer@example.com", postalCode: "10115", locale: "de" },
      { agentId: "pusat" }
    );

    expect(seen).toEqual([
      { orderNumber: "B-1001", email: "buyer@example.com", postalCode: "10115", locale: "de" },
    ]);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("SUCCESS");
    expect(result.errorCode).toBeNull();
    expect(result.result.orderNumber).toBe("B-1001");
    expect(result.result.status).toBe("paid");
    expect(result.result.paymentStatus).toBeUndefined();
    expect(result.approvalCreated).toBe(false);
    expect(result.taskCreated).toBe(false);
    expect(result.stored).toBe(false);
    expect(result.sideEffectExecuted).toBe(false);
  });

  it("reports a missing order as FAILED / GET_ORDER_FAILED", async () => {
    const result = await adapter.executeReadOnlyBuzzardAction(
      "GET_ORDER",
      { orderNumber: "B-MISSING", email: "nobody@example.com", postalCode: "00000" },
      { agentId: "zeynep_hanim" }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("GET_ORDER_FAILED");
    expect(result.errorKey).toBe("ai.phone.orderNotFound");
    expect(result.approvalCreated).toBe(false);
    expect(result.taskCreated).toBe(false);
    expect(result.stored).toBe(false);
  });

  it.each(Object.entries(EXPECTED_WRITE_MAP))(
    "maps %s to HUMAN_REQUIRED %s without creating an approval",
    (facadeAction, policyAction) => {
      const mapped = adapter.mapFacadeAction({ action: facadeAction, agentId: "pusat" });
      const policy = classifyAction(policyAction);
      expect(adapter.FACADE_WRITE_MAP[facadeAction]).toBe(policyAction);
      expect(mapped.ok).toBe(true);
      expect(mapped.status).toBe("MAPPED");
      expect(mapped.humanRequiredAction).toBe(policyAction);
      expect(mapped.classification).toBe("HUMAN_REQUIRED");
      expect(policy.classification).toBe("HUMAN_REQUIRED");
      expect(policy.autoEligible).toBe(false);
      expect(mapped.autoEligible).toBe(false);
      expect(mapped.risk).toBe("CRITICAL");
      expect(mapped.risk).not.toBe("LOW");
      expect(mapped.humanRequiredAction).not.toBe("CREATE_REPORTS");
      expect(mapped.approvalCreated).toBe(false);
      expect(mapped.taskCreated).toBe(false);
      expect(mapped.stored).toBe(false);
      expect(mapped.sideEffectExecuted).toBe(false);
    }
  );

  it("returns NOT_IMPLEMENTED for unmapped, read-only, and unknown actions", () => {
    const actions = [
      "CREATE_EXCHANGE",
      "REQUEST_SUPPLIER_ACTION",
      "CHECK_AVAILABILITY",
      "GET_PRODUCT",
      "CHECK_PRICE",
      "CREATE_REPORTS",
      "LIVE_PAYMENT",
      "NOT_A_REAL_ACTION",
    ];
    for (const action of actions) {
      const mapped = adapter.mapFacadeAction({ action, agentId: "pusat" });
      expect(mapped.status).toBe("NOT_IMPLEMENTED");
      expect(mapped.errorCode).toBe("NOT_IMPLEMENTED");
      expect(mapped.autoEligible).toBe(false);
      expect(mapped.approvalCreated).toBe(false);
      expect(mapped.humanRequiredAction).toBeNull();
      expect(mapped.risk).toBeNull();
    }
  });

  it("does not use the automatic approval path", () => {
    expect(Object.values(adapter.FACADE_WRITE_MAP)).not.toContain("CREATE_REPORTS");
    const report = adapter.mapFacadeAction({ action: "CREATE_REPORTS", agentId: "pusat", payload: { risk: "LOW" } });
    expect(report.status).toBe("NOT_IMPLEMENTED");
    expect(report.autoEligible).toBe(false);
    expect(report.approvalCreated).toBe(false);
    const low = classifyAction("CREATE_REPORTS");
    expect(low.classification).toBe("AUTO_LOW");
    expect(low.autoEligible).toBe(true);
  });

  it("rejects an unknown agent before any order read", async () => {
    let calls = 0;
    phoneAssistant.getVerifiedOrderStatus = () => {
      calls += 1;
      return { ok: true };
    };
    const unknown = await adapter.executeReadOnlyBuzzardAction(
      "GET_ORDER",
      { orderNumber: "B-1001", email: "buyer@example.com" },
      { agentId: "not_a_seed" }
    );
    const membersOnly = adapter.mapFacadeAction({ action: "CANCEL_ORDER", agentId: "finance_ai" });
    expect(unknown.errorCode).toBe("UNKNOWN_AGENT");
    expect(unknown.approvalCreated).toBe(false);
    expect(membersOnly.errorCode).toBe("UNKNOWN_AGENT");
    expect(membersOnly.identityCode).toBe("NOT_NATIVE_SEED");
    expect(calls).toBe(0);
  });

  it("allows ASSIGN_TASK for Pusat only", () => {
    const pusat = adapter.assignmentAuthority("pusat");
    const sinan = adapter.assignmentAuthority("sinan_bey");
    const phoneAlias = adapter.assignmentAuthority("phone_ai");
    expect(pusat.assignAllowed).toBe(true);
    expect(pusat.permissionIncreased).toBe(false);
    expect(sinan.assignAllowed).toBe(false);
    expect(sinan.errorCode).toBe("ASSIGN_TASK_DENIED");
    expect(phoneAlias.assignAllowed).toBe(false);
    expect(phoneAlias.agentId).toBe("zeynep_hanim");
    expect(SEED_IDS).toHaveLength(17);
    expect(SEED_IDS).toContain("pusat");
  });

  it("rejects card data and does not echo it", async () => {
    const card = "4111111111111111";
    let calls = 0;
    phoneAssistant.getVerifiedOrderStatus = () => {
      calls += 1;
      return { ok: true, orderNumber: card };
    };
    const result = await adapter.executeReadOnlyBuzzardAction(
      "GET_ORDER",
      { orderNumber: "B-1001", email: "buyer@example.com", note: card },
      { agentId: "pusat" }
    );
    expect(result.errorCode).toBe("CARD_DATA_REJECTED");
    expect(result.stored).toBe(false);
    expect(JSON.stringify(result)).not.toContain(card);
    expect(calls).toBe(0);
  });

  it("does not open the Buzzard database or order file", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/lib/pusatPolicyAdapter.js"), "utf8");
    expect(source).not.toMatch(/controlCenter|createAiTask|createApproval|humanApproval|taskRouter|durableTaskQueue|better-sqlite3/);
    expect(fileMark(dbPath)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
  });
});
