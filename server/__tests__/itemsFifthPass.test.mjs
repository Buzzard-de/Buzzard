import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { encodeQrSvg, formatBits } = require("../lib/commerce/dryQr");
const { phase3Identity, verifyPayment, cancelDryPayment, refundDryPayment, paymentTimeout } = require("../lib/commerce/phase3Identity");
const { invoke, boundMethods } = require("../lib/software/control");
const { audit, CAPABILITIES } = require("../lib/buzzardNative/engines/digitalHumanCapabilities");

describe("fifth pass identity, gate and body", () => {
  it("encodes a dry payment address as a QR and does not collect money", () => {
    const identity = phase3Identity("dry-order-5", { amount: 12.5, currency: "EUR" });
    expect(identity.payable).toBe(false);
    expect(identity.paymentStatus).toBe("UNPAID");
    expect(identity.provider).toBeNull();
    expect(identity.qr.paymentUrl).toBeNull();
    expect(identity.qr.roundTrip).toBe(true);
    expect(identity.qr.svg.startsWith("<svg")).toBe(true);
    expect(identity.paymentAddress.startsWith("buzzard://dry-pay/")).toBe(true);
    expect(identity.amount).toBe(12.5);
    const mark = encodeQrSvg(identity.paymentAddress);
    expect(mark.roundTrip).toBe(true);
    expect(mark.decoded.payload).toBe(identity.paymentAddress);
    expect(formatBits()).toBe(0b111011111000100);
    expect(verifyPayment(identity).code).toBe("PAYMENT_NOT_LIVE");
    expect(verifyPayment(identity).realMoneyMovement).toBe(false);
    expect(cancelDryPayment().refunded).toBe(false);
    expect(refundDryPayment().customerRefundIssued).toBe(false);
    expect(paymentTimeout().code).toBe("PAYMENT_TIMEOUT");
  });

  it("requires an actor at the software gate and blocks a second write target", () => {
    expect(invoke({ engine: "payment", method: "capturePayment" }).code).toBe("ACTOR_REQUIRED");
    const capture = invoke({ engine: "payment", method: "capturePayment", actorId: "gate-test" });
    expect(capture.result.code).toBe("PAYMENT_NOT_LIVE");
    expect(capture.decides).toBe(false);
    expect(capture.orchestrator).toBe(false);
    const dual = invoke({
      engine: "product",
      method: "assertNoDualWrite",
      args: { targets: ["D", "legacy"] },
      actorId: "gate-test",
    });
    expect(dual.ok).toBe(false);
    expect(dual.code).toBe("DUAL_WRITE_FORBIDDEN");
    expect(boundMethods()).toContain("pricing.quotePrice");
    expect(invoke({ engine: "missing", method: "nope", actorId: "gate-test" }).code).toBe("ENGINE_METHOD_UNKNOWN");
  });

  it("keeps one body engine and does not mark speech or walking ready", () => {
    const sinan = audit({ agentId: "sinan_bey", avatar: "/council/sinan-bey.png", voiceId: "sinan_bey_official_voice_v1" });
    const amelia = audit({ agentId: "amelia", avatar: "/council/amelia.png", voiceId: "amelia-voice" });
    expect(sinan.engine).toBe(amelia.engine);
    expect(sinan.profile.agentId).not.toBe(amelia.profile.agentId);
    expect(sinan.profile.avatar).not.toBe(amelia.profile.avatar);
    expect(CAPABILITIES).toHaveLength(12);
    expect(sinan.ready).toEqual(["expression", "separate_profile"]);
    for (const name of ["speech_out", "speech_in", "tts", "lip_sync", "arm_gesture", "full_body_animation", "stand_and_walk", "sit_and_stand", "object_interaction", "wardrobe"]) {
      expect(sinan.capabilities[name].status).toBe("NOT_IMPLEMENTED");
    }
  });
});
