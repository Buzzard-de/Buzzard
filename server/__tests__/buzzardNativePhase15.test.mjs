import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { duplexOnce } = require("../lib/buzzardNative/realtime/duplex.js");
const { runPhase15 } = require("../lib/buzzardNative/thinking/phase15Run.js");
const { matrix } = require("../lib/buzzardNative/platform/engineStatus.js");

describe("Phase 15 realtime", () => {
  it("encrypts in-process duplex and does not claim live WebRTC media", () => {
    const d = duplexOnce();
    expect(d.payloadMatch).toBe(true);
    expect(d.encrypted).toBe(true);
    expect(d.liveMedia).toBe(false);
    expect(d.liveCommunicationPass).toBe(false);
    expect(runPhase15().liveMedia).toBe("BLOCKED");
    expect(runPhase15().unauth).toBe("UNAUTHORIZED_ACTOR");
    expect(matrix().realtime.networkMedia).toBe("BLOCKED");
    expect(matrix().realtime.liveMedia).toBe("NOT_IMPLEMENTED");
  });
});
