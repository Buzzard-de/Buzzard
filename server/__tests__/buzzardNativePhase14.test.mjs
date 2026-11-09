import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { runPhase14 } = require("../lib/buzzardNative/thinking/phase14Run.js");
const { setExpression, speechSync } = require("../lib/buzzardNative/motion/expression.js");

describe("Phase 14 body", () => {
  it("runs expression FSM and speech timeline without claiming 3D or lip-sync", () => {
    expect(setExpression("speaking").ok).toBe(true);
    expect(setExpression("alien").ok).toBe(false);
    const s = speechSync("merhaba");
    expect(s.lipSyncPass).toBe(false);
    expect(s.body3d).toBe(false);
    expect(s.wavMs).toBeGreaterThan(0);
    const p = runPhase14();
    expect(p.avatarExists).toBe(true);
    expect(p.body3d).toBe(false);
    expect(p.official.unchanged).toBe(true);
  });
});
