import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const tempRoot = mkdtempSync(path.join(os.tmpdir(), "buzzard-local-gaps-"));
process.env.BUZZARD_DB_PATH = path.join(tempRoot, "app.sqlite");
process.env.BUZZARD_DATA_DIR = path.join(tempRoot, "data");
process.env.BUZZARD_SALES_ENABLED = "0";

const require = createRequire(import.meta.url);
const { requestApproval, approvalInputHash } = require("../lib/buzzardNative/core/specialists/brandDraft");
const { dispatch } = require("../lib/buzzardNative/core/specialistDispatch");
const { executeReadOnly } = require("../lib/pusat/runtime");
const controlCenter = require("../lib/controlCenter");
const { isSalesEnabled } = require("../lib/salesMode");
const { capturePayment } = require("../lib/commerce/paymentService");

describe("local open gaps", () => {
  it("binds an approval request to the submitted input", () => {
    const input = { action: "BRAND_LIVE_PUBLISH", note: "dry" };
    const first = requestApproval({ actorId: "mira", action: input.action, input });
    const same = approvalInputHash({ actorId: "mira", action: input.action, input });
    const changed = approvalInputHash({ actorId: "mira", action: "OTHER", input });
    expect(first.code).toBe("HUMAN_GATE_REQUIRED");
    expect(first.livePublish).toBe(false);
    expect(first.inputHash).toBe(same);
    expect(first.inputHash).not.toBe(changed);

    const routed = dispatch({ agentId: "mira", kind: "APPROVAL_REQUEST", input });
    expect(routed.code).toBe("HUMAN_GATE_REQUIRED");
    expect(routed.live).toBe(false);
    expect(routed.result.inputHash).toBe(approvalInputHash({ actorId: "mira", action: input.action, input }));
  });

  it("expires a due admin approval and marks a denied Pusat write as not retryable", () => {
    const created = controlCenter.createApproval({ reason: "due", riskLevel: "HIGH" });
    expect(controlCenter.decideApproval(created.id, "approve", "operator@example.test").status).toBe("APPROVED");

    const due = controlCenter.createApproval({ reason: "past", riskLevel: "HIGH" });
    const closed = controlCenter.expireDue(Date.parse(due.metadata.expiresAt) + 1);
    expect(closed.expired).toBeGreaterThanOrEqual(1);
    expect(controlCenter.decideApproval(due.id, "approve", "operator@example.test")).toBeNull();
    expect(controlCenter.listApprovals("EXPIRED").some((row) => row.id === due.id)).toBe(true);

    const previous = process.env.PUSAT_RUNTIME_ENABLED;
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    try {
      const denied = executeReadOnly("CAPTURE_PAYMENT", { amount: 1 }, { actorId: "pricing_ai" });
      expect(denied.code).toBe("PERMISSION_DENIED");
      expect(denied.retryable).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
      else process.env.PUSAT_RUNTIME_ENABLED = previous;
    }
    expect(isSalesEnabled()).toBe(false);
    expect(capturePayment({ amount: 1, actorId: "local-gaps" }).code).toBe("PAYMENT_NOT_LIVE");
  });
});
