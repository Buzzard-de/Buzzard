/**
 * ISO 20022 sandbox documents. They are not submitted to a bank.
 */
const { pain001, parseCamt, ibanValid } = require("../../finance/bankingAdapter");
const { decideAsset } = require("./fiatPolicy");

function buildPain001({ debtorIban, creditorIban, amount = "1.00", currency = "EUR" } = {}) {
  const fiat = decideAsset({ currency, assetType: "fiat" });
  if (!fiat.ok) return { ...fiat, submitted: false, xml: null };
  if (!ibanValid(debtorIban) || !ibanValid(creditorIban)) {
    return { ok: false, code: "IBAN_INVALID", submitted: false, xml: null };
  }
  const doc = pain001({ debtorIban, creditorIban, amount, currency: fiat.currency });
  return { ...doc, ok: doc.ok, submitted: false, live: false, transmitted: false };
}

function readCamt(xml) {
  const parsed = parseCamt({ xml });
  return { ...parsed, live: false, transmitted: false };
}

function ebicsReady() {
  return { ok: false, code: "CONTRACT_REQUIRED", hostId: null, live: false, submitted: false };
}

module.exports = { buildPain001, readCamt, ebicsReady };
