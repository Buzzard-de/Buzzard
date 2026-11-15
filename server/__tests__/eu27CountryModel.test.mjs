import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  EU27_CODES,
  countries,
  getCountry,
  snapshotRate,
  validateCountry,
  validateCountryModel,
} = require("../lib/buzzardNative/core/tax/countryRegistry.js");

const EURO = ["AT", "BE", "CY", "DE", "EE", "EL", "ES", "FI", "FR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];
const OTHER = { CZ: "CZK", DK: "DKK", HU: "HUF", PL: "PLN", RO: "RON", SE: "SEK" };

describe("EU27 country model", () => {
  it("keeps 27 members, Greece mapping, and no Germany rate default", () => {
    const model = validateCountryModel();
    expect(model.ok).toBe(true);
    expect(model.countries).toBe(27);
    expect(model.commercialReady).toBe(false);
    expect(model.problems).toEqual([]);
    expect(EU27_CODES).toHaveLength(27);
    expect(new Set(EU27_CODES).size).toBe(27);

    const rows = countries();
    expect(rows).toHaveLength(27);
    for (const row of rows) {
      expect(row.vatOfficial).toBe(false);
      expect(row.vatVerified).toBe(false);
      expect(row.verificationStatus).toBe("UNVERIFIED");
      expect(row.liveLegal).toBe(false);
      expect(row.filingReady).toBe(false);
      expect(row.lastVerifiedDate).toBeNull();
      expect(row.lastVerifiedDate).not.toBe(row.snapshotRetrievedAt);
      expect(row.ossIossApplicability).toEqual({ oss: "UNKNOWN", ioss: "UNKNOWN", live: false });
      expect(row.paymentConfig).toBe("UNKNOWN");
      expect(row.shippingConfig).toBe("UNKNOWN");
      expect(row.returnRules).toBe("UNKNOWN");
      expect(row.marketplaceEligibility).toBe("UNKNOWN");
      expect(row.complianceStatus).toBe("UNKNOWN");
      expect(row.taxAuthority).toBe("UNKNOWN");
    }

    expect(getCountry("DE")?.currency).toBe("EUR");
    expect(getCountry("de")?.countryCode).toBe("DE");
    expect(getCountry("PL")?.currency).toBe("PLN");
    expect(getCountry("BG")?.currency).toBe("UNKNOWN");
    expect(getCountry("BG")?.vatOfficial).toBe(false);
    expect(getCountry("GR")).toMatchObject({ countryCode: "EL", iso: "GR" });
    expect(getCountry("EL")).toMatchObject({ countryCode: "EL", iso: "GR" });
    expect(getCountry("ZZ")).toBeNull();
    expect(getCountry("DEU")).toBeNull();
    expect(getCountry("")).toBeNull();

    for (const code of EURO) {
      expect(getCountry(code)?.currency).toBe("EUR");
    }
    for (const [code, currency] of Object.entries(OTHER)) {
      expect(getCountry(code)?.currency).toBe(currency);
    }

    const removed = snapshotRate("FR", { DE: 19 });
    expect(removed.vatStandardRate).toBeNull();
    expect(removed.vatSource).toBe("UNKNOWN");
    expect(removed.vatOfficial).toBe(false);
    expect(snapshotRate("DE", { DE: 19 })).toMatchObject({
      vatStandardRate: 19,
      vatSource: "UNVERIFIED_LOCAL_SNAPSHOT",
      vatOfficial: false,
      vatVerified: false,
    });
    expect(snapshotRate("CY").vatStandardRate).toBe(19);
    expect(getCountry("CY")?.countryCode).not.toBe("DE");
  });

  it("stops invalid, unknown, and unverified countries without a commercial success", () => {
    expect(validateCountry("")).toMatchObject({
      ok: false,
      structural: false,
      code: "COUNTRY_CODE_INVALID",
      currency: "UNKNOWN",
      vatStandardRate: null,
      inheritedGermanyRate: false,
    });
    expect(validateCountry("ZZ")).toMatchObject({
      ok: false,
      structural: false,
      code: "COUNTRY_UNKNOWN",
      vatSource: "UNKNOWN",
      vatOfficial: false,
    });
    const bulgaria = validateCountry("BG");
    expect(bulgaria.structural).toBe(true);
    expect(bulgaria.ok).toBe(false);
    expect(bulgaria.commercialReady).toBe(false);
    expect(bulgaria.code).toBe("COUNTRY_MODEL_UNVERIFIED");
    expect(bulgaria.currency).toBe("UNKNOWN");
    expect(bulgaria.vatOfficial).toBe(false);
    expect(bulgaria.vatVerified).toBe(false);
    expect(bulgaria.missingFields).toEqual(expect.arrayContaining(["currency", "paymentConfig", "shippingConfig", "complianceStatus", "oss", "ioss"]));
    const greece = validateCountry("GR");
    expect(greece).toMatchObject({ structural: true, country: "EL", iso: "GR", commercialReady: false, vatOfficial: false });
  });
});
