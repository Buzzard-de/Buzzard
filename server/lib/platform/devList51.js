/**
 * 51-item development close-out. Does not enable sales or live connections.
 */
const fs = require("fs");
const path = require("path");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { validateTaxonomy } = require("../taxonomy/validateTaxonomy");
const { validateCatalogCoverage } = require("../pim/subcategoryCatalogProfile");
const { validateHubSeoCoverage, buildHubSeoMeta } = require("../storefront/hubSeoLocaleService");
const { bindProductCategory } = require("../pim/productCategoryBind");
const { mapActiveCatalogCategory } = require("../supplier/supplierMappingService");
const { classifyProductOrigin } = require("../pim/productOrigin");
const { assessMedia } = require("../pim/mediaReadiness");
const { envelopeProductContent, LOCALES } = require("../pim/productContentI18n");
const { searchAndSort } = require("../pim/catalogSearchSort");
const { normalizeBrand } = require("../pim/brandNormalizer");
const { canPublishProduct } = require("../pim/productCatalogPublish");
const { validateEan } = require("../productValidator");
const { ApiSupplierAdapter } = require("../supplier/apiSupplierAdapter");
const { XmlSupplierAdapter } = require("../supplier/xmlSupplierAdapter");
const { CsvSupplierAdapter } = require("../supplier/csvSupplierAdapter");
const { listSuppliers } = require("../supplier/supplierRegistry");
const { importSupplierFeed } = require("../supplier/supplierImportPipeline");
const { runCommercialDryRun, quoteCommercialPrice, DECISIONS } = require("../commerce/commercialCore");
const { deriveStockStatus } = require("../operations/stockEngine");
const { profit } = require("../commerce/marginEngine");
const { detectPriceTampering } = require("../commerce/commerceValidation");
const { canTransitionOrder, ORDER_STATUS } = require("../../core/commerceConstants");
const { createDraftStore, draftOrdersFromDryRun } = require("../commerce/dryOrderDraft");
const { capture } = require("../commerce/paymentSandbox");
const { createReturnStore, requestReturn, refundMoney } = require("../commerce/dryReturnRequest");
const { rejectClientCouponFields } = require("../commerce/commerceCouponService");
const { queueJob } = require("../orderAutomation");
const { AB27, estimateVat } = require("../commerce/ab27Tax");
const { POOL_COUNTRIES, resetPools } = require("../commerce/taxPools");
const { createTaxPoolStore, postPoolIncome } = require("../commerce/taxPoolLedger");
const { createGermanyTaxStore, postGermanyNet, submitElster } = require("../commerce/germanyTaxPath");
const { assess: assessTaxConnect, submitFiling } = require("../commerce/taxConnect");
const { screenCompliance } = require("../commerce/sanctionsScreen");
const { snapshot: carrierSnapshot, getAdapter } = require("../logistics/carrierContract");
const { verifyAddress } = require("../logistics/addressVerification");
const { startReturn } = require("../logistics/v5/returnsEngine");
const { htmlDirForLanguage, isolateLtrFields } = require("../i18n/rtlDir");
const { getSearchHealth } = require("../commerce/productSearchAbstraction");

const NAMES = Object.freeze({
  1: "50 ana ürün kategorisinin master kaydı",
  2: "Mağazada 50 aktif kategori",
  3: "Emekli kategorilerin satış ağacından çıkarılması",
  4: "Hub kategorileri",
  5: "Kategori isimleri TR/DE/EN",
  6: "Ürün-kategori ilişkilendirme",
  7: "EAN, MPN ve SKU doğrulama",
  8: "Ürün fotoğrafı ve medya altyapısı",
  9: "Marka kayıt sistemi",
  10: "Demo ürünlerin gerçek ürünlerden ayrılması",
  11: "Katalog yayınlama altyapısı",
  12: "Ürün arama ve sıralama",
  13: "Tedarikçi kayıt sistemi",
  14: "API tedarikçi bağlantısı",
  15: "XML tedarikçi bağlantısı",
  16: "CSV tedarikçi bağlantısı",
  17: "Otomatik ürün içe aktarma",
  18: "Tedarikçi kategori eşleştirme",
  19: "Canlı TecDoc bağlantısı",
  20: "Canlı tedarikçi bağlantısı",
  21: "Otomatik fiyat hesaplama",
  22: "Otomatik stok takip",
  23: "Fiyat ve stok güncelleme",
  24: "Gerçekleşen kâr ve maliyet",
  25: "Sepet fiyat doğrulama",
  26: "Sipariş durum yönetimi",
  27: "Sipariş motoru",
  28: "Ödeme alma sistemi",
  29: "İade talebi kayıt sistemi",
  30: "Gerçek para iade sistemi",
  31: "Kupon ve indirim",
  32: "Otomatik sipariş yönetimi",
  33: "AB-27 KDV altyapısı",
  34: "Tanımsız ülke KDV kontrolü",
  35: "26 ülkelik vergi havuzu",
  36: "Almanya ayrı vergi yolu",
  37: "Resmî Tax Connect",
  38: "Yaptırım kontrolü olmadan otomatik onay yok",
  39: "AB dışı / yüksek tutar inceleme",
  40: "Kargo ana veri",
  41: "Canlı kargo fiyatı",
  42: "Otomatik gönderi oluşturma",
  43: "Kargo takip",
  44: "Adres doğrulama",
  45: "İade lojistiği",
  46: "30 dil ve hreflang",
  47: "Dil seçimi ülkeden bağımsız",
  48: "Ülke seçimi dilden bağımsız",
  49: "Ürün içerikleri 30 dil",
  50: "Arapça RTL mağaza görünümü",
  51: "Satış kapısı ve canlı işlem kilidi",
});

function row(n, status, extra = {}) {
  return {
    n,
    name: NAMES[n],
    status,
    live: false,
    productionReady: false,
    ...extra,
  };
}

function already(n) {
  return row(n, "ALREADY_COMPLETE", { mark: "✅", note: "Completed work left in place" });
}

function blocked(n, code) {
  return row(n, "LIVE_BLOCKED", { mark: "🔴", code, note: "Live connection stays off" });
}

function complete(n, extra = {}) {
  const { status: detailStatus, ...rest } = extra;
  return row(n, "CODE_COMPLETE", { mark: "✅", ...rest, ...(detailStatus != null ? { detailStatus } : {}) });
}

function fail(n, extra = {}) {
  const { status: detailStatus, ...rest } = extra;
  return row(n, "PARTIAL", { mark: "🟡", ...rest, ...(detailStatus != null ? { detailStatus } : {}) });
}

function sampleRecord() {
  return {
    sku: "DRY-SKU-001",
    supplier_sku: "DRY-SKU-001",
    name: "Bremsbelag Set Vorderachse",
    title: "Bremsbelag Set Vorderachse",
    description: "Synthetic dry-run brake pad set for catalog review.",
    supplier_category: "automotive/bremssystem",
    ean_gtin: "5901234123457",
    mpn: "P85073",
    brand: "ATE",
    images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
  };
}

function evaluateDevList51() {
  const sales = evaluateSalesGate();
  const items = [];

  const taxonomy = validateTaxonomy();
  items.push(taxonomy.ok === true && taxonomy.master50 === 50 ? complete(1, { master50: taxonomy.master50 }) : fail(1, { master50: taxonomy.master50 }));

  const catalog = validateCatalogCoverage();
  items.push(catalog.activeL1 === 50 && catalog.missingL1.length === 0 ? complete(2, { activeL1: catalog.activeL1 }) : fail(2, { activeL1: catalog.activeL1 }));

  const retiredDecisions = ["cat-25", "getraenke", "schmuck-uhren"].map((token) => mapActiveCatalogCategory(token));
  items.push(
    retiredDecisions.every((decision) => decision.ok === false && decision.code === "CATEGORY_RETIRED")
      ? complete(3, { code: "CATEGORY_RETIRED", count: retiredDecisions.length })
      : fail(3, { codes: retiredDecisions.map((decision) => decision.code) })
  );

  const hubs = validateHubSeoCoverage();
  items.push(hubs.ok === true && hubs.activeHubs === 50 ? complete(4, { activeHubs: hubs.activeHubs }) : fail(4, { activeHubs: hubs.activeHubs }));

  const deHub = buildHubSeoMeta("cat-01", "de");
  const enHub = buildHubSeoMeta("cat-01", "en");
  const trHub = buildHubSeoMeta("cat-01", "tr");
  items.push(
    deHub.ok && deHub.title.startsWith("Textil") && enHub.title.startsWith("Textiles") && trHub.title.startsWith("Tekstil")
      ? complete(5, { de: "Textil", en: "Textiles", tr: "Tekstil" })
      : fail(5, { deHub, enHub, trHub })
  );

  const bound = bindProductCategory(sampleRecord());
  items.push(bound.ok && bound.categoryId ? complete(6, { categoryId: bound.categoryId, pimWrite: false }) : fail(6, bound));

  const ean = validateEan("5901234123457");
  const brand = normalizeBrand("ATE");
  items.push(ean.ok && brand.ok ? complete(7, { ean: true, brand: brand.normalized }) : fail(7, { ean, brand }));

  const media = assessMedia({
    url: "https://cdn.test-supplier.example.de/p85073.jpg",
    altText: "Brake pad set",
    product: sampleRecord(),
  });
  const blockedDemoMedia = assessMedia({
    url: "https://cdn.test-supplier.example.de/demo.jpg",
    product: { sku: "BZ-CORE-DEMO-001", title: "Demo" },
  });
  items.push(
    media.ok && blockedDemoMedia.code === "MEDIA_DEMO_BLOCKED"
      ? complete(8, { liveUpload: false })
      : fail(8, { media, blockedDemoMedia })
  );

  items.push(brand.canonical ? complete(9, { normalized: brand.normalized, dbWrite: false }) : fail(9, brand));

  const origin = classifyProductOrigin(sampleRecord());
  const demo = classifyProductOrigin({ sku: "BZ-CORE-DEMO-001", title: "Demo product" });
  items.push(
    origin.origin === "DRY_RUN" && demo.origin === "DEMO"
      ? complete(10, { dryRun: origin.origin, demo: demo.origin })
      : fail(10, { origin, demo })
  );

  const publishDemo = canPublishProduct({ sku: "BZ-CORE-DEMO-001", title: "Demo", brand: "Buzzard Demo" });
  items.push(
    publishDemo.status === "SKIPPED_DEMO" && publishDemo.ok === false
      ? complete(11, { demoPublish: publishDemo.status, salesEnabled: false })
      : fail(11, publishDemo)
  );

  const sorted = searchAndSort(
    [
      { sku: "B", title: "Brake", price: 20, stock: 1 },
      { sku: "A", title: "Axle", price: 10, stock: 5 },
    ],
    { q: "a", sort: "price", order: "asc" }
  );
  const health = getSearchHealth();
  items.push(
    sorted.items[0]?.sku === "A" && health.fallbackAvailable
      ? complete(12, { backend: sorted.backend, liveIndex: false })
      : fail(12, { sorted, health })
  );

  const suppliers = listSuppliers();
  const supplierIds = suppliers.map((supplier) => supplier.id);
  items.push(
    ["api-supplier-dry", "xml-supplier-dry", "csv-supplier-dry"].every((id) => supplierIds.includes(id)) &&
      suppliers.every((supplier) => supplier.ordersEnabled === false && supplier.canGoLive === false)
      ? complete(13, { suppliers: supplierIds, ordersEnabled: false })
      : fail(13, { supplierIds })
  );

  const api = new ApiSupplierAdapter();
  const xml = new XmlSupplierAdapter();
  const csv = new CsvSupplierAdapter();
  items.push(api.networkBlocked ? complete(14, { live: false, format: api.adapterFormat }) : fail(14));
  items.push(xml.networkBlocked ? complete(15, { live: false, format: xml.adapterFormat }) : fail(15));
  items.push(csv.networkBlocked ? complete(16, { live: false, format: csv.adapterFormat }) : fail(16));

  const imported = importSupplierFeed({
    supplierId: "api-supplier-dry",
    format: "api",
    records: [sampleRecord()],
  });
  items.push(
    imported.ok === true && imported.catalog.length >= 1 && imported.rejected.length === 0 && imported.pimWrite === false
      ? complete(17, { liveImport: false, catalog: imported.catalog.length })
      : fail(17, { catalog: imported.catalog?.length, rejected: imported.rejected?.length })
  );

  items.push(bound.ok ? complete(18, { code: bound.code, categoryId: bound.categoryId }) : fail(18, bound));

  items.push(blocked(19, "TECDOC_LIVE_BLOCKED"));
  items.push(blocked(20, "LIVE_SUPPLIER_BLOCKED"));

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
  items.push(priced.ok && priced.salesEnabled === false ? complete(21, { livePriceWrite: false }) : fail(21, priced));

  const stock = deriveStockStatus(12, { lowThreshold: 5 });
  items.push(stock.status === "IN_STOCK" ? complete(22, { stockStatus: stock.status }) : fail(22, stock));

  const dryRun = runCommercialDryRun({
    supplierId: "api-supplier-dry",
    format: "api",
    records: [
      {
        ...sampleRecord(),
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
      },
    ],
  });
  items.push(
    dryRun.salesGate === "LOCKED" && dryRun.products[0].decision === DECISIONS.READY_FOR_REVIEW
      ? complete(23, { mode: "DRY_RUN" })
      : fail(23, { decision: dryRun.products[0]?.decision })
  );

  const margin = profit({
    sellGross: 90,
    costs: { vat: { vat: 14 }, netBeforeVat: 52 },
    returnOccurred: false,
  });
  const returned = profit({
    sellGross: 90,
    costs: { vat: { vat: 14 }, netBeforeVat: 52 },
    returnOccurred: true,
  });
  items.push(
    margin.realized === 24 && returned.realized === null
      ? complete(24, { realized: margin.realized, unreimbursedReturn: null })
      : fail(24, { realized: margin.realized, returned: returned.realized })
  );

  const tamper = detectPriceTampering(9.99, 19.99);
  items.push(tamper.tampered ? complete(25, tamper) : fail(25, tamper));

  items.push(
    canTransitionOrder(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED)
      ? complete(26, { from: ORDER_STATUS.PENDING, to: ORDER_STATUS.CANCELLED })
      : fail(26)
  );

  const store = createDraftStore();
  const drafts = draftOrdersFromDryRun(dryRun, { customerId: "SYN-CUST", qty: 1, store });
  store.db.close();
  items.push(
    drafts.summary.drafted >= 1 && drafts.paymentCaptured === false
      ? complete(27, { drafted: drafts.summary.drafted, paymentCaptured: false })
      : fail(27, drafts.summary)
  );

  const pay = capture("pay_test");
  items.push(blocked(28, pay.code || "SALES_LOCKED"));

  const returns = createReturnStore();
  const requested = requestReturn(returns, { orderId: drafts.drafts.find((d) => d.ok)?.orderId || "DRY-ORD-1", reason: "defective" });
  returns.db.close();
  items.push(requested.ok && requested.refundIssued === false ? complete(29, { returnStatus: requested.status }) : fail(29, requested));

  const refund = refundMoney();
  items.push(blocked(30, refund.code));

  const coupon = rejectClientCouponFields({ discount: 100 }, 5);
  const honestCoupon = rejectClientCouponFields({ discount: 5 }, 5);
  items.push(
    coupon.ok === false && coupon.code === "coupon_tampering" && coupon.fields.includes("discount") && honestCoupon.ok === true
      ? complete(31, { code: coupon.code })
      : fail(31, coupon)
  );

  const queued = queueJob("payment", `DRY-DEVLIST-${Date.now()}`, { provider: "sandbox" });
  items.push(
    queued.ok === true && queued.approval && queued.jobId
      ? complete(32, { status: "APPROVAL_REQUIRED", liveOrder: false })
      : fail(32, { ok: queued.ok, code: queued.code })
  );

  items.push(AB27.length === 27 && estimateVat({ country: "DE", netAmount: 100 }).ok ? already(33) : fail(33));
  items.push(estimateVat({ country: "XX", netAmount: 100 }).code === "VAT_UNKNOWN" ? already(34) : fail(34));

  resetPools();
  const poolStore = createTaxPoolStore();
  const fr = postPoolIncome(poolStore, { country: "FR", netIncome: 100 });
  const dePool = postPoolIncome(poolStore, { country: "DE", netIncome: 100 });
  poolStore.db.close();
  items.push(
    fr.ok && fr.entry.reserve === 25 && dePool.code === "DE_USES_PRIOR_APPROVAL_RULE" && POOL_COUNTRIES.length === 26
      ? complete(35, { countries: POOL_COUNTRIES.length, paymentAuthority: false })
      : fail(35, { fr, dePool })
  );

  const deStore = createGermanyTaxStore();
  const deTax = postGermanyNet(deStore, { netIncome: 200 });
  deStore.db.close();
  items.push(
    deTax.ok && deTax.pool === false && deTax.elsterLive === false
      ? complete(36, { taxStatus: deTax.status, filing: deTax.filing })
      : fail(36, deTax)
  );

  items.push(blocked(37, submitFiling("x").code || assessTaxConnect().status));

  const sanctions = screenCompliance({ destination: "IR", goodsCode: "8708", parties: [{ name: "Unknown", country: "IR" }] });
  items.push(
    sanctions.sanctionsCleared === false && sanctions.autoApproved === false && sanctions.status === "HUMAN_REVIEW" && sanctions.code === "OUTSIDE_AB27"
      ? complete(38, { code: sanctions.code, autoApproved: false })
      : fail(38, { code: sanctions.code, status: sanctions.status })
  );

  const highValue = screenCompliance({ destination: "FR", value: 10000, goodsCode: "8708" });
  items.push(
    highValue.sanctionsCleared === false && highValue.autoApproved === false && highValue.code === "HIGH_VALUE"
      ? complete(39, { code: highValue.code, autoApproved: false })
      : fail(39, { code: highValue.code, status: highValue.status })
  );

  const carriers = carrierSnapshot();
  items.push(carriers.live === false && carriers.carriers.length > 20 ? complete(40, { count: carriers.carriers.length }) : fail(40, carriers));

  items.push(blocked(41, "LIVE_CARRIER_RATE_BLOCKED"));

  const shipment = getAdapter("DHL").createShipment({
    orderId: "DRY-1",
    postalCode: "10115",
    address: { postalCode: "10115" },
  });
  items.push(
    shipment.ok === false && shipment.code === "HUMAN_GATE_REQUIRED" && shipment.liveShipment === false
      ? complete(42, { code: shipment.code, liveShipment: false })
      : fail(42, shipment)
  );

  const tracked = getAdapter("DHL").trackShipment({ status: "transit" });
  items.push(tracked.status === "IN_TRANSIT" ? complete(43, { trackingStatus: tracked.status }) : fail(43, tracked));

  const addrOk = verifyAddress({
    firstName: "Ada",
    lastName: "Lovelace",
    line1: "Invalidenstraße 12",
    city: "Berlin",
    postalCode: "10115",
    country: "DE",
  });
  const addrBad = verifyAddress({ line1: "x", city: "Berlin", postalCode: "12", country: "DE" });
  items.push(addrOk.ok && addrOk.live === false && addrBad.ok === false ? complete(44, { provider: "LOCAL_RULES" }) : fail(44, { addrOk, addrBad }));

  const retLog = startReturn({ shipmentId: "DRY-1" });
  items.push(retLog.live === false && retLog.customerRefundIssued === false ? complete(45, { state: retLog.state }) : fail(45, retLog));

  items.push(LOCALES.length === 30 && LOCALES.includes("ar") && LOCALES.includes("de") ? complete(46, { listed: LOCALES.length }) : fail(46, { listed: LOCALES.length }));
  const localeSource = fs.readFileSync(path.join(process.cwd(), "lib/i18n/detect.ts"), "utf8");
  const countrySource = fs.readFileSync(path.join(process.cwd(), "lib/market/storage.ts"), "utf8");
  const languageSelector = fs.readFileSync(path.join(process.cwd(), "components/LanguageSelector.tsx"), "utf8");
  items.push(
    localeSource.includes('STORAGE_KEY = "buzzard_locale"') &&
      !countrySource.includes("buzzard_locale") &&
      languageSelector.includes("setLocale") &&
      !languageSelector.includes("setCountryCode")
      ? complete(47, { localeKey: "buzzard_locale" })
      : fail(47)
  );
  const countrySelector = fs.readFileSync(path.join(process.cwd(), "components/CountrySelector.tsx"), "utf8");
  items.push(
    countrySource.includes('STORAGE_KEY = "buzzard_market_country"') &&
      countrySelector.includes("setCountryCode") &&
      !countrySelector.includes("setLocale")
      ? complete(48, { countryKey: "buzzard_market_country" })
      : fail(48)
  );

  const i18n = envelopeProductContent(sampleRecord());
  items.push(
    i18n.listed === 30 && i18n.missingStrings === 0 && i18n.professional === false
      ? complete(49, { native: i18n.nativeStrings, machine: i18n.machineGeneratedStrings, professional: false })
      : fail(49, i18n)
  );

  items.push(
    htmlDirForLanguage("ar") === "rtl" && htmlDirForLanguage("de") === "ltr" && isolateLtrFields().includes("price")
      ? complete(50, { dir: "rtl", visualQa: false })
      : fail(50)
  );

  items.push(sales.status === "LOCKED" ? already(51) : fail(51, sales));

  const marks = { "✅": 0, "🟡": 0, "🔴": 0, "⬜": 0 };
  for (const item of items) marks[item.mark] = (marks[item.mark] || 0) + 1;

  return {
    ok: items.length === 51,
    listed: items.length,
    salesGate: sales.status,
    live: false,
    productionReady: false,
    professionalTranslation: false,
    marks,
    items,
  };
}

module.exports = { NAMES, evaluateDevList51 };
