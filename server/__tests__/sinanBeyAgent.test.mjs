import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createSinanBeyAgent } = require("../lib/pusat/sinanBeyAgent.js");
const { createDurable } = require("../lib/pusat/durable.js");
const { db } = require("../lib/db.js");
const { canShare, CLASSIFICATION, getMember } = require("../lib/pusat/council.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("Sinan Bey agent (isolated, not live)", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
  });

  it("has a distinct identity, instruction, and isolated personal memory", () => {
    expect(getMember("sinan_bey").role).toBe("software_architect");
    const agent = createSinanBeyAgent({ db });
    const profile = agent.profile();
    expect(profile.id).toBe("sinan_bey");
    expect(profile.title).toBe("Buzzard Baş Yazılım Mimarı");
    expect(profile.instruction.coordinator).toBe("pusat");
    expect(profile.productionWrite).toBe(false);
    expect(isSalesEnabled()).toBe(false);

    const store = createDurable(db);
    store.putMemory({ ownerId: "sinan_bey", key: "decision", value: "hold-on-unknown" });
    store.putMemory({ ownerId: "dogu_bey", key: "secret-research", value: "not-for-sinan" });
    expect(store.getMemory({ ownerId: "sinan_bey", requesterId: "dogu_bey" }).code).toBe("PERSONAL_MEMORY_DENIED");
    expect(store.getMemory({ ownerId: "dogu_bey", requesterId: "sinan_bey" }).code).toBe("PERSONAL_MEMORY_DENIED");
    const own = store.getMemory({ ownerId: "sinan_bey", requesterId: "sinan_bey" });
    expect(own.ok).toBe(true);
    expect(own.records.some((r) => r.key === "decision")).toBe(true);
    expect(canShare({ fromId: "sinan_bey", toId: "textile_ai", classification: CLASSIFICATION.PERSONAL })).toBe(false);
  });

  it("accepts Pusat tasks, reports, and never self-marks LIVE_VERIFIED", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const assigned = pusat.executeReadOnly("SINAN_ASSIGN", { title: "review-order-engine" }, { actorId: "pusat" });
    expect(assigned.ok).toBe(true);
    const taskId = assigned.data.id;
    const accepted = pusat.executeReadOnly("SINAN_ACCEPT", { taskId }, { actorId: "sinan_bey" });
    expect(accepted.data.status).toBe("IN_PROGRESS");
    const reported = pusat.executeReadOnly(
      "SINAN_REPORT",
      {
        taskId,
        status: "TESTED",
        testResult: "unit-pass",
        branch: "cursor/sinan-bey-agent-c293",
        body: { note: "tests are not live proof" },
      },
      { actorId: "sinan_bey" },
    );
    expect(reported.data.liveVerified).toBe(false);
    expect(reported.data.testedIsNotLive).toBe(true);
    const agent = createSinanBeyAgent({ db });
    expect(agent.durable.setStatus({ taskId, status: "LIVE_VERIFIED" }).code).toBe("LIVE_VERIFIED_FORBIDDEN");
  });

  it("analyzes allowlisted code, blocks human gates, and does not fake meeting or voice", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = require("../lib/pusat/runtime.js");
    const analysis = pusat.executeReadOnly("SINAN_ANALYZE", { domain: "pusat_orchestrator" }, { actorId: "sinan_bey" });
    expect(analysis.data.ok).toBe(true);
    expect(analysis.data.productionMutation).toBe(false);
    const deniedPath = pusat.executeReadOnly("SINAN_ANALYZE", { relativePath: "../outside" }, { actorId: "sinan_bey" });
    expect(deniedPath.data.ok === false || deniedPath.data.code === "PATH_DENIED" || deniedPath.data.kind === "missing").toBe(
      true,
    );

    const gate = pusat.executeReadOnly("SINAN_GATE", { gate: "GIT_PUSH" }, { actorId: "sinan_bey" });
    expect(gate.data.item.status).toBe("WAITING_APPROVAL");
    expect(pusat.executeReadOnly("CREATE_ORDER", {}).code).toBe("PERMISSION_DENIED");

    const agent = createSinanBeyAgent({ db });
    const skipped = agent.attendMeeting({ meetingId: "meet_x", present: false });
    expect(skipped.attended).toBe(false);
    expect(skipped.faked).toBe(false);
    expect(agent.didAttend("meet_x")).toBe(false);
    const present = agent.attendMeeting({ meetingId: "meet_y", present: true, summary: "risk: sales still closed" });
    expect(present.attended).toBe(true);
    expect(agent.didAttend("meet_y")).toBe(true);

    const voice = pusat.executeReadOnly("SINAN_VOICE", {}, { actorId: "sinan_bey" });
    expect(voice.data.liveCalls).toBe(false);
    expect(voice.data.completeClaim).toBe(false);
    expect(voice.data.stt).toBe(false);
    expect(voice.data.avatar).toBe("/council/sinan-bey.png");
  });

  it("snapshots and restores only Sinan personal memory locally (not offsite)", () => {
    const agent = createSinanBeyAgent({ db });
    const store = createDurable(db);
    store.putMemory({ ownerId: "sinan_bey", key: "arch", value: "modular-monolith" });
    const bak = agent.backupPersonalMemory();
    expect(bak.ok).toBe(true);
    expect(bak.offsite).toBe(false);
    expect(bak.completeClaim).toBe(false);
    const restored = agent.restorePersonalMemory(bak.snapshot);
    expect(restored.ok).toBe(true);
    expect(store.getMemory({ ownerId: "sinan_bey", requesterId: "sinan_bey" }).records.some((r) => r.key === "arch")).toBe(
      true,
    );
    expect(agent.durable.listAudit().length).toBeGreaterThan(0);
  });
});
