import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { evaluateDevList51, NAMES } = require("../lib/platform/devList51.js");
const { validateTaxonomy } = require("../lib/taxonomy/validateTaxonomy.js");
const { validateCatalogCoverage } = require("../lib/pim/subcategoryCatalogProfile.js");
const { validateHubSeoCoverage, buildHubSeoMeta } = require("../lib/storefront/hubSeoLocaleService.js");
const { bindProductCategory } = require("../lib/pim/productCategoryBind.js");
const { mapActiveCatalogCategory } = require("../lib/supplier/supplierMappingService.js");
const { validateEan } = require("../lib/productValidator.js");
const { normalizeBrand } = require("../lib/pim/brandNormalizer.js");
const { assessMedia } = require("../lib/pim/mediaReadiness.js");
const { classifyProductOrigin } = require("../lib/pim/productOrigin.js");
const { canPublishProduct } = require("../lib/pim/productCatalogPublish.js");
const { searchAndSort } = require("../lib/pim/catalogSearchSort.js");
const { listSuppliers } = require("../lib/supplier/supplierRegistry.js");
const { ApiSupplierAdapter } = require("../lib/supplier/apiSupplierAdapter.js");
const { XmlSupplierAdapter } = require("../lib/supplier/xmlSupplierAdapter.js");
const { CsvSupplierAdapter } = require("../lib/supplier/csvSupplierAdapter.js");
const { importSupplierFeed } = require("../lib/supplier/supplierImportPipeline.js");
const { quoteCommercialPrice, runCommercialDryRun, DECISIONS } = require("../lib/commerce/commercialCore.js");
const { deriveStockStatus } = require("../lib/operations/stockEngine.js");
const { profit } = require("../lib/commerce/marginEngine.js");
const { detectPriceTampering } = require("../lib/commerce/commerceValidation.js");
const { canTransitionOrder, ORDER_STATUS } = require("../core/commerceConstants.js");
const { createDraftStore, draftOrdersFromDryRun } = require("../lib/commerce/dryOrderDraft.js");
const { capture } = require("../lib/commerce/paymentSandbox.js");
const { createReturnStore, requestReturn, refundMoney } = require("../lib/commerce/dryReturnRequest.js");
const { rejectClientCouponFields } = require("../lib/commerce/commerceCouponService.js");
const { queueJob } = require("../lib/orderAutomation.js");
const { AB27, estimateVat } = require("../lib/commerce/ab27Tax.js");
const { POOL_COUNTRIES, resetPools } = require("../lib/commerce/taxPools.js");
const { createTaxPoolStore, postPoolIncome } = require("../lib/commerce/taxPoolLedger.js");
const { createGermanyTaxStore, postGermanyNet } = require("../lib/commerce/germanyTaxPath.js");
const { submitFiling } = require("../lib/commerce/taxConnect.js");
const { screenCompliance } = require("../lib/commerce/sanctionsScreen.js");
const { snapshot: carrierSnapshot, getAdapter } = require("../lib/logistics/carrierContract.js");
const { verifyAddress } = require("../lib/logistics/addressVerification.js");
const { startReturn } = require("../lib/logistics/v5/returnsEngine.js");
const { envelopeProductContent, LOCALES } = require("../lib/pim/productContentI18n.js");
const { htmlDirForLanguage, isolateLtrFields } = require("../lib/i18n/rtlDir.js");
const { evaluateSalesGate } = require("../lib/salesSafetyGate.js");

const root = path.resolve(new URL("../..", import.meta.url).pathname);
let report;

const sample = {
  sku: "DRY-SKU-001",
  supplier_sku: "DRY-SKU-001",
  supplier_category: "automotive/bremssystem",
  ean_gtin: "5901234123457",
  mpn: "P85073",
  brand: "ATE",
  title: "Bremsbelag Set Vorderachse",
  description: "Trockenlauf-Bremsbelag für die Vorderachse.",
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
};

beforeAll(() => {
  process.env.BUZZARD_SALES_ENABLED = "0";
  report = evaluateDevList51();
});

function item(n) {
  return report.items.find((row) => row.n === n);
}

describe("dev-list 51 individual behavior", () => {
  it("1 master taxonomy has 50 categories and no duplicate codes", () => {
    const taxonomy = validateTaxonomy();
    expect(taxonomy.master50).toBe(50);
    expect(taxonomy.ok).toBe(true);
    expect(item(1).status).not.toBe("PARTIAL");
  });

  it("2 the active shop has 50 level-1 categories", () => {
    const catalog = validateCatalogCoverage();
    expect(catalog.activeL1).toBe(50);
    expect(catalog.missingL1).toEqual([]);
  });

  it("3 retired food, drinks, and jewelry cannot be selected for a new product", () => {
    for (const token of ["cat-25", "getraenke", "schmuck-uhren"]) {
      const decision = mapActiveCatalogCategory(token);
      expect(decision.ok).toBe(false);
      expect(decision.code).toBe("CATEGORY_RETIRED");
    }
  });

  it("4 hub coverage is 50 hubs and does not publish live", () => {
    const hubs = validateHubSeoCoverage();
    expect(hubs.ok).toBe(true);
    expect(hubs.activeHubs).toBe(50);
    expect(buildHubSeoMeta("cat-01", "de").livePublish).toBe(false);
  });

  it("5 textile hub labels are German, English, and Turkish", () => {
    expect(buildHubSeoMeta("cat-01", "de").title.startsWith("Textil")).toBe(true);
    expect(buildHubSeoMeta("cat-01", "en").title.startsWith("Textiles")).toBe(true);
    expect(buildHubSeoMeta("cat-01", "tr").title.startsWith("Tekstil")).toBe(true);
  });

  it("6 a mapped brake category binds and an unknown category does not", () => {
    const bound = bindProductCategory(sample);
    expect(bound.ok).toBe(true);
    expect(bound.categoryId).toBeTruthy();
    expect(bound.pimWrite).toBe(false);
    expect(bindProductCategory({ ...sample, supplier_category: "not/a/category" }).ok).toBe(false);
  });

  it("7 a known EAN passes and a short code fails", () => {
    expect(validateEan("5901234123457").ok).toBe(true);
    expect(validateEan("123").ok).toBe(false);
    expect(normalizeBrand("ATE").ok).toBe(true);
  });

  it("8 a real image is accepted and a demo image is blocked", () => {
    expect(assessMedia({ url: sample.images[0], altText: "Brake pad set", product: sample }).ok).toBe(true);
    expect(assessMedia({ url: "https://cdn.test-supplier.example.de/demo.jpg", product: { sku: "BZ-CORE-DEMO-001" } }).code).toBe(
      "MEDIA_DEMO_BLOCKED"
    );
  });

  it("9 ATE normalizes to a canonical brand without a database write", () => {
    const brand = normalizeBrand("ATE");
    expect(brand.canonical).toBeTruthy();
    expect(item(9).dbWrite).toBe(false);
  });

  it("10 a dry SKU is not classified as a demo product", () => {
    expect(classifyProductOrigin(sample).origin).toBe("DRY_RUN");
    expect(classifyProductOrigin({ sku: "BZ-CORE-DEMO-001", title: "Demo product" }).origin).toBe("DEMO");
  });

  it("11 a demo product is skipped instead of published", () => {
    const result = canPublishProduct({ sku: "BZ-CORE-DEMO-001", title: "Demo", brand: "Buzzard Demo" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("SKIPPED_DEMO");
  });

  it("12 search sorts the cheaper matching row first and stays off a live index", () => {
    const sorted = searchAndSort(
      [
        { sku: "B", title: "Brake", price: 20, stock: 1 },
        { sku: "A", title: "Axle", price: 10, stock: 5 },
      ],
      { q: "a", sort: "price", order: "asc" }
    );
    expect(sorted.items[0].sku).toBe("A");
    expect(sorted.liveIndex).toBe(false);
  });

  it("13 dry supplier records cannot take orders or go live", () => {
    const suppliers = listSuppliers();
    for (const id of ["api-supplier-dry", "xml-supplier-dry", "csv-supplier-dry"]) {
      const supplier = suppliers.find((row) => row.id === id);
      expect(supplier.ordersEnabled).toBe(false);
      expect(supplier.canGoLive).toBe(false);
    }
  });

  it("14 the API supplier adapter blocks the network", () => {
    expect(new ApiSupplierAdapter().networkBlocked).toBe(true);
  });

  it("15 the XML supplier adapter blocks the network", () => {
    expect(new XmlSupplierAdapter().networkBlocked).toBe(true);
  });

  it("16 the CSV supplier adapter blocks the network", () => {
    expect(new CsvSupplierAdapter().networkBlocked).toBe(true);
  });

  it("17 a valid dry import is staged and a missing EAN is rejected", () => {
    const imported = importSupplierFeed({ supplierId: "api-supplier-dry", format: "api", records: [sample] });
    expect(imported.ok).toBe(true);
    expect(imported.catalog.length).toBe(1);
    expect(imported.pimWrite).toBe(false);
    const missing = importSupplierFeed({
      supplierId: "api-supplier-dry",
      format: "api",
      records: [{ ...sample, ean_gtin: "" }],
    });
    expect(missing.catalog).toEqual([]);
    expect(missing.rejected).toHaveLength(1);
  });

  it("18 the brake alias resolves to a category id", () => {
    const bound = bindProductCategory(sample);
    expect(bound.ok).toBe(true);
    expect(bound.categoryId).toBeTruthy();
  });

  it("19 TecDoc stays blocked", () => {
    expect(item(19).status).toBe("LIVE_BLOCKED");
    expect(item(19).code).toBe("TECDOC_LIVE_BLOCKED");
    expect(item(19).live).toBe(false);
  });

  it("20 a live supplier connection stays blocked", () => {
    expect(item(20).status).toBe("LIVE_BLOCKED");
    expect(item(20).code).toBe("LIVE_SUPPLIER_BLOCKED");
  });

  it("21 a commercial quote is calculated while sales stay off", () => {
    const priced = quoteCommercialPrice({
      supplierCost: 40,
      shippingCost: 6,
      marketplaceFee: 4,
      paymentFee: 1.2,
      returnReserve: 1,
      otherCost: 0,
      comparableMarketPrice: 90,
      category: { slug: "automotive" },
      country: "DE",
    });
    expect(priced.ok).toBe(true);
    expect(priced.salesEnabled).toBe(false);
  });

  it("22 stock above the threshold is in stock", () => {
    expect(deriveStockStatus(12, { lowThreshold: 5 }).status).toBe("IN_STOCK");
    expect(deriveStockStatus(0).status).not.toBe("IN_STOCK");
  });

  it("23 a dry commercial run stays locked and ready for review", () => {
    const dry = runCommercialDryRun({
      supplierId: "api-supplier-dry",
      format: "api",
      records: [{
        ...sample,
        supplier_price: { amount: 40, currency: "EUR" },
        shipping_cost: 6,
        marketplace_fee: 4,
        payment_fee: 1.2,
        return_reserve: 1,
        other_cost: 0,
        comparable_market_price: 90,
        stock: 12,
        reserved_stock: 2,
        stock_updated_at: new Date().toISOString(),
        country: "DE",
      }],
    });
    expect(dry.salesGate).toBe("LOCKED");
    expect(dry.products[0].decision).toBe(DECISIONS.READY_FOR_REVIEW);
  });

  it("24 realized profit is the net remainder and an unreimbursed return is not booked", () => {
    const margin = profit({ sellGross: 90, costs: { vat: { vat: 14 }, netBeforeVat: 52 } });
    expect(margin.realized).toBe(24);
    expect(profit({ sellGross: 90, costs: { vat: { vat: 14 }, netBeforeVat: 52 }, returnOccurred: true }).realized).toBeNull();
  });

  it("25 a client price that differs from the server price is tampering", () => {
    expect(detectPriceTampering(9.99, 19.99).tampered).toBe(true);
    expect(detectPriceTampering(19.99, 19.99).tampered).toBe(false);
  });

  it("26 a pending order can be cancelled", () => {
    expect(canTransitionOrder(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED)).toBe(true);
    expect(canTransitionOrder(ORDER_STATUS.CANCELLED, ORDER_STATUS.PAID)).toBe(false);
  });

  it("27 a dry order draft does not capture payment", () => {
    const dry = runCommercialDryRun({
      supplierId: "api-supplier-dry",
      format: "api",
      records: [{
        ...sample,
        supplier_price: { amount: 40, currency: "EUR" },
        shipping_cost: 6,
        marketplace_fee: 4,
        payment_fee: 1.2,
        return_reserve: 1,
        other_cost: 0,
        comparable_market_price: 90,
        stock: 12,
        reserved_stock: 2,
        stock_updated_at: new Date().toISOString(),
        country: "DE",
      }],
    });
    const store = createDraftStore();
    const drafts = draftOrdersFromDryRun(dry, { customerId: "SYN-CUST", qty: 1, store });
    store.db.close();
    expect(drafts.summary.drafted).toBeGreaterThanOrEqual(1);
    expect(drafts.paymentCaptured).toBe(false);
  });

  it("28 payment capture is refused", () => {
    const pay = capture("pay_test");
    expect(pay.ok).toBe(false);
    expect(pay.captured).toBe(false);
    expect(pay.code).toBe("SALES_LOCKED");
  });

  it("29 a return request does not issue a refund", () => {
    const store = createReturnStore();
    const requested = requestReturn(store, { orderId: "DRY-ORD-1", reason: "defective" });
    store.db.close();
    expect(requested.ok).toBe(true);
    expect(requested.refundIssued).toBe(false);
  });

  it("30 a money refund is blocked", () => {
    expect(refundMoney().code).toBe("REAL_REFUND_BLOCKED");
    expect(item(30).status).toBe("LIVE_BLOCKED");
  });

  it("31 a client discount that does not match the server discount is rejected", () => {
    const tampered = rejectClientCouponFields({ discount: 100 }, 5);
    expect(tampered.ok).toBe(false);
    expect(tampered.code).toBe("coupon_tampering");
    expect(rejectClientCouponFields({ discount: 5 }, 5).ok).toBe(true);
  });

  it("32 an automation job waits for approval and does not place a live order", () => {
    const queued = queueJob("payment", `DRY-ITEM-32-${Date.now()}`, { provider: "sandbox" });
    expect(queued.ok).toBe(true);
    expect(queued.jobId).toBeTruthy();
    expect(evaluateSalesGate().status).toBe("LOCKED");
  });

  it("33 Germany VAT is estimated for one of the 27 countries", () => {
    expect(AB27).toHaveLength(27);
    expect(estimateVat({ country: "DE", netAmount: 100 }).ok).toBe(true);
  });

  it("34 an unknown country code is not given a VAT rate", () => {
    expect(estimateVat({ country: "XX", netAmount: 100 }).code).toBe("VAT_UNKNOWN");
  });

  it("35 France reserves 25 percent and Germany is kept out of the 26-country pool", () => {
    resetPools();
    const store = createTaxPoolStore();
    expect(postPoolIncome(store, { country: "FR", netIncome: 100 }).entry.reserve).toBe(25);
    expect(postPoolIncome(store, { country: "DE", netIncome: 100 }).code).toBe("DE_USES_PRIOR_APPROVAL_RULE");
    store.db.close();
    expect(POOL_COUNTRIES).toHaveLength(26);
  });

  it("36 a German net posting does not enter the pool or file ELSTER", () => {
    const store = createGermanyTaxStore();
    const posted = postGermanyNet(store, { netIncome: 200 });
    store.db.close();
    expect(posted.ok).toBe(true);
    expect(posted.pool).toBe(false);
    expect(posted.elsterLive).toBe(false);
  });

  it("37 Tax Connect filing is blocked", () => {
    const filing = submitFiling("x");
    expect(filing.ok).toBe(false);
    expect(filing.code).toBe("TAX_CONNECT_BLOCKED");
    expect(filing.filingEnabled).toBe(false);
  });

  it("38 an Iran destination is not auto-cleared", () => {
    const screen = screenCompliance({ destination: "IR", goodsCode: "8708", parties: [{ name: "Unknown", country: "IR" }] });
    expect(screen.sanctionsCleared).toBe(false);
    expect(screen.autoApproved).toBe(false);
    expect(screen.code).toBe("OUTSIDE_AB27");
  });

  it("39 a high-value intra-EU shipment requires review", () => {
    const screen = screenCompliance({ destination: "FR", value: 10000, goodsCode: "8708" });
    expect(screen.autoApproved).toBe(false);
    expect(screen.sanctionsCleared).toBe(false);
    expect(screen.code).toBe("HIGH_VALUE");
  });

  it("40 the carrier catalog is local and not live", () => {
    const carriers = carrierSnapshot();
    expect(carriers.live).toBe(false);
    expect(carriers.carriers.length).toBeGreaterThan(20);
  });

  it("41 a live carrier rate stays blocked", () => {
    expect(item(41).status).toBe("LIVE_BLOCKED");
    expect(item(41).code).toBe("LIVE_CARRIER_RATE_BLOCKED");
  });

  it("42 creating a DHL shipment requires a human and buys no label", () => {
    const shipment = getAdapter("DHL").createShipment({ orderId: "DRY-1", postalCode: "10115", address: { postalCode: "10115" } });
    expect(shipment.ok).toBe(false);
    expect(shipment.code).toBe("HUMAN_GATE_REQUIRED");
    expect(shipment.liveShipment).toBe(false);
  });

  it("43 a transit tracking status is in transit and not a live carrier call", () => {
    const tracked = getAdapter("DHL").trackShipment({ status: "transit" });
    expect(tracked.status).toBe("IN_TRANSIT");
    expect(tracked.live).not.toBe(true);
  });

  it("44 a Berlin address passes local rules and a short postcode fails", () => {
    expect(
      verifyAddress({
        firstName: "Ada",
        lastName: "Lovelace",
        line1: "Invalidenstraße 12",
        city: "Berlin",
        postalCode: "10115",
        country: "DE",
      }).ok
    ).toBe(true);
    expect(verifyAddress({ line1: "x", city: "Berlin", postalCode: "12", country: "DE" }).ok).toBe(false);
  });

  it("45 a logistics return does not refund the customer", () => {
    const result = startReturn({ shipmentId: "DRY-1" });
    expect(result.live).toBe(false);
    expect(result.customerRefundIssued).toBe(false);
  });

  it("46 the product locale list contains 30 languages including Arabic", () => {
    expect(LOCALES).toHaveLength(30);
    expect(LOCALES).toContain("ar");
    expect(LOCALES).toContain("de");
  });

  it("47 choosing a language uses its own key and does not set the country", () => {
    const locale = fs.readFileSync(path.join(root, "lib/i18n/detect.ts"), "utf8");
    const country = fs.readFileSync(path.join(root, "lib/market/storage.ts"), "utf8");
    const selector = fs.readFileSync(path.join(root, "components/LanguageSelector.tsx"), "utf8");
    expect(locale).toContain('STORAGE_KEY = "buzzard_locale"');
    expect(country).not.toContain("buzzard_locale");
    expect(selector).toContain("setLocale");
    expect(selector).not.toContain("setCountryCode");
  });

  it("48 choosing a country uses its own key and does not set the language", () => {
    const country = fs.readFileSync(path.join(root, "lib/market/storage.ts"), "utf8");
    const selector = fs.readFileSync(path.join(root, "components/CountrySelector.tsx"), "utf8");
    expect(country).toContain('STORAGE_KEY = "buzzard_market_country"');
    expect(selector).toContain("setCountryCode");
    expect(selector).not.toContain("setLocale");
  });

  it("49 a product envelope covers 30 locales and is not marked professional", () => {
    const pack = envelopeProductContent(sample);
    expect(pack.listed).toBe(30);
    expect(pack.missingStrings).toBe(0);
    expect(pack.professional).toBe(false);
  });

  it("50 Arabic is right to left and a price field stays isolated", () => {
    expect(htmlDirForLanguage("ar")).toBe("rtl");
    expect(htmlDirForLanguage("de")).toBe("ltr");
    expect(isolateLtrFields()).toContain("price");
  });

  it("51 the sales gate is locked", () => {
    const sales = evaluateSalesGate();
    expect(sales.status).toBe("LOCKED");
    expect(sales.allowed).toBe(false);
    expect(NAMES[51]).toBeTruthy();
    expect(report.items).toHaveLength(51);
    expect(report.items.filter((row) => row.status === "PARTIAL")).toEqual([]);
  });
});
