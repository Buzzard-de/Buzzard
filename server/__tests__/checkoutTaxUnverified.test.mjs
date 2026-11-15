import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { calculateTax, getTaxRate } = require("../lib/commerce/taxProvider.js");
const { calculateVat, germanyPolicy } = require("../lib/buzzardNative/core/tax/vatEngine.js");
const { getCountry, countries } = require("../lib/buzzardNative/core/tax/countryRegistry.js");
const { usable } = require("../lib/buzzardNative/core/tax/sourceRegistry.js");
const { calculateCheckoutQuote } = require("../lib/customerCheckout.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

function closed(result) {
  assert.equal(result.official, false);
  assert.equal(result.verified, false);
  assert.equal(result.rate, null);
  assert.equal(result.tax == null, true);
  assert.notEqual(result.status, "VERIFIED");
}

test("an unverified country table does not become a checkout VAT amount", () => {
  assert.equal(isSalesEnabled(), false);
  const source = usable("ec_vat_rates");
  assert.equal(source.status, "UNVERIFIED");
  assert.equal(source.source.fetchedLive, false);

  for (const country of ["DE", "FR", "PL", "BG", "EE", "XX", ""]) {
    const tax = calculateTax({ country, rate: 0.19 });
    closed(tax);
    assert.equal(tax.status, "UNKNOWN");
    assert.equal(tax.code, "VAT_UNVERIFIED");
    assert.equal(tax.callerRateIgnored, true);
    assert.equal(getTaxRate(country), null);
  }

  const rows = countries();
  assert.equal(rows.length, 27);
  const germany = getCountry("DE");
  assert.equal(germany.vatOfficial, false);
  assert.equal(germany.vatVerified, false);
  assert.equal(germany.vatSource, "UNVERIFIED_LOCAL_SNAPSHOT");
  assert.equal(germany.vatStandardRate, 19);
  const policy = germanyPolicy();
  assert.equal(policy.country, "DE");
  assert.equal(policy.separateFromEu26Reserve, true);
  assert.equal(policy.vatOfficial, false);
  assert.equal(policy.vatVerified, false);
  assert.equal(policy.tax, null);
  assert.equal(policy.filingReady, false);
  for (const row of rows) {
    assert.equal(row.vatOfficial, false, row.iso);
    assert.equal(row.vatVerified, false, row.iso);
    assert.equal(row.vatSource, "UNVERIFIED_LOCAL_SNAPSHOT", row.iso);
    assert.equal(typeof row.vatStandardRate, "number", row.iso);
    const vat = calculateVat({
      actorId: "nedim_bey",
      sellerCountry: "DE",
      customerCountry: row.iso,
      deliveryCountry: row.iso,
      goodsNet: 100,
    });
    assert.equal(vat.ok, false, row.iso);
    assert.equal(vat.vat, null, row.iso);
    assert.equal(vat.gross, null, row.iso);
    assert.equal(vat.official, false, row.iso);
    assert.equal(vat.verified, false, row.iso);
    assert.equal(vat.filingReady, false, row.iso);
  }
  assert.equal(getCountry("XX"), null);

  const quote = calculateCheckoutQuote({ subtotal: 100, countryCode: "DE", vatRate: 0.19, currency: "EUR" });
  assert.equal(quote.code, "SALES_CLOSED");
  assert.equal(quote.tax, null);
  assert.equal(quote.subtotal, 100);
  assert.equal(isSalesEnabled(), false);

  const checkout = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "../lib/customerCheckout.js"), "utf8");
  assert.equal(checkout.includes("FROM tax_rates"), false);
});
