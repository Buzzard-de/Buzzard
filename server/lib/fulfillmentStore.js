const fs = require("fs");
const path = require("path");

function dataFiles() {
  const dataDir = process.env.BUZZARD_FULFILLMENT_DIR
    ? path.resolve(process.env.BUZZARD_FULFILLMENT_DIR)
    : path.join(__dirname, "..", "data");
  return {
    dataDir,
    fulfillmentsFile: path.join(dataDir, "fulfillments.json"),
    supplierOrdersFile: path.join(dataDir, "supplier-orders.json"),
    shipmentsFile: path.join(dataDir, "shipments.json"),
    returnsFile: path.join(dataDir, "return-requests.json"),
  };
}

function ensureDataDir() {
  const { dataDir } = dataFiles();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readJson(file) {
  ensureDataDir();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readFulfillments() {
  return readJson(dataFiles().fulfillmentsFile);
}

function writeFulfillments(items) {
  writeJson(dataFiles().fulfillmentsFile, items);
}

function readSupplierOrders() {
  return readJson(dataFiles().supplierOrdersFile);
}

function writeSupplierOrders(items) {
  writeJson(dataFiles().supplierOrdersFile, items);
}

function readShipments() {
  return readJson(dataFiles().shipmentsFile);
}

function writeShipments(items) {
  writeJson(dataFiles().shipmentsFile, items);
}

function readReturns() {
  return readJson(dataFiles().returnsFile);
}

function writeReturns(items) {
  writeJson(dataFiles().returnsFile, items);
}

function directRefusal(code) {
  return { ok: false, code, stored: false, created: false, updated: false, live: false, status: 409 };
}

function createFulfillment() {
  return directRefusal(require("./salesMode").isSalesEnabled() ? "STOCK_UNVERIFIED" : "SALES_CLOSED");
}

function updateFulfillment() {
  return directRefusal("FULFILLMENT_NOT_LIVE");
}

function findFulfillmentByIdempotency(key) {
  return readFulfillments().find((f) => f.idempotencyKey === key);
}

function createSupplierOrder() {
  return directRefusal(require("./salesMode").isSalesEnabled() ? "SUPPLIER_NOT_LIVE" : "SALES_CLOSED");
}

function updateSupplierOrder() {
  return directRefusal("SUPPLIER_NOT_LIVE");
}

function createShipment() {
  return directRefusal(require("./salesMode").isSalesEnabled() ? "SHIPPING_RATE_UNVERIFIED" : "SALES_CLOSED");
}

function updateShipment(_id, patch = {}) {
  const claimed = String(patch.status || "");
  return {
    ok: false,
    code: claimed === "delivered" ? "DELIVERY_UNCONFIRMED" : "SHIPMENT_NOT_CREATED",
    trackingNumber: null,
    delivered: false,
    shipped: false,
    live: false,
    updated: false,
  };
}

function listShipmentsForOrder(orderNumber) {
  return readShipments().filter((s) => s.orderNumber === orderNumber);
}

function sanitizeShipment(shipment) {
  const { supplierId, fulfillmentId, ...safe } = shipment;
  return safe;
}

function createReturnRequest() {
  return directRefusal("RETURN_UNVERIFIED");
}

function updateReturnRequest() {
  return directRefusal("RETURN_UNVERIFIED");
}

module.exports = {
  createFulfillment,
  updateFulfillment,
  findFulfillmentByIdempotency,
  readFulfillments,
  createSupplierOrder,
  updateSupplierOrder,
  readSupplierOrders,
  createShipment,
  updateShipment,
  readShipments,
  listShipmentsForOrder,
  sanitizeShipment,
  createReturnRequest,
  updateReturnRequest,
  readReturns,
};
