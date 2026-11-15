import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createRouter } = require("../lib/buzzardNative/core/taskRouter.js");

describe("17-agent task and report history", () => {
  it("keeps start, waiting, and approval distinct and refuses a duplicate result", () => {
    const router = createRouter();
    const created = router.create({ title: "council report", fromId: "pusat" });
    router.assign({ taskId: created.task.id, agentId: "sinan_bey", fromId: "pusat" });
    router.assign({ taskId: created.task.id, agentId: "esat_bey", fromId: "pusat" });
    const ran = router.runAssigned(created.task.id);
    expect(ran.ok).toBe(true);
    expect(ran.completed).toBe(false);
    expect(ran.task.state).toBe("APPROVAL_REQUIRED");
    expect(ran.task.state).not.toBe("COMPLETED");
    expect(ran.task.reports.map((report) => report.agentId)).toEqual(["sinan_bey", "esat_bey"]);
    expect(ran.task.reports[0].expertise).not.toEqual(ran.task.reports[1].expertise);
    const states = ran.task.history.map((event) => event.state);
    expect(states).toContain("IN_PROGRESS");
    expect(states).toContain("WAITING");
    expect(states).toContain("APPROVAL_REQUIRED");
    expect(states).not.toContain("COMPLETED");
    expect(states).not.toContain("FAILED");
    const again = router.runAssigned(created.task.id);
    expect(again.code).toBe("DUPLICATE_RESULT");
    expect(again.completed).toBe(false);
    expect(router.get(created.task.id).reports).toHaveLength(2);
    expect(router.forceComplete().code).toBe("HUMAN_GATE_REQUIRED");
    expect(router.get(created.task.id).state).toBe("APPROVAL_REQUIRED");
    const ledger = router.history();
    expect(ledger).toHaveLength(1);
    expect(ledger[0].requestedBy).toBe("pusat");
    expect(ledger[0].completed).toBe(false);
    expect(ledger[0].reports.map((report) => report.agentId)).toEqual(["sinan_bey", "esat_bey"]);
  });

  it("records a failure without completing the task and blocks a forged report", () => {
    const router = createRouter();
    const created = router.create({ title: "isolated report", fromId: "pusat" });
    router.assign({ taskId: created.task.id, agentId: "banu_hanim", fromId: "pusat" });
    router.assign({ taskId: created.task.id, agentId: "sinan_bey", fromId: "pusat" });
    const forged = router.recordReport({
      taskId: created.task.id,
      actorId: "sinan_bey",
      agentId: "banu_hanim",
      summary: "forged",
    });
    expect(forged.code).toBe("REPORT_IDENTITY_MISMATCH");
    expect(forged.recorded).toBe(false);
    expect(router.get(created.task.id).reports).toHaveLength(0);
    const outsider = router.assign({ taskId: created.task.id, agentId: "mira", fromId: "banu_hanim" });
    expect(outsider.ok).toBe(false);
    expect(router.get(created.task.id).assignees).toEqual(["banu_hanim", "sinan_bey"]);
    const failed = router.recordReport({
      taskId: created.task.id,
      actorId: "banu_hanim",
      agentId: "banu_hanim",
      summary: "customer path blocked",
      ok: false,
      code: "PROBE_FAILED",
    });
    expect(failed.completed).toBe(false);
    expect(failed.task.state).toBe("FAILED");
    expect(failed.task.state).not.toBe("COMPLETED");
    const repeated = router.recordReport({
      taskId: created.task.id,
      actorId: "banu_hanim",
      agentId: "banu_hanim",
      summary: "customer path blocked",
      ok: false,
      code: "PROBE_FAILED",
    });
    expect(repeated.code).toBe("DUPLICATE_REPORT");
    expect(router.get(created.task.id).reports).toHaveLength(1);
    const sinan = router.recordReport({
      taskId: created.task.id,
      actorId: "sinan_bey",
      agentId: "sinan_bey",
      summary: "architecture note",
    });
    expect(sinan.recorded).toBe(true);
    expect(sinan.completed).toBe(false);
    expect(router.get(created.task.id).state).toBe("FAILED");
    const reports = router.get(created.task.id).reports;
    expect(reports.find((report) => report.agentId === "banu_hanim").summary).toBe("customer path blocked");
    expect(reports.find((report) => report.agentId === "sinan_bey").summary).toBe("architecture note");
    expect(reports.find((report) => report.agentId === "sinan_bey").ok).toBe(true);
    expect(router.history()[0].completed).toBe(false);
    expect(router.history()[0].events.some((event) => event.state === "FAILED" && event.agentId === "banu_hanim")).toBe(true);
    expect(router.forceComplete().code).toBe("HUMAN_GATE_REQUIRED");
  });
});
