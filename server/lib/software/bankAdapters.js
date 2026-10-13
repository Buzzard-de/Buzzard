/**
 * SEPA / IBAN / accounting adapter boundaries.
 * Format checks only. No bank transfer, collection, DATEV session, or refund.
 */

function iso7064Mod97(value) {
  let remainder = 0;
  for (let i = 0; i < value.length; i += 1) {
    remainder = (remainder * 10 + Number(value[i])) % 97;
  }
  return remainder;
}

function expandIban(iban) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  return rearranged
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) return String(code - 55);
      return ch;
    })
    .join("");
}

function validateIban(raw) {
  const iban = String(raw || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return { ok: false, valid: false, reason: "IBAN_FORMAT_INVALID", configured: false };
  }
  const expanded = expandIban(iban);
  const valid = iso7064Mod97(expanded) === 1;
  return {
    ok: valid,
    valid,
    country: iban.slice(0, 2),
    reason: valid ? "IBAN_CHECKSUM_OK" : "IBAN_CHECKSUM_INVALID",
    configured: false,
    transferred: false,
  };
}

function sepaAdapter() {
  return {
    id: "sepa",
    status: "NOT_CONFIGURED",
    live: false,
    transferIssued: false,
    collectionIssued: false,
    credentialsPresent: Boolean(process.env.SEPA_CREDITOR_ID),
  };
}

function bankAdapter() {
  return {
    id: "bank_transfer",
    status: "NOT_CONFIGURED",
    live: false,
    transferIssued: false,
    credentialsPresent: Boolean(process.env.BANK_ACCOUNT_IBAN),
  };
}

function datevAdapter() {
  return {
    id: "datev",
    status: "NOT_CONFIGURED",
    live: false,
    sessionOpen: false,
    configuredLikeLive: false,
    credentialsPresent: Boolean(process.env.DATEV_CLIENT_ID),
    note: "DATEV is not configured and is not presented as connected.",
  };
}

function accountingHealth() {
  return {
    sepa: sepaAdapter(),
    bank: bankAdapter(),
    datev: datevAdapter(),
    anyLive: false,
    refundIssued: false,
  };
}

module.exports = {
  validateIban,
  sepaAdapter,
  bankAdapter,
  datevAdapter,
  accountingHealth,
};
