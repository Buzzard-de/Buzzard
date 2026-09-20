import { describe, it, expect, beforeEach } from "vitest";
import { evaluateHealthDbResponse } from "@/lib/render-persistence-evidence-bridge/healthDbEvaluation";
import { buildRenderPersistenceLiveStatus } from "@/lib/render-persistence-evidence-bridge/persistenceStatus";
import { validateRenderBlueprint } from "@/lib/production-storage-preflight/renderBlueprintValidation";
import { evaluateLivePersistenceFromHealthBody } from "./livePersistenceVerify";
import { parseBuzzardApiFromRenderYaml } from "./parseRenderService";

describe("Render operator assistant — safety", () => {
  beforeEach(() => {
    process.env.SALES_ENABLED = "0";
  });

  it("TEST 1: blueprint present does not validate LIVE_RENDER_DISK", () => {
    const bp = validateRenderBlueprint();
    const live = buildRenderPersistenceLiveStatus();
    if (bp.BLUEPRINT_CONFIGURATION === "PASS") {
      expect(live.LIVE_RENDER_DISK).toBe("UNVERIFIED_EXTERNAL");
    }
  });

  it("TEST 2: correct env path without mount stays UNVERIFIED", () => {
    const evalEphemeral = evaluateHealthDbResponse({
      database: { path: "/var/data/buzzard.db", persistence: { persistent: false } },
    });
    expect(evalEphemeral.meetsLivePersistenceCriteria).toBe(false);
    const live = evaluateLivePersistenceFromHealthBody(
      { database: { path: "/var/data/buzzard.db", persistence: { persistent: false } } },
      200,
      true,
    );
    expect(live.live.LIVE_RENDER_DISK).toBe("UNVERIFIED_EXTERNAL");
  });

  it("TEST 3: local path must not imply LIVE pass", () => {
    const local = evaluateHealthDbResponse({
      database: { path: "server/data/buzzard.db", persistence: { persistent: true } },
    });
    expect(local.meetsLivePersistenceCriteria).toBe(false);
  });

  it("TEST 4: unreachable health stays UNVERIFIED", () => {
    const live = evaluateLivePersistenceFromHealthBody(null, null, false);
    expect(live.live.LIVE_DB_HEALTH).toBe("UNVERIFIED_EXTERNAL");
  });

  it("TEST 5-6: mock/sandbox bodies do not meet live criteria without persistent+path", () => {
    const mock = evaluateHealthDbResponse({ database: { path: "/tmp/x", persistence: { persistent: true } } });
    expect(mock.meetsLivePersistenceCriteria).toBe(false);
  });

  it("parses buzzard-api service from render.yaml", () => {
    const p = parseBuzzardApiFromRenderYaml();
    expect(p.serviceName).toBe("buzzard-api");
    expect(p.mountPath).toBe("/var/data");
    expect(p.dbPathEnv).toBe("/var/data/buzzard.db");
    expect(p.healthDbUrl).toContain("/api/health/db");
  });
});
