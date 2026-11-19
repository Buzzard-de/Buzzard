const { evaluatePhase3ProductPim } = require("./phase3ProductPim");
const { classifyProductOrigin } = require("../pim/productOrigin");
const { canPublishProduct } = require("../pim/productCatalogPublish");
const { envelopeProductContent, LOCALES } = require("../pim/productContentI18n");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase11PimSot() {
  const p3 = evaluatePhase3ProductPim();
  const real = classifyProductOrigin({ sku: "DRY-SKU-001", supplier_sku: "DRY-SKU-001", title: "Real" });
  const demo = classifyProductOrigin({ sku: "BZ-CORE-DEMO-001", title: "Demo" });
  const pub = canPublishProduct({
    sku: "DRY-SKU-001",
    title: "Bremsbelag",
    brand: "ATE",
    ean_gtin: "5901234123457",
    images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
  });
  const i18n = envelopeProductContent({ title: "Bremsbelag", description: "Test" }, "de");

  const checks = [
    { id: "PIM_SOT_PHASE3", ok: p3.percentComplete === 100 },
    { id: "PIM_SOT_ORIGIN", ok: real.demo === false && demo.demo === true },
    { id: "PIM_SOT_PUBLISH_GATE", ok: pub.validation != null || pub.ok === true },
    { id: "PIM_SOT_I18N", ok: i18n.sourceLocale === "de" && i18n.listed >= 30 && (LOCALES?.length || 0) >= 30 },
    { id: "PIM_LIVE_PUBLISH", ok: false, status: "BLOCKED_EXTERNAL", note: "Sales gate + human approval" },
  ];

  return finalizePhase(11, "Ürün yönetimi ve PIM (SoT)", checks, ["PIM_LIVE_PUBLISH"]);
}

module.exports = { evaluatePhase11PimSot };