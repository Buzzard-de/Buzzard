import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { roster } = require("../lib/pusat/council.js");
const { exchangeClassification } = require("../lib/commerce/taxCustomsBridge.js");
const { payTax, postNetIncome, resetPools } = require("../lib/commerce/taxPools.js");

describe("master command locks", () => {
  it("keeps approved council roles without granting sales or payment power", () => {
    const ids = roster().map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining(["pusat", "nesrin_hanim", "esat_bey", "customs_ai", "phone_ai", "sinan_bey"]),
    );
    expect(roster().find((m) => m.id === "finance_ai").cannotExecutePayments).toBe(true);
    expect(roster().find((m) => m.id === "sales_analysis_ai").cannotEnableSales).toBe(true);
    expect(roster().find((m) => m.id === "phone_ai").liveCalls).toBe(false);
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
