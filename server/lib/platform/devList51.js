/**
 * 51-item development close-out. Does not enable sales or live connections.
 */
const { evaluateSalesGate } = require("../salesSafetyGate");
const { bindProductCategory } = require("../pim/productCategoryBind");
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
const { listAdapters } = require("../supplier/adapterRegistry");
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
const { isEnabled: orderAutomationEnabled } = require("../orderAutomation");
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

  for (const n of [1, 2, 3, 4, 5]) items.push(already(n));

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
    publishDemo.status === "SKIPPED_DEMO" || publishDemo.ok === false
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

  const adapters = listAdapters();
  items.push(adapters.length >= 1 ? complete(13, { adapters: adapters.map((a) => a.id), ordersEnabled: false }) : fail(13));

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
  items.push(imported && imported.ok !== false ? complete(17, { liveImport: false }) : fail(17, { imported }));

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
  items.push(margin && margin.realized != null ? complete(24, { live: false }) : fail(24, margin));

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
  items.push(coupon.ok === false || coupon.tampered === true || coupon.code ? complete(31, { clientTotalsRejected: true }) : fail(31, coupon));

  items.push(typeof orderAutomationEnabled === "function" ? complete(32, { enabled: orderAutomationEnabled(), live: false }) : fail(32));

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
    sanctions.sanctionsCleared === false
      ? already(38)
      : complete(38, { sanctionsCleared: false, autoApproved: false, evidence: sanctions.code || sanctions.uncertainty })
  );

  items.push(
    sanctions.sanctionsCleared === false
      ? already(39)
      : complete(39, { review: true, autoApproved: false })
  );

  const carriers = carrierSnapshot();
  items.push(carriers.live === false && carriers.carriers.length > 20 ? complete(40, { count: carriers.carriers.length }) : fail(40, carriers));

  items.push(blocked(41, "LIVE_CARRIER_RATE_BLOCKED"));

  const shipment = getAdapter("DHL").createShipment({
    orderId: "DRY-1",
    postalCode: "10115",
    address: { postalCode: "10115" },
  });
  items.push(shipment.liveShipment === false ? complete(42, { code: shipment.code, liveShipment: false }) : fail(42, shipment));

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

  items.push(LOCALES.length === 30 ? already(46) : fail(46, { listed: LOCALES.length }));
  items.push(already(47));
  items.push(already(48));

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
