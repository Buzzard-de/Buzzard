import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import Database from "better-sqlite3";

const require = createRequire(import.meta.url);

function memoryDb() {
  const db = new Database(":memory:");
  require("../lib/software").initialize(db);
  return db;
}

describe("easiest remaining human gates — 165 communications, 182 catalog", () => {
  it("item 165: unknown channel is not a live send", () => {
    const software = require("../lib/software");
    const db = memoryDb();
    const sms = software.communications.draft(db, {
      channel: "sms",
      message: "Track my order",
    });
    expect(sms.ok).toBe(false);
    expect(sms.sent).toBe(false);
    expect(sms.reason).toBe("CHANNEL_NOT_ALLOWED");

    const draft = software.communications.draft(db, {
      channel: "email",
      message: "Track my order",
    });
    expect(draft.ok).toBe(true);
    expect(draft.sent).toBe(false);
    const queued = software.communications.queue(db, draft.draft.id);
    expect(queued.status).toBe("QUEUED");
    expect(queued.sent).toBe(false);
    expect(queued.live).toBe(false);
    const again = software.communications.queue(db, draft.draft.id);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe("NOT_DRAFT");
    const marked = software.communications.markSentOrDelivered();
    expect(marked.ok).toBe(false);
    expect(marked.reason).toBe("HUMAN_SEND_REQUIRED");
    db.close();
  });

  it("item 182: catalog refuses AI self-approve and never executes", () => {
    const software = require("../lib/software");
    const listed = software.gatedActions.catalog();
    expect(listed.length).toBeGreaterThanOrEqual(8);
    expect(listed.every((row) => row.executed === false && row.requiresHuman === true)).toBe(true);

    const ai = software.gatedActions.execute({ action: "sales_enable", actor: "pusat" });
    expect(ai.reason).toBe("SELF_APPROVE_DENIED");
    expect(ai.executed).toBe(false);
    expect(ai.live).toBe(false);

    const humanShaped = software.gatedActions.execute({
      action: "marketplace_live_listing",
      actor: "operator",
    });
    expect(humanShaped.reason).toBe("HUMAN_APPROVAL_REQUIRED");
    expect(humanShaped.executed).toBe(false);
    expect(humanShaped.sideEffect).toBe(false);

    const unknown = software.gatedActions.evaluate({ action: "invented_action" });
    expect(unknown.reason).toBe("UNKNOWN_GATED_ACTION");
  });
});
