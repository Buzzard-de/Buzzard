const { ORDER_STATUS, GERMANY_CARRIERS } = require("./contract");
const { startReturn } = require("../../logistics/v5/returnsEngine");

function toOrderDraft(pkg, { storeFrontCode = "DE" } = {}) {
  const packageId = pkg?.shipmentPackageId ?? pkg?.id;
  if (packageId == null || packageId === "") return { ok: false, code: "PACKAGE_ID_MISSING", live: false };
  const sourceStatus = pkg.shipmentPackageStatus || pkg.status;
  const buzzardStatus = ORDER_STATUS[sourceStatus] || "UNKNOWN";
  return {
    ok: true,
    live: false,
    persisted: false,
    orderCreated: false,
    channel: "trendyol",
    market: "international",
    storeFrontCode,
    externalPackageId: String(packageId),
    orderNumber: pkg.orderNumber == null ? null : String(pkg.orderNumber),
    buzzardStatus,
    actionAllowed: buzzardStatus !== "AWAITING",
    currency: pkg.currencyCode || null,
    lines: (pkg.lines || []).map((line) => ({
      lineId: line.lineId,
      barcode: line.barcode,
      sku: line.stockCode || line.merchantSku || null,
      quantity: line.quantity,
      unitPrice: line.lineUnitPrice,
      currency: line.currencyCode || pkg.currencyCode || null,
    })),
    shipment: {
      cargoTrackingNumber: pkg.cargoTrackingNumber || null,
      cargoSenderNumber: pkg.cargoSenderNumber || null,
      cargoProviderName: pkg.cargoProviderName || null,
      trackingLink: pkg.cargoTrackingLink || null,
    },
  };
}

function providerCodeFor(carrierId, storeFrontCode = "DE") {
  if (storeFrontCode !== "DE") return { ok: false, code: "STOREFRONT_CARRIER_UNMAPPED", live: false };
  const code = GERMANY_CARRIERS[String(carrierId || "").toUpperCase()];
  if (!code) return { ok: false, code: "CARRIER_UNMAPPED", live: false };
  return { ok: true, providerCode: code, live: false, labelPurchased: false };
}

function trackingPayload({ packageStatus, carrierId, cargoSenderNumber, returnTrackingNumber }) {
  if (!["Picking", "Invoiced", "Shipped"].includes(packageStatus)) {
    return { ok: false, code: "TRACKING_STATUS_BLOCKED", live: false };
  }
  const carrier = providerCodeFor(carrierId);
  if (!carrier.ok) return carrier;
  if (!cargoSenderNumber) return { ok: false, code: "TRACKING_NUMBER_MISSING", live: false };
  const body = { cargoSenderNumber: String(cargoSenderNumber), providerCode: carrier.providerCode };
  if (returnTrackingNumber) body.returnTrackingNumber = String(returnTrackingNumber);
  return { ok: true, body, live: false, network: false };
}

function toReturnDraft(claim) {
  if (!claim || (claim.claimId == null && claim.id == null)) return { ok: false, code: "CLAIM_ID_MISSING", live: false };
  const shipmentId = String(claim.orderShipmentPackageId || claim.orderOutboundPackageId || "UNKNOWN");
  return {
    ok: true,
    live: false,
    channel: "trendyol",
    claimId: String(claim.claimId || claim.id),
    orderNumber: claim.orderNumber == null ? null : String(claim.orderNumber),
    return: startReturn({ shipmentId }),
  };
}

function readBatchResult(body = {}) {
  const items = Array.isArray(body.items) ? body.items : [];
  const failed = items.filter((item) => item.status === "FAILED" || (item.failureReasons && item.failureReasons.length));
  return {
    ok: body.status === "COMPLETED" && failed.length === 0,
    batchRequestId: body.batchRequestId || null,
    status: body.status || null,
    failed,
    live: false,
  };
}

module.exports = { toOrderDraft, providerCodeFor, trackingPayload, toReturnDraft, readBatchResult };
