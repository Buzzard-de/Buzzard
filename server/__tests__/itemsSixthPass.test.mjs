import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { enforce } = require("../lib/software/control");
const productCore = require("../lib/pim/productCore");
const { capturePayment } = require("../lib/commerce/paymentService");
const { reserve } = require("../lib/commerce/inventoryIntegration");
const { audit } = require("../lib/buzzardNative/engines/digitalHumanCapabilities");
const tecdoc = require("../lib/adapters/tecdocAdapter");

describe("sixth pass gate and providers", () => {
  it("rejects a canonical product write that skips the actor", () => {
    expect(() => productCore.createProduct({ sku: `gate-${Date.now()}`, title: "No actor" })).toThrow(/ACTOR_REQUIRED/);
    const read = enforce({ engine: "product", method: "getProduct", mode: "read" });
    expect(read.ok).toBe(true);
    expect(read.role).toBe("read");
    const admin = enforce({ engine: "product", method: "archiveProduct", mode: "admin" });
    expect(admin.code).toBe("ACTOR_REQUIRED");
    expect(admin.role).toBe("admin");
  });

  it("keeps payment and stock writes closed without an actor and without money", () => {
    expect(capturePayment().code).toBe("ACTOR_REQUIRED");
    expect(capturePayment().realMoneyMovement).toBe(false);
    expect(capturePayment({ actorId: "sixth" }).code).toBe("PAYMENT_NOT_LIVE");
    expect(reserve({ productId: "missing", quantity: 1 }).code).toBe("ACTOR_REQUIRED");
  });

  it("does not pretend a digital body or a live TecDoc catalog", () => {
    const body = audit({ agentId: "mira", avatar: "/council/mira.png", voiceId: "mira-voice" });
    expect(body.engine).toBe("digital_body");
    expect(body.capabilities.speech_out.status).toBe("NOT_IMPLEMENTED");
    expect(body.capabilities.expression.rendered).toBe(false);
    expect(body.capabilities.stand_and_walk.ran).toBe(false);
    const catalog = tecdoc.liveRequirements();
    expect(catalog.live).toBe(false);
    expect(catalog.accountVerified).toBe(false);
    expect(catalog.requiredEnv).toContain("TECDOC_API_KEY");
    return tecdoc.fetchCatalog().then((result) => {
      expect(result.mock).toBe(true);
      expect(result.records).toEqual([]);
    });
  });
});
