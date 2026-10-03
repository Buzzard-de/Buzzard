import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createGoLiveGate } = require("../lib/goLiveGate.js");
const { createGoLiveActivation } = require("../lib/goLiveActivation.js");
const { EXACT, PUBLIC_ROUTES } = require("../lib/routePermissions.js");

describe("goLiveSafety", () => {
  it("keeps kill switch, bypass, writes, and payment/supplier/marketplace off", () => {
    const env = {
      BUZZARD_PRODUCT_SOT_ACTIVE: "0",
      BUZZARD_SALES_ENABLED: "0",
      BUZZARD_SUPPLIER_ORDERS_ENABLED: "0",
      BUZZARD_PAYMENT_LIVE: "0",
      BUZZARD_PRODUCTION_SALES_KILL_SWITCH: "1",
    };
    const gate = createGoLiveGate({ env, productionSafetyLock: true });
    const safe = gate.safety();
    expect(safe.salesLocked).toBe(true);
    expect(safe.supplierOrders).toBe(false);
    expect(safe.payments).toBe(false);
    expect(safe.marketplaceWrites).toBe(false);
    expect(safe.killSwitch).toBe(true);

    const activation = createGoLiveActivation({
      env,
      mutateEnv: false,
      force: true,
      getApproval: () => ({ id: "x", status: "APPROVED", resourceType: "GO_LIVE_PRODUCTION" }),
    });
    const bypassed = activation.activateProduction({ approvalId: "x", correlationId: "corr_safe" });
    expect(bypassed.ok).toBe(false);
    expect(bypassed.code).toBe("BYPASS_FORBIDDEN");
    expect(env.BUZZARD_SALES_ENABLED).toBe("0");
  });

  it("registers authenticated go-live routes and a public aggregate health path", () => {
    expect(PUBLIC_ROUTES.has("GET /api/health/go-live")).toBe(true);
    expect(EXACT["GET /api/admin/system/go-live"]).toBe("system.read");
    expect(EXACT["GET /api/admin/system/go-live/checks"]).toBe("system.read");
    expect(EXACT["POST /api/admin/system/go-live/activate"]).toBe("system.configure");
    expect(EXACT["POST /api/admin/system/go-live/deactivate"]).toBe("system.configure");
  });
});
