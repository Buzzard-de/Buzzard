import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { denyGate, meeting } = require("../lib/buzzardNative/platform/councilOps.js");
const { runPhase17 } = require("../lib/buzzardNative/thinking/phase17Run.js");
const { identities } = require("../lib/buzzardNative/platform/identity.js");

describe("Phase 17 council", () => {
  it("blocks human gates and does not fake missing members or mix identities", () => {
    expect(denyGate("GIT_PUSH").executed).toBe(false);
    expect(denyGate("DEPLOY").code).toBe("HUMAN_GATE_REQUIRED");
    const m = meeting({ present: ["pusat", "sinan_bey", "esat_bey"] });
    expect(m.absent).toContain("dogu_bey");
    expect(m.fakeAttendance).toBe(false);
    expect(m.voiceReport.officialVoiceUsed).toBe(false);
    expect(identities().sinan_bey.id).toBe("sinan_bey");
    expect(identities().identityMixForbidden).toBe(true);
    expect(runPhase17().push.executed).toBe(false);
  });
});
