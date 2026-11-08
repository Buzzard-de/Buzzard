import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { runPhase13 } = require("../lib/buzzardNative/thinking/phase13Run.js");
const { ocrLanguages } = require("../lib/buzzardNative/vision/imageOps.js");
const { createNativeRuntime } = require("../lib/buzzardNative/runtimeCore.js");

describe("Phase 13 vision", () => {
  it("reads synthetic TR/DE/EN glyphs and diffs frames without general understanding", () => {
    const o = ocrLanguages();
    expect(o.tr.pass).toBe(true);
    expect(o.de.pass).toBe(true);
    expect(o.en.pass).toBe(true);
    const p = runPhase13();
    expect(p.compareSame).toBe(true);
    expect(p.compareDiff).toBe(true);
    expect(p.video.changed).toBeGreaterThan(0);
    expect(p.understand).toBe("NOT_IMPLEMENTED");
    const rt = createNativeRuntime();
    rt.initializeAll();
    expect(rt.engines.get("vision").execute({ op: "understand" }).code).toBe("NOT_IMPLEMENTED");
  });
});
