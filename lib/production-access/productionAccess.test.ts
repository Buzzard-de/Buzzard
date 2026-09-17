import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildMissingProductionAccessReport,
  resolveInterCarsSecretRef,
  buildInterCarsAccessChecklist,
} from "./index";
import { resetSupplierEngineForTests } from "@/lib/supplier-engine/testReset";
import { getSupplier } from "@/lib/supplier-engine/registry";
import { getInterCarsSupplierId } from "@/lib/supplier-inter-cars-production-access/config";

const ORIGINAL = { ...process.env };

describe("Missing production access diagnostics", () => {
  beforeEach(() => {
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.SALES_ENABLED = "0";
    delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    delete process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("Inter Cars secret NOT_CONFIGURED without credentials", () => {
    const secret = resolveInterCarsSecretRef();
    expect(secret.secretResolvable).toBe(false);
    expect(secret.credentialStatus).toBe("NOT_CONFIGURED");
  });

  it("blocks mock credentials", () => {
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    resetSupplierEngineForTests();
    getSupplier(getInterCarsSupplierId());
    process.env.SUPPLIER_LIVE_CREDENTIALS = JSON.stringify({ accessToken: "mock-token" });
    const secret = resolveInterCarsSecretRef();
    expect(secret.secretResolvable).toBe(true);
    expect(secret.credentialStatus).toBe("BLOCKED");
  });

  it("access checklist never marks #342 VALIDATED without evidence", () => {
    process.env.SUPPLIER_LIVE_PROFILE = "inter-cars";
    const checklist = buildInterCarsAccessChecklist(resolveInterCarsSecretRef());
    const cv = checklist.find((c) => c.id === "ic_controlled_validation");
    expect(cv?.status).toBe("UNVERIFIED");
  });

  it("missing access report sales CLOSED and zero side effects", () => {
    const report = buildMissingProductionAccessReport();
    expect(report.sales).toBe("CLOSED");
    expect(report.realSideEffects.realSupplierOrders).toBe(0);
    expect(report.interCars.liveValidation).not.toBe("VALIDATED");
    expect(report.blockers.length).toBeGreaterThan(0);
  });

  it("never enables production flags in report", () => {
    const report = buildMissingProductionAccessReport();
    expect(report.productionFlags.SALES).toBe("OFF");
    expect(report.productionFlags.SUPPLIER_ORDER_NETWORK).toBe("OFF");
  });
});
