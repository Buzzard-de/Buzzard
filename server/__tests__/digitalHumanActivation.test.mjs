import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("real-time digital human activation", () => {
  beforeEach(() => {
    process.env.ORCHESTRATOR_ENABLED = "1";
    process.env.EMBODIED_AI_ENABLED = "1";
    delete process.env.AVATAR_PROVIDER;
    delete process.env.AVATAR_API_KEY;
    delete process.env.AVATAR_BASE_URL;
    delete process.env.VIDEO_PROVIDER;
    delete process.env.VIDEO_API_KEY;
  });

  afterEach(() => {
    delete process.env.ORCHESTRATOR_ENABLED;
    delete process.env.EMBODIED_AI_ENABLED;
    delete process.env.AVATAR_PROVIDER;
    delete process.env.AVATAR_API_KEY;
    delete process.env.AVATAR_BASE_URL;
    delete process.env.AVATAR_CAPABILITIES;
  });

  it("does not claim avatar capabilities for speech-only providers", () => {
    const { listCatalog } = require("../lib/orchestrator/embodied/capabilityRegistry");
    const catalog = listCatalog();
    expect(catalog.openai.capabilities).not.toContain("AVATAR");
    expect(catalog.twilio.capabilities).toEqual(["TELEPHONY"]);
  });

  it("keeps the generic avatar adapter honest without credentials", () => {
    const avatar = require("../lib/orchestrator/embodied/avatarProvider");
    const created = avatar.createSession();
    expect(created.ok).toBe(false);
    expect(created.code).toBe("AVATAR_PROVIDER_NOT_CONFIGURED");
    expect(created.live).toBe(false);
    expect(created.fallback.mode).toBe("CSS_3D_FALLBACK");
  });

  it("does not mark a named provider live without a base URL", () => {
    process.env.AVATAR_PROVIDER = "generic";
    process.env.AVATAR_API_KEY = "sk-test";
    const avatar = require("../lib/orchestrator/embodied/avatarProvider");
    const created = avatar.createSession();
    expect(created.code).toBe("AVATAR_PROVIDER_NOT_WIRED");
    expect(created.live).toBe(false);
  });

  it("blocks private avatar base URLs", async () => {
    process.env.AVATAR_PROVIDER = "generic";
    process.env.AVATAR_API_KEY = "sk-test";
    process.env.AVATAR_BASE_URL = "http://127.0.0.1:9";
    const avatar = require("../lib/orchestrator/embodied/avatarProvider");
    const auth = await avatar.authenticate();
    expect(auth.ok).toBe(false);
    expect(auth.code).toBe("SSRF_BLOCKED");
  });

  it("locks visemes to audio duration instead of random mouth motion", () => {
    const { buildTimeline, visemeAt, silence } = require("../lib/orchestrator/embodied/visemeEngine");
    const timeline = buildTimeline({ text: "halo", durationMs: 800 });
    expect(timeline.audioLocked).toBe(true);
    expect(timeline.random).toBe(false);
    expect(timeline.durationMs).toBe(800);
    expect(timeline.frames[0].startMs).toBe(0);
    expect(timeline.frames.at(-1).endMs).toBe(800);
    expect(visemeAt(timeline, 10)).toBeTruthy();
    expect(silence().interrupted).toBe(true);
  });

  it("does not claim audio-locked lips without audio timing", () => {
    const { buildTimeline } = require("../lib/orchestrator/embodied/visemeEngine");
    const timeline = buildTimeline({ text: "hi" });
    expect(timeline.audioLocked).toBe(false);
    expect(timeline.source).toBe("grapheme-unscheduled");
  });

  it("blends body poses without inventing a live stream", () => {
    const { blend, transition } = require("../lib/orchestrator/embodied/bodyAnimation");
    expect(blend(0, 10, 0.5)).toBe(5);
    expect(transition("idle", "walk").stages).toContain("walk");
    expect(transition("fly", "moon").hardCut).toBe(true);
  });

  it("keeps world coordinates camera-independent", () => {
    const { createOfficeWorld } = require("../lib/orchestrator/embodied/worldGraph");
    const { snapshot, consistentAcrossCameras } = require("../lib/orchestrator/embodied/worldState");
    const world = createOfficeWorld();
    const snap = snapshot(world, { position: { x: 5, y: 0, z: 3 }, orientation: 0 });
    const cabinet = consistentAcrossCameras(world, "cabinet");
    expect(snap.objects.find((row) => row.id === "cabinet").position).toEqual(cabinet.position);
    expect(world.objects.some((row) => row.id === "drawer")).toBe(true);
    expect(world.objects.some((row) => row.id === "plant_front")).toBe(true);
  });

  it("separates CODE_READY from PROVIDER_READY", () => {
    const { validateEmbodied } = require("../lib/orchestrator/embodied/validator");
    const report = validateEmbodied();
    expect(report.codeReady.avatarAdapter).toBe("READY");
    expect(report.providerReady.avatar).toBe("NOT_CONFIGURED");
    expect(report.productionReady.avatar).toBe("BLOCKED");
    expect(report.realAvatarActive).toBe(false);
    expect(report.code).toBe("BLOCKED_BY_PROVIDER_CONFIGURATION");
  });

  it("stops lip sync on interrupt", async () => {
    const runtime = require("../lib/orchestrator/embodied/runtime");
    const created = runtime.createSession({ language: "tr" });
    const turn = await runtime.handleTurn(created.session.id, {
      message: "merhaba",
      interrupt: true,
      language: "tr",
    });
    expect(turn.session.state).toBeTruthy();
    const { silence } = require("../lib/orchestrator/embodied/visemeEngine");
    expect(silence().frames[0].viseme).toBe("SILENCE");
  });

  it("still refuses fake phone animation without a live provider", () => {
    const { createOfficeWorld } = require("../lib/orchestrator/embodied/worldGraph");
    const { startCall } = require("../lib/orchestrator/embodied/actions");
    expect(startCall(createOfficeWorld(), { callAuthorized: true, callProviderLive: false }).code).toBe(
      "PHONE_PROVIDER_NOT_CONFIGURED"
    );
  });

  it("picks additional report plans without requiring identical sequences", () => {
    const { candidatePlans } = require("../lib/orchestrator/embodied/behaviorPlanner");
    const plans = candidatePlans("raporu getir", { documentFound: true, engineResultOk: true });
    expect(plans.length).toBeGreaterThanOrEqual(5);
  });
});
