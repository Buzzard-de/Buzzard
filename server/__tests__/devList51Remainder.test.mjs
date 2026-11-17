import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";

const require = createRequire(import.meta.url);
const { bindProductCategory } = require("../lib/pim/productCategoryBind.js");
const { classifyProductOrigin } = require("../lib/pim/productOrigin.js");
const { assessMedia } = require("../lib/pim/mediaReadiness.js");
const { envelopeProductContent, LOCALES } = require("../lib/pim/productContentI18n.js");
const { searchAndSort } = require("../lib/pim/catalogSearchSort.js");
const { verifyAddress } = require("../lib/logistics/addressVerification.js");
const { createGermanyTaxStore, postGermanyNet, submitElster } = require("../lib/commerce/germanyTaxPath.js");
const { createTaxPoolStore, postPoolIncome, reopenTaxPoolStore, listPoolEntries } = require("../lib/commerce/taxPoolLedger.js");
const { resetPools } = require("../lib/commerce/taxPools.js");
const { createReturnStore, requestReturn, refundMoney } = require("../lib/commerce/dryReturnRequest.js");
const { htmlDirForLanguage } = require("../lib/i18n/rtlDir.js");
const { evaluateDevList51 } = require("../lib/platform/devList51.js");
const { evaluateSalesGate } = require("../lib/salesSafetyGate.js");

const PROTECTED = "/workspace/server/data/buzzard.db";

describe("dev-list 51 remainder", () => {
  it("binds a mapped category and refuses an unmapped one without PIM write", () => {
    const ok = bindProductCategory({
      sku: "DRY-SKU-001",
      supplier_category: "automotive/bremssystem",
    });
    expect(ok.ok).toBe(true);
    expect(ok.pimWrite).toBe(false);
    expect(ok.published).toBe(false);
    const bad = bindProductCategory({ sku: "DRY-SKU-002", supplier_category: "automotive/brakes" });
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe("CATEGORY_UNMAPPED");
  });

  it("separates demo, dry-run, and media placeholders", () => {
    expect(classifyProductOrigin({ sku: "BZ-CORE-DEMO-001" }).origin).toBe("DEMO");
    expect(classifyProductOrigin({ sku: "DRY-SKU-001" }).origin).toBe("DRY_RUN");
    expect(
      assessMedia({
        url: "https://cdn.test-supplier.example.de/p85073.jpg",
        altText: "Brake pads",
        product: { sku: "DRY-SKU-001" },
      }).ok
    ).toBe(true);
    expect(assessMedia({ url: "http://insecure.example/x.jpg", product: { sku: "DRY-SKU-001" } }).code).toBe(
      "MEDIA_HTTPS_REQUIRED"
    );
    expect(
      assessMedia({
        url: "https://via.placeholder.com/1x1",
        product: { sku: "DRY-SKU-001" },
      }).code
    ).toBe("MEDIA_PLACEHOLDER");
  });

  it("builds a 30-locale product envelope that is not professional", () => {
    const pack = envelopeProductContent({
      title: "Bremsbelag Set Vorderachse",
      shortDescription: "Front axle pads",
      description: "Dry-run pad set",
    });
    expect(LOCALES).toHaveLength(30);
    expect(pack.listed).toBe(30);
    expect(pack.missingStrings).toBe(0);
    expect(pack.professional).toBe(false);
    expect(pack.locales.ar.quality).toBe("AUTHORED");
    expect(pack.locales.fr.quality).toBe("MACHINE");
  });

  it("searches and sorts in memory", () => {
    const result = searchAndSort(
      [
        { sku: "B", title: "Brake", price: 40, stock: 1 },
        { sku: "A", title: "Axle", price: 10, stock: 4 },
      ],
      { q: "a", sort: "price" }
    );
    expect(result.items[0].sku).toBe("A");
    expect(result.liveIndex).toBe(false);
  });

  it("verifies EU addresses locally and rejects a PO box for parcels", () => {
    const berlin = verifyAddress({
      firstName: "Ada",
      lastName: "Lovelace",
      line1: "Invalidenstraße 12",
      city: "Berlin",
      postalCode: "10115",
      country: "DE",
    });
    expect(berlin.ok).toBe(true);
    expect(berlin.live).toBe(false);
    const poBox = verifyAddress(
      {
        recipient: "Ada Lovelace",
        line1: "Postfach 12 34",
        city: "Berlin",
        postalCode: "10115",
        country: "DE",
      },
      { purpose: "shipping" }
    );
    expect(poBox.ok).toBe(false);
    expect(poBox.code).toBe("PO_BOX_NOT_FOR_PARCEL");
    const packstation = verifyAddress({
      recipient: "Ada Lovelace",
      line1: "Packstation",
      city: "Berlin",
      postalCode: "10115",
      country: "DE",
      packstationNumber: "123",
      postNumber: "1234567",
    });
    expect(packstation.ok).toBe(true);
  });

  it("keeps Germany off the 26-country pool and blocks ELSTER", () => {
    resetPools();
    const pools = createTaxPoolStore();
    const fr = postPoolIncome(pools, { country: "FR", netIncome: 80 });
    expect(fr.ok).toBe(true);
    expect(fr.entry.reserve).toBe(20);
    expect(postPoolIncome(pools, { country: "DE", netIncome: 80 }).code).toBe("DE_USES_PRIOR_APPROVAL_RULE");
    pools.db.close();
    const reopened = reopenTaxPoolStore({ dbPath: pools.dbPath });
    expect(listPoolEntries(reopened)).toHaveLength(1);
    reopened.db.close();

    const de = createGermanyTaxStore();
    const posted = postGermanyNet(de, { netIncome: 100 });
    expect(posted.ok).toBe(true);
    expect(posted.country).toBe("DE");
    expect(posted.pool).toBe(false);
    expect(posted.status).toBe("UNVERIFIED");
    expect(submitElster().code).toBe("ELSTER_BLOCKED");
    de.db.close();
  });

  it("records a dry return without paying a refund", () => {
    const store = createReturnStore();
    const requested = requestReturn(store, { orderId: "DRY-ORD-1", reason: "defective" });
    expect(requested.ok).toBe(true);
    expect(requested.refundIssued).toBe(false);
    expect(refundMoney().code).toBe("REAL_REFUND_BLOCKED");
    store.db.close();
  });

  it("sets Arabic RTL and German LTR", () => {
    expect(htmlDirForLanguage("ar")).toBe("rtl");
    expect(htmlDirForLanguage("de")).toBe("ltr");
  });

  it("closes the 51-item remainder without enabling sales or touching the protected db", () => {
    const before = statSync(PROTECTED);
    expect(evaluateSalesGate().status).toBe("LOCKED");
    const report = evaluateDevList51();
    expect(report.listed).toBe(51);
    expect(report.live).toBe(false);
    expect(report.productionReady).toBe(false);
    expect(report.salesGate).toBe("LOCKED");
    expect(report.marks["⬜"]).toBe(0);
    expect(report.marks["🟡"]).toBe(0);
    expect(report.items.filter((item) => item.status === "PARTIAL")).toEqual([]);
    expect(report.items.filter((item) => item.status === "LIVE_BLOCKED").map((item) => item.n)).toEqual([
      19, 20, 28, 30, 37, 41,
    ]);
    expect(report.items.filter((item) => item.status === "CODE_COMPLETE" || item.status === "ALREADY_COMPLETE")).toHaveLength(45);
    expect(report.items.every((item) => item.live === false)).toBe(true);
    const after = statSync(PROTECTED);
    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs);
  });
});
