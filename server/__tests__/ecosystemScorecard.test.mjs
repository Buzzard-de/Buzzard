import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildScorecard } = require("../lib/ecosystem/scorecard.js");
const { assess, submitFiling, enqueueCountryReport } = require("../lib/commerce/taxConnect.js");
const { copyOffsite, isIndependent } = require("../lib/survival/offsiteCopy.js");
const { createRoom, postSignal, readiness } = require("../lib/voice/signaling.js");
const { sandboxAuthorize, capture } = require("../lib/commerce/paymentSandbox.js");

describe("ecosystem remaining-gap closure", () => {
  it("does not claim go-live 100% while sales and deploy need approval", () => {
    const card = buildScorecard();
    expect(card.completeClaim).toBe(false);
    expect(card.softwareCompleteClaim).toBe(true);
    expect(card.softwarePercent).toBe(100);
    expect(card.salesEnabled).toBe(false);
    expect(card.goLivePercent).toBeGreaterThanOrEqual(60);
    expect(card.goLivePercent).toBeLessThan(100);
    expect(card.percent).toBe(card.goLivePercent);
    expect(card.blocked.map((i) => i.id)).toEqual(expect.arrayContaining(["sales_payments", "merge_deploy", "voice_live"]));
    expect(card.items.find((i) => i.id === "e2e_crypto").status).toBe("COMPLETE");
  });

  it("queues tax reports locally and refuses live filing", () => {
    const queued = enqueueCountryReport({ country: "DE", netAmount: 100 });
    expect(queued.ok).toBe(true);
    expect(queued.item.submitted).toBe(false);
    expect(assess().queueReady).toBe(true);
    expect(submitFiling(queued.item.id).ok).toBe(false);
  });

  it("copies offsite only to an independent directory", () => {
    const primary = fs.mkdtempSync(path.join(os.tmpdir(), "bz-pri-"));
    const offsite = fs.mkdtempSync(path.join(os.tmpdir(), "bz-off-"));
    const source = path.join(primary, "snap.bin");
    fs.writeFileSync(source, "offsite-proof");
    expect(isIndependent(primary, offsite)).toBe(true);
    expect(isIndependent(primary, path.join(primary, "nested"))).toBe(false);
    const copied = copyOffsite({ sourcePath: source, primaryRoot: primary, offsiteRoot: offsite });
    expect(copied.ok).toBe(true);
    expect(copied.remoteVault).toBe(false);
  });

  it("exchanges WebRTC signals without live media", () => {
    const room = createRoom({ participants: ["pusat", "dogu_bey"] });
    expect(postSignal({ roomId: room.room.id, kind: "offer", fromId: "pusat", payload: "sdp" }).ok).toBe(true);
    expect(readiness().liveCalls).toBe(false);
    expect(readiness().webrtcCode).toBe(true);
  });

  it("authorizes sandbox payments and refuses capture", () => {
    const hold = sandboxAuthorize({ amount: 10 });
    expect(hold.captured).toBe(false);
    expect(hold.live).toBe(false);
    expect(capture(hold.id).code).toBe("SALES_LOCKED");
  });
});
