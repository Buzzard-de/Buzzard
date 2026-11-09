/**
 * Extensible fiat banking adapter. Deutsche Bank AG is a commercial-bank
 * candidate, not Deutsche Bundesbank. No credentials, no transfers.
 */
const PROVIDERS = Object.freeze([
  { id: "deutsche_bank_ag", kind: "commercial_bank", candidate: true, live: false },
  { id: "sepa", kind: "rail", live: false },
  { id: "sepa_instant", kind: "rail", live: false },
  { id: "ebics", kind: "protocol", live: false },
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

module.exports = { PROVIDERS, initiateTransfer, reconcile, snapshot };
