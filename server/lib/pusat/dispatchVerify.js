/**
 * Independent verification of specialist dispatch results.
 * A specialist cannot mark its own tests passed.
 */
function verifyDispatch({ kind, result } = {}) {
  const fail = (code) => ({
    ok: false,
    code,
    testsPassed: false,
    acceptancePassed: false,
    independent: true,
    notVerified: code === "NOT_VERIFIED",
  });
  if (!result) return fail("NOT_VERIFIED");
  if (result.llmCompleted === true) return fail("LLM_CLAIM_REJECTED");
  if (result.live === true) return fail("LIVE_CLAIM_REJECTED");
  const inner = result.result || {};
  if (inner.live === true || inner.liveCall === true || inner.purchased === true || inner.sent === true) {
    return fail("LIVE_ACTION_REJECTED");
  }
  if (kind === "THINK" || kind === "REPORT") {
    const ok = inner.kind === "RULE_BASED" && inner.ok !== false && inner.llmCompleted === false;
    return ok
      ? { ok: true, code: "INDEPENDENT_OK", testsPassed: true, acceptancePassed: true, independent: true }
      : fail("NOT_VERIFIED");
  }
  if (kind === "STOCK_BUY") {
    if (inner.purchased === true) return fail("STOCK_PURCHASE_REJECTED");
    if (result.ok === true && result.humanApproved === true && inner.purchased === false) {
      return { ok: true, code: "APPROVED_DRY_RUN", testsPassed: true, acceptancePassed: true, independent: true };
    }
    return fail("HUMAN_GATE_REQUIRED");
  }
  if (kind === "PRICE_CALCULATE") {
    const ok = inner.ok === true && Number(inner.net) >= 0.5 && inner.livePublish !== true;
    return ok
      ? { ok: true, code: "INDEPENDENT_OK", testsPassed: true, acceptancePassed: true, independent: true }
      : fail(inner.code || "NOT_VERIFIED");
  }
  if (result.ok === true && result.llmCompleted === false) {
    return { ok: true, code: "INDEPENDENT_OK", testsPassed: true, acceptancePassed: true, independent: true };
  }
  if (result.ok === false && result.code === "HUMAN_GATE_REQUIRED") {
    return fail("HUMAN_GATE_REQUIRED");
  }
  return fail("NOT_VERIFIED");
}

module.exports = { verifyDispatch };
