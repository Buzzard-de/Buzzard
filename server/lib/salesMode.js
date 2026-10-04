/** Server-side catalog mode — blocks orders/checkout until BUZZARD_SALES_ENABLED=1 */

function testBypassAllowed() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.BUZZARD_SALES_GATE_BYPASS === "1"
  );
}

let goLiveEvalDepth = 0;

function isGoLiveEligible() {
  if (goLiveEvalDepth > 0) return false;
  goLiveEvalDepth += 1;
  try {
    const { createGoLiveGate } = require("./goLiveGate");
    const report = createGoLiveGate({ env: process.env, productionSafetyLock: true }).evaluateGoLive();
    return report.status === "PASS" && report.decision === "GO";
  } catch {
    return false;
  } finally {
    goLiveEvalDepth -= 1;
  }
}

function isSalesEnabled() {
  if (process.env.BUZZARD_SALES_ENABLED !== "1") return false;
  if (testBypassAllowed()) return true;
  try {
    const { evaluateSalesGate } = require("./salesSafetyGate");
    if (evaluateSalesGate().allowed !== true) return false;
  } catch {
    return false;
  }
  return isGoLiveEligible();
}

function salesDisabledResponse() {
  return {
    error: "Online ordering is currently disabled (catalog mode)",
    code: "sales_disabled",
    status: 403,
  };
}

function assertSalesEnabled() {
  if (isSalesEnabled()) return null;
  if (process.env.BUZZARD_SALES_ENABLED === "1") {
    return {
      error: "Sales blocked by Go-Live Gate",
      code: "SALES_BLOCKED_BY_GO_LIVE_GATE",
      status: 403,
    };
  }
  return salesDisabledResponse();
}

function requireSalesEnabled(req, res) {
  const blocked = assertSalesEnabled();
  if (blocked) {
    res.status(blocked.status).json({ error: blocked.error, code: blocked.code });
    return false;
  }
  return true;
}

module.exports = {
  isSalesEnabled,
  salesDisabledResponse,
  assertSalesEnabled,
  requireSalesEnabled,
  isGoLiveEligible,
};
