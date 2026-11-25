import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { ids, getAgent } = require("../lib/buzzardNative/core/identityRegistry.js");
const { check } = require("../lib/buzzardNative/core/permissionEngine.js");
const { holdStaffMeeting, runTextMeeting } = require("../lib/buzzardNative/platform/councilMeeting.js");
const { dispatch } = require("../lib/buzzardNative/core/specialistDispatch.js");

function orchDb() {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-staff-")), "orch.sqlite");
}

describe("17-member staff round", () => {
  it("routes every registered member through Pusat and stores one shared note", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    expect(ids()).toHaveLength(17);
    expect(new Set(ids()).size).toBe(17);
    const names = ["Sinan Bey", "Amelia", "Adrian", "Mira", "Leon", "Esat Bey", "Doğu Bey", "Nedim Bey", "Tuncay Bey", "Çakır Bey", "Pelin Hanım", "Akın Bey", "Yılmaz Bey", "Banu Hanım", "Sencer Bey", "Zeynep Hanım", "Pusat"];
    expect(names.every((name) => ids().some((id) => getAgent(id).display_name === name))).toBe(true);
    const orch = createOrchestrator({ dbPath: orchDb() });
    const ran = orch.routeStaff({ domain: "all" });
    expect(ran.ok).toBe(true);
    expect(ran.members).toBe(17);
    expect(ran.merged.completed).toBe(17);
    expect(ran.salesEnabled).toBe(false);
    expect(ran.live).toBe(false);
    expect(ran.llmCouncil).toBe(false);
    expect(ran.memory.ok).toBe(true);
    const stored = ran.memory.store.get({ actorId: "pusat", ownerId: "pusat", type: "shared_knowledge", key: "staff-all" });
    expect(stored.found).toBe(true);
    expect(stored.intact).toBe(true);
    expect(ran.memory.store.get({ actorId: "banu_hanim", ownerId: "pusat", type: "shared_knowledge", key: "staff-all" }).code).toBe("MEMORY_ISOLATION_DENIED");
    expect(ran.reports.map((row) => row.agentId).sort()).toEqual([...ids()].sort());
    orch.close();
  });

  it("sends a brand pair together and a publish request to approval", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    const brand = orch.routeStaff({ domain: "brand" });
    expect(brand.merged.completed).toBe(2);
    expect(brand.reports.map((row) => row.agentId).sort()).toEqual(["adrian", "amelia"]);
    const gated = orch.routeStaff({ domain: "publish" });
    expect(gated.reports[0]).toMatchObject({ agentId: "amelia", status: "GATED", code: "HUMAN_GATE_REQUIRED" });
    expect(orch.approvals.pending()).toHaveLength(1);
    expect(dispatch({ agentId: "banu_hanim", kind: "ASSIGN_TASK" }).code).toBe("UNAUTHORIZED_KIND");
    expect(check("pricing_ai", "STOCK_BUY").ok).toBe(false);
    orch.close();
  });

  it("retries a price task that cannot be verified and then stops", () => {
    const orch = createOrchestrator({ dbPath: orchDb() });
    const ran = orch.routeStaff({ domain: "price", input: { supplierCost: 10 }, maxAttempts: 2 });
    expect(ran.ok).toBe(false);
    expect(ran.reports).toHaveLength(2);
    expect(ran.reports.every((row) => row.status === "FAILED")).toBe(true);
    expect(ran.audit.byState.DEAD_LETTER).toBe(1);
    orch.close();
  });

  it("keeps the staff meeting textual and does not invent a live voice", () => {
    const meeting = holdStaffMeeting({ topic: "durum" });
    expect(meeting.ok).toBe(true);
    expect(meeting.members).toBe(17);
    expect(meeting.chair).toBe("pusat");
    expect(meeting.liveVoice).toBe(false);
    expect(meeting.realtime).toBe("NOT_CONFIGURED");
    expect(meeting.minutes).toContain("Sinan Bey");
    expect(meeting.minutes).toContain("Amelia");
    const sinan = meeting.turns.find((turn) => turn.speaker === "sinan_bey");
    const amelia = meeting.turns.find((turn) => turn.speaker === "amelia");
    const stock = meeting.turns.find((turn) => turn.speaker === "stock_ai");
    expect(sinan.voiceStatus).toBe("REFERENCE_REGISTERED");
    expect(sinan.officialVoiceUsed).toBe(false);
    expect(amelia.voiceStatus).toBe("NOT_CONFIGURED");
    expect(amelia.avatarStatus).toBe("NOT_CONFIGURED");
    expect(stock.voiceStatus).toBe("CAPABILITY_DENIED");
    expect(stock.audioProduced).toBe(false);
    const legacy = runTextMeeting();
    expect(legacy.liveVoice).toBe(false);
    expect(legacy.turns[0].text).toBe("Toplantı açıldı. Canlı ses yok.");
    expect(holdStaffMeeting({ chair: "sinan_bey" }).code).toBe("CHAIR_MUST_BE_PUSAT");
  });
});
