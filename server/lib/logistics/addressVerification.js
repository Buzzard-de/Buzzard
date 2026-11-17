/**
 * Local address verification for EU-27 (+ TR/CH/GB/NO). No live postal API.
 */
const { POSTCODE, getAdapter } = require("./carrierContract");
const { AB27 } = require("../commerce/ab27Tax");

const EXTRA_POSTCODE = Object.freeze({
  TR: /^\d{5}$/,
  CH: /^\d{4}$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
  NO: /^\d{4}$/,
});

const HOUSE_NUMBER_COUNTRIES = new Set(["DE", "AT", "NL", "BE", "FR", "LU"]);
const PACKSTATION = /packstation/i;
const PO_BOX = /\b(p\.?\s*o\.?\s*box|postfach|postbus|apartado)\b/i;

function countryKey(value) {
  const code = String(value || "").trim().toUpperCase();
  return code === "GR" ? "EL" : code;
}

function postalPattern(country) {
  return POSTCODE[country] || EXTRA_POSTCODE[country] || null;
}

function normalizeAddress(input = {}) {
  const country = countryKey(input.country);
  const postalCode = String(input.postalCode || input.postcode || input.zip || "").trim().toUpperCase();
  const line1 = String(input.line1 || input.street || "").trim();
  const line2 = String(input.line2 || "").trim();
  const houseNumber = String(input.houseNumber || input.houseNo || "").trim();
  const city = String(input.city || "").trim();
  const recipient = String(input.recipient || input.name || `${input.firstName || ""} ${input.lastName || ""}`.trim()).trim();
  return {
    recipient,
    line1,
    line2,
    houseNumber,
    city,
    postalCode,
    country,
    packstationNumber: String(input.packstationNumber || "").trim(),
    postNumber: String(input.postNumber || "").trim(),
  };
}

function verifyAddress(input = {}, { purpose = "shipping" } = {}) {
  const address = normalizeAddress(input);
  const errors = [];
  if (address.recipient.length < 2) errors.push({ field: "recipient", code: "RECIPIENT_REQUIRED" });
  if (address.line1.length < 3) errors.push({ field: "line1", code: "STREET_REQUIRED" });
  if (address.city.length < 2) errors.push({ field: "city", code: "CITY_REQUIRED" });
  if (!address.country || address.country.length !== 2) errors.push({ field: "country", code: "COUNTRY_INVALID" });

  const pattern = postalPattern(address.country);
  if (!pattern) {
    errors.push({ field: "country", code: "COUNTRY_UNSUPPORTED" });
  } else if (!pattern.test(address.postalCode)) {
    errors.push({ field: "postalCode", code: "POSTAL_INVALID" });
  }

  const packstation = PACKSTATION.test(address.line1) || PACKSTATION.test(address.line2);
  const poBox = PO_BOX.test(address.line1) || PO_BOX.test(address.line2);
  if (packstation) {
    if (!/^\d{3}$/.test(address.packstationNumber)) {
      errors.push({ field: "packstationNumber", code: "PACKSTATION_NUMBER_REQUIRED" });
    }
    if (!/^\d{6,10}$/.test(address.postNumber)) {
      errors.push({ field: "postNumber", code: "POST_NUMBER_REQUIRED" });
    }
  } else if (HOUSE_NUMBER_COUNTRIES.has(address.country) && !packstation && !poBox) {
    const inStreet = /\b\d+[a-zA-Z]?\b/.test(address.line1);
    if (!address.houseNumber && !inStreet) {
      errors.push({ field: "houseNumber", code: "HOUSE_NUMBER_REQUIRED" });
    }
  }

  if (purpose === "shipping" && poBox && !packstation) {
    errors.push({ field: "line1", code: "PO_BOX_NOT_FOR_PARCEL" });
  }

  const supported = Boolean(pattern) || AB27.includes(address.country);
  return {
    ok: errors.length === 0,
    live: false,
    provider: "LOCAL_RULES",
    purpose,
    supportedCountry: supported,
    packstation,
    poBox,
    normalized: address,
    errors,
    code: errors[0]?.code || "ADDRESS_VERIFIED_LOCAL",
  };
}

function canCreateDryShipment(address, carrierId = "DHL") {
  const verified = verifyAddress(address, { purpose: "shipping" });
  if (!verified.ok) {
    return { ok: false, liveShipment: false, ...verified };
  }
  const adapter = getAdapter(carrierId);
  if (!adapter) {
    return { ok: false, liveShipment: false, code: "CARRIER_UNKNOWN" };
  }
  const created = adapter.createShipment({
    orderId: "DRY-ADDR-1",
    address: {
      postalCode: verified.normalized.postalCode,
      postcode: verified.normalized.postalCode,
      country: verified.normalized.country,
    },
    postalCode: verified.normalized.postalCode,
    weightGrams: 500,
    contactName: verified.normalized.recipient,
    houseNumber: verified.normalized.houseNumber || "1",
  });
  return {
    ...created,
    addressOk: true,
    liveShipment: false,
    label: false,
  };
}

module.exports = {
  POSTAL: { ...POSTCODE, ...EXTRA_POSTCODE },
  normalizeAddress,
  verifyAddress,
  canCreateDryShipment,
};
