import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

process.env.BUZZARD_DB_PATH = path.join(os.tmpdir(), `buzzard-approval-${process.pid}.sqlite`);
process.env.BUZZARD_SALES_ENABLED = "0";

const require = createRequire(import.meta.url);
const controlCenter = require("../lib/controlCenter");
const { isSalesEnabled } = require("../lib/salesMode");

describe("items 168-182 approval identity", () => {
  it("rejects an empty approver and a second decision", () => {
    const created = controlCenter.createApproval({
      reason: "dry approval",
      resourceType: "catalog",
      riskLevel: "HIGH",
    });
    expect(created.status).toBe("PENDING");
    expect(controlCenter.decideApproval(created.id, "approve", "")).toBeNull();
    expect(controlCenter.decideApproval(created.id, "approve", "   ")).toBeNull();
    const stillPending = controlCenter.listApprovals("PENDING").find((row) => row.id === created.id);
    expect(stillPending.status).toBe("PENDING");

    const decided = controlCenter.decideApproval(created.id, "approve", "operator@example.test");
    expect(decided.status).toBe("APPROVED");
    expect(decided.decidedBy).toBe("operator@example.test");
    expect(controlCenter.decideApproval(created.id, "reject", "operator@example.test")).toBeNull();
    const kept = controlCenter.listApprovals("APPROVED").find((row) => row.id === created.id);
    expect(kept.status).toBe("APPROVED");

    const pending = controlCenter.listApprovals("PENDING");
    expect(pending.some((row) => row.id === created.id)).toBe(false);
    expect(isSalesEnabled()).toBe(false);
  });
});
