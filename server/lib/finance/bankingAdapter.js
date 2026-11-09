/**
 * Extensible fiat banking adapter. Deutsche Bank AG is a commercial-bank
 * candidate, not Deutsche Bundesbank. No credentials, no transfers.
 */
const PROVIDERS = Object.freeze([
  { id: "deutsche_bank_ag", kind: "commercial_bank", candidate: true, live: false },
  { id: "sepa", kind: "rail", live: false },
  { id: "sepa_instant", kind: "rail", live: false },
  { id: "ebics", kind: "protocol", live: false },
  { id: "paypal", kind: "wallet", candidate: true, live: false },
]);

function initiateTransfer() {
  return {
    ok: false,
    code: "HUMAN_GATE_REQUIRED",
    sent: false,
    realMoneyMovement: false,
    crypto: false,
    cbdc: false,
  };
}

const PAYMENT_STATES = Object.freeze(["CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED", "CANCELLED"]);

function paymentStatus({ from = "CREATED", event = "authorize" } = {}) {
  const transitions = {
    CREATED: { authorize: "AUTHORIZED", fail: "FAILED", cancel: "CANCELLED" },
    AUTHORIZED: { capture: "CAPTURED", fail: "FAILED", refund: "REFUNDED", cancel: "CANCELLED" },
    CAPTURED: { refund: "REFUNDED" },
    FAILED: {},
    REFUNDED: {},
    CANCELLED: {},
  };
  const next = (transitions[from] || {})[event];
  if (!next) return { ok: false, code: "INVALID_TRANSITION", from, event, live: false, moneyMoved: false };
  return { ok: true, from, event, to: next, live: false, moneyMoved: false, states: PAYMENT_STATES };
}

function fraudScreen({ amount, country } = {}) {
  if (amount != null && Number(amount) > 10_000) {
    return { ok: true, decision: "REVIEW", live: false, listLive: false, moneyMoved: false };
  }
  return { ok: true, decision: "PASS_SYNTHETIC", live: false, listLive: false, country: country || null };
}

function reconcile() {
  return { ok: true, matched: 0, mode: "DRY_RUN", live: false };
}

function snapshot() {
  return {
    providers: PROVIDERS.map((p) => ({ ...p })),
    fiatOnly: true,
    cryptoRails: false,
    credentialsStored: false,
    bundesbankIsNotCommercialCandidate: true,
  };
}

module.exports = {
  PROVIDERS,
  PAYMENT_STATES,
  initiateTransfer,
  paymentStatus,
  fraudScreen,
  reconcile,
  snapshot,
};
