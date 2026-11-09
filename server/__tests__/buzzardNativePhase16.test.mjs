import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { lab32110 } = require("../lib/buzzardNative/memory/localCopies.js");
const { runPhase16 } = require("../lib/buzzardNative/thinking/phase16Run.js");
const { matrix } = require("../lib/buzzardNative/platform/engineStatus.js");

describe("Phase 16 memory and backup lab", () => {
  it("detects tamper on local copies and does not claim offsite 3-2-1-1-0", () => {
    const lab = lab32110();
    expect(lab.copies).toBe(3);
    expect(lab.tamperDetected).toBe(true);
    expect(lab.offsite).toBe(false);
    expect(lab.completeClaim).toBe(false);
    const p = runPhase16();
    expect(p.isolationDenied).toBe(true);
    expect(p.alwaysOn.alwaysOnHost).toBe("NOT_IMPLEMENTED");
    expect(p.liveVerified).toBe(false);
    expect(matrix().memory.offsiteBackup).toBe("NOT_IMPLEMENTED");
  });
});
