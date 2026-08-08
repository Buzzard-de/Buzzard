const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getTrackingUrl } = require("./carriers");

const dataDir = path.join(__dirname, "..", "data");
const fulfillmentsFile = path.join(dataDir, "fulfillments.json");
const supplierOrdersFile = path.join(dataDir, "supplier-orders.json");
const shipmentsFile = path.join(dataDir, "shipments.json");
const returnsFile = path.join(dataDir, "return-requests.json");

function ensureDataDir() {
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
  return readJson(fulfillmentsFile);
}

function writeFulfillments(items) {
  writeJson(fulfillmentsFile, items);
}

function readSupplierOrders() {
  return readJson(supplierOrdersFile);
}

function writeSupplierOrders(items) {
  writeJson(supplierOrdersFile, items);
}

function readShipments() {
  return readJson(shipmentsFile);
}

function writeShipments(items) {
  writeJson(shipmentsFile, items);
}

function readReturns() {
  return readJson(returnsFile);
}

function writeReturns(items) {
  writeJson(returnsFile, items);
}

function createFulfillment({ orderNumber, supplierId, model, lines }) {
  const items = readFulfillments();
  const fulfillment = {
    id: `ful-${crypto.randomUUID()}`,
    orderNumber,
    supplierId,
    model,
    status: "pending",
    lines,
    supplierOrderId: null,
    error: null,
    retryCount: 0,
    idempotencyKey: `${orderNumber}:${supplierId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.push(fulfillment);
  writeFulfillments(items);
  return fulfillment;
}

function updateFulfillment(id, patch) {
  const items = readFulfillments();
  const idx = items.findIndex((f) => f.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  writeFulfillments(items);
  return items[idx];
}

function findFulfillmentByIdempotency(key) {
  return readFulfillments().find((f) => f.idempotencyKey === key);
}

function createSupplierOrder({ orderNumber, supplierId, lines, shippingAddress, idempotencyKey }) {
  const existing = readSupplierOrders().find((o) => o.idempotencyKey === idempotencyKey);
  if (existing) return existing;

  const order = {
    id: `so-${crypto.randomUUID()}`,
    buzzardOrderNumber: orderNumber,
    supplierId,
    lines,
    shippingAddress,
    status: "pending",
    supplierResponse: null,
    trackingNumber: null,
    trackingCarrier: null,
    error: null,
    retryCount: 0,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const items = readSupplierOrders();
  items.push(order);
  writeSupplierOrders(items);
  return order;
}

function updateSupplierOrder(id, patch) {
  const items = readSupplierOrders();
  const idx = items.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  writeSupplierOrders(items);
  return items[idx];
}

function createShipment({ orderNumber, fulfillmentId, supplierId, lines, carrier = "DHL" }) {
  const items = readShipments();
  const shipment = {
    id: `shp-${crypto.randomUUID()}`,
    orderNumber,
    fulfillmentId,
    supplierId,
    carrier,
    trackingNumber: null,
    trackingUrl: null,
    status: "pending",
    lines,
    events: [{ status: "pending", at: new Date().toISOString(), message: "Fulfillment created" }],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  items.push(shipment);
  writeShipments(items);
  return shipment;
}

function updateShipment(id, patch) {
  const items = readShipments();
  const idx = items.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const next = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  if (patch.trackingNumber) {
    next.trackingUrl = getTrackingUrl(next.carrier, patch.trackingNumber);
  }
  if (patch.status) {
    next.events = [...(items[idx].events || []), { status: patch.status, at: new Date().toISOString() }];
  }
  items[idx] = next;
  writeShipments(items);
  return items[idx];
}

function listShipmentsForOrder(orderNumber) {
  return readShipments().filter((s) => s.orderNumber === orderNumber);
}

function sanitizeShipment(shipment) {
  const { supplierId, fulfillmentId, ...safe } = shipment;
  return safe;
}

function createReturnRequest({ orderNumber, customerId, items, reason }) {
  const all = readReturns();
  const entry = {
    id: `ret-${crypto.randomUUID()}`,
    orderNumber,
    customerId,
    items,
    reason,
    status: "requested",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(entry);
  writeReturns(all);
  return entry;
}

function updateReturnRequest(id, patch) {
  const all = readReturns();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  writeReturns(all);
  return all[idx];
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
