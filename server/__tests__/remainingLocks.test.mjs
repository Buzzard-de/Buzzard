import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { put, get, resetVaults, countries } = require("../lib/privacy/countryVault.js");
const { reviewRequest } = require("../lib/privacy/authorityGate.js");
const { assessBackupLock } = require("../lib/survival/backupLock.js");
const { resetEsat, recent } = require("../lib/security/esatBey.js");

describe("remaining software locks", () => {
  afterEach(() => {
    resetVaults();
    resetEsat();
  });

  it("keeps 27 country files isolated", () => {
    expect(countries()).toHaveLength(27);
    expect(put({ country: "DE", actorCountry: "DE", key: "tax", value: 1 }).ok).toBe(true);
    const cross = get({ country: "DE", actorCountry: "FR", key: "tax" });
    expect(cross.ok).toBe(false);
    expect(cross.code).toBe("COUNTRY_ISOLATION");
    expect(cross.esat.hold).toBe(true);
    expect(recent().some((e) => e.type === "COUNTRY_CROSS_SHARE")).toBe(true);
  });

  it("blocks phishing authority mail and does not auto-stop a claimed binding order", () => {
    const phish = reviewRequest({
      sender: "it-support@gmail.com",
      body: "verify your password",
      claimedAgency: "Finanzamt",
    });
    expect(phish.status).toBe("BLOCKED");
    expect(phish.esat.hold).toBe(true);
    const order = reviewRequest({ bindingOrder: true, claimedAgency: "Amtsgericht" });
    expect(order.obstructLawfulProcess).toBe(false);
    expect(order.humanReview).toBe(true);
    expect(order.code).toBe("BINDING_ORDER_REVIEW");
  });

  it("refuses to call local backup a finished 3-2-1-1-0", () => {
    const lock = assessBackupLock({ offsiteDir: "", wormConfirmed: false });
    expect(lock.completeClaim).toBe(false);
    expect(lock.missing).toEqual(expect.arrayContaining(["OFFSITE_DIR", "WORM_CONFIRMED"]));
  });
});
