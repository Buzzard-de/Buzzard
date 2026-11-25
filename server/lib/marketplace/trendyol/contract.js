/**
 * Trendyol International Marketplace, documented at
 * https://developers.trendyol.com/v3.0/
 * Turkey domestic endpoints are not used.
 * Product create/update and order read use V2. The V1 order path is not called.
 */

const HOSTS = Object.freeze({
  stage: "https://stageapigw.trendyol.com",
  production: "https://apigw.trendyol.com",
});

const STOREFRONTS = Object.freeze({
  DE: { region: "Europe", vatRates: [0, 7, 19] },
  GR: { region: "CEE", vatRates: [0, 6, 13, 24] },
  SK: { region: "CEE", vatRates: [0, 19, 23] },
  RO: { region: "CEE", vatRates: [0, 11, 21] },
  CZ: { region: "CEE", vatRates: [0, 12, 21] },
  BG: { region: "CEE", vatRates: [0, 9, 20] },
  SA: { region: "GULF", vatRates: [15] },
  AE: { region: "GULF", vatRates: [5] },
  KW: { region: "GULF", vatRates: [0] },
});

const GERMANY_CARRIERS = Object.freeze({
  DHL: "DHLMP",
  HERMES: "HERMESMP",
  DHL_EXPRESS: "DHLEXPMP",
  DPD: "DPDMP",
});

const ORDER_STATUS = Object.freeze({
  Created: "PENDING",
  Picking: "PROCESSING",
  Invoiced: "INVOICED",
  Shipped: "SHIPPED",
  Delivered: "DELIVERED",
  Cancelled: "CANCELLED",
  Returned: "RETURNED",
  UnDelivered: "UNDELIVERED",
  UnPacked: "UNPACKED",
  UnSupplied: "UNSUPPLIED",
  Awaiting: "AWAITING",
  Verified: "VERIFIED",
  AtCollectionPoint: "AT_COLLECTION_POINT",
});

const LIMITS = Object.freeze({
  productWritePerMinute: 1000,
  productReadPerMinute: 2000,
  inventoryPerMinute: 1000,
  barcodePricePerMinute: 30,
  orderReadPerMinute: 2000,
  batchSize: 1000,
});

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function productCreatePath(sellerId) {
  return `/integration/product/sellers/${sellerId}/v2/products`;
}

function productUpdatePath(sellerId, kind) {
  const suffix = {
    unapproved: "products/unapproved-bulk-update",
    content: "products/content-bulk-update",
    variant: "products/variant-bulk-update",
    delivery: "products/delivery-info-bulk-update",
  }[kind];
  if (!suffix) return null;
  return `/integration/product/sellers/${sellerId}/${suffix}`;
}

function priceAndInventoryPath(sellerId) {
  return `/integration/inventory/sellers/${sellerId}/products/price-and-inventory`;
}

function batchResultPath(sellerId, batchRequestId) {
  return `/integration/product/sellers/${sellerId}/products/batch-requests/${batchRequestId}`;
}

function ordersPath(sellerId) {
  return `/integration/order/sellers/${sellerId}/v2/orders`;
}

function trackingPath(sellerId, packageId) {
  return `/integration/order/sellers/${sellerId}/shipment-packages/${packageId}/tracking-details`;
}

function packageStatusPath(sellerId, packageId) {
  return `/integration/order/sellers/${sellerId}/shipment-packages/${packageId}`;
}

function cancelPath(sellerId, packageId) {
  return `/integration/order/sellers/${sellerId}/shipment-packages/${packageId}/items/unsupplied`;
}

function claimsPath(sellerId) {
  return `/integration/order/sellers/${sellerId}/claims`;
}

function invoiceLinkPath(sellerId) {
  return `/integration/sellers/${sellerId}/seller-invoice-links`;
}

module.exports = {
  HOSTS,
  STOREFRONTS,
  GERMANY_CARRIERS,
  ORDER_STATUS,
  LIMITS,
  RETRYABLE_STATUS,
  productCreatePath,
  productUpdatePath,
  priceAndInventoryPath,
  batchResultPath,
  ordersPath,
  trackingPath,
  packageStatusPath,
  cancelPath,
  claimsPath,
  invoiceLinkPath,
};
