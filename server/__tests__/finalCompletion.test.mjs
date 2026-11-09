import { createRequire } from "node:module";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { integrate } = require("../lib/platform/completionBus.js");
const { createDurableTaskQueue } = require("../lib/pusat/durableTaskQueue.js");
const { executeReadOnly } = require("../lib/pusat/runtime.js");
const { ids } = require("../lib/buzzardNative/core/identityRegistry.js");
const { SHARED } = require("../lib/security/egressPolicy.js");
const { runIsolatedDisasterDrill } = require("../lib/survival/isolatedDisasterDrill.js");

describe("final connected completion bus", () => {
  it("wires council, engines, CEARS, holidays, tax, memory without claiming live", () => {
    const snap = integrate();
    expect(snap.live).toBe(false);
    expect(snap.productionReady).toBe(false);
    expect(snap.llmCouncil).toBe(false);
    expect(snap.specialists.count).toBe(17);
    expect(snap.specialists.uniqueNamespaces).toBe(true);
    expect(snap.engines.count).toBe(11);
    expect(snap.dropshipping).toBe(true);
    expect(snap.commerce.duplicate.events[1].code).toBe("DUPLICATE_ORDER");
    expect(snap.commerce.payment.events[0].sent).toBe(false);
    expect(snap.desk.sent).toBe(false);
    expect(snap.whatsapp.sent).toBe(false);
    expect(snap.voice.liveCalls).toBe(false);
    expect(snap.holidays.publish.published).toBe(false);
    expect(snap.holidays.ab27).toBe(27);
    expect(snap.streams.streams).toHaveLength(16);
    expect(snap.tax.fr.emergencyReserve).toBe(25);
    expect(snap.tax.de.emergencyReserve).toBe(0);
    expect(snap.incident.notify.reachedNetwork).toBe(false);
    expect(snap.incident.worm).toBe(true);
    expect(snap.memory.personalCrossDenied).toBe(true);
    expect(snap.taxonomy.mergedPr492).toBe(false);
    expect(snap.taxonomy.approvedReviewRows).toBe(false);
    expect(snap.egressDefault).toBe("DENY");
    expect(SHARED.default).toBe("DENY");
  });

  it("Pusat integrated status is dry-run", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const r = executeReadOnly("INTEGRATED_PLATFORM_STATUS", {}, { actorId: "pusat" });
    expect(r.ok).toBe(true);
    expect(r.data.live).toBe(false);
    expect(r.data.specialists.count).toBe(17);
  });
});

describe("durable queue concurrency and council dispatch", () => {
  it("never double-leases the same task and recovers after restart", () => {
    const dbPath = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-final-")), "orch.sqlite");
    const q = createDurableTaskQueue({ dbPath });
    for (const id of ids()) {
      q.enqueue({ title: `ping-${id}`, ownerId: "pusat", assigneeId: id, priority: "P2" });
    }
    const seen = new Set();
    for (;;) {
      const leased = q.lease({ workerId: "wA" });
      if (!leased.ok) break;
      expect(seen.has(leased.task.id)).toBe(false);
      seen.add(leased.task.id);
    }
    expect(seen.size).toBe(17);
    q.close();
    const q2 = createDurableTaskQueue({ dbPath });
    expect(q2.recoverLeases().recovered).toBe(17);
    const first = q2.lease({ workerId: "wB" });
    expect(first.ok).toBe(true);
    q2.close();
  });
});

describe("isolated DR still not production", () => {
  it("drill remains ISOLATED_RESTORE_TESTED", () => {
    const drill = runIsolatedDisasterDrill();
    expect(drill.status).toBe("ISOLATED_RESTORE_TESTED");
    expect(drill.productionDrVerified).toBe(false);
  });
});
