const { capture, sandboxAuthorize } = require("../commerce/paymentSandbox");
const { rejectClientCouponFields } = require("../commerce/commerceCouponService");
const { createReturnStore, requestReturn, refundMoney } = require("../commerce/dryReturnRequest");
const { estimateVat, AB27 } = require("../commerce/ab27Tax");
const { listPools } = require("../commerce/taxPools");
const { snapshot: financeOpsSnapshot } = require("../finance/financeOpsSnapshot");
const { assess: assessTaxConnect } = require("../commerce/taxConnect");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase7PaymentFinance() {
  const auth = sandboxAuthorize({ amount: 49.9, currency: "EUR" });
  const cap = capture(auth.id);
  const coupon = rejectClientCouponFields({ clientDiscount: 99 }, 5);
  const store = createReturnStore();
  const ret = requestReturn(store, { orderId: "DRY-ORD-P7", reason: "DRY" });
  const refund = refundMoney();
  const vat = estimateVat({ country: "DE", netAmount: 50 });
  const pools = listPools();
  const fin = financeOpsSnapshot();
  const tax = assessTaxConnect();

  const checks = [
    { id: "PAY_SANDBOX_AUTH", ok: auth.ok === true && auth.captured === false },
    { id: "PAY_CAPTURE_BLOCKED", ok: cap.ok === false && cap.captured === false },
    { id: "PAY_COUPON_TAMPER", ok: coupon.ok === false && coupon.code === "coupon_tampering" },
    { id: "PAY_RETURN_DRY", ok: ret.ok === true },
    { id: "PAY_REFUND_SANDBOX", ok: refund.refundIssued === false && refund.live === false },
    { id: "PAY_VAT_AB27", ok: vat.ok === true && AB27 != null },
    { id: "PAY_TAX_POOLS", ok: Array.isArray(pools) && pools.length >= 20 },
    { id: "PAY_FINANCE_OPS", ok: fin.taxConnect?.filingLive === false },
    { id: "PAY_TAX_CONNECT_ASSESS", ok: tax.filingEnabled === false && tax.connected === false },
    { id: "PAY_LIVE_CAPTURE", ok: false, status: "BLOCKED_EXTERNAL", note: "Dev list #28" },
    { id: "PAY_LIVE_REFUND", ok: false, status: "BLOCKED_EXTERNAL", note: "Dev list #30" },
    { id: "PAY_TAX_CONNECT_LIVE", ok: false, status: "BLOCKED_EXTERNAL", note: "Dev list #37" },
  ];

  return finalizePhase(7, "Ödeme ve finans", checks, [
    "PAY_LIVE_CAPTURE",
    "PAY_LIVE_REFUND",
    "PAY_TAX_CONNECT_LIVE",
  ]);
}

module.exports = { evaluatePhase7PaymentFinance };