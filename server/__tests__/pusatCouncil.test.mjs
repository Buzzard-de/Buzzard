import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { canShare, createTask, roster, CLASSIFICATION } = require("../lib/pusat/council.js");
const { createMemoryStore } = require("../lib/pusat/memory.js");
const { createMeetingService } = require("../lib/pusat/meetings.js");
const { createDoguDesk } = require("../lib/pusat/doguResearch.js");
const { createCategoryExperts } = require("../lib/pusat/categoryExperts.js");
const { createApprovalCenter, RISK } = require("../lib/pusat/humanApproval.js");

describe("Pusat council and research", () => {
  it("keeps personal memory private and blocks unrestricted share", () => {
    const memory = createMemoryStore();
    memory.putPersonal("textile_ai", { key: "fabric", value: "denim notes" });
    expect(memory.getPersonal("textile_ai", "electronics_ai").code).toBe("PERSONAL_MEMORY_DENIED");
    expect(memory.getPersonal("textile_ai", "textile_ai").ok).toBe(true);
    expect(canShare({ fromId: "textile_ai", toId: "electronics_ai", classification: CLASSIFICATION.PERSONAL })).toBe(
      false
    );
    expect(canShare({ fromId: "pusat", toId: "dogu_bey", classification: CLASSIFICATION.SHARED })).toBe(true);
  });

  it("runs a daily meeting with minutes and carry-over", () => {
    const meetings = createMeetingService();
    const opened = meetings.openDaily({
      participantIds: ["pusat", "dogu_bey", "textile_ai", "esat_bey"],
    });
    expect(opened.ok).toBe(true);
    expect(meetings.report({ meetingId: opened.meeting.id, speakerId: "textile_ai", summary: "No new SKUs" }).ok).toBe(
      true
    );
    expect(meetings.decide({ meetingId: opened.meeting.id, text: "Ask Doğu Bey for denim sourcing" }).ok).toBe(true);
    const task = meetings.assign({
      meetingId: opened.meeting.id,
      title: "Research denim mills",
      assigneeId: "dogu_bey",
      dueAt: "2026-11-02",
    });
    expect(task.ok).toBe(true);
    const closed = meetings.close({ meetingId: opened.meeting.id });
    expect(closed.minutes.carryOver).toHaveLength(1);
    expect(closed.minutes.reports[0].role).toBe("category_expert");
  });

  it("marks unsourced research UNVERIFIED and routes sourced work through Pusat", () => {
    const desk = createDoguDesk();
    const req = desk.requestResearch({
      fromId: "automotive_ai",
      topic: "suppliers",
      question: "Who supplies brake pads in DE?",
    });
    const unverified = desk.complete({ requestId: req.request.id, findings: "guess" });
    expect(unverified.report.verification).toBe("UNVERIFIED");
    const sourced = desk.complete({
      requestId: req.request.id,
      findings: "See official list",
      sources: [{ url: "https://example.com/source", retrievedAt: "2026-10-22" }],
    });
    expect(sourced.report.verification).toBe("SOURCED");
    const routed = desk.evaluateAndRoute({
      reportId: sourced.report.id,
      evaluatorId: "automotive_ai",
      developmentTask: "Add brake-pad attributes",
    });
    expect(routed.routed).toBe(true);
    expect(routed.task.routedBy).toBe("pusat");
  });

  it("preserves the 48-category master tree", () => {
    const experts = createCategoryExperts();
    expect(experts.treePreserved).toBe(true);
    expect(experts.hubCount).toBe(3);
    expect(experts.hubs.map((h) => h.shop_id)).toEqual(["cat-54", "cat-55", "cat-56"]);
    expect(experts.expertForCode("bz.01").id).toBe("automotive_ai");
    expect(createTask({ fromId: "unknown", title: "x", assigneeId: "pusat" }).code).toBe("PERMISSION_DENIED");
  });

  it("wires durable council actions through Pusat without money writes", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const council = pusat.executeReadOnly("GET_COUNCIL", {});
    expect(council.ok).toBe(true);
    expect(council.data.length).toBeGreaterThan(5);
    const meeting = pusat.executeReadOnly("OPEN_MEETING", { chairId: "pusat" });
    expect(meeting.data.id).toMatch(/^meet_/);
    const mem = pusat.executeReadOnly("MEMORY_PUT", { ownerId: "textile_ai", key: "x", value: "y" });
    const denied = pusat.executeReadOnly("MEMORY_GET", { ownerId: "textile_ai", requesterId: "electronics_ai" });
    expect(denied.data.code).toBe("PERSONAL_MEMORY_DENIED");
    const req = pusat.executeReadOnly("RESEARCH_REQUEST", {
      fromId: "textile_ai",
      topic: "markets",
      question: "denim",
    });
    const done = pusat.executeReadOnly("RESEARCH_COMPLETE", { requestId: req.data.id, findings: "n" });
    expect(done.data.verification).toBe("UNVERIFIED");
    const trade = pusat.executeReadOnly("SCREEN_TRADE", { destination: "US", value: 50 });
    expect(trade.data.status).toBe("HUMAN_REVIEW");
    const holds = pusat.executeReadOnly("LIST_TRADE_HOLDS", {});
    expect(holds.data.length).toBeGreaterThan(0);
    expect(pusat.executeReadOnly("CREATE_ORDER", {}).code).toBe("PERMISSION_DENIED");
    expect(mem.data.key).toBe("x");
  });

  it("holds high-risk work for humans; Esat is not sole defense", () => {
    const approvals = createApprovalCenter();
    const held = approvals.submit({ action: "LIVE_PAYMENT", requestedBy: "finance_ai", risk: RISK.CRITICAL });
    expect(held.item.status).toBe("WAITING_APPROVAL");
    expect(roster().find((m) => m.id === "esat_bey").soleDefense).toBe(false);
    expect(roster().find((m) => m.id === "nesrin_hanim").cannotChair).toBe(true);
  });
});
