const { requireAuth } = require("../lib/auth");
const { requireCustomer } = require("../lib/customerAuth");
const { requirePermission } = require("../lib/rbac");
const { logAudit } = require("../lib/audit");
const fulfillmentStore = require("../lib/fulfillmentStore");
const fulfillmentPipeline = require("../lib/fulfillmentPipeline");
const { listMethods } = require("../lib/shippingEngine");
const { listCarriers } = require("../lib/carriers");
const customerStore = require("../lib/customerStore");
const fs = require("fs");
const path = require("path");

const ordersFile = path.join(__dirname, "..", "data", "orders.json");

function readOrders() {
  if (!fs.existsSync(ordersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(ordersFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function audit(req, entry) {
  logAudit({
    userId: req.adminUser?.id,
    userEmail: req.adminUser?.email,
    ...entry,
  });
}

function ownsOrder(order, session) {
  const customer = customerStore.findById(session.customerId);
  return order.customerId === session.customerId || order.customer?.email === customer?.email;
}

module.exports = {
  register(app) {
    app.get("/api/checkout/shipping-methods", (req, res) => {
      const country = String(req.query?.country || "DE").toUpperCase();
      return res.json({ success: true, methods: listMethods(country), carriers: listCarriers() });
    });

    app.get("/api/admin/logistics/fulfillments", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.read")) return;
      const orderNumber = req.query?.orderNumber;
      let fulfillments = fulfillmentStore.readFulfillments().slice().reverse();
      if (orderNumber) {
        fulfillments = fulfillments.filter((f) => f.orderNumber === orderNumber);
      }
      return res.json({ success: true, fulfillments });
    });

    app.post("/api/admin/logistics/fulfillments/:id/retry", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.write")) return;
      const result = fulfillmentPipeline.retryFulfillment(req.params.id, {
        userId: req.adminUser.id,
        email: req.adminUser.email,
      });
      if (!result) return res.status(404).json({ success: false, errorKey: "logistics.fulfillment.notFound" });
      if (!result.ok) return res.status(400).json({ success: false, errorKey: result.errorKey });
      audit(req, {
        action: "fulfillment_retry",
        entityType: "fulfillment",
        entityId: req.params.id,
        field: "status",
        oldValue: "failed",
        newValue: "confirmed",
      });
      return res.json({ success: true, fulfillment: result.fulfillment });
    });

    app.get("/api/admin/logistics/shipments", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.read")) return;
      const orderNumber = req.query?.orderNumber;
      let shipments = fulfillmentStore.readShipments().slice().reverse();
      if (orderNumber) {
        shipments = shipments.filter((s) => s.orderNumber === orderNumber);
      }
      return res.json({ success: true, shipments });
    });

    app.patch("/api/admin/logistics/shipments/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.write")) return;
      const allowedStatuses = new Set([
        "pending",
        "preparing",
        "handed_to_carrier",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "exception",
        "returned",
      ]);
      const { trackingNumber, carrier, status } = req.body || {};
      const patch = {};
      if (trackingNumber) patch.trackingNumber = String(trackingNumber).trim();
      if (carrier) patch.carrier = String(carrier).trim();
      if (status) {
        if (!allowedStatuses.has(status)) {
          return res.status(400).json({ success: false, errorKey: "logistics.shipment.invalidStatus" });
        }
        patch.status = status;
      }
      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ success: false, errorKey: "logistics.shipment.invalidPatch" });
      }
      const shipment = fulfillmentStore.updateShipment(req.params.id, patch);
      if (!shipment) return res.status(404).json({ success: false, errorKey: "logistics.shipment.notFound" });
      audit(req, {
        action: "shipment_update",
        entityType: "shipment",
        entityId: shipment.id,
        field: Object.keys(patch).join(","),
        oldValue: null,
        newValue: JSON.stringify(patch),
      });
      return res.json({ success: true, shipment });
    });

    app.get("/api/admin/logistics/supplier-orders", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.read")) return;
      const orderNumber = req.query?.orderNumber;
      let supplierOrders = fulfillmentStore.readSupplierOrders().slice().reverse();
      if (orderNumber) {
        supplierOrders = supplierOrders.filter((o) => o.buzzardOrderNumber === orderNumber);
      }
      return res.json({ success: true, supplierOrders });
    });

    app.get("/api/admin/logistics/returns", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.read")) return;
      return res.json({ success: true, returns: fulfillmentStore.readReturns().slice().reverse() });
    });

    app.patch("/api/admin/logistics/returns/:id", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "logistics.write")) return;
      const allowed = new Set(["requested", "approved", "rejected", "received", "refunded", "closed"]);
      const status = req.body?.status;
      if (!allowed.has(status)) {
        return res.status(400).json({ success: false, errorKey: "logistics.return.invalidStatus" });
      }
      const entry = fulfillmentStore.updateReturnRequest(req.params.id, { status });
      if (!entry) return res.status(404).json({ success: false, errorKey: "logistics.return.notFound" });
      audit(req, {
        action: "return_status",
        entityType: "return",
        entityId: entry.id,
        field: "status",
        oldValue: null,
        newValue: status,
      });
      return res.json({ success: true, returnRequest: entry });
    });

    app.get("/api/account/orders/:orderNumber/shipments", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const order = readOrders().find((o) => o.orderNumber === req.params.orderNumber);
      if (!order) return res.status(404).json({ success: false, errorKey: "account.order.notFound" });
      if (!ownsOrder(order, session)) {
        return res.status(403).json({ success: false, errorKey: "account.auth.forbidden" });
      }
      const shipments = fulfillmentStore
        .listShipmentsForOrder(order.orderNumber)
        .map(fulfillmentStore.sanitizeShipment);
      return res.json({ success: true, shipments });
    });

    app.post("/api/account/orders/:orderNumber/returns", (req, res) => {
      const session = requireCustomer(req, res);
      if (!session) return;
      const order = readOrders().find((o) => o.orderNumber === req.params.orderNumber);
      if (!order) return res.status(404).json({ success: false, errorKey: "account.order.notFound" });
      if (!ownsOrder(order, session)) {
        return res.status(403).json({ success: false, errorKey: "account.auth.forbidden" });
      }
      const { items, reason } = req.body || {};
      if (!Array.isArray(items) || items.length === 0 || !reason?.trim()) {
        return res.status(400).json({ success: false, errorKey: "logistics.return.invalidRequest" });
      }
      const entry = fulfillmentStore.createReturnRequest({
        orderNumber: order.orderNumber,
        customerId: session.customerId,
        items,
        reason: String(reason).trim().slice(0, 500),
      });
      return res.status(201).json({ success: true, returnRequest: entry });
    });
  },
};
