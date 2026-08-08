const CARRIERS = {
  DHL: {
    name: "DHL",
    trackingUrl(trackingNumber) {
      return `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(trackingNumber)}`;
    },
  },
  DPD: {
    name: "DPD",
    trackingUrl(trackingNumber) {
      return `https://tracking.dpd.de/status/en_US/parcel/${encodeURIComponent(trackingNumber)}`;
    },
  },
  GLS: {
    name: "GLS",
    trackingUrl(trackingNumber) {
      return `https://gls-group.eu/EU/en/parcel-tracking?match=${encodeURIComponent(trackingNumber)}`;
    },
  },
  HERMES: {
    name: "Hermes",
    trackingUrl(trackingNumber) {
      return `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${encodeURIComponent(trackingNumber)}`;
    },
  },
  UPS: {
    name: "UPS",
    trackingUrl(trackingNumber) {
      return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
    },
  },
};

function normalizeCarrier(carrier) {
  return String(carrier || "DHL").toUpperCase();
}

function getCarrier(carrier) {
  return CARRIERS[normalizeCarrier(carrier)] || CARRIERS.DHL;
}

function getTrackingUrl(carrier, trackingNumber) {
  if (!trackingNumber) return null;
  return getCarrier(carrier).trackingUrl(trackingNumber);
}

function listCarriers() {
  return Object.keys(CARRIERS);
}

module.exports = { getCarrier, getTrackingUrl, listCarriers, CARRIERS };
