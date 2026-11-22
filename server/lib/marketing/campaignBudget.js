/**
 * Campaign budget plan. Money can be reserved on paper and cannot be spent.
 */
function planBudget({ channel, currency = "EUR", limitCents } = {}) {
  if (typeof channel !== "string" || channel.trim() === "") return { ok: false, code: "CHANNEL_REQUIRED", live: false };
  if (!Number.isInteger(limitCents) || limitCents <= 0) return { ok: false, code: "LIMIT_INVALID", live: false };
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, code: "CURRENCY_INVALID", live: false };
  return {
    ok: true,
    channel: channel.trim(),
    currency,
    limitCents,
    reservedCents: 0,
    spentCents: 0,
    live: false,
  };
}

function reserve(plan, amountCents) {
  if (!plan || plan.ok !== true) return { ok: false, code: "NO_PLAN", spentCents: 0, live: false };
  if (!Number.isInteger(amountCents) || amountCents <= 0) return { ok: false, code: "AMOUNT_INVALID", spentCents: 0, live: false };
  if (amountCents > plan.limitCents) return { ok: false, code: "BUDGET_EXCEEDED", spentCents: 0, live: false };
  return { ...plan, ok: true, reservedCents: amountCents, spentCents: 0, live: false };
}

function captureSpend() {
  return { ok: false, code: "ADS_SPEND_LOCKED", spentCents: 0, live: false };
}

module.exports = { planBudget, reserve, captureSpend };
