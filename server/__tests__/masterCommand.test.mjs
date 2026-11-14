import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { roster } = require("../lib/pusat/council.js");
const { SEED_IDS } = require("../lib/buzzardNative/core/identityRegistry.js");
const { exchangeClassification } = require("../lib/commerce/taxCustomsBridge.js");
const { payTax, postNetIncome, resetPools } = require("../lib/commerce/taxPools.js");

describe("master command locks", () => {
  it("keeps approved council roles without granting sales or payment power", () => {
    expect(roster().map((member) => member.id)).toEqual([...SEED_IDS]);
    expect(roster().some((member) => ["nesrin_hanim", "finance_ai", "customs_ai", "phone_ai"].includes(member.id))).toBe(false);
    expect(roster().find((member) => member.id === "sales_analysis_ai").canEnableSales).toBe(false);
    expect(roster().find((member) => member.id === "zeynep_hanim").liveCalls).toBe(false);
    const legacy = roster("legacy");
    expect(legacy.map((member) => member.id)).toEqual(
      expect.arrayContaining(["pusat", "nesrin_hanim", "esat_bey", "customs_ai", "phone_ai", "sinan_bey"]),
    );
    expect(legacy.find((member) => member.id === "finance_ai").cannotExecutePayments).toBe(true);
    expect(legacy.find((member) => member.id === "phone_ai").liveCalls).toBe(false);
  });

  it("holds incomplete tax/customs exchanges for a human", () => {
    expect(exchangeClassification({ hsCode: "8708" }).code).toBe("HUMAN_REVIEW");
    expect(exchangeClassification({ hsCode: "8708", originCountry: "TR", destCountry: "DE", vatKnown: true }).ok).toBe(
      true
    );
    expect(exchangeClassification({ hsCode: "9301", originCountry: "CN", destCountry: "DE", vatKnown: true, dualUse: true }).hold).toBe(
      true
    );
  });

  it("keeps 26-country tax payment denied", () => {
    resetPools();
    const posted = postNetIncome({ country: "FR", netIncome: 10000 });
    expect(posted.entry.reserve).toBe(2500);
    expect(payTax({ country: "FR", amount: 100 }).code).toBe("PAYMENT_AUTHORITY_DENIED");
  });
});
