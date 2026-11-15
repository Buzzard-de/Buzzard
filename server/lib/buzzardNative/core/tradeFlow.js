const { createRouter } = require("./taskRouter");
const { calculateVat, netIncomeReport, fileReturn, payTax } = require("./tax/vatEngine");
const { screen, duty, fileDeclaration, release } = require("./customs/engine");
const { check } = require("./permissionEngine");
const { think } = require("./sharedThinking");

const TASK_KINDS = Object.freeze([
  "TAX_ANALYSIS",
  "TAX_REPORT",
  "VAT_CALCULATION",
  "TAX_COMPLIANCE_REVIEW",
  "CUSTOMS_ANALYSIS",
  "HS_CLASSIFICATION",
  "TARIC_CHECK",
  "SANCTIONS_SCREENING",
  "CUSTOMS_DUTY_CALCULATION",
  "TRADE_COMPLIANCE_REVIEW",
]);

function runImportToEuCustomer({ sku = "cotton_tshirt", origin = "TR", destination = "FR", sellerCountry = "DE", net = 100 } = {}) {
  const router = createRouter();
  const created = router.create({ title: "import to EU customer", fromId: "pusat", kind: "TRADE_COMPLIANCE_REVIEW" });
  router.assign({ taskId: created.task.id, agentId: "tuncay_bey" });
  router.assign({ taskId: created.task.id, agentId: "nedim_bey" });
  const customs = screen({
    actorId: "tuncay_bey",
    sku,
    origin,
    sellerCountry,
    customerCountry: destination,
    destination,
  });
  const dutyEst = duty({ actorId: "tuncay_bey", goodsValue: net, origin, destination, hs: customs.classification.hs });
  const tax = calculateVat({
    actorId: "nedim_bey",
    sellerCountry,
    customerCountry: destination,
    deliveryCountry: destination,
    goodsNet: net,
    kind: "B2C",
  });
  const finance = netIncomeReport({
    actorId: "nedim_bey",
    incomeCountry: destination,
    gross: net + (tax.vat || 0),
    vat: tax.vat || 0,
    commission: 0,
    logistics: 0,
    supplierCost: 40,
  });
  const tuncayThink = think({ agentId: "tuncay_bey", facts: { ask_expertise: true } });
  const nedimThink = think({ agentId: "nedim_bey", facts: { ask_expertise: true } });
  const conflict =
    (customs.status === "BLOCKED" || customs.status === "UNKNOWN") && tax.ok
      ? { conflict: true, note: "customs_not_clear_tax_cannot_clear_shipment" }
      : { conflict: false };
  const ran = router.runAssigned(created.task.id);
  ran.task.reports.push({ agentId: "tuncay_bey", kind: "CUSTOMS_ANALYSIS", status: customs.status });
  ran.task.reports.push({ agentId: "nedim_bey", kind: "TAX_ANALYSIS", vat: tax.vat, liveLegal: false });
  const nedimApprovesCustoms = { ok: false, code: "CROSS_SPECIALIST_APPROVAL_DENIED" };
  const tuncayApprovesTax = { ok: false, code: "CROSS_SPECIALIST_APPROVAL_DENIED" };
  return {
    ok: true,
    task: ran.task,
    completed: false,
    customs,
    duty: dutyEst,
    tax,
    finance,
    thinking: { tuncay: tuncayThink.expertise, nedim: nedimThink.expertise },
    conflict,
    nedimApprovesCustoms,
    tuncayApprovesTax,
    fileReturn: fileReturn(),
    payTax: payTax(),
    fileDeclaration: fileDeclaration(),
    release: release(),
    pusatPay: check("pusat", "PAYMENT_ACTIVATE"),
    liveVerified: false,
    TASK_KINDS,
  };
}

module.exports = { runImportToEuCustomer, TASK_KINDS };
